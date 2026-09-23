import type { JudgingState } from "../types.ts";
import type { createSessionStorage, StoredSession } from "./sessionStorageV3.ts";

type Repository = ReturnType<typeof createSessionStorage>;
export interface SessionSaveStatus {
  phase: "saved" | "saving" | "failed" | "conflict";
  hasUnsaved: boolean;
  message: string;
}

/** One ordered save stream per tab. The pending state includes the whole ledger,
 * so coalescing rapid renders cannot omit an intervening judging action. */
export class SessionSaveController {
  readonly repository: Repository;
  private checkpoint: StoredSession["checkpoint"];
  private latest: JudgingState;
  private committed: JudgingState;
  private pending: JudgingState | null = null;
  private busy = false;
  private checkAfterSave = false;
  private listeners = new Set<() => void>();
  private status: SessionSaveStatus = {phase:"saved",hasUnsaved:false,message:"Saved on this device"};

  constructor(repository: Repository, initial: StoredSession) {
    this.repository=repository;
    this.checkpoint=initial.checkpoint;
    this.latest=initial.state;
    this.committed=initial.state;
  }
  getSnapshot = () => this.status;
  getCurrentState = () => this.latest;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(phase: SessionSaveStatus["phase"], message: string) {
    this.status={phase,message,hasUnsaved:this.latest !== this.committed};
    this.listeners.forEach(listener=>listener());
  }
  stage(state: JudgingState) {
    if (state === this.latest) return;
    this.latest=state;
    this.pending=state;
    if (this.status.phase === "failed" || this.status.phase === "conflict") {
      this.publish(this.status.phase,this.status.message);
    } else void this.pump();
  }
  private async pump() {
    if (this.busy || !this.pending) return;
    this.busy=true;
    this.publish("saving","Saving…");
    try {
      while (this.pending) {
        const state=this.pending;
        this.pending=null;
        try {
          const receipt=await this.repository.save(state,this.checkpoint);
          this.checkpoint=receipt.checkpoint;
          this.committed=state;
          if (receipt.legacyChanged) {
            this.publish("conflict","The older app copy changed or could not be checked. Both copies need review.");
            return;
          }
        } catch(error) {
          this.pending ??= state;
          const code=(error as {code?:string})?.code;
          this.publish(code === "stale" || code === "legacy-changed" ? "conflict" : "failed",
            code === "stale" ? "Another tab saved newer work. This tab’s changes are still here."
              : code === "legacy-changed" ? "The older app copy changed. Both copies need review."
              : "This tab’s changes are still here. Keep it open until saving succeeds or you download a copy.");
          return;
        }
      }
      this.publish("saved","Saved on this device");
    } finally {
      this.busy=false;
      if (this.checkAfterSave) { this.checkAfterSave=false; void this.check(); }
    }
  }
  async check(): Promise<boolean> {
    if (this.busy) { this.checkAfterSave=true; return false; }
    const checkpoint=this.checkpoint.raw;
    const status=await this.repository.inspect();
    // A visibility check can overlap this tab's own save; it is not a conflict.
    if (this.busy) { this.checkAfterSave=true; return false; }
    if (this.checkpoint.raw !== checkpoint) return this.check();
    if (status.kind === "ready" && status.current.checkpoint.raw === checkpoint) return true;
    this.publish("conflict",status.kind === "legacy-conflict"
      ? "The older app copy changed. Both copies need review."
      : "The saved session changed or could not be opened. This tab’s work is still here.");
    return false;
  }
  async retry() {
    if (!await this.check()) return;
    this.publish(this.pending ? "saving" : "saved",this.pending ? "Saving…" : "Saved on this device");
    await this.pump();
  }
}
