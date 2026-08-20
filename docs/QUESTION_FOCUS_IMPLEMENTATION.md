# Question focus — implementation record

Status: four-mode ayah-aware refinement implemented and browser-checked locally.

## Outcome

The ready and live judging Mushaf can distinguish the exact prepared question
without changing the printed QCF V1 1405H geometry. Shade presentations measure
the actual printed bounds of every outside ayah segment instead of combining
unrelated full rows into slabs. If a question starts or ends part-way through a
line, the outside ayah portion on that mixed line receives its own measured
shade while the question words remain untouched. The same resolver is used for
a single page and for each page in a true two-page spread.

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
- **Shade:** every outside ayah segment uses neutral backing with normal ink,
  including outside ayahs sharing a printed line with the question boundary.
  The backing stops at the exact saved question word ID.
- **Shade + fade:** combines the ayah backing with the quieter context ink.
- **Visual semantics:** the exact question stays on untouched paper with full
  QCF ink. Treatment belongs to the surrounding context, so it cannot be read
  as a highlight selecting the question.
- **Tone:** Shade uses one subtle neutral surface token rather than an accent or
  status colour. It is slightly deeper in dark mode so the boundary remains
  legible without competing with Quran ink or mistake colours.
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

- exact same-line, mixed-line, cross-page, outside-page, and corrupt-boundary
  tests;
- preference default, migration, write, and unavailable-storage tests;
- full automated test suite and production build;
- browser review in light and dark themes, one page and two pages, with Off,
  Fade, Shade, and Shade + fade;
- mixed-line and cross-page checks confirming that shade bands include the
  complete outside ayah portion and stop before every question word;
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
- Page 588 forms 22 rendered ayah segments around the question, including the
  mixed start and end rows; page 589 forms 36 rather than one page-sized slab.
  Shade keeps full Quran ink, Shade + fade quiets the same outside words, and
  the non-interactive boxes introduce no horizontal overflow.
- The user explicitly requested direct release for this bounded correction; the
  usual separate visual-approval pause was therefore skipped after the scoped
  1280 x 720 browser checks passed.

## Confidence after local visual verification

- Practicality: **98%**
- Architecture/data safety: **99%**
- Visual certainty: **94%**
