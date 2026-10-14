import { Icon } from "./Icon";

/** Inline correction control, separate from the disclosure header. */
export function MistakeAmount({ amount, onChange }: { amount: number; onChange: (amount: number) => void }) {
  return (
    <div className="log-adjust" role="group" aria-label="Deduction amount">
      <button type="button" className="step-btn" aria-label="decrease deduction" onClick={() => onChange(amount - 0.5)}>
        <Icon name="minus" size={12} />
      </button>
      <span className="step-val t-num" aria-live="polite">−{amount}</span>
      <button type="button" className="step-btn" aria-label="increase deduction" onClick={() => onChange(amount + 0.5)}>
        <Icon name="plus" size={12} />
      </button>
    </div>
  );
}
