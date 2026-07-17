# Task: typographic fidelity + optimization backlog for Tahqeeq

You are working in the **Tahqeeq** repo — a working judging app for Quran recitation
competitions. All 604 mushaf pages render in the real KFGQPC Hafs font with letter-level
press targets; judges mark mistakes via press-hold-drag-release. Read `PROGRESS.md`,
`README.md`, and `KIMI_TASK_FULL_MUSHAF.md` (the previous handoff — its architecture
rules still bind you). Run `npm install && npm run dev`, mark a few letters, and flip
through pages 3, 300, 582 before touching anything.

This is a **prioritized backlog**. Work top to bottom. Each item is independently
shippable — finish, verify, and commit a progress note to `PROGRESS.md` before starting
the next. Do not redesign anything; every visual change moves the page *closer to the
printed Madani mushaf*, never toward something new.

## The one landmine that must never go off

Mistake addresses (`tid` = `"${surah}.${ayah|b}.${wordIndex}#${graphemeIndex}"`) are
**grapheme-index based against the logical word text**. Saved sessions and the records
layer depend on them. If you ever change what text is rendered (item 2 does), the
logical text used for tids must stay untouched — you render a *display* variant and map
between the two. Any change that shifts grapheme indices silently corrupts every
existing mark. Every item below that touches text must end with the regression check in
"Global verification".

---

## 1. Fix the word-gap stretching (the "kalima too far apart" bug) — do this first

**Problem:** `.m-line-ayah` uses flex `justify-content: space-between` with no ceiling.
Lines whose natural content is between ~52% and ~90% of the measure get stretched with
enormous inter-word gaps. The print never does this — its inter-word gap is nearly
constant; it fills lines by elongating letters (item 2).

**Fix (cheap, deterministic):** in `fitLines()` (`src/components/Mushaf.tsx`), you
already compute each line's natural width. Add a per-line decision:

