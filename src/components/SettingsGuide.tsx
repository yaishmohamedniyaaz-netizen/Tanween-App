import { useEffect, useLayoutEffect, useRef, useState } from "react";

export function SettingsGuide({ onDismiss }: { onDismiss: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState<1 | 2>(1);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const dismiss = () => {
    if (dialogRef.current?.open) dialogRef.current.close();
    onDismiss();
  };

  return (
    <dialog
      ref={dialogRef}
      className="settings-guide"
      aria-labelledby="settings-guide-title"
      aria-describedby="settings-guide-description"
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
    >
      <div className="settings-guide-progress" aria-label={`Step ${step} of 2`}>
        <span>Getting started</span>
        <span className="t-num">{step} / 2</span>
      </div>

      {step === 1 ? (
        <div className="settings-guide-copy">
          <h2 id="settings-guide-title" ref={headingRef} tabIndex={-1}>
            Your view, saved here
          </h2>
          <p id="settings-guide-description">
            Theme, Mushaf layout, scale, and panel position save in this browser.
            They change your view, not the competition rules.
          </p>
        </div>
      ) : (
        <div className="settings-guide-copy">
          <h2 id="settings-guide-title" ref={headingRef} tabIndex={-1}>
            Keep a backup of competition data
          </h2>
          <p id="settings-guide-description">
            Competition data is currently stored in this browser. Download a
            backup before clearing site data or moving to another browser.
          </p>
        </div>
      )}

      <div className="settings-guide-actions">
        {step === 1 ? (
          <button type="button" className="btn-ghost" onClick={dismiss}>
            Skip
          </button>
        ) : (
          <button type="button" className="btn-ghost" onClick={() => setStep(1)}>
            Back
          </button>
        )}
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            if (step === 1) setStep(2);
            else dismiss();
          }}
        >
          {step === 1 ? "Next" : "Done"}
        </button>
      </div>
    </dialog>
  );
}
