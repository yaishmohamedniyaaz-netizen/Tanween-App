import { STORAGE_KEY } from "../config.ts";
import type { JudgingState } from "../types.ts";
import { buildStateBackup, parseStateBackup } from "../lib/resultPackages.ts";
import { stateHasNonQuranEvidence } from "../lib/phraseEvidence.ts";

// Never reuse the legacy key or the audio/Mushaf databases. Older builds can
// continue to write their own copy, but cannot overwrite this evidence.
export const SESSION_DB_V3 = "tanween-session-v3";
const STORE = "snapshots";
const SCHEMA = "tanween-session-store-v1";
type Records = { current?: string; previous?: string; legacy?: string | null };
export type StorageFailure = "unavailable" | "blocked" | "invalid" | "unsupported" | "stale" | "legacy-changed" | "quota" | "aborted";
export class SessionStorageError extends Error {
  readonly code: StorageFailure;
  constructor(code: StorageFailure, message: string) {
    super(message); this.name = "SessionStorageError"; this.code=code;
  }
}
export interface SessionCheckpoint { readonly raw: string; readonly revision: number }
export interface StoredSession { state: JudgingState; checkpoint: SessionCheckpoint }
export type SessionStorageStatus =
  | { kind: "empty" }
  | { kind: "ready"; current: StoredSession }
  | { kind: "legacy-conflict"; current?: StoredSession; legacyAtMigration: string | null; legacyNow: string | null }
  | { kind: "recovery-required"; previous: StoredSession; damagedCurrent: string | undefined }
  | { kind: "blocked"; error: SessionStorageError };
interface Envelope {
  schema: typeof SCHEMA; minimumReaderVersion: 3; revision: number;
  commitId: string; legacyDigest: string; payload: string; digest: string;
}
function failure(error: unknown): SessionStorageError {
  if (error instanceof SessionStorageError) return error;
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return new SessionStorageError("quota", "Device storage is full. The last saved snapshot was retained.");
  }
  return new SessionStorageError("aborted", "The save did not complete. Keep this tab open and retain its unsaved work.");
}
async function digest(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
}
const content = (e: Omit<Envelope, "digest">) => JSON.stringify([e.schema,e.minimumReaderVersion,e.revision,e.commitId,e.legacyDigest,e.payload]);
async function encode(state: JudgingState, revision: number, legacy: string | null): Promise<string> {
  // Detach the caller's live object before the first asynchronous boundary.
  const payload = JSON.stringify(buildStateBackup(state));
  parseStateBackup(JSON.parse(payload));
  const envelope: Omit<Envelope,"digest"> = {schema:SCHEMA,minimumReaderVersion:3,revision,commitId:crypto.randomUUID(),
    legacyDigest:await digest(JSON.stringify(legacy)),payload};
  return JSON.stringify({...envelope,digest:await digest(content(envelope))});
}
async function decode(raw: string, legacy: string | null): Promise<StoredSession> {
  let e: Envelope;
  try { e = JSON.parse(raw); } catch { throw new SessionStorageError("invalid", "The saved snapshot is damaged."); }
  if (!e || e.schema !== SCHEMA || e.minimumReaderVersion !== 3) {
    throw new SessionStorageError("unsupported", "This snapshot requires another app version. It has not been replaced.");
  }
  if (!Number.isSafeInteger(e.revision) || e.revision < 1 || typeof e.commitId !== "string" || !e.commitId || typeof e.payload !== "string" ||
      e.legacyDigest !== await digest(JSON.stringify(legacy)) || e.digest !== await digest(content(e))) {
    throw new SessionStorageError("invalid", "The saved snapshot failed its integrity check.");
  }
  try { return {state:parseStateBackup(JSON.parse(e.payload)),checkpoint:{raw,revision:e.revision}}; }
  catch { throw new SessionStorageError("invalid", "The saved evidence is incomplete or unsupported."); }
}

