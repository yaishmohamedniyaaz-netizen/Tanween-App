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
the saved result. Results combines the enabled judge sections only after every
required criterion is present. Conflicting sources require an explicit choice,
and the verified workbook contains only current finalized results.

## Results and review

The Results workspace opens on a review queue rather than an analytics
dashboard. It separates participants who need review, are ready to finalize,
or are already finalized; shows the source judge, revision, and criterion score;
and calculates the proposed total through the same scoring path used by final
results. The header badge counts unresolved participants in the active
competition.

Review filters and pagination are independent from the Analysis tab. Analysis
can use either the current competition or all stored competitions without
hiding historical judge records. Sample and official CSV exports remain
separate, and the finalized Excel workbook remains the checked official output.

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

Competition setup can save institution choices plus optional default
Muqarrar start and institution values. New or category-level participant rows
inherit those explicit defaults. The editor can fill only empty fields within
one Category, add another participant in-place, and resolve one repeated
unmatched imported Category for every affected row without fuzzy guessing.

New competitions can assign participant numbers automatically from final row
order (`01–99`, then `001–999`) or preserve supplied competition numbers. The
competition-specific Template V4 provides 100 styled entry rows, native Excel
dropdowns for Category, Muqarrar start, and institution suggestions, and a
hidden compatibility-safe metadata sheet. Template V3, Template V2
Division/Muqarrar, and older seven-column templates remain importable. OCR and
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
src/components/RecordsView.tsx Results review and analysis workspace
src/components/FinalResultsPanel.tsx result-source review and finalization
src/lib/judgingUnits.ts       semantic letter/mark isolation
src/lib/roster.ts             draft validation, paste/import, Template V4
src/lib/resultsReview.ts      result review states, filtering, and pagination
src/lib/qcfFont.ts            page-specific QCF font loader and preloader
src/state/store.tsx           scoring and persistence
src/styles/global.css         responsive reader and judging UI
```

## Licensing

The Mushaf layout, Quran text, and page-specific glyph fonts originate from the
King Fahd Glorious Qur'an Printing Complex resources exposed through QUL and Quran
Foundation services. Distribution must comply with the applicable KFGQPC, QUL, and
Quran Foundation terms. The application code is separate.
