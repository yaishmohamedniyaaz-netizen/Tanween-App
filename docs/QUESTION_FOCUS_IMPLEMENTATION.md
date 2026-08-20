# Question focus — implementation record

Status: four-mode ayah-aware refinement implemented and browser-checked locally; explicit
visual approval pending.

## Outcome

The ready and live judging Mushaf can distinguish the exact prepared question
without changing the printed QCF V1 1405H geometry. Shade presentations measure
the actual printed bounds of each outside ayah segment instead of combining
unrelated full rows into slabs. If a question starts or ends part-way through a
line, the outside words on that mixed line fade without receiving a shade box.
The same resolver is used for a single page and for each page in a true two-page
spread.

## Product decisions

- **Retained:** QCF glyphs, 15-line geometry, page navigation, touch hitboxes,
  mistake colour, scoring, history, exports, and existing page-loading behavior.
- **Recomposed:** the already-loaded page words receive exact question,
  boundary, or context presentation states derived from the frozen range;
  complete context lines expose ayah segments which are measured into separate,
  non-interactive shade boxes without changing word spacing.
- **Removed:** no Quran content or judging control.
- **Control:** `Question focus` is an Off/Fade/Shade/Shade + fade view setting
  in the three-dot Mushaf controls. Fade remains the fresh-device default.
- **Fade:** outside context uses quieter ink and no background.
- **Shade:** complete outside ayah segments use neutral backing with normal ink;
  outside words on a mixed boundary line still fade because a partial shade box
  could look like selected question text.
- **Shade + fade:** combines the ayah backing with the quieter context ink.
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
field. Its only persisted value is one normalized device-local mode. V3 device
preferences migrate the former V2 `Shade` to `Shade + fade`, preserving its
appearance. The earlier boolean still migrates deterministically (`true` to
Fade, `false` to Off), and V2/V1 mirrors remain for rollback compatibility.

## Release gates

- exact same-line, cross-page, outside-page, and corrupt-boundary tests;
- preference default, migration, write, and unavailable-storage tests;
- full automated test suite and production build;
- browser review in light and dark themes, one page and two pages, with Off,
  Fade, Shade, and Shade + fade;
- same-line and cross-page checks confirming that shade bands stop at mixed
  boundary lines rather than covering question words;
- verify that mistake overlays remain fully coloured and page geometry does not
  move;
- commit, push, Sites publish, and live-bundle verification.

## Current verification state

- Range and preference tests cover ayah segmentation, mixed-line exclusion, V1
  and V2 migration, invalid values, writes, and unavailable storage.
- All 285 automated tests and the production build pass.
- Browser-checked at the available 1280 x 720 review viewport in light and dark
  themes, with one page and two real pages. Off and Shade + fade have identical
  page and 15-line geometry and no horizontal overflow.
- Page 588 forms 19 ayah segments around the question; page 589 forms 36 rather
  than one page-sized slab. The mixed start/end rows stay fade-only, and the
  marking picker still opens above the non-interactive boxes.
- A separate larger desktop viewport could not be forced by the in-app browser
  capability in this pass; explicit visual approval remains the release gate.

## Confidence before explicit visual approval

- Practicality: **96%**
- Architecture/data safety: **99%**
- Visual certainty: **91%**
