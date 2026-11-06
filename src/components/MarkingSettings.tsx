import { CATEGORY_BY_ID } from "../config";
import type { CategoryId } from "../types";
import type { MarkingPreferences } from "../lib/markingPreferences";

interface Choice<T> {
  value: T;
  label: string;
}

function Options<T extends string | boolean>({ legend, value, choices, onChange, note }: {
  legend: string;
  value: T;
  choices: Choice<T>[];
  onChange: (value: T) => void;
  note?: string;
}) {
  return (
    <fieldset className="selector-display-control marking-option">
      <legend>{legend}</legend>
      <div className="mushaf-view-options" role="radiogroup" aria-label={legend}>
        {choices.map((choice) => (
          <button key={String(choice.value)} type="button" role="radio"
            aria-checked={value === choice.value}
            className={value === choice.value ? "is-active" : ""}
            onClick={() => onChange(choice.value)}>
            {choice.label}
          </button>
        ))}
      </div>
      {note && <small>{note}</small>}
    </fieldset>
  );
}

const ORDER_NOTE: Record<MarkingPreferences["order"], string> = {
  both: "Choose a criterion on the bar first, or tap the word first as before.",
  "criterion-first": "Choose a criterion on the bar before tapping a word.",
  "word-first": "No bar. Tap the word, then the letter and criterion in the tray.",
};

/** Marking choices for this device: criterion bar, keys and pen. */
export function MarkingSettings({ value, onChange, penCategories }: {
  value: MarkingPreferences;
  onChange: (patch: Partial<MarkingPreferences>) => void;
  /** The judge's criteria in bar order; names the pen tap and double tap. */
  penCategories?: readonly CategoryId[];
}) {
  const first = penCategories?.[0] ? CATEGORY_BY_ID[penCategories[0]].short : "first criterion";
  const second = penCategories?.[1] ? CATEGORY_BY_ID[penCategories[1]].short : "second criterion";
  const bar = value.order !== "word-first";
  return (
    <div className="marking-settings">
      <Options legend="Order" value={value.order} onChange={(order) => onChange({ order })}
        note={ORDER_NOTE[value.order]}
        choices={[
          { value: "both", label: "Both" },
          { value: "criterion-first", label: "Criterion first" },
          { value: "word-first", label: "Word first" },
        ]} />
      {bar && <>
        <Options legend="Tap on the bar" value={value.barTap} onChange={(barTap) => onChange({ barTap })}
          note={value.barTap === "next" ? "A tapped criterion is used for the next mark, then turns off." : "A tapped criterion stays on until you tap it again."}
          choices={[{ value: "next", label: "Next mark" }, { value: "sticky", label: "Stays on" }]} />
        <Options legend="Hold to keep" value={value.holdToKeep} onChange={(holdToKeep) => onChange({ holdToKeep })}
          note="Hold a bar button or key: the criterion stays on only while you hold it."
          choices={[{ value: true, label: "On" }, { value: false, label: "Off" }]} />
        <Options legend="Keys 1 · 2 · 3" value={value.keys} onChange={(keys) => onChange({ keys })}
          note="Each number presses the bar button with that number."
          choices={[{ value: true, label: "On" }, { value: false, label: "Off" }]} />
        <Options legend="Criteria in the letter tray" value={value.trayCriteria} onChange={(trayCriteria) => onChange({ trayCriteria })}
          note={value.trayCriteria ? "Criteria show on the bar and in the tray." : "The tray shows letters only; choose the criterion on the bar."}
          choices={[{ value: false, label: "Off" }, { value: true, label: "On" }]} />
        <Options legend="Bar side" value={value.barSide} onChange={(barSide) => onChange({ barSide })}
          choices={[{ value: "auto", label: "Away from scorecard" }, { value: "left", label: "Left" }, { value: "right", label: "Right" }]} />
        <Options legend="Bar size" value={value.barSize} onChange={(barSize) => onChange({ barSize })}
          choices={[{ value: "standard", label: "Standard" }, { value: "large", label: "Large" }]} />
      </>}
      <Options legend="Pen tap and double tap" value={value.penDoubleTap} onChange={(penDoubleTap) => onChange({ penDoubleTap })}
        note={`With a pen, in the letter tray: tap a letter = ${first}, double tap = ${second}.`}
        choices={[{ value: true, label: "On" }, { value: false, label: "Off" }]} />
      <Options legend="Pen only" value={value.penOnly} onChange={(penOnly) => onChange({ penOnly })}
        note="Fingers and palm cannot mark the page. The bar still works with a finger."
        choices={[{ value: true, label: "On" }, { value: false, label: "Off" }]} />
    </div>
  );
}
