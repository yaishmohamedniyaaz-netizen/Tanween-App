# Task: extend Tahqeeq from 1 mushaf page to all 604 pages

> **Archived handoff.** This describes an early Tahqeeq prototype. Tanween now
> includes all 604 pages and defaults to fixed artwork. Do not execute this as a
> current task; follow [current status](docs/CURRENT_STATUS.md) and [AGENTS.md](AGENTS.md).

You are working in the **Tahqeeq** repo — a working web app for judging Quran recitation
competitions. A judge sees a mushaf page rendered in the real KFGQPC Uthmanic Hafs font,
presses and holds any letter, drags onto a category pill (Laḥn Jalī / Laḥn Khafī / Faṣāḥa),
and releases to record a pinpointed mistake with an automatic deduction. It currently
renders exactly **one page: 604** (Al-Ikhlāṣ, Al-Falaq, An-Nās). Your job is to make **every
page 1–604** available with the same fidelity, plus page navigation. Nothing else.

Read `PROGRESS.md` and `README.md` first. Run `npm install`, `npm run dev` (port 5173),
and try marking a letter so you understand the interaction before touching anything.

## Architecture you must preserve (do not redesign)

- **Text, not images.** The page is Unicode text in the KFGQPC Hafs v18 font
  (`public/fonts/hafs.18.woff2`). Letter-level hitboxes are measured at runtime with
  `Range.getClientRects()` over grapheme clusters (`Intl.Segmenter`) — see
  `src/components/Mushaf.tsx` (`measure()`). This gives deterministic per-letter targets
  without breaking Arabic joining. Never wrap individual letters in DOM elements.
- **Stable mistake addresses.** A mark's `tid` is `"${surah}.${ayah|b}.${wordIndex}#${graphemeIndex}"`
  where `wordIndex` is the word's index **within its ayah** (not within a line or page).
  Basmala words use `b`. Saved sessions in localStorage reference these — the format must
  not change.
- **The line model.** `scripts/build-data.mjs` fetches (a) the full Hafs v18 text
  (`hafsData_v18.json`, font-matched encoding — this is the text that gets rendered) and
  (b) per-word printed `line_number`s from `https://api.qurancdn.com/api/qdc/verses/by_page/{page}?words=true&word_fields=line_number&per_page=50`,
  zips them **by word order within each verse**, and emits
  `src/data/page604.json` with `lines[]` of type `surah-header | basmala | ayah`.
  `src/lib/page.ts` exposes it; `Mushaf.tsx` renders lines as justified RTL flex rows,
  auto-fitting the font size so the widest line fills the page (see `fitLines()`), and
  centering lines whose natural width is < 52%.
- Design system: `src/styles/global.css` + `motion.css`. Match it exactly — near-monochrome,
  4px grid, existing button/dialog classes. No new colors, no new UI frameworks, no new
  dependencies unless listed below.

## What to build

### 1. Data pipeline for all pages (`scripts/build-data.mjs`)
- Generalize the existing `buildPageLayout()` to loop pages 1..604 and emit **one JSON
  file per page**: `public/pages/p{n}.json` (shape identical to the current
  `page604.json`). One combined file would be 6–8 MB — do not ship that; per-page files
  are fetched lazily.
- Keep `src/data/page604.json` generation working (used as the instant first paint /
  fallback), or refactor cleanly so page 604 loads the same lazy way with a preloaded
  cache entry.
- Fetch politely: batch with limited concurrency (e.g. 8 at a time), retry once on
  failure, and **fail the build loudly** if any page or any verse's word count mismatches.
- Add an assertion pass: every one of the 6,236 verses matched word-for-word
  (hafs split count === qurancdn `words.length` for that verse's words *on all its
  pages combined*), and pages 1..604 all produced 15 lines (except the known special
  pages — see pitfalls).

### 2. Correct page semantics (this is where the current code is too naive)
The current header/basmala inference ("any line without words is a header/basmala pair")
only works on page 604. Generalize:
- A verse's words carry `page_number` and `line_number`. **Filter words to the page being
  built** (`w.page_number === page`) — long ayahs span two pages, and `by_page` returns
  whole verses. Word→hafs mapping must use the word's per-verse `position` (1-based)
  against the hafs word split of the whole ayah, so an ayah split across pages still gets
  correct `wordIndex` values.
- Lines on a page with no words are surah-header or basmala lines. Rules:
  - A surah header line appears where a new surah begins (first word of ayah 1 of that
    surah is on this page). Header is the empty line immediately before the surah's first
    word line (or the basmala line).
  - A basmala line follows the header for every surah **except** surah 9 (At-Tawbah — no
    basmala) and surah 1 (the basmala *is* ayah 1:1, already in the words).
  - Multiple surahs can start on one page (e.g. late-juz pages have 2–3 headers).
