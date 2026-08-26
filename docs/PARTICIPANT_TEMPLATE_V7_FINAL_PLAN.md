# Participant template V7 final plan

Status: implemented and technically verified locally; user visual approval pending
Updated: 22 August 2026
Scope: participant-template generation, import compatibility, and the minimum
terminology boundary required before a remote database or full localization

## Outcome

The template should feel like the office participant lists organizers already
use, while remaining safe to sort, filter, import, and translate. V7 replaces
the V6 category-section experiment; it is not an additional visual layer on
top of V6.

## Workbook contract

- Keep one visible `Participants` worksheet and one contiguous native Excel
  table. Do not insert merged headings or blank divider rows inside the data.
- Use these columns in this order:
  `Participant number | Name | Category | Muqarrar start | Phone | Institution`.
  Participant number is present only for supplied numbering. Phone and
  Institution are optional columns.
- The template dialog lists the active competition Categories with checkboxes,
  followed by Phone and Institution column choices and one `Download Excel`
  action. Category definitions continue to belong to Competition setup.
- Prepare four editable rows for each selected Category. The native table must
  grow when the organizer continues typing; the template must not create a
  hundred apparently occupied rows.
- Repeat the exact Category value on every row so filtering, sorting, copy,
  paste, and import remain dependable.
- Mark a change of Category with a medium top border and a slightly stronger
  first-row tint. Within a Category, alternate two restrained tones of the same
  colour for horizontal row tracking.
- Use a compact professional table: muted copper heading, dark text, clear
  slate grid, familiar row height, frozen heading, filters, text-safe number
  and phone columns, and no decorative title block inside the data table.
- Phone and Institution default off for a first-time download. Remember the
  organizer's last explicit choices on that device. Do not add Grade/Class,
  Address, Participant type, or Related employee until Tahqeeq retains and
  governs those fields.
- Keep `Choices`, `Instructions`, and `_Tahqeeq` support sheets. The Category
  and Muqarrar dropdowns are entry aids; Tahqeeq import validation remains
  authoritative.

## Terminology and internationalization contract

`Nubalaa`, `Balaigen`, `Fesheykolhu`, and `Nimeykolhu` are approved Maldivian
Romanized display terms. They are not durable database identifiers.

The application should expose a single terminology registry instead of
hard-coding those strings across components, tests, workbooks, and exports.
Its first reviewed display profile is:

| Meaning | Maldivian Romanized display |
|---|---|
| memorisation discipline | Nubalaa |
| reading-from-Mushaf discipline | Balaigen |
| starting side | Fesheykolhu |
| ending side | Nimeykolhu |

The durable domain concepts should use locale-neutral IDs:

- `memorisation`;
- `mushaf-reading`;
- `starting-side`;
- `ending-side`.

The current values `nubalaa`, `baliagen`, `feshey-kolhu`, and `nimey-kolhu`
are legacy compatibility values. Do not expose them as a new API or remote
database contract. Before Supabase or another shared backend becomes the
source of truth, add an explicit versioned migration from the legacy values to
the neutral IDs. Imports must continue accepting the legacy spellings plus
`Hifz`, `Tarteel`, `Baliagen`, the spaced side labels, and the corrected joined
labels. Exports use the chosen display profile, never the raw stored ID.

Do not create a general `context` or `fix later` folder. Use:

- one typed terminology registry for display strings and aliases;
- one versioned data migration at the persistence boundary;
- this plan for the accepted architecture; and
- `UNDECIDED_DECISIONS.md` only for language or product choices that still
  require a human answer.

This boundary allows an English profile to display `Memorisation` and
`Reading / Tarteel`, and a future reviewed Thaana profile to use Dhivehi script,
without changing participant records, competition rules, rankings, or judging
evidence.

## Retain, recompose, remove

Retain:

- one-sheet participant entry;
- native dropdowns, filters, frozen heading, metadata, and old-template import;
- competition-defined Category values;
- explicit non-Boolean Muqarrar choice.

Recompose:

- V6 reserved Category blocks into one auto-growing table;
- scattered labels into the typed terminology registry;
- the download dialog into Category selection plus two optional columns.

Remove:

- merged Category divider rows inside participant data;
- the 100-row reserved-entry appearance;
- hard-coded `Hifz`, `Baliagen`, and spaced Muqarrar labels from current-facing
  template and app surfaces;
- language-specific identifiers from any new persistence or integration API.

## Migration and verification gates

1. Add neutral IDs and a versioned legacy adapter without mutating immutable
   judging evidence in place.
2. Normalize competition divisions, roster participants, live snapshots,
   saved sessions, result filters, workbook import, and JSON import through the
   same adapter.
3. Prove old local state and V1-V6 workbooks still load with the same category,
   question assignment, score, and placement meaning.
4. Generate and re-import a mixed Nubalaa/Balaigen workbook and a
   Balaigen-only workbook.
5. Verify the native table grows after the fourth row, dropdowns extend, zebra
   shading remains legible, and no prepared blank row becomes a participant.
6. Open both workbooks in desktop Excel and Google Sheets. Verify headings,
   borders, filters, frozen row, validations where supported, text-safe numbers,
   printing, and round-trip import.
7. Run the participant, competition-lifecycle, results, TypeScript, and
   production-build checks before browser review of the template dialog.

## Deliberately unresolved

- Reviewed Thaana and Arabic display terms. Do not invent these translations.
- Whether office competitions need Participant type and Related employee as
  retained, permissioned fields.
- Whether Grade/Class or Address belongs in the participant record at all.

These do not block V7.

## Local verification evidence

- Desktop Excel opened the approval workbook without a repair warning. The
  Participants sheet keeps one frozen copper heading, visible grid borders,
  native filters, four starter rows per selected Category, and restrained
  paired row tones with a clear Category boundary.
- Excel compatibility testing caught and fixed two generator defects before
  release: per-cell validation rules became overlapping ranges after row 9,
  and header notes were serialized after table parts in an XML order desktop
  Excel rejected. V7 now writes one validation range per column and keeps the
  data-table heading free of comments.
- Untouched starter cells are true blanks and Muqarrar validation allows those
  blank scaffolding rows; Tahqeeq still requires Muqarrar start when a named
  participant is imported.
- The template builder was visually checked at 1366 x 768 and 390 x 844. It
  remains within the viewport, has no horizontal overflow, and has no console
  errors. Desktop uses a two-column Category grid; compact uses one column.
- Production build and all 300 automated tests pass. Google Sheets visual and
  round-trip testing remains a release check because it requires sending the
  workbook to an external service.

## Confidence gate

- Practicality: **96%**. Desktop Excel compatibility, browser behavior, and the
  full automated suite are verified; Google Sheets remains a separate release
  check.
- Architecture/data safety: **94%**. Neutral IDs and legacy adapters pass the
  current participant, competition, question, results, and snapshot tests.
- Visual certainty: **92%**. The workbook and builder are visually verified in
  desktop Excel and at desktop and compact browser viewports. User approval and
  Google Sheets review remain before publication.
