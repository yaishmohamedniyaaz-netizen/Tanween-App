# Adu & Raagu input and judging-rail layout — research and plan

Status: **proposed, awaiting decisions.** Nothing in this document is implemented yet.
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

## Recommendation

**The score row is the control.** Adu & Raagu keeps exactly one home in the
rail — its row in the scorecard, beside Jalī, Khafī and Faṣāḥa. The row shows
the mark; clicking it opens a mark scale in place; picking a number collapses it
back. The separate impression panel is retired.

Four ways in, all writing the same two ledger events already implemented:

- **Click a mark** on the scale — the ordinary path, one action.
- **Shift-click** for the half mark below, or **drag across** the scale and
  release on the value, reusing the press-drag-release gesture of the letter tray.
- **Keyboard**: arrows by one step, Shift-arrow by a whole mark, `Home` / `End`
  for 0 and full marks, digits to type a mark. This is the ARIA slider contract,
  so it is also the accessible path.
- **Wheel**, only after the control is focused by click or tab — never on hover.

The unmarked state is unchanged: a dashed row reading "Not marked", resolving to
full marks on save, still warned about in the finish dialog.

When an allocation has more than 12 whole marks, the scale shows every second
whole mark as a target and fills the gaps with Shift-click and arrows, so the row
never becomes 41 tiny buttons.

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
| 1 | Rail left by default. Re-check split layout, tray placement near both edges, printed sheet. | `App.tsx`, `global.css` |
| 2 | One home, one control: retire `ImpressionPanel`, grow the scorecard row into the mark scale with click, Shift-click, drag-sweep, full keyboard and focused-only wheel; the note moves into the row. | `ScorePanel`, new `MarkScale`, `App.tsx` |
| 3 | Optional named-deduction mode per competition, reusing the mistake-log rendering so reasons reach the result sheet and statistics. | setup, scoring, result sheet |

Pass 2 changes no stored data: `impression_changed` and
`impression_note_changed` already carry everything, so saved records stay
readable and no migration is needed.

## Decisions needed

1. Primary control: mark scale with scrub layered on, or another candidate after
   trying the prototypes?
2. Named deductions: a second mode worth building, or is picking the mark enough?
3. Is 0.5 the real step Maldivian judges use for voice and melody, or whole marks?
4. Wheel: enable after focus, or leave it out?
