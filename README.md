# Tahqeeq

A web app for judging Quran recitation competitions — built around **pinpointing**: the
judge marks the exact letter (or mark) on a real-looking mushaf page, with gradual
per-category deductions, producing a transparent, reviewable record instead of a number
that lives only in the judge's head.

This repo is the **first prototype**: single judge, desktop + mouse, three short surahs
(Al-Ikhlāṣ, Al-Falaq, An-Nās) on a mushaf page, every letter pressable, the
press-hold-drag-release gesture, the three scoring categories, live scores, a mistake log,
and a notes box. It records what the judge calls — it does not detect correctness itself.

## Run it

```bash
npm install          # install deps
npm run data         # (re)generate src/data/surahs.json from the Hafs v18 source
npm run dev          # start the dev server at http://localhost:5173
```

`npm run build` produces a production bundle in `dist/`.

## How the mushaf + hitboxes work (the key decision)

The page is **rendered text in the KFGQPC Uthmanic Hafs v18 font**, not an image of a
printed page. This was the central design choice:

- The font + its matching Unicode text (`thetruetruth/quran-data-kfgqpc`, Hafs v18) keeps
  the authentic connected script. Selection is driven by semantic **judging units**, not
  raw Unicode graphemes: special hamza encodings, small vowel letters, combining marks,
  ligatures, and the Allah form are normalized in `src/lib/judgingUnits.ts` before their
  contextual ranges are measured in `src/components/Mushaf.tsx`.
- An image of the printed page would instead need fragile, inconsistent computer-vision or
  by-hand hitboxing per page — exactly the cost the vision wanted to avoid.
- Trade-off: rendered text is not pixel-identical to one specific printed Madani page. For
  the prototype that is irrelevant; it still renders in the authentic mushaf font. Exact
  full-page fidelity (QPC v1/v2 page-glyph fonts, word-level) is a later layer.

The hitboxes are a transparent overlay (`.hit-layer`) above the shaped text. Each point
within a word belongs to one non-overlapping judging unit. Old grapheme-based saved marks
remain addressable through legacy aliases.

## The gesture

Press (or tap) a letter → a magnified word selector confirms the exact judging unit → drag
onto a category and release to commit. A tap pins the selector so the unit and category can
be chosen independently. The menu is rendered synchronously on press (`flushSync`) so fast
touch drags work; hover is detected with `elementFromPoint`. Escape cancels.

## Scoring

Three categories, each with a starting allocation and a per-mark deduction step,
**adjustable per competition** (the "Marks" button in the score panel):

| Category    | Default start | Default step |
| ----------- | ------------- | ------------ |
| Laḥn Jalī   | 30            | 2            |
| Laḥn Khafī  | 20            | 1            |
| Faṣāḥa      | 10            | 0.5          |

Each pinpoint deducts the step; deductions are adjustable per entry in the log. State
persists to `localStorage`; "Print" produces a clean result sheet; "New reciter" clears.

## Project structure

```
public/fonts/hafs.18.woff2     KFGQPC Uthmanic Hafs v18 (see licensing)
scripts/build-data.mjs         extracts surahs 112–114 + Basmala -> src/data/surahs.json
src/data/surahs.json           generated text data
src/lib/                       page model, judging-unit tokenizer, scoring, ids
src/state/store.tsx            reducer + context + persistence
src/components/                Mushaf, DragMenu, ScorePanel, MistakeLog, NotesBox, Header, ResultSheet
src/styles/global.css          design system
```

## Scope

**Done (prototype):** single judge; desktop/mouse; 3 surahs; letter + mark hitboxes;
press-hold-drag-release; categories; live scores + configurable increments; mistake log
with adjust/undo; notes; print result sheet; per-reciter reset; persistence.

**Later:** statistics/accountability across islands & classes; multiple judges; Jali/Khafi
guidance layer; deeper mistake-type capture; AI-ordered mistake menu; full mushaf coverage;
tablet & pen.

## Licensing note

The mushaf font and text are from the King Fahd Glorious Qur'an Printing Complex (KFGQPC),
distributed via `thetruetruth/quran-data-kfgqpc` / the Quranic Universal Library (QUL). Any
distribution of this app must comply with KFGQPC and QUL terms for those assets. App code
in this repo is separate.
