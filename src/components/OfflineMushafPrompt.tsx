import { useLayoutEffect, useRef, useState, useEffect } from "react";
import { useOfflineMushaf } from "../hooks/useOfflineMushaf";
import { usePwaInstall } from "../hooks/usePwaInstall";
import {
  OFFLINE_MUSHAF_PACKAGE_VERSION,
  startOfflineMushafDownload,
} from "../lib/offlineMushaf";

const promptKey = `tahqeeq:offline-mushaf-prompt:${OFFLINE_MUSHAF_PACKAGE_VERSION}`;

export function OfflineMushafPrompt({ suppressed }: { suppressed: boolean }) {
  const { standalone } = usePwaInstall();
  const offline = useOfflineMushaf();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const handled = localStorage.getItem(promptKey);
    if (
      !suppressed &&
      standalone &&
      handled === "downloaded" &&
      offline.phase === "available" &&
      offline.readyPages > 1
    ) {
      void startOfflineMushafDownload();
      return;
    }
    if (
      suppressed ||
      !standalone ||
      offline.phase === "checking" ||
      offline.phase === "downloading" ||
      offline.phase === "complete" ||
      offline.phase === "unsupported" ||
      handled
    ) {
      return;
    }
    setOpen(true);
  }, [offline.phase, standalone, suppressed]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    if (!dialog.open) dialog.showModal();
    titleRef.current?.focus({ preventScroll: true });
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open]);

  if (!open) return null;

  const dismiss = () => {
    localStorage.setItem(promptKey, "later");
    setOpen(false);
  };

  const download = () => {
    localStorage.setItem(promptKey, "downloaded");
    setOpen(false);
    void startOfflineMushafDownload();
  };

  return (
    <dialog
      ref={dialogRef}
      className="dialog offline-mushaf-dialog"
      aria-labelledby="offline-mushaf-title"
      aria-describedby="offline-mushaf-description"
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
    >
      <p className="dialog-kicker">Installed app</p>
      <h2
        className="dialog-title"
        id="offline-mushaf-title"
        ref={titleRef}
        tabIndex={-1}
      >
        Prepare the Mushaf
      </h2>
      <p className="dialog-sub" id="offline-mushaf-description">
        Download all 604 pages for faster page and surah jumps, even offline.
        The download is about 48 MB.
      </p>
      <p className="offline-mushaf-note">Keep Tahqeeq open while it prepares. If interrupted, it resumes from the pages already saved.</p>
      <div className="dialog-actions">
        <button type="button" className="btn-ghost" onClick={dismiss}>
          Later
        </button>
        <button type="button" className="btn-primary" onClick={download}>
          Download Mushaf
        </button>
      </div>
    </dialog>
  );
}
