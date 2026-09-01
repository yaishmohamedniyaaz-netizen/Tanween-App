import {
  type ReactNode,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export function CompactTextEditor({
  title,
  label,
  value,
  placeholder,
  onChange,
  triggerClassName,
  triggerContent,
  triggerLabel,
  presentation = "dialog",
}: {
  title: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  triggerClassName: string;
  triggerContent: ReactNode;
  triggerLabel: string;
  presentation?: "dialog" | "inline";
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const textareaId = useId();

  useLayoutEffect(() => {
    if (!open) return;
    if (presentation === "inline") {
      textareaRef.current?.focus();
      const scrollFrame = window.requestAnimationFrame(() => {
        textareaRef.current?.scrollIntoView({ block: "nearest" });
      });
      return () => window.cancelAnimationFrame(scrollFrame);
    }
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    textareaRef.current?.focus({ preventScroll: true });
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open, presentation]);

  const close = () => {
    if (presentation === "dialog") dialogRef.current?.close();
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      className={triggerClassName}
      aria-label={triggerLabel}
      aria-haspopup={presentation === "dialog" ? "dialog" : undefined}
      aria-controls={presentation === "inline" ? textareaId : undefined}
      aria-expanded={open}
      onClick={() => setOpen(true)}
    >
      {triggerContent}
    </button>
  );

  if (presentation === "inline") {
    return (
      <div className={`compact-text-inline ${open ? "is-open" : ""}`}>
        {trigger}
        {open && (
          <div className="compact-text-inline-editor">
            <textarea
              id={textareaId}
              ref={textareaRef}
              value={value}
              placeholder={placeholder}
              aria-label={label}
              rows={3}
              onKeyDown={(event) => {
                if (event.key === "Escape") close();
              }}
              onChange={(event) => onChange(event.target.value)}
            />
            <button type="button" className="compact-text-inline-done" onClick={close}>
              Done
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {trigger}
      {open && (
        <dialog
          ref={dialogRef}
          className="compact-text-dialog"
          aria-labelledby={titleId}
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
        >
          <div className="compact-text-dialog-head">
            <h2 id={titleId}>{title}</h2>
            <button type="button" onClick={close}>Done</button>
          </div>
          <textarea
            ref={textareaRef}
            value={value}
            placeholder={placeholder}
            aria-label={label}
            rows={3}
            onChange={(event) => onChange(event.target.value)}
          />
        </dialog>
      )}
    </>
  );
}
