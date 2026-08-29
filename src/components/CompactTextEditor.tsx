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
}: {
  title: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  triggerClassName: string;
  triggerContent: ReactNode;
  triggerLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();

  useLayoutEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    textareaRef.current?.focus({ preventScroll: true });
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open]);

  const close = () => {
    dialogRef.current?.close();
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {triggerContent}
      </button>
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
