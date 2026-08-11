import { useEffect, useRef, useState } from "react";
import type { SavedSession } from "../types";

export function ReopenSessionDialog({
  session,
  onCancel,
  onConfirm,
}: {
  session: SavedSession;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="dialog-backdrop">
      <form
        className="dialog reopen-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reopen-title"
        onSubmit={(event) => {
          event.preventDefault();
          if (reason.trim()) onConfirm(reason.trim());
        }}
      >
        <span className="dialog-kicker">Recorded correction</span>
        <h2 className="dialog-title" id="reopen-title">
          Reopen {session.participant.name || "this result"}?
        </h2>
        <p className="dialog-sub">
          Briefly state why. The reason will appear in the judging history.
        </p>
        <textarea
          ref={inputRef}
          className="reopen-reason"
          value={reason}
          rows={3}
          maxLength={240}
          placeholder="Example: Correcting a deduction after review"
          onChange={(event) => setReason(event.target.value)}
        />
        <div className="dialog-actions">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={!reason.trim()}
          >
            Reopen result
          </button>
        </div>
      </form>
    </div>
  );
}
