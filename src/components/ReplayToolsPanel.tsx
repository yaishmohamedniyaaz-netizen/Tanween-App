import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import "../styles/replayToolsPanel.css";

/** Presentation only: timing state and the media element remain in their owner. */
export function ReplayToolsPanel({ children, open, dirty, busy, onOpen, onClose, onDiscard, onTransportTarget, enabled = true }: {
  enabled?: boolean;
  children: ReactNode; open: boolean; dirty: boolean; busy: boolean;
  onOpen: () => void; onClose: () => void; onDiscard: () => void;
  onTransportTarget: (element: HTMLDivElement | null) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const keepButton = useRef<HTMLButtonElement>(null);
  const [confirm, setConfirm] = useState(false);
  const title = useId();
  useEffect(() => { if (confirm) keepButton.current?.focus({ preventScroll: true }); }, [confirm]);
  useEffect(() => {
    if (!open) return;
    const node = dialog.current;
    if (node && !node.open) node.showModal();
    closeButton.current?.focus({ preventScroll: true });
    return () => { if (node?.open) node.close(); };
  }, [open]);
  const finish = () => {
    if (busy) return;
    setConfirm(false); onClose();
    requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true }));
  };
  const requestClose = () => { if (busy) return; if (dirty) setConfirm(true); else finish(); };
  if (!enabled) return <div className="replay-timing-tools">{children}</div>;
  return <>
    <button ref={trigger} type="button" className="btn-secondary" aria-haspopup="dialog" aria-expanded={open} onClick={onOpen}>Timing tools</button>
    <dialog ref={dialog} className="replay-tools-dialog" aria-labelledby={title}
      onCancel={event => { event.preventDefault(); requestClose(); }}
      onKeyDown={event => { if (event.key === "Escape") event.stopPropagation(); }}>
      <header><h2 id={title}>Timing tools</h2><button ref={closeButton} type="button" className="btn-ghost" disabled={busy} onClick={requestClose}>Close timing tools</button></header>
      {confirm && <div className="replay-draft-confirm" role="alert">
        <p>Discard unsaved timing changes?</p>
        <button ref={keepButton} type="button" className="btn-secondary" onClick={() => { setConfirm(false); closeButton.current?.focus({ preventScroll: true }); }}>Keep editing</button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => { if (busy) return; onDiscard(); finish(); }}>Discard changes</button>
      </div>}
      <div ref={onTransportTarget} className="replay-tools-transport" />
      <fieldset className="replay-tools-content" disabled={confirm} aria-label="Timing editor">{children}</fieldset>
    </dialog>
  </>;
}
