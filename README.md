# Tanween

Tanween (formerly Tahqeeq) is a web app for judging Quran recitation competitions.
A judge marks an exact letter within a kalimah, assigns a mistake category, and
gets a transparent, reviewable score and mistake log.

The workflow also includes competition and question preparation, recoverable
participant rosters, local recording and replay, participant evidence review,
and finalized result exports. Human judges make the official decisions.

> **Source status:** the repository is now **Tanween-App**, but `main` and the
> Tanween release branch are not yet synchronized. The rebrand and later
> Results/replay changes are on `codex/tanween-results-release`. See
> [current status](docs/CURRENT_STATUS.md) for checked source references.

## Run it

Use Node.js 22.18+ in the Node 22 line and npm. Generated Quran assets are checked
in; regenerating them is not part of normal setup. To inspect the newer Tanween
release source, switch to `codex/tanween-results-release` before installing.

```bash
git clone https://github.com/yaishmohamedniyaaz-netizen/Tanween-App.git
cd Tanween-App
npm ci
npm run dev
```

Open Vite's local URL, normally `http://localhost:5173`. In Windows PowerShell,
use `npm.cmd` if execution policy blocks `npm`.

`npm run build` places browser assets in `dist/client/` and the Worker entry in
`dist/server/`. Preview static assets with `npm run preview -- --outDir dist/client`;
Worker routes require the hosting runtime. See [development](docs/DEVELOPMENT.md)
for validation commands and data-generation prerequisites.

## Mushaf rendering

The reader uses the complete 604-page KFGQPC V1 1405H Madani Mushaf layout.
Fixed page artwork is now the default, with registered word geometry and a
semantic text layer for judging. Single-page and desktop two-page views preserve
the page composition instead of reflowing ayah lines. The legacy QCF renderer
remains available through `fixedMushaf=0` for rollback checks.

The generated files in `public/pages/` contain two complementary representations:

- the page-specific QCF glyph, used for the faithful connected-script rendering;
- the semantic Uthmani word text, used to build stable judging units and labels.

Surah headings, basmalahs, centered short-surah lines, ayah-marker glyphs, and line
numbers come from the QUL KFGQPC V1 Mushaf layout rather than being inferred from
browser wrapping.

## Kalimah and letter selection

The source page has a hit target for each selectable recited word. Holding or tapping a word
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
boundaries. Matching page fonts support the legacy renderer and glyph displays.
The default artwork package under `public/mushaf/` is generated separately from
pinned artwork and a reviewed corpus; its regeneration inputs are not required
to run the app. See [development](docs/DEVELOPMENT.md).

## Scoring

The three mistake categories have configurable allocations and deduction steps.
Enabled Adu / Raagu criteria use explicit score entry through the scorecard.
Each committed pinpoint is recorded in the mistake log, can be adjusted or undone,
and persists locally. Undoing a mark keeps it in the judge-readable history, and
the score is rebuilt from that history after a reload. Finishing a reciter saves a
protected result; reopening it for correction requires a recorded reason. Printing
produces a result sheet, and the next reciter starts with a clean active record.

## Judge assignments

Competition setup assigns enabled criteria across judge seats and selects which
judge is using the current device. The score panel and
letter tray show only that judge's categories. A one-category judge can release
directly on the exact letter during the hold gesture, while the tap path keeps a
visible confirmation.

Every reciter freezes the judge seat, assigned categories, and score rules in
the saved result. Results combines the enabled judge sections only after every
required criterion is present. Conflicting sources require an explicit choice,
and the verified workbook contains only current finalized results.

## Results and review

The Results workspace opens on a participant overview, including participants
awaiting results. It shows received criteria and items needing attention, then
opens participant review with source records, saved passage evidence, and replay.
Missing criteria and conflicting sources must be resolved before finalization.
A source total is distinct from an official result. The legacy review interface
remains available through `resultsOverview=0`.

