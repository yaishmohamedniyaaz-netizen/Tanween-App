# Tahqeeq

Tahqeeq is a web app for judging Quran recitation competitions. A judge marks an
exact letter within a kalimah, assigns a mistake category, and gets a transparent,
reviewable score and mistake log.

## Run it

```bash
npm install
npm run data
npm run dev
```

`npm run build` creates the production bundle in `dist/`.

## Mushaf rendering

The reader uses the complete 604-page KFGQPC V1 1405H Madani Mushaf layout. Each
page is rendered with its matching QPC V1 page font and the exact QUL V1 glyph
stream. The page geometry is fixed: changing the viewer zoom scales the composed
page instead of reflowing its ayah lines.

The generated files in `public/pages/` contain two complementary representations:

- the page-specific QCF glyph, used for the faithful connected-script rendering;
- the semantic Uthmani word text, used to build stable judging units and labels.

Surah headings, basmalahs, centered short-surah lines, ayah-marker glyphs, and line
numbers come from the QUL KFGQPC V1 Mushaf layout rather than being inferred from
browser wrapping.

## Kalimah and letter selection

The source page has one hit target per visible kalimah. Holding or tapping a word
selects the whole source word and opens the connected letter rail. The judge then
chooses the exact letter or mark in that rail before committing Laḥn Jalī, Laḥn
Khafī, or Faṣāḥa.

This separation is intentional: the authoritative page glyph remains visually
solid and cannot be broken apart by browser text measurement, while the semantic
rail can still isolate Allah forms, hamzah combinations, small letters, and other
judging units reliably. Stable word IDs preserve existing saved marks.

## Data generation

`scripts/build-data.mjs` rebuilds all 604 page files from Quran Foundation's
semantic word data and the paired QUL V1 layout and word-glyph resources. The
generator aligns the actual V1 glyph stream rather than inheriting V2 page or line
boundaries. Matching QPC V1 page fonts are loaded on demand and adjacent page
data/fonts are prefetched.

## Scoring

The three mistake categories have configurable allocations and deduction steps.
Each committed pinpoint is recorded in the mistake log, can be adjusted or undone,
and persists locally. Undoing a mark keeps it in the judge-readable history, and
the score is rebuilt from that history after a reload. Finishing a reciter saves a
protected result; reopening it for correction requires a recorded reason. Printing
produces a result sheet, and the next reciter starts with a clean active record.

## Judge assignments

Competition setup can assign Jali, Khafi, and Fasaha to one, two, or three
judges and select which judge is using the current device. The score panel and
letter tray show only that judge's categories. A one-category judge can release
directly on the exact letter during the hold gesture, while the tap path keeps a
visible confirmation.

Every reciter freezes the judge seat, assigned categories, and score rules in
the saved result. These are judge-section results; this version deliberately
does not combine separate devices into an official competition total.

## Participant roster onboarding

Competition setup opens a dedicated participant-list editor for manual entry,
Excel/Google Sheets paste, or `.xlsx`, `.xls`, and `.csv` upload. All sources
become one device-local, recoverable draft. Invalid rows stay visible with
field-level guidance and the applied roster changes only after a final
comparison.

Participant-facing groups are called Categories throughout setup, question
preparation, roster editing, and competition-day selection. The editor groups
rows into accessible collapsible Category sections and uses a labelled Feshey
kolhu / Nimey kolhu control for Muqarrar start. These remain enum values rather
than ambiguous spreadsheet or storage Booleans.

New competitions can assign participant numbers automatically from final row
order (`01–99`, then `001–999`) or preserve supplied competition numbers. The
competition-specific Template V3 includes Participants, Choices, and
Instructions sheets with Category and Muqarrar start headings. Template V2
Division/Muqarrar and older seven-column templates remain importable. OCR and
photo extraction are intentionally outside this release.

See [`docs/ROSTER_ONBOARDING_V2.md`](docs/ROSTER_ONBOARDING_V2.md) for the UI,
data-safety, spreadsheet, and validation contracts.

## Project structure

```text
public/pages/                 generated 604-page Mushaf dataset
scripts/build-data.mjs        authoritative page-data generator
scripts/solid-mushaf.test.mjs full-dataset and architecture audit
src/components/Mushaf.tsx     fixed page renderer and word interaction
src/components/DragMenu.tsx   connected exact-letter rail and category gesture
src/components/ParticipantRosterEditor.tsx recoverable roster preparation UI
src/lib/judgingUnits.ts       semantic letter/mark isolation
src/lib/roster.ts             draft validation, paste/import, Template V3
src/lib/qcfFont.ts            page-specific QCF font loader and preloader
src/state/store.tsx           scoring and persistence
src/styles/global.css         responsive reader and judging UI
```

## Licensing

The Mushaf layout, Quran text, and page-specific glyph fonts originate from the
King Fahd Glorious Qur'an Printing Complex resources exposed through QUL and Quran
Foundation services. Distribution must comply with the applicable KFGQPC, QUL, and
Quran Foundation terms. The application code is separate.