/** Production session store; retains the legacy snapshot and detects old-tab edits. */
export function createSessionStorage(options: {
  databaseName?: string;
  legacyStorage?: Pick<Storage,"getItem">;
} = {}) {
  const databaseName = options.databaseName ?? SESSION_DB_V3;
  const legacyValue = (): string | null => {
    try { return (options.legacyStorage ?? localStorage).getItem(STORAGE_KEY); }
    catch { throw new SessionStorageError("unavailable", "The previous device session cannot be read safely."); }
  };
  const open = (): Promise<IDBDatabase> => new Promise((resolve,reject) => {
    let request: IDBOpenDBRequest;
    try { request = indexedDB.open(databaseName,1); }
    catch { reject(new SessionStorageError("unavailable","Session storage is unavailable on this device.")); return; }
    let blocked = false;
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onblocked = () => { blocked=true; reject(new SessionStorageError("blocked","Another tab is blocking session storage.")); };
    request.onerror = () => reject(request.error?.name === "VersionError"
      ? new SessionStorageError("unsupported","A newer app owns this session database. No data was replaced.")
      : failure(request.error));
    request.onsuccess = () => {
      const db=request.result;
      if (blocked) { db.close(); return; }
      db.onversionchange=()=>db.close(); resolve(db);
    };
  });
  async function read(): Promise<Records> {
    const db=await open();
    return new Promise((resolve,reject)=>{
      let tx: IDBTransaction;
      try { tx=db.transaction(STORE,"readonly"); }
      catch(error) { db.close(); reject(failure(error)); return; }
      const rows: Records={}; const store=tx.objectStore(STORE);
      for (const key of ["current","previous","legacy"] as const) {
        const request=store.get(key); request.onsuccess=()=>{ rows[key]=request.result; };
      }
      tx.oncomplete=()=>{ db.close(); resolve(rows); };
      tx.onabort=()=>{ db.close(); reject(failure(tx.error)); };
    });
  }
  async function recoveryCopies() {
    const db=await open();
    return new Promise<Records & {quarantined: Record<string,unknown>; legacyNow: string | null}>((resolve,reject)=>{
      const tx=db.transaction(STORE,"readonly"),store=tx.objectStore(STORE);
      const keys=store.getAllKeys(),values=store.getAll();
      tx.oncomplete=()=>{
        db.close();
        const rows: Records={},quarantined: Record<string,unknown>={};
        keys.result.forEach((key,index)=>{
          if (key === "current" || key === "previous" || key === "legacy") rows[key]=values.result[index];
          else if (typeof key === "string" && key.startsWith("damaged:")) quarantined[key]=values.result[index];
        });
        try { resolve({...rows,quarantined,legacyNow:legacyValue()}); }
        catch(error) { reject(error); }
      };
      tx.onabort=()=>{db.close();reject(failure(tx.error));};
    });
  }
  async function write(expected: Records, next: string, capturedLegacy: string | null, quarantine = false): Promise<void> {
    const db=await open();
    return new Promise((resolve,reject)=>{
      let tx: IDBTransaction;
      try { tx=db.transaction(STORE,"readwrite",{durability:"strict"}); }
      catch(error) { db.close(); reject(failure(error)); return; }
      const store=tx.objectStore(STORE); let reason: unknown;
      const actual: Records={}; let remaining=3;
      for (const key of ["current","previous","legacy"] as const) {
        const request=store.get(key);
        request.onsuccess=()=>{
          actual[key]=request.result;
          if (--remaining) return;
          try {
            // Read, compare and replace within the SAME transaction. A second
            // tab cannot pass this comparison against an out-of-date snapshot.
            if (actual.current !== expected.current || actual.previous !== expected.previous || actual.legacy !== expected.legacy) {
              throw new SessionStorageError("stale","Another tab saved a newer session. Your unsaved work has not replaced it.");
            }
            if (legacyValue() !== capturedLegacy) throw new SessionStorageError("legacy-changed","The older app copy changed. Both copies must be reviewed before saving.");
            if (quarantine && actual.current !== undefined) store.put(actual.current,`damaged:${crypto.randomUUID()}`);
            if (!quarantine && actual.current !== undefined) store.put(actual.current,"previous");
            if (actual.legacy === undefined) store.put(capturedLegacy,"legacy");
            store.put(next,"current");
          } catch(error) { reason=error; tx.abort(); }
        };
      }
      tx.oncomplete=()=>{db.close();resolve();};
      tx.onabort=()=>{db.close();reject(failure(reason ?? tx.error));};
    });
  }
  async function inspect(): Promise<SessionStorageStatus> {
    try {
      const rows=await read();
      if (rows.current === undefined && rows.previous === undefined && rows.legacy === undefined) return {kind:"empty"};
      if (rows.legacy === undefined) throw new SessionStorageError("invalid","The migration baseline is missing. No data was replaced.");
      let current: StoredSession | undefined; let broken: unknown;
      try { if (rows.current !== undefined) current=await decode(rows.current,rows.legacy); }
      catch(error) { broken=error; }
      // Never recover an old snapshot over a newer, unsupported app format.
      if (broken instanceof SessionStorageError && broken.code === "unsupported") throw broken;
      const now=legacyValue();
      if (now !== rows.legacy) return {kind:"legacy-conflict",current,legacyAtMigration:rows.legacy,legacyNow:now};
      if (current) return {kind:"ready",current};
      if (rows.previous !== undefined) return {kind:"recovery-required",previous:await decode(rows.previous,rows.legacy),damagedCurrent:rows.current};
      throw broken ?? new SessionStorageError("invalid","No complete session snapshot is available. The raw data was retained.");
    } catch(error) { return {kind:"blocked",error:failure(error)}; }
  }
  /** Caller supplies the state derived from this EXACT legacy read. No
   * automatic migration/reset occurs merely because the module is imported. */
  async function initialize(state: JudgingState, expectedLegacy: string | null) {
    const raw=await encode(state,1,expectedLegacy);
    if (legacyValue() !== expectedLegacy) throw new SessionStorageError("legacy-changed","The older app changed while migration was prepared.");
    // Initialize in one transaction; also compare the captured legacy value
    // inside it, without treating it as an existing database row.
    await write({},raw,expectedLegacy);
    const status=await inspect();
    if (status.kind === "blocked") throw status.error;
    if (status.kind !== "ready") throw new SessionStorageError("legacy-changed","Migration finished but the older app changed. Preserve both copies.");
    return status.current;
  }
  function receipt(raw: string, revision: number, legacy: string | null) {
    const checkpoint={raw,revision};
    try { return {checkpoint,legacyChanged:legacyValue() !== legacy}; }
    catch(error) {
      // The database transaction has already committed. A subsequent failure
      // to read legacy storage must not be reported as a failed database save.
      return {checkpoint,legacyChanged:true,legacyCheckError:failure(error)};
    }
  }
  return {
    inspect, initialize, recoveryCopies,
    /** Explicit cutover entry point for the future app bootstrap. A malformed
     * old file must not become an empty new competition through normalization. */
    async migrateLegacy(normalize: (state: Partial<JudgingState>) => JudgingState, emptyState: JudgingState) {
      const legacy=legacyValue();
      let parsed: unknown;
      try { parsed=legacy === null ? null : JSON.parse(legacy); }
      catch { throw new SessionStorageError("invalid","The previous session is damaged. It was retained without migration."); }
      if (legacy !== null) {
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) ||
            !Array.isArray((parsed as JudgingState).history) || !Array.isArray((parsed as JudgingState).roster) ||
            stateHasNonQuranEvidence(parsed)) {
          throw new SessionStorageError("invalid","The previous session is incomplete or uses unsupported evidence. It was retained.");
        }
      }
      let state: JudgingState;
      try { state=legacy === null ? emptyState : normalize(parsed as Partial<JudgingState>); }
      catch { throw new SessionStorageError("invalid","The previous session could not be normalized safely. Its original bytes were retained."); }
      return initialize(state,legacy);
    },
    async save(state: JudgingState, checkpoint: SessionCheckpoint) {
      const snapshot=structuredClone(state);
      const rows=await read();
      if (rows.current !== checkpoint.raw || rows.legacy === undefined) throw new SessionStorageError("stale","The saved session changed. Reload and review before saving.");
      const current=await decode(rows.current,rows.legacy);
      if (current.checkpoint.revision !== checkpoint.revision) throw new SessionStorageError("stale","The checkpoint revision does not match.");
      const raw=await encode(snapshot,checkpoint.revision+1,rows.legacy);
      await write(rows,raw,rows.legacy);
      // localStorage and IndexedDB have no shared transaction. An old tab can
      // write immediately after our commit: report that separately from a failed save.
      return receipt(raw,checkpoint.revision+1,rows.legacy);
    },
    /** Explicit recovery only. Never auto-fallback and overwrite damaged work. */
    async recover(status: Extract<SessionStorageStatus,{kind:"recovery-required"}>) {
      const rows=await read();
      if (rows.current !== status.damagedCurrent || rows.previous !== status.previous.checkpoint.raw || rows.legacy === undefined) {
        throw new SessionStorageError("stale","The recovery candidates changed. Review them again.");
      }
      if (rows.current !== undefined) {
        try {
          await decode(rows.current,rows.legacy);
          throw new SessionStorageError("stale","The current snapshot is readable. Recovery must not replace it.");
        } catch(error) {
          if (!(error instanceof SessionStorageError) || error.code !== "invalid") throw error;
        }
      }
      // Do not trust a caller-mutated state object: decode the retained bytes.
      const previous=await decode(rows.previous,rows.legacy);
      const raw=await encode(previous.state,previous.checkpoint.revision+1,rows.legacy);
      await write(rows,raw,rows.legacy,true);
      return receipt(raw,previous.checkpoint.revision+1,rows.legacy);
    },
  };
}
