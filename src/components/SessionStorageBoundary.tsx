import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { JudgingState } from "../types";
import { STORAGE_KEY } from "../config";
import { createSessionStorage, SessionStorageError, type SessionStorageStatus, type StoredSession } from "../state/sessionStorageV3";
import { SessionSaveController } from "../state/sessionSaveController";
import { applyDeviceTheme, readDevicePreferences } from "../lib/devicePreferences";
import { buildStateBackup } from "../lib/resultPackages";
import "./sessionStorage.css";

const SaveContext=createContext<SessionSaveController | null>(null);
const disabledStatus={phase:"saved" as const,hasUnsaved:false,message:""};
const noopSubscribe=()=>()=>{};
const getDisabled=()=>disabledStatus;

function storageExplanation(code: string) {
  if(code === "unsupported") return "This copy was saved by a newer version of Tanween. Open it with that version to continue.";
  if(code === "unavailable") return "Tanween cannot access this device’s saved work. Keep existing tabs open and try again.";
  if(code === "blocked") return "Another tab is preventing access. Finish saving there, then close that tab and check again.";
  return "The saved copy could not be read safely. The retained copies have not been replaced.";
}
function savedCopyTime(snapshot: StoredSession) {
  try {
    const date=new Date(JSON.parse(JSON.parse(snapshot.checkpoint.raw).payload).exportedAt);
    return Number.isFinite(date.getTime()) ? date.toLocaleString() : "Time not recorded";
  } catch {return "Time not recorded";}
}

export function useSessionSaveStatus() {
  const controller=useContext(SaveContext);
  const status=useSyncExternalStore(controller?.subscribe ?? noopSubscribe,controller?.getSnapshot ?? getDisabled,getDisabled);
  return controller ? status : null;
}

/** Production default; the development-only legacy proof can still run independently. */
export function sessionStorageReviewEnabled() {
  return import.meta.env?.PROD || import.meta.env?.DEV && new URLSearchParams(location.search).get("sessionStorage") === "3";
}

