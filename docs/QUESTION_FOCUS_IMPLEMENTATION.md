# Question focus — implementation record

Status: three-mode refinement implemented and browser-checked locally; explicit
visual approval pending.

## Outcome

The ready and live judging Mushaf can distinguish the exact prepared question
without changing the printed QCF V1 1405H geometry. Complete context lines use
neutral context ink. Only the outside words are dimmed on a mixed start or end
line. The optional Shade presentation adds broad neutral bands behind complete
context-line runs without putting selection-like rectangles around individual
words. The same resolver is used for a single page and for each page in a true
two-page spread.

## Product decisions

- **Retained:** QCF glyphs, 15-line geometry, page navigation, touch hitboxes,
  mistake colour, scoring, history, exports, and existing page-loading behavior.
- **Recomposed:** the already-loaded page words receive exact question,
  boundary, or context presentation states derived from the frozen range;
  consecutive complete context lines can form one non-interactive shade band.
- **Removed:** no Quran content or judging control.
- **Control:** `Question focus` is an Off/Fade/Shade view setting in the
  three-dot Mushaf controls. Fade is the fresh-device default. Shade is an
  explicit stronger presentation, never an independent toggle.
- **Visual semantics:** the exact question stays on untouched paper with full
  QCF ink. Treatment belongs to the surrounding context, so it cannot be read
  as a highlight selecting the question.
- **Failure behavior:** manual, legacy, incompatible, or unverifiable ranges
  leave the whole Mushaf undimmed. Tahqeeq never guesses a Quran boundary.
- **Scope boundary:** marking outside the saved question remains possible.
  Preventing it would change judging behavior and is not part of this visual
  update.

## Data and performance boundary

The feature reads the range already frozen on the prepared or active question
and the one or two Mushaf pages already in memory. It creates no competition
record, database migration, API request, page request, result field, or export
field. Its only persisted value is one normalized device-local mode. V2 device
preferences migrate the former boolean deterministically (`true` to Fade,
`false` to Off) and mirror the closest V1 value for rollback compatibility.

## Release gates

- exact same-line, cross-page, outside-page, and corrupt-boundary tests;
- preference default, migration, write, and unavailable-storage tests;
- full automated test suite and production build;
- browser review in light and dark themes, one page and two pages, with Off,
  Fade, and Shade;
- same-line and cross-page checks confirming that shade bands stop at mixed
  boundary lines rather than covering question words;
- verify that mistake overlays remain fully coloured and page geometry does not
  move;
- commit, push, Sites publish, and live-bundle verification.

## Current verification state

- Range and preference tests cover context-run grouping, V1 migration, invalid
  values, writes, and unavailable storage.
- All 284 automated tests and the production build pass.
- Browser-checked at the available 1280 x 720 review viewport in light and dark
  themes, with one page and two real pages. Off, Fade, and Shade have identical
  page and 15-line geometry and no horizontal overflow.
- Shade formed two complete context runs on page 588 and one complete-page run
  on page 589. The mixed boundary rows stayed word-level, and the marking
  picker still opened above the non-interactive bands.
- A separate larger desktop viewport could not be forced by the in-app browser
  capability in this pass; explicit visual approval remains the release gate.

## Confidence before explicit visual approval

- Practicality: **97%**
- Architecture/data safety: **99%**
- Visual certainty: **88%**