- Surah names: take `sora_name_ar` from the hafs data (already fetched). The surah-header
  line entry needs `{ surah, nameAr }` exactly like today.
- **Special pages 1 and 2** (Al-Fātiḥah and the opening of Al-Baqarah): the print is an
  ornate 6-line centered layout, not 15 justified lines. Emit their real line numbers as
  the data says, mark the page object `"special": true`, and render all their ayah lines
  centered (skip the justify/auto-fit-to-full-width behavior). Do not attempt the ornate
  frame art.

### 3. Page state + navigation UI
- `Mushaf.tsx` (or a thin wrapper) takes a `page` number; fetch `/pages/p{n}.json` on
  demand, cache in memory (a simple `Map`), and prefetch page±1 after render.
- Loading state: keep the paper `.page` card at stable height with a subtle skeleton
  (no spinner graphics — a faint pulsing line block is enough, consistent with the
  design system).
- Navigation (RTL: "next" page number sits to the LEFT):
  - Chevron buttons on both sides of the page card + ArrowLeft/ArrowRight keys.
  - A small control near the page number: click it to open a jump popover — type a page
    number (1–604) or pick a surah from a list (surah → its first page; build a static
    `src/data/surah-index.json` in the same script: number, nameAr, first page).
  - Persist the current page in localStorage so a refresh stays put.
- **Marks vs pages:** the store and `tid`s are already page-agnostic. Two integrations:
  - The mistake-log jump (`JUMP_EVENT` in `Mushaf.tsx`): if the mark's location is on
    another page, switch pages first, then flash the letter once hitboxes exist. Add the
    page number to each new `Mistake` (extend the type with `page?: number`) so this is a
    lookup, not a search; for old saved marks without `page`, fall back to searching the
    surah-index.
  - Marks on other pages must still count in the scorecard/log (they already do — state
    is global; just don't filter by page anywhere).

### 4. Verification (do all of it, in the browser, before calling it done)
- `npm run data` completes with the assertion pass green; spot-open `p1.json`, `p2.json`,
  `p50.json`, `p255.json`, `p582.json`, `p604.json` and sanity-check line structure.
- In the app: pages 1, 2 (special centered), 3 (dense 15-line), 50, 255, 582 (multiple
  surah headers), 604 render without horizontal overflow (`page.scrollWidth ===
  page.clientWidth`) and with hitboxes (`document.querySelectorAll('.hit').length > 0`).
- Mark a letter on page 3 and one on page 604; scorecard totals both; clicking each log
  row navigates to the right page and flashes the right letter.
- An ayah that spans a page boundary (find one via the data, e.g. around 2:282, pages
  48–49) shows its words split correctly across both pages, and marking works on both
  halves with correct `112:1 · letter N`-style labels.
- Keyboard nav works; jump-to-surah works for at least Al-Baqarah, Yā-Sīn, An-Nās;
  reload restores the page; dark mode unaffected.
- `npx tsc -b` clean, `npm run build` clean; main bundle must NOT grow by more than
  ~20 KB (the page JSONs are fetched, not imported).

## Pitfalls (learned building page 604 — do not rediscover these the hard way)
- The qurancdn `text_uthmani` encoding differs slightly from hafs v18 — **never render
  their text**; use it only for `line_number`/`page_number`/`position`. The hafs text is
  what matches the font.
- `sheet`/HMR half-states: after editing `Mushaf.tsx`, hard-reload the browser before
  trusting behavior; stale module graphs produced phantom bugs for us twice.
- The auto-fit loop (`fitLines`) converges by re-running when it changes `fontPx` — if
  you touch it, make sure it can't oscillate (tolerance is 0.75px).
- Headless/preview screenshot tools can be flaky here; verify via DOM reads
  (`getBoundingClientRect`, class assertions) as the source of truth.
- `per_page=50` may paginate on verse-dense pages (late juz 30 pages have 15+ short
  verses; some pages exceed 20). Follow `pagination.next_page` until null.
- Do not touch: scoring (`lib/scoring.ts`), store actions, roster, dialogs, print sheet,
  records view, or the gesture handlers — they are verified working.

## Definition of done
All 604 pages navigable and judgeable with letter-precision marks, the verification list
above fully green, no regressions on page 604's existing behavior, and a short section
appended to `PROGRESS.md` describing what you built and how you verified it.