function downloadJSON(value: unknown, filename: string) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:"application/json"}));
  const link=document.createElement("a");link.href=url;link.download=filename;
  document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export function SessionStorageBoundary({children,normalize,emptyState}: {
  children: (state: JudgingState, controller: SessionSaveController) => ReactNode;
  normalize: (state: Partial<JudgingState>) => JudgingState;
  emptyState: JudgingState;
}) {
  const [repository]=useState(()=>createSessionStorage());
  const [status,setStatus]=useState<SessionStorageStatus | null>(null);
  const [controller,setController]=useState<SessionSaveController | null>(null);
  const [busy,setBusy]=useState(false);
  const [exportError,setExportError]=useState("");
  const [reviewed,setReviewed]=useState(false);
  const boot=useRef<Promise<SessionStorageStatus> | null>(null);
  const heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{applyDeviceTheme(readDevicePreferences().theme);},[]);
  const accept=(snapshot: StoredSession)=>{
    setStatus({kind:"ready",current:snapshot});
    setController(new SessionSaveController(repository,snapshot));
  };
  const inspect=async()=>{
    const result=await repository.inspect();setStatus(result);setReviewed(false);
    if (result.kind === "ready") accept(result.current);
  };
  useEffect(()=>{
    let active=true;
    boot.current ??= (async()=>{
      let result=await repository.inspect();
      if (result.kind === "empty") {
        try { result={kind:"ready",current:await repository.migrateLegacy(normalize,emptyState)}; }
        catch(error) {
          // A concurrent tab may have completed migration. Inspect instead of
          // starting over or replacing an uncertain commit with default data.
          result=await repository.inspect();
          if (result.kind === "empty") result={kind:"blocked",error:error instanceof SessionStorageError
            ? error : new SessionStorageError("invalid","The saved session could not be opened safely.")};
        }
      }
      return result;
    })();
    void boot.current.then(result=>{
      if (!active) return;
      setStatus(result);if (result.kind === "ready") accept(result.current);
    });
    return ()=>{active=false;};
  },[repository,normalize,emptyState]);
  useEffect(()=>{if(status && status.kind !== "ready") heading.current?.focus();},[status]);

  if(controller && status?.kind === "ready") return <SaveContext.Provider value={controller}>
    {children(status.current.state,controller)}
    <SessionSaveNotice controller={controller}/>
  </SaveContext.Provider>;

  const recovery=status?.kind === "recovery-required" ? status : null;
  const title=!status ? "Opening your saved session…" : recovery ? "A previous saved copy is available"
    : status.kind === "legacy-conflict" ? "Two copies need review" : "Your saved session needs attention";
  const exportCopies=async()=>{
    setExportError("");
    try { downloadJSON({format:"tanween-recovery-v1",exportedAt:new Date().toISOString(),copies:await repository.recoveryCopies()},"tanween-recovery-copies.json"); }
    catch {setExportError("The copies could not be downloaded. Keep this page open and try again.");}
  };
  return <main className="session-storage-screen"><section className="session-storage-card" aria-labelledby="storage-title" aria-busy={busy || !status}>
    <h1 id="storage-title" ref={heading} tabIndex={-1}>{title}</h1>
    {!status ? <p role="status">Please wait before judging.</p> : <>
      <p>{recovery ? "The latest copy could not be opened. Review the previous copy below before restoring it. The damaged copy will be kept."
        : status.kind === "legacy-conflict" ? "An older tab changed its copy after the new one was created. Neither copy has been replaced. Download both before deciding which work to keep."
        : status.kind === "blocked" ? storageExplanation(status.error.code) : "No saved copy is available. Nothing has been replaced."}</p>
      {recovery && <>
        <dl><dt>Copy saved</dt><dd>{savedCopyTime(recovery.previous)}</dd>
          <dt>Reciter</dt><dd>{recovery.previous.state.participant.name || "No active reciter"}</dd>
          <dt>Saved results</dt><dd>{recovery.previous.state.history.length}</dd>
          <dt>Current findings</dt><dd>{recovery.previous.state.mistakes.length}</dd>
          {recovery.previous.state.history.length>0 && <><dt>Last completed</dt><dd>{[...recovery.previous.state.history].sort((a,b)=>b.savedAt-a.savedAt)[0].participant.name}</dd></>}
        </dl>
        <label className="session-recovery-confirm"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>
          I understand that changes after this copy may be missing.</label>
      </>}
      {status.kind === "legacy-conflict" && <p>The copies remain separate until their differences are reviewed.</p>}
      <div className="session-storage-actions">
        <button className="btn-ghost" disabled={busy} onClick={()=>void exportCopies()}>Download saved copies</button>
        {recovery ? <button className="btn-primary" disabled={!reviewed || busy} onClick={async()=>{
          setBusy(true);
          try { await repository.recover(recovery); await inspect(); }
          catch(error) {setExportError(error instanceof Error ? error.message : "Recovery did not complete. Nothing was replaced.");}
          finally {setBusy(false);}
        }}>Restore previous copy</button> : null}
        <button className="btn-ghost" disabled={busy} onClick={()=>window.location.reload()}>Check again</button>
      </div>
      {exportError && <p role="alert">{exportError}</p>}
    </>}
  </section></main>;
}

function SessionSaveNotice({controller}:{controller:SessionSaveController}) {
  const status=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
  const [exportError,setExportError]=useState("");
  useEffect(()=>{
    const check=()=>{if(document.visibilityState === "visible") void controller.check();};
    const storage=(event:StorageEvent)=>{if(event.key === STORAGE_KEY || event.key === null) void controller.check();};
    const beforeUnload=(event:BeforeUnloadEvent)=>{
      if(controller.getSnapshot().hasUnsaved) {event.preventDefault();event.returnValue="";}
    };
    window.addEventListener("focus",check);document.addEventListener("visibilitychange",check);
    window.addEventListener("storage",storage);window.addEventListener("beforeunload",beforeUnload);
    return ()=>{window.removeEventListener("focus",check);document.removeEventListener("visibilitychange",check);
      window.removeEventListener("storage",storage);window.removeEventListener("beforeunload",beforeUnload);};
  },[controller]);
  if(status.phase === "saved" || status.phase === "saving") return null;
  return <aside className="session-save-notice" aria-label="Session saving needs attention">
    <div role="alert"><strong>{status.hasUnsaved ? "Not saved" : "Saving paused"}</strong><p>{status.message}</p></div>
    <div className="session-storage-actions">
      <button className="btn-ghost" onClick={()=>void controller.retry()}>{status.phase === "failed" ? "Retry saving" : "Check again"}</button>
      <button className="btn-primary" onClick={async()=>{
        setExportError("");
        const thisTab=structuredClone(controller.getCurrentState());
        try {
          let copies: unknown;
          try {copies=await controller.repository.recoveryCopies();}
          catch {copies={unavailable:true};}
          downloadJSON({...buildStateBackup(thisTab),recoveryCopies:copies},"tanween-unsaved-work.json");
        }catch{setExportError("The download did not start. Keep this tab open and try again.");}
      }}>Download this tab’s work</button>
    </div>
    {exportError && <p role="alert">{exportError}</p>}
  </aside>;
}
