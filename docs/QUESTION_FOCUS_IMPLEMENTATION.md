# Question focus — implementation record

Status: implementation-ready and browser-verified.

## Outcome

The ready and live judging Mushaf can distinguish the exact prepared question
without changing the printed QCF V1 1405H geometry. Complete context lines use
neutral context ink. Only the outside words are dimmed on a mixed start or end
line. The same resolver is used for a single page and for each page in a true
two-page spread.

## Product decisions

- **Retained:** QCF glyphs, 15-line geometry, page navigation, touch hitboxes,
  mistake colour, scoring, history, exports, and existing page-loading behavior.
- **Recomposed:** the already-loaded page words receive exact question,
  boundary, or context presentation states derived from the frozen range.
- **Removed:** no Quran content or judging control.
- **Control:** `Question focus` is an On/Off view setting in the three-dot
  Mushaf controls. It defaults on and persists as a device preference.
- **Failure behavior:** manual, legacy, incompatible, or unverifiable ranges
  leave the whole Mushaf undimmed. Tahqeeq never guesses a Quran boundary.
- **Scope boundary:** marking outside the saved question remains possible.
  Preventing it would change judging behavior and is not part of this visual
  update.

## Data and performance boundary

The feature reads the range already frozen on the prepared or active question
and the one or two Mushaf pages already in memory. It creates no competition
record, database migration, API request, page request, result field, or export
field. Its only new persisted value is one normalized device-local boolean.

## Release gates

- exact same-line, cross-page, outside-page, and corrupt-boundary tests;
- preference default, migration, write, and unavailable-storage tests;
- full automated test suite and production build;
- browser review in light and dark themes, one page and two pages, with focus
  both on and off;
- verify that mistake overlays remain fully coloured and page geometry does not
  move;
- commit, push, Sites publish, and live-bundle verification.

## Browser verification

- One-page and true two-page spreads verified in light and dark themes.
- The On/Off control was exercised and the default On state restored.
- At 1024 × 768, focus On and Off produced identical Mushaf shell and spread
  geometry; the document had no horizontal overflow.
- Context lines, mixed boundary lines, and outside boundary words were present
  only while focus was On.
- No browser console errors or warnings were reported.

## Confidence after browser verification

- Practicality: **98%**
- Architecture/data safety: **99%**
- Visual certainty: **94%**