- Let `gapNeeded = (lineWidth − naturalWordsWidth) / (wordCount − 1)`.
- Define `MAX_GAP = 0.62 * fontPx` (tune visually against the printed page photo —
  the print's gap is roughly 0.3–0.5em; leave a little slack).
- If `gapNeeded <= MAX_GAP`: keep `space-between` (true justification, looks right).
- If `gapNeeded > MAX_GAP`: render the line **centered with a fixed gap of
  `0.42em`** (reuse/extend `.m-line-center`). This replaces the current blunt
  `< 0.52 → center` threshold — remove that threshold entirely; the gap rule subsumes it.
- Keep the font auto-fit loop as is (widest line still drives `fontPx`).

Also tighten vertical rhythm toward print proportions: `.m-line` `line-height: 2.35` →
try `2.05–2.15`; `.m-line-basmala` size factor 0.78 stays; reduce `.page` bottom padding
if 15 lines now sit shorter. Compare side-by-side with the printed 604 photo (the ratio
of glyph height to line pitch is the thing to match).

**Verify:** pages 3 (dense), 255, 587+ (short-verse pages, worst stretching today), 604.
No line anywhere shows a gap wider than ~0.7em; no horizontal overflow; hitboxes still
land on the right letters after the rhythm change (mark 3 letters, check the ink hugs
them).

## 2. Kashida (tatweel) justification — the real print behavior [large, token-heavy, high value]

Make under-full justified lines fill the measure the way the print does: by elongating
the connecting stroke inside words (U+0640 ARABIC TATWEEL renders as a joining
elongation in the KFGQPC font).

**Architecture (mandatory, because of the landmine):**
- Keep `PageWord.text` (logical) untouched — tids, labels, exports all keep using it.
- At render time compute `displayText` per word = logical text with tatweel characters
  inserted at chosen sites. Render `displayText`.
- Hitbox measurement (`measure()`) currently walks graphemes of the rendered text
  node. Change it to walk graphemes of the **logical** text while building code-unit
  ranges against the **display** text: maintain a cursor that skips over inserted
  U+0640 runs (tatweel is never part of a logical grapheme; a mapping array
  `logicalIndex → displayStart/displayEnd` built during insertion is the clean way).
  The elongated stroke becomes part of the preceding letter's tight ink rect — that is
  correct and matches how a reader points at a stretched letter.

**Where tatweel may be inserted (keep it conservative):**
- Only between two Arabic letters that actually join (previous letter is a dual-joining
  letter not followed by a non-joiner; skip if either side carries a mark that would
  visually float — after tashkeel is fine, the mark stays on its base).
- Never inside: the divine name (لله / ٱللَّه sequences), basmala lines, ayah-number
  markers, waqf signs, or any word shorter than 3 letters.
- Madani convention: prefer ONE elongation site per word, at the **last joinable joint**
  of the word (e.g. يُولَـــدْ). Distribute line slack across the line's eligible words
  round-robin (widest words first), 1 tatweel per pass, max ~4 per site. If a line has
  no eligible sites, fall back to item 1's centered-fixed-gap rendering.
- Compute the tatweel advance width once per `fontPx` (measure a span off-screen), then
  solve `tatweelsNeeded = ceil(slack / tatweelWidth)` and distribute.

**Verify (in addition to Global verification):** the previously stretched lines on
pages 4-context (604's line 4/9), 255, 590+ now fill the measure with elongated letters
and normal gaps; marking an elongated letter highlights the whole elongated form;
clicking that mark in the log jumps back and flashes it; `112:1 · letter N` labels are
identical before/after (export a session pre-change on main, re-import expectations).
Screenshot-compare a page against the printed photo.

## 3. Offline-first (service worker precache) [competitions run on islands with bad wifi]

- Add a hand-rolled service worker (no workbox dependency): on install, precache the app
  shell, both fonts, and all 604 page JSONs (they gzip to ~3–4 MB total — acceptable; do
  it in the background with progress, don't block first paint).
- Cache strategy: cache-first for `/pages/*.json` and fonts (immutable content),
  network-first for the shell in dev.
- A tiny "offline ready" indicator: reuse the reciter-chip dot pattern — green when
  precache complete. No new UI surface.
- Verify: DevTools → offline → full app works: navigation across never-visited pages,
  marking, records, print sheet.

## 4. Page-data slimming + loading polish [medium]

- `public/pages/p{n}.json` word objects repeat derivable fields. Emit compact form:
  `wid` is derivable from `surah/ayah/index`; `role` is derivable from the text
  (Arabic-Indic digits = ayah-end). Keep the *builder* explicit but emit
  `[surah, ayah, "text"]` tuples or short keys; expand in `castPage()`. Target ≥40%
  smaller payloads. Bump a `schema` field; keep `castPage` accepting both shapes so
  nothing breaks mid-deploy.
- Add `<link rel="preload" as="font">` for `hafs.18.woff2` and `InterVariable.woff2` in
  `index.html` (kills the measure→FOUT→re-measure cycle on cold load).
- Raise in-memory prefetch to ±3 pages when `navigator.connection?.saveData !== true`.
- Verify: cold-load network waterfall shows fonts starting immediately; page JSON sizes
  down; page flips still never show empty hitboxes.

## 5. Marginalia: juz / hizb / sajdah [domain value, small]

- The hafs dataset (`hafsData_v18.json`, already fetched in `scripts/build-data.mjs`)
  carries `jozz` per ayah; qurancdn verses carry `hizb_number`, `rub_el_hizb_number`,
  `sajdah_number`. Emit per-page metadata: `{ juzStart?, hizbQuarters: [...], sajdahAyahs: [...] }`.
- Render: a small juz label in the page's outer margin (like the print's margin
  medallion, but flat/refined — a bordered circle with الجزء number), and the sajdah
  marker ۩ is already in the text where present — just verify it renders and is
  pressable like any letter.
- Verify pages 21 (juz 2 start? check data), 293, 596 (sajdah in al-ʿAlaq).

## 6. Special pages 1–2 refinement [cosmetic, last]

- Pages 1–2 currently render centered generic lines. Give them the print's feel without
  the ornate art: narrower measure (~70%), all lines centered, the existing surah-band
  cartouche, slightly larger font. Flag-driven (`special: true` already in the data).
- Verify: pages 1 and 2 look composed, no overflow, marking works.

## Global verification (run after EVERY item)

1. `npx tsc -b` clean; `npm run build` clean; main bundle growth < 10 KB per item.
2. tid stability: with the dev server running, seed a session (mark 3 letters on page
   604 incl. one on a line your change affects), reload, click each log row — the page
   navigates and the flash lands on the exact same letters. Export JSON before/after
   your change on the same marks — identical `tid` and `location` fields.
3. Gesture: drag-mark and tap-pin both work on pages 3 and 604 (headless viewport
   1200×1900 if testing synthetically; hard-reload after HMR edits — stale module
   graphs have produced phantom bugs in this repo twice).
4. Both themes; `prefers-reduced-motion`; no console errors.
5. Append what you did + how you verified to `PROGRESS.md`.

## Definition of done
Items 1–2 are the point of this handoff (spacing fidelity); 3–6 in order as budget
allows. Never trade the landmine (tid stability) for visual fidelity — if kashida can't
be made index-safe, ship item 1 alone and write up exactly where the mapping broke.