Stored judge records can be scoped to the current competition or all stored
competitions. Result packages support file-based transfer between judges;
the finalized Excel workbook remains the checked official output. Sample
records are kept distinct from official results.

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
competition-specific Template V7 uses a contiguous Participants table, selected
Categories, optional Phone/Institution columns, and native dropdowns with support
and metadata sheets. Earlier template formats remain importable. See the
[V7 workbook contract](docs/PARTICIPANT_TEMPLATE_V7_FINAL_PLAN.md); later release
source also refines workbook formatting. OCR/photo extraction is not part of
this workflow.

See [`docs/ROSTER_ONBOARDING_V2.md`](docs/ROSTER_ONBOARDING_V2.md) for the UI,
data-safety, spreadsheet, and validation contracts.

## Recording, offline use, and local data

Recordings are held separately in IndexedDB, with saved-session playback and
interruption recovery. Word/ayah timing tools are experimental: machine timings
remain suggestions until reviewed and never create official deductions.

Judging state and preferences are browser-local. Multi-judge transfer uses
exported/imported files, not automatic live synchronization. A state JSON backup
does **not** include recording audio blobs. Preserve the original browser profile
and origin for local recordings; do not clear site data to update the app.

The compact judging deck is enabled by default. The PWA shell and in-app Mushaf
download support offline preparation, but an offline shell does not prove every
page, recording, or replay model is ready. Fresh offline launch, installation,
microphone behavior, and playback need checks on the intended physical device.

Legacy `tahqeeq` storage keys, audio databases, cache names, JSON markers, and
spreadsheet metadata are intentional compatibility identifiers. Existing hosting
URLs and the private npm package name may retain the former name too. Do not
bulk-rename them; see [compatibility](docs/CURRENT_STATUS.md#name-and-compatibility).

## Project structure

```text
public/pages/                 generated 604-page Mushaf dataset
public/mushaf/                versioned fixed artwork and word geometry
scripts/build-data.mjs        authoritative page-data generator
scripts/solid-mushaf.test.mjs full-dataset and architecture audit
src/components/ConnectedFixedMushaf.tsx default artwork judging view
src/components/Mushaf.tsx     legacy QCF renderer for rollback checks
src/components/DragMenu.tsx   connected exact-letter rail and category gesture
src/components/ParticipantRosterEditor.tsx recoverable roster preparation UI
src/components/RecordsView.tsx Results entry and stored judge records
src/components/ResultsOverview.tsx participant overview
src/components/ParticipantReviewWorkspace.tsx saved evidence and review
src/components/FinalResultsPanel.tsx result-source review and finalization
src/lib/judgingUnits.ts       semantic letter/mark isolation
src/lib/roster.ts             draft validation, paste/import, Template V7
src/lib/recitationAudioStorage.ts local recording storage
src/lib/recitationReplay.ts   replay revisions and timing evidence
src/lib/resultsReview.ts      result review states, filtering, and pagination
src/lib/qcfFont.ts            page-specific QCF font loader and preloader
src/state/store.tsx           scoring and persistence
src/styles/global.css         responsive reader and judging UI
```

## Documentation

- [Documentation index](docs/README.md): maintained guides and historical records.
- [Current status](docs/CURRENT_STATUS.md): checked branches and acceptance limits.
- [Development](docs/DEVELOPMENT.md): commands, data, and releases.
- [Design grammar](docs/DESIGN_GRAMMAR.md): visual and interaction rules.
- [Unresolved decisions](docs/UNDECIDED_DECISIONS.md): open product/rule choices.
- [Progress log](PROGRESS.md): dated milestones, not a current feature checklist.

## Licensing

The Mushaf layout, Quran text, and page-specific glyph fonts originate from the
King Fahd Glorious Qur'an Printing Complex resources exposed through QUL and Quran
Foundation services. Distribution must comply with the applicable KFGQPC, QUL, and
Quran Foundation terms. The application code is separate.
