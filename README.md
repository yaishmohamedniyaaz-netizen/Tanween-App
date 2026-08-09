# Tahqeeq App

Tahqeeq is a mobile- and desktop-friendly judging tool for Quran recitation
competitions. A judge can select the precise Quranic letter involved in a mistake,
assign its category, and keep a transparent scoring record for the reciter.

**Live app:** [tahqeeq-mobile.yaish.chatgpt.site](https://tahqeeq-mobile.yaish.chatgpt.site)

## Current capabilities

- Complete 604-page Mushaf navigation with stable page composition and zoom controls.
- Semantic letter-level judging across the Quran, including contextual handling for
  ligatures, combining marks, special hamzas, and the Allah form.
- Ayah markers and decorative ornaments are excluded from judging targets.
- Tap or press-drag interaction for choosing a letter and mistake category on mobile.
- Adaptive selector callout that stays usable near screen edges and with long words.
- Configurable Laḥn Jalī, Laḥn Khafī, and Faṣāḥah deductions.
- Live scoring, mistake history, notes, undo/edit controls, printing, and reciter reset.
- Local persistence so an in-progress judging session survives a refresh.

Tahqeeq records a judge's decision; it does not automatically determine whether a
recitation is correct.

## Run locally

Requirements: Node.js and npm.

```bash
npm install
npm run dev
```

The development server normally opens at `http://localhost:5173`.

## Validate a change

```bash
npm test
npm run build
```

The tests cover semantic Quran judging units, contextual glyph geometry, ayah-marker
exclusion, all 604 pages, and adaptive selector sizing. The production build is emitted
to `dist/` and prepared for the configured Sites deployment.

## How precise letter selection works

The Mushaf is rendered with the KFGQPC Uthmanic Hafs font and matching Quran text.
Selection does not rely on raw Unicode graphemes: `src/lib/judgingUnits.ts` converts the
text into semantic judging units, while `src/lib/clusterGeometry.ts` and
`src/components/Mushaf.tsx` calculate contextual, non-overlapping ownership regions for
the shaped Arabic text.

This allows visually connected script and ligatures to remain authentic while exposing
the intended sounds or letters as reliable judging targets. Older saved marks remain
compatible through legacy target identifiers.

## Project structure

```text
public/fonts/                    Quran and interface fonts
public/pages/                    Complete Mushaf page data
scripts/                         Data preparation and automated tests
src/components/Mushaf.tsx       Page rendering and precise interaction handling
src/components/DragMenu.tsx     Letter and mistake-category selector
src/lib/judgingUnits.ts         Semantic Quran judging-unit rules
src/lib/clusterGeometry.ts      Contextual shaped-text hit geometry
src/lib/selectorLayout.ts       Adaptive selector sizing and edge placement
src/state/                      Judging state and persistence
src/styles/                     Application design and motion system
```

## GitHub update workflow

- `main` represents the latest stable source used for releases.
- Develop substantial changes in a focused branch and merge them after validation.
- Create a `checkpoint/...` branch before risky layout or interaction work.
- Run both validation commands before merging or publishing.
- Use release tags for important competition-ready milestones.

## Licensing note

The Mushaf font and Quran text originate from the King Fahd Glorious Qur'an Printing
Complex (KFGQPC) ecosystem and Quranic Universal Library sources. Any redistribution
must comply with the applicable terms for those assets. The application source is
maintained separately in this repository.
