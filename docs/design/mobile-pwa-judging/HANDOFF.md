# Mobile PWA judging — handoff

Design canvas: `tahqeeq-mobile-judging.html` (rebuild with `node build.mjs`, then
re-seed with the `design` skill's `seed-canvas.mjs`).

**Chosen direction: A — Mushaf-first status dock.** B and C are drawn for
comparison and are not the target. D (the four-card bento deck) is dropped.

## What A is

Portrait, installed PWA, active judging session. Desktop and phone landscape
are out of scope and unchanged.

```
59   status bar        reserved; background paints through
55   header            unchanged from today (64 is the proposed alternative)
554  Mushaf page       377 wide at 8px margins, aspect 0.68
94   dock              morphing row 44 + action row 48, fixed height
12   padding
34   home indicator    reserved; background paints through
```

The page selector is **not** a band. It floats in the Mushaf's own centre
marginalia slot (`.page-static-number` is `visibility: hidden` in single-page
mode), exactly as `.mushaf-shared-nav` already does, so it costs no height.
`‹` is next and `›` is previous — the Mushaf reads right to left.

The dock's top row morphs between the criterion strip and a last-action strip
carrying Undo. Both are 44 high, so opening or dismissing it moves nothing.

Criterion chips are stacked (label over number) and never abbreviated. The
strip renders 1–4 cells depending on the judge's assignment.

Chips carry **deductions**, not remaining scores, so the dock's total is not
the sum of the chips. The score sheet keeps the desktop's Deducted + Score
columns unchanged.

The dock's second zone reads `3 mistakes` — the app's own noun for a logged
error, since `mark` already means a score point here. It was briefly a
deduction amount instead; that was rejected as ambiguous against the total
deduction, which includes Adu / Raagu. `History` was considered and rejected
as vaguer still.

Below about 312px of dock width the `Score` label and the strip's timestamp
drop out rather than clip; the numbers, the criterion name and Finish stay.

A marked word paints `var(--c-wash)` with `mix-blend-mode: multiply`
(`screen` in dark), exactly as `.glyph-ink.marked` does. Without the blend the
Faṣāḥa indigo washes out to grey on the page paper and stops reading as a
verdict colour.

## Prerequisites

1. `index.html:5` — add `viewport-fit=cover` to the viewport meta. Without it
   `env(safe-area-inset-*)` returns 0 and none of the safe-area work applies.
2. `.finish-dialog` (`global.css:10653`) — `max-height: calc(100dvh - 32px)`
   with `margin: auto` and no `env()` term. On a phone it will sit under the
   Dynamic Island. Add safe-area padding.
3. `.page-nav-btn` (`global.css:5408`) is 28×28, below the app's own 44px live
   floor (design grammar rule 10). Phone build needs a 44px hit box around the
   28px visible pill.

## Contracts that must not change

Scoring (`computeScores`, `impressionScore`), the mistake ledger, notes state,
the Finish validation in `FinishDialog.tsx`, exports, and the saved device
preferences — `judgeRailSide`, `aduRaaguInputMode`, theme. The deck reads the
same state the desktop rail reads; there is no mobile copy of anything.

`JudgeRoleStrip` (42px, currently above the scorecard in the rail) folds into
the score sheet head as the judge name plus its category swatches. It must not
simply disappear — in a one-judge-per-criterion panel it is how a judge
confirms which criteria are theirs.

## New settings

Two, both in `MoreActionsPopover` beside `judgeRailSide` and
`aduRaaguInputMode`.

`lastMarkStrip` — `on` | `off`. See "The last-action strip" below.

`scoreChipTint` — `off` | `earned` | `always`. Default `earned`: a chip carries
its category wash only once that criterion has lost marks, so the strip starts
monochrome and colours up as the judge works.

Two accessibility constraints on the tinted state: secondary text must be
`--ink-2`, because `--ink-3` on the Jalī wash measures 4.43:1 and misses AA;
and the label may never be the category colour, which fails on its own wash
for every criterion (2.62–4.20:1).

## "later"

Not now. Record these in the later planning documents rather than acting on
them in this pass.

- **Marks on screen.** The desktop shows Deducted and Score side by side and
  that stays as it is for now. Whether carrying both is redundant, and which
  one a compact strip should show, is a question to revisit — not to settle
  inside the mobile work.
- **Adu / Raagu by press-and-hold from the scorecard.** The gesture itself is
  sound: `MarkPicker` is already press-drag-release with snap-to-step, and
  design grammar rule 4 blesses it. The risk is the target — an 89×44 chip
  beside the Finish button, with no visible affordance, against rule 5
  ("nothing is ever set by accident"). If it is ever built it needs its own
  handle inside the chip, not the whole chip.
- **Results screen overhaul**, desktop included. The four-card bento layout
  dropped here may be worth reviving there, where vertical space is free and
  four equal readouts are honest.

## The last-action strip

It replaces the criterion chips for a few seconds after a mark. It is not an
overlay and resizes nothing — both rows are 44 high — but for those seconds
the judge cannot see the per-criterion breakdown. That is its whole cost, and
it buys a one-tap Undo at the moment the judge is most likely to want it.

Two escapes, because the mistake is in the log either way and nothing is lost
by closing it:

- The strip carries its own dismiss (44×44, separated from Undo by a
  hairline so the two are not confused — an accidental dismiss is cheap, an
  accidental Undo is not).
- **`lastMarkStrip`** — a device preference alongside `scoreChipTint`,
  `judgeRailSide` and `aduRaaguInputMode`, to turn it off for good. The
  prototype exposes it as the `lastMark` tweak (`on` / `off`), default `on`.

## Test matrix

- Criterion counts 1, 2, 3, 4 (and the singular "1 mistake") (`one-each` panel preset; Faṣāḥa and Adu / Raagu
  switched off)
- `aduRaaguInputMode` — ruler and stepper
- `judgeRailSide` — left and right
- Light and dark
- 320×568, 360×800, 390×844, 393×852, 430×932
- Adu / Raagu unentered → Finish blocked, deck height unchanged
- Mark → appears in the strip → opens its evidence editor → Undo restores the
  original score
- Desktop 1024×768, 1280×800, 1400×900 unchanged

## Known gap in the prototype only

The app renders the Mushaf with a per-page KFGQPC V1 font from
`static-cdn.tarteel.ai` (`mushafAssets.ts:5`), whose glyphs fill each printed
line exactly. That host is unreachable from the design session, so the canvas
falls back to the app's `hafs.18.woff2`, which is about 1.7× wider for the same
words — the widest line of page 562 needs 552px where the page gives 326. The
words, their order and the marks are real; the line breaks are re-packed to
fit. Nothing in the app changes because of this; it affects only how faithful
the mock page looks.
