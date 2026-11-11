import { CATEGORY_BY_ID } from "../config";
import type { CategoryId } from "../types";
import type { IslandLook, MarkingPreferences } from "../lib/markingPreferences";

interface Choice<T> {
  value: T;
  label: string;
}

function Options<T extends string | number | boolean>({ legend, value, choices, onChange, note }: {
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
  "criterion-first": "Choose a criterion, then tap the word and the letter. After the mark nothing is chosen.",
  "drag-hold": "Drag from a criterion onto the word, slide to the letter and lift. Lift on the word to keep the tray open.",
  "word-first": "No island. Tap the word, then the letter and criterion in the tray.",
};

/** Test switches for the island's look; one set will be kept. */
function LookSettings({ value, onChange }: { value: IslandLook; onChange: (patch: Partial<IslandLook>) => void }) {
  return (
    <details className="marking-settings-group" open>
      <summary>Look (test switches)</summary>
      <div className="marking-settings">
        <Options legend="Where you choose the criterion" value={value.place} onChange={(place) => onChange({ place })}
          note={value.place === "scorecard" ? "Tap a row of the scorecard." : "Buttons beside the pages, centred."}
          choices={[{ value: "scorecard", label: "Scorecard" }, { value: "island", label: "Island" }]} />
        <Options legend="Chosen button" value={value.chosen} onChange={(chosen) => onChange({ chosen })}
          choices={[{ value: "solid", label: "Solid" }, { value: "soft", label: "Soft + edge" }]} />
        <Options legend="Khafi colour" value={value.khafi} onChange={(khafi) => onChange({ khafi })}
          note={value.khafi === "current" ? "Current #d58e3a. White text on it measures 2.7:1 (4.5 needed)." : "Deeper #a16300. White text 4.9:1."}
          choices={[{ value: "current", label: "Current" }, { value: "deep", label: "Deeper" }]} />
        {value.place === "island" && <>
        <Options legend="Buttons at rest" value={value.rest} onChange={(rest) => onChange({ rest })}
          choices={[{ value: "paper", label: "Paper" }, { value: "tinted", label: "Tinted" }]} />
        <Options legend="Shape" value={value.shape} onChange={(shape) => onChange({ shape })}
          choices={[{ value: "squares", label: "Squares" }, { value: "rows", label: "Rows" }]} />
        <Options legend="Corners" value={value.radius} onChange={(radius) => onChange({ radius })}
          choices={[{ value: 12, label: "12" }, { value: 16, label: "16" }, { value: 20, label: "20" }]} />
        <Options legend="Gap" value={value.gap} onChange={(gap) => onChange({ gap })}
          choices={[{ value: 8, label: "8" }, { value: 12, label: "12" }]} />
        </>}
        <Options legend="Mushaf frame" value={value.frame} onChange={(frame) => onChange({ frame })}
          choices={[{ value: "strong", label: "3px" }, { value: "thin", label: "2px" }, { value: "off", label: "Off" }]} />
        <Options legend="Keyboard focus ring" value={value.focus} onChange={(focus) => onChange({ focus })}
          note="Press Tab to see it. The app's blue is the same colour as Fasaha."
          choices={[{ value: "neutral", label: "Neutral" }, { value: "blue", label: "Blue" }]} />
      </div>
    </details>
  );
}

/** Marking choices for this device: criterion island, keys and pen. */
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
      <Options legend="Page drawing" value={value.pageDrawing} onChange={(pageDrawing) => onChange({ pageDrawing })}
        note={value.pageDrawing === "digitalkhatt"
          ? "Pages drawn with the DigitalKhatt old Madina font. A marked letter is coloured itself. Surah headers come from the print."
          : "The scanned 1405 print. Marks show as a word highlight and underlines."}
        choices={[{ value: "print", label: "Print" }, { value: "digitalkhatt", label: "DigitalKhatt" }]} />
      {value.pageDrawing === "print" && <Options legend="Basmala at the start of a surah" value={value.basmala}
        onChange={(basmala) => onChange({ basmala })}
        note={value.basmala === "regular"
          ? "Al-Fatiha 1:1 from the same print, in place of the stretched one. Easier to see each letter."
          : "As printed in the Mushaf, with the long stretched line."}
        choices={[{ value: "regular", label: "Regular" }, { value: "printed", label: "Printed" }]} />}
      <Options legend="How you mark" value={value.order} onChange={(order) => onChange({ order })}
        note={ORDER_NOTE[value.order]}
        choices={[
          { value: "criterion-first", label: "Criterion first" },
          { value: "drag-hold", label: "Drag and hold" },
          { value: "word-first", label: "Word first" },
        ]} />
      {bar && <LookSettings value={value.look} onChange={(patch) => onChange({ look: { ...value.look, ...patch } })} />}
      {value.order === "criterion-first" && <>
        <Options legend="Hold to keep" value={value.holdToKeep} onChange={(holdToKeep) => onChange({ holdToKeep })}
          note="After one mark the criterion turns off. Hold it (or its key) to mark several letters; it turns off when you let go."
          choices={[{ value: true, label: "On" }, { value: false, label: "Off" }]} />
        <Options legend="Keys 1 · 2 · 3" value={value.keys} onChange={(keys) => onChange({ keys })}
          note="Each number presses the criterion with that number."
          choices={[{ value: true, label: "On" }, { value: false, label: "Off" }]} />
      </>}
      {bar && <>
        <Options legend="Criteria in the letter tray" value={value.trayCriteria} onChange={(trayCriteria) => onChange({ trayCriteria })}
          note={value.trayCriteria ? "Criteria show on the island and in the tray." : "The tray shows letters only."}
          choices={[{ value: false, label: "Off" }, { value: true, label: "On" }]} />
        {value.look.place === "island" && <>
        <Options legend="Island side" value={value.barSide} onChange={(barSide) => onChange({ barSide })}
          choices={[{ value: "auto", label: "Away from scorecard" }, { value: "left", label: "Left" }, { value: "right", label: "Right" }]} />
        <Options legend="Island size" value={value.barSize} onChange={(barSize) => onChange({ barSize })}
          choices={[{ value: "standard", label: "Standard" }, { value: "large", label: "Large" }]} />
        </>}
      </>}
      {value.pageDrawing === "print" && <Options legend="Underlines on words you have not approved" value={value.guessedUnderlines}
        onChange={(guessedUnderlines) => onChange({ guessedUnderlines })}
        note={{
          off: "Only words you approved get an underline; others keep the word highlight.",
          high: "Adds bars on the 68,599 words that passed the automatic checks. In a test of 300 of them, 283 were fully right.",
          short: "Checked words plus 8,660 words that failed a check, with a short bar in the middle of the letter. Failed words are more often wrong.",
          full: "Checked words plus 8,660 words that failed a check, with the full bar. Failed words are more often wrong.",
        }[value.guessedUnderlines]}
        choices={[{ value: "off", label: "Off" }, { value: "high", label: "Checked words" }, { value: "short", label: "All, short" }, { value: "full", label: "All, full" }]} />}
      <Options legend="Pen tap and double tap" value={value.penDoubleTap} onChange={(penDoubleTap) => onChange({ penDoubleTap })}
        note={`With a pen, in the letter tray: tap a letter = ${first}, double tap = ${second}.`}
        choices={[{ value: true, label: "On" }, { value: false, label: "Off" }]} />
      <Options legend="Pen only" value={value.penOnly} onChange={(penOnly) => onChange({ penOnly })}
        note="Fingers and palm cannot mark the page. The island still works with a finger."
        choices={[{ value: true, label: "On" }, { value: false, label: "Off" }]} />
    </div>
  );
}
