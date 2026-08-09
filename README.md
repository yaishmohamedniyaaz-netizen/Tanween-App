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

The reader uses the complete 604-page KFGQPC V2 1421H Mushaf layout. Each page is
rendered with its matching QCF V2 page font and Quran.com/Quran Foundation word
glyphs. The page geometry is fixed: changing the viewer zoom scales the composed
page instead of reflowing its ayah lines.

The generated files in `public/pages/` contain two complementary representations:

- the page-specific QCF glyph, used for the faithful connected-script rendering;
- the semantic Uthmani word text, used to build stable judging units and labels.

Surah headings, basmalahs, centered short-surah lines, ayah-marker glyphs, and line
numbers come from the QUL KFGQPC V2 Mushaf layout rather than being inferred from
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

`scripts/build-data.mjs` rebuilds all 604 page files from Quran Foundation's QDC
page-word data and the corresponding QUL layout metadata. Matching QCF page fonts
are loaded on demand and adjacent page data/fonts are prefetched.

## Scoring

The three mistake categories have configurable allocations and deduction steps.
Each committed pinpoint is recorded in the mistake log, can be adjusted or undone,
and persists locally. Printing produces a result sheet; starting a new reciter
clears the active record.

## Project structure

```text
public/pages/                 generated 604-page Mushaf dataset
scripts/build-data.mjs        authoritative page-data generator
scripts/solid-mushaf.test.mjs full-dataset and architecture audit
src/components/Mushaf.tsx     fixed page renderer and word interaction
src/components/DragMenu.tsx   connected exact-letter rail and category gesture
src/lib/judgingUnits.ts       semantic letter/mark isolation
src/lib/qcfFont.ts            page-specific QCF font loader and preloader
src/state/store.tsx           scoring and persistence
src/styles/global.css         responsive reader and judging UI
```

## Licensing

The Mushaf layout, Quran text, and page-specific glyph fonts originate from the
King Fahd Glorious Qur'an Printing Complex resources exposed through QUL and Quran
Foundation services. Distribution must comply with the applicable KFGQPC, QUL, and
Quran Foundation terms. The application code is separate.
