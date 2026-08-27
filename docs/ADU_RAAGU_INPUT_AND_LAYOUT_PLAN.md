# Adu & Raagu input and judging-rail layout — research and plan

Status: **decided and implemented (2026-08-13).** The chosen control is the
vertical scrub with a click-to-open mark list, described under "Decision" below.
The research and the rejected candidates are kept as the record of why.
Interactive version with live prototypes of every candidate control:
[`adu-raagu-input-study.html`](./adu-raagu-input-study.html).

## The two problems

1. **Adu & Raagu appears twice in the judging rail.** It is a row in the score
   panel and a separate marking panel below the mistake log. The row reports,
   the panel controls, and the judge has to work out which one to touch. The
   pinpointed criteria have no such split: the Mushaf page is the control and
   the row is the readout.
2. **A mark costs one click per half mark.** With a 10-mark allocation and a
   0.5 step there are 21 plausible values. The stepper reaches 7.5 in five
   presses and 6 in eight. That is a control for correcting a value, not for
   entering one, and a judge enters this value once while a reciter waits.

Design target: **a considered mark costs one deliberate action**, with a cheap
second action to refine it, and nothing is ever set by accident.

## What the research found

| Finding | Consequence for Tahqeeq |
| --- | --- |
| For a small set of known values, discrete button scales beat sliders on speed, error rate and data quality; sliders are also governed by the steering law | The primary control is enumerated, not continuous |
| Real judging systems are discrete: figure-skating GOE is a fixed −5…+5 per element; gymnastics execution panels start at 10.0 and subtract named deductions, with tablet apps showing a running score | An enumerated scale is the domain convention, not a compromise |
| Apple caps segmented controls at 5 segments (7 on iPad); Material at 2–4 | 11 whole marks is not a segmented control; the right reference is the numeric 0–10 rating row |
| Photoshop, Blender and Figma all scrub numbers by press-drag, with a precision modifier and click-to-type | Tahqeeq already speaks press-drag-release; scrubbing is a natural second layer |
| Firefox disabled wheel adjustment on number inputs because users changed values while scrolling; Chrome and Safari only allow it when focused | Wheel must never act on hover; allowed only after deliberate focus, or not at all |

Sources are listed in the interactive study.

## Decision — a boxed mark, and a bar on the press

The mark sits in the score row inside a **box**, centred, in the same column as
every other criterion's score. Research on input affordances is unambiguous: a
full border is what tells someone a value can be changed, and plain text is what
tells them it cannot. The other rows stay plain, so the one editable number in
the rail identifies itself without a label.

Pressing it drops a **horizontal mark bar** carrying every awardable mark:

- **Press and drag along the bar**, release on the mark you want. The reading
  follows the pointer while the press is held, so a mark that lands wrong is
  corrected without lifting — the same press-drag-release gesture the letter
  tray teaches.
- **Press without dragging** and the bar stays open to pick from.
- Every half mark is a tick and whole marks are taller. Only zero, every fifth
  mark and the allocation maximum are labelled, while the thumb callout shows
  the exact live value, so both 10 and 20 marks read as rulers rather than rows
  of crowded numbers.
- Nothing is committed until the press ends: a whole gesture writes exactly one
  ledger event, so the audit history stays readable.
- **Keyboard**: arrows by one step, Shift-arrow by five, `Home` for full marks,
  `End` for zero, digits to type a mark, `Enter` or `Space` for the bar.
- **Wheel** adjusts only when the control is already focused, never on hover.
- **A whole-recitation criterion is capped at 20 marks**, in the judging control
  and in setup, because that is the most this criterion is given in practice.
  Stored allocations above the cap are trimmed on load.

**One home either way.** Adu & Raagu keeps exactly one place in the rail — its
row in the scorecard, beside Jalī, Khafī and Faṣāḥa, with the reason note under
it. The separate impression panel is retired. The unmarked state is unchanged: a
row reading "Not marked yet", resolving to full marks on save, still warned about
in the finish dialog.

The rejected candidates — stepper, a row of mark buttons, a snapping track, and
named deductions — are in the interactive study with the reasoning and the click
costs. Named deductions remain a possible second mode; see "Still open".

## Judging rail to the left by default

`judgeRailSide` already exists with a per-device preference; this changes the
default only, and existing choices are untouched.

- The Mushaf is right-to-left: a reader's eye starts at the page's right edge. A
  right-hand rail puts app chrome where the recitation begins.
- Persistent chrome sits left by convention in desktop software, and vertical
  lists on the left are scanned with fewer fixations.
- The letter tray opens over the page; left-hand chrome keeps the evidence and
  the readout from competing for the same region.

## Build plan

| Pass | Work | Touches |
| --- | --- | --- |
| 1 | **Done.** Rail left by default, existing per-device choices untouched. | `App.tsx` |
| 2 | **Done.** `ImpressionPanel` retired; the scorecard row carries the mark picker and the reason. | `ScorePanel`, `MarkPicker` |
| 3 | Optional named-deduction mode per competition, reusing the mistake-log rendering so reasons reach the result sheet and statistics. | setup, scoring, result sheet |

Pass 2 changes no stored data: `impression_changed` and
`impression_note_changed` already carry everything, so saved records stay
readable and no migration is needed.

## Also decided in this pass

- **One letter carries one mark.** Marking a letter that already has a mark
  replaces it: the earlier mark is undone, leaves the score, and stays in the
  history where it can still be restored. Re-marking with the same criterion
  changes nothing rather than stacking a duplicate.
- **Mistake details name the kalimah**, with its surah and ayah beside it. The
  letter ordinal stays in the stored evidence and the printed sheet; it is no
  longer in the judge's reading view.
- The criterion is written **Adu / Raagu** everywhere, including exports.

The four bar formats compared at 20 marks — ruler, whole-mark chips, coarse then
fine, and the dropdown list it replaced — are live in the interactive study with
their widths, per-step distances and weaknesses.

## Still open

1. Named deductions: a second mode worth building, or is picking the mark enough?
2. Is 0.5 the real step Maldivian judges use for voice and melody, or whole marks?
   The step is per-competition either way, so this only sets the default.
3. Should a later refinement add an evaluative colour range? The current ruler
   deliberately keeps the single Adu / Raagu colour until the meaning and
   colour-accessibility consequences are agreed.
