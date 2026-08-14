# Tahqeeq — build progress log

## Participant queue clarity — IMPLEMENTED & VERIFIED (2026-08-14)

- Participant cards now lead with the reciter's name and keep the competition
  number as a small aligned badge. Ordinary numeric values display as `01–99`
  or `001–999` to match roster size; stored alphanumeric numbers remain exact.
- Division blocks are accessible collapsible groups. The active block opens
  automatically, search opens every matching block without changing its real
  waiting/absent/finished totals, and unmatched participants remain visible.
- Participant context is shared across selection, question handoff, and
  Prepared mode, so institution, division/category, and side no longer repeat.
  The fictional sample roster now uses numeric `01–08` labels.
- The participant dialog keeps the page behind it fixed and gives scrolling to
  the queue only. Desktop and 390px browser checks confirmed aligned badges,
  visible group counts, group expansion, and no application console errors.
- Verification: 204 automated tests and the production Sites build.

## Twenty-question draw and Prepared mode — IMPLEMENTED & VERIFIED (2026-08-13)

- Choosing a number now records the reveal and opens the exact starting Mushaf
  page in a persistent **Prepared** state. Judging time, letter selection,
  deductions, notes, and Finish remain locked until this device presses Ready.
- The Mushaf shows one narrow participant/question strip with reversible
  **Change reciter** and **Change question** actions. Every replacement stays
  linked to the final question record; revealed tiles are never silently put
  back into the board.
- The sample competition now has 20 technically valid ayah-first questions for
  every division and both muqarrar sides (160 total). They are deterministic
  test fixtures, not a claim of scholarly approval or question quality.
- Frozen boards now carry a recorded cycle number. After all 20 positions are
  spent, a new seeded cycle is added without rewriting any earlier board or
  draw. V1 boards and draws restore as cycle 1 without changing their evidence.
- Prepared state survives refresh and has its own one-time rollback backup.
  Official Tahqeeq-set mode requires at least 20 reviewed, frozen questions.
- Ready is deliberately single-device. Tahqeeq does not display invented
  multi-judge readiness; shared readiness remains a later cloud-sync release.
- Verification: 196 automated tests, complete 604-page/6,236-ayah corpus checks,
  TypeScript compilation, and the production Sites build.

## Mark bar, one mark per letter, kalimah details — IMPLEMENTED & VERIFIED (2026-08-13)

- The Adu / Raagu mark now sits in a **box** in its score row, centred and in the
  same column as every other criterion, because a full border is what signals a
  value can be changed while plain text signals it cannot.
- Pressing it drops a **horizontal mark bar** with every awardable mark: drag and
  release to commit, or press without moving and the bar stays open to pick from.
  Half marks are ticks, whole marks are taller, every fifth is labelled once an
  allocation passes twelve. One gesture still writes one ledger event.
- Four bar formats were compared at the hard case, 20 marks in half steps, and
  are live in the interactive study: ruler strip, whole-mark chips, coarse-then-
  fine, and the dropdown list this replaces.
- **One letter carries one mark.** Marking a letter that already carries one
  replaces it — the earlier mark is undone, leaves the score, and remains in the
  history to be restored. Re-marking with the same criterion changes nothing.
- **Mistake details name the kalimah** and its surah:ayah reference. The letter
  ordinal remains in the stored evidence and the printed sheet.
- The criterion is written **Adu / Raagu**, including in the results workbook.
- Verification: 117 automated tests, production build, and browser QA of the bar
  drag, the pinned bar, the replace rule and the details view. No console errors.

## Adu & Raagu marking control and left rail — IMPLEMENTED & VERIFIED (2026-08-13)

- Research and the rejected candidates:
  [`docs/ADU_RAAGU_INPUT_AND_LAYOUT_PLAN.md`](docs/ADU_RAAGU_INPUT_AND_LAYOUT_PLAN.md)
  and the interactive study beside it.
- Adu & Raagu now has **one place in the judging rail**: its own score row. The
  separate marking panel is retired, so the criterion is no longer both reported
  and controlled in two places.
- The mark is a **vertical scrub**: press and drag up or down, 14px per step and
  34px while Shift is held. A press without a drag opens the **full list of
  awardable marks**, full marks first, so any mark costs one press and one click.
- A drag previews locally and writes **one ledger event when the judge lets go**,
  keeping the readable history readable.
- Keyboard: arrows by one step, Shift-arrow by five, `Home` full marks, `End`
  zero, digits to type a mark, `Enter` or `Space` for the list. The wheel adjusts
  only while the control is focused, never on hover.
- A whole-recitation criterion is **capped at 20 marks** in the control and in
  setup; stored allocations above the cap are trimmed on load.
- The **judging rail now defaults to the left**, since the Mushaf is read from
  the right edge. Judges who already chose a side keep it.
- Verification: 114 automated tests (6 new), production build, and browser QA of
  the drag, the list, keyboard, focused-only wheel, the 20-mark cap and the saved
  ledger. Browser console: no application errors.

## Adu & Raagu, and optional criteria — IMPLEMENTED & VERIFIED (2026-08-13)

- Added **Adu & Raagu** (voice and melody) as a fourth scoring criterion. It is a
  *whole-recitation* criterion: it is never pinpointed on a letter, so it never
  appears in the letter tray. The judge marks it once per reciter in its own
  sidebar panel — start at the full allocation, step down by the configured
  step, with a reason note.
- Every change is an append-only ledger event (`impression_changed`,
  `impression_note_changed`), so the mark, its history, and its note survive
  finishing, reopening, export, and the printed result sheet.
- **Faṣāḥa and Adu & Raagu are now optional per competition.** Laḥn Jalī and
  Laḥn Khafī are always judged. Setup's "Marks and criteria" task switches a
  criterion on or off; the 100-mark total is checked across the criteria in use
  only, and a criterion out of use carries 0 marks.
- Switching a criterion off removes it from the judging panel, the letter tray,
  the score panel, the result sheet, final results, and the results workbook,
  which now writes one score column per criterion actually judged.
- The panel now supports up to four seats (one per criterion) and validates
  against the criteria in use: every one assigned exactly once, and none that
  the competition does not judge.
- A judge who owns only Adu & Raagu cannot open the letter tray at all.
- An unmarked Adu & Raagu rests on full marks; the score panel and the finish
  dialog both say so before the result is saved.
- Migration: records saved before this change keep exactly the criteria they
  were judged with — Adu & Raagu stays off with 0 marks, so old totals never
  move. A one-time `pre-adu-raagu-v1` browser backup is written on first load.
- Verification: 108 automated tests (13 new in `scripts/adu-raagu.test.mjs`),
  production build, and browser QA of three competition shapes — all four
  criteria, Jalī + Khafī only, and a restored pre-Adu & Raagu browser state.
  Browser console: no application errors.

## Manual Question Builder V1 — IMPLEMENTED & VERIFIED (2026-08-12)

- Added a dedicated **Draft questions** task inside Competition setup.
- Organizers can choose a division and complete starting ayah, then preview the
  deterministic ending on the real KFGQPC V1 1405H Mushaf.
- The preview supports all 604 pages, direct page navigation, and choosing a
  starting ayah from its marker in question-building mode.
- Drafts retain exact page, line, word, marker, source-version, index-version,
  and layout-hash evidence. Rule or source changes show **Needs checking**
  instead of silently rewriting a saved draft.
- Exact ayah-level juz and surah eligibility blocks passages outside a
  division's configured Quran portion.
- The sample competition loads normal, cross-page, and extended examples plus
  a Quran-end shortfall test.
- Drafts remain device-local preparation data. Tahqeeq question-set mode,
  approval, frozen sets, and randomized tiles remain disabled until Q2/Q3.
- Full tests: all 6,236 ayah starts resolve deterministically or return an
  explicit Quran-end reason; the existing judging and Mushaf suite stays green.

Next question-bank checkpoint: **Q2 — review, approval, retirement, and version
history for prepared questions.**

## Product foundation research — COMPLETE (2026-08-11)

- Added `docs/PRODUCT_FOUNDATION.md` as the current research decision record and
  solo-developer roadmap.
- Diagnosed the selector as two distinct issues: crowded full-mark rendering in
  `ٱلنَّفَّٰثَٰتِ`, and independent madd/silent-alif targets that do not fit the
  proposed judge-interface policy for `وَتَوَاصَوۡاْ`.
- Decision: keep the QPC V1 1405H page intact; replace Unicode-base heuristics
  with a versioned corpus-wide recitation-target map; use clean primary rail
  glyphs while retaining full tashkeel/features in details and audit records.
- Defined the reliable product boundary: human judging and append-only audit
  history first; verified rankings and value-only Excel export; reviewed
  question bank; audio bookmarks before advisory AI; no automatic official AI
  scoring. Server-authenticated finalization is required before claiming an
  official record is tamper-evident.
- No runtime code or deployed assets changed in this research pass. Rollback
  checkpoint: `checkpoint/pre-product-foundation-research-20260811`.

The current future-work source of truth is
[`docs/PRODUCT_FOUNDATION.md`](docs/PRODUCT_FOUNDATION.md). Older sections below
remain as implementation history and may describe superseded prototypes.

## Letter Tray V2 — IMPLEMENTED & VERIFIED (2026-08-11)

- Implementation plan: [`docs/LETTER_TRAY_V2_PLAN.md`](docs/LETTER_TRAY_V2_PLAN.md).
- Added source-anchored V2 target IDs plus aliases for every absorbed V1
  ordinal/grapheme ID. Existing browser state is preserved and receives a
  one-time pre-V2 backup; historic glyph snapshots are not rewritten.
- The rail now renders only clean `primaryGlyph` ink while preserving the exact
  source `fullGlyph`, offsets, carrier role, marks/features, rule ID, and review
  status in evidence metadata.
- Implemented named judge-interface policies for madd/silent-plural alif hosts,
  hamza carriers, and standard/prefixed/madd-entry Allah lam loci. These policies
  remain explicitly marked for qualified Hafs/1405H review rather than being
  presented as self-authorizing religious rulings.
- A word opens with no implied letter. Jali/Khafi/Fasaha stay disabled until an
  explicit target is chosen. Target and category controls are 44px minimum,
  long words use a non-shrinking horizontal rail, and the whole source kalimah
  remains the visible page highlight.
- Fixed stale navigation/focus behavior: tray keys cannot change the Mushaf
  page, page/layout changes close the tray, pinned dialogs trap focus, and close
  returns keyboard focus to the invoking word.
- Verification: 41/41 automated tests, a full 604-page source/alias audit,
  production build, desktop browser QA, 390x844 mobile QA, long-word overflow,
  page-601 `وَتَوَاصَوۡاْ`, page-604 `ٱلنَّفَّٰثَٰتِ`, Allah grouping,
  and a real mobile hold-drag-release commit. Browser console: zero warnings or
  errors. This update has not been published yet.
- Rollback checkpoint: `checkpoint/pre-letter-tray-v2-implementation-20260811`.

This file is the **source of truth for resuming work**. If a session/usage limit cuts us
off, the next session reads this file and continues from "Next up". Keep it updated as
work proceeds.

## What this is
A web app for judging Quran recitation competitions. The differentiator vs existing
tools (QuranJudge.com, "Quran Competitions Technology", etc., which are all rubric +/-
number entry): **pinpointing** — the judge marks the exact letter/mark on a real-looking
mushaf page via a press-hold-drag-release gesture, with gradual per-category deductions,
producing a transparent, reviewable mistake log for accountability and teaching.

Full original vision is in `docs/VISION.md`.

## Key technical decision — the "image vs font" crux: SETTLED → rendered font
- Using **KFGQPC Uthmanic Hafs v18** font + its **matching Unicode text data** (from the
  `thetruetruth/quran-data-kfgqpc` repo, hafs v18). The font is paired with that exact
  text encoding, so glyphs render correctly.
- Why font not image: the font gives **letter-level + mark-level hitboxes for free and
  deterministically** (zero AI tokens) via the browser's own text metrics
  (`Range.getClientRects()` / per-grapheme spans). An image would require fragile,
  inconsistent per-page CV/manual hitboxing — exactly the "wasting tokens / consistency"
  worry from the vision.
- Trade-off acknowledged: rendered text is not pixel-identical to one specific printed
  Madani page layout. For the prototype (3 short surahs) this is irrelevant — it still
  looks like a proper mushaf in the real font. Full-mushaf exact-page fidelity (QPC v1/v2
  page-glyph fonts, word-level) is a later layer.
- Mark-level (tashkeel/sukun/madd) vs letter spatial overlap is handled by treating each
  grapheme cluster (base letter + its marks) as the press unit for the prototype; later,
  vertical zones above/below a letter separate the harakah from the base.

## Stack
Vite + React + TypeScript. Plain pointer events for the gesture (framework-agnostic core).

## Status — PROTOTYPE COMPLETE & VERIFIED IN BROWSER (2026-06-19)
- [x] Toolchain verified (node 24, npm 11, git, curl)
- [x] Network + quran.com API + github asset source verified
- [x] Project scaffolded (manual Vite+React+TS, since dir had .claude) + npm install OK
- [x] Assets downloaded (hafs.18.woff2 in public/fonts; src/data/surahs.json 112/113/114 + Basmala)
- [x] Core data + types (src/types.ts, config.ts, lib/*)
- [x] Mushaf page render with per-letter hitboxes (271 deterministic boxes via Range.getClientRects + Intl.Segmenter)
- [x] Press-hold-drag-release pill menu (Jali/Khafi/Fasaha) — flushSync so fast drags work; Escape cancels
- [x] Live score panel + configurable increments (per-competition start/step)
- [x] Mistake log (per-entry +/- adjust, remove)
- [x] Notes box (Fasaha / voice & melody)
- [x] Header (reciter name/number/island-class) + toolbar (Print, New reciter)
- [x] Printable result sheet (the transparent record)
- [x] localStorage persistence
- [x] Polish pass (clean Stripe/Apple-ish design; dropped 4MB Tabler webfont for inline SVG icons)
- [x] Runs & verified end-to-end in real browser (both gesture paths, marking, scoring, log, print sheet, reset)

How to run: `npm install` → `npm run dev` → http://localhost:5173 (launch config in .claude/launch.json, name "tahqeeq").

## Next up (post-prototype — NEEDS USER DIRECTION before big features)
Safe, aligned polish that can proceed without product decisions:
- [x] Touch-safety for the gesture — pointerId tracking (ignore stray multi-touch), touch-action:none on hitboxes, -webkit-touch-callout:none, onContextMenu prevent; also fixed closeAll() to clear startRef (Escape/cancel mid-press no longer freezes the gesture). Verified drag still commits (60→59).
- [x] Keyboard a11y for the pill menu — tap pins → first pill auto-focused → ArrowUp/Down navigate → Enter/Space commit; :focus-visible ring. Verified (jali→khafi via ArrowDown, commit OK).
- [x] First-run hint / drag affordance — dismissible coach banner above the mushaf (HintBanner), shows on clean slate only. Verified present + dismissable.
- [x] JSON export of a session — Export button → downloads structured JSON (app/schema/participant/config/score/notes/mistakes). Verified payload shape end-to-end.

ALL FOUR SAFE-POLISH ITEMS DONE & VERIFIED.

## Now building (judgment call — user said "keep working"): Records / stats v1
Flagship "Later" feature = the accountability/statistics layer (the vision's "biggest
strength"). Building a sensible LOCAL v1 so the user can react and reshape:
- Persist finished sessions to localStorage (tahqeeq.history.v1); "New reciter" saves the
  current session (if it has marks/name) before clearing.
- A "Records" view: session list (name/number/island/total/date, delete), filter by
  island/class, and aggregates — mistakes by category, most-common marked letters/locations
  ("the same mistakes repeat"), session count / average score.
DECISIONS MADE (flag for user): storage is local-only for now (no backend); accountability
stays in-system per the vision; aggregates chosen = category breakdown + repeated-mistake
ranking + per-island filter. Reshape freely.

### Records / stats v1 — DONE & VERIFIED (2026-06-19)
- Header now has a Judge ⇄ Records toggle (with saved-session count).
- "New reciter" saves the current session to history (localStorage tahqeeq.history.v1) then resets.
- RecordsView: metric cards (sessions / avg score % / mistakes), mistakes-by-category bars,
  most-marked-letters chips, **most-repeated-mistakes** ranking (same letter across reciters),
  per-island/class filter, session list with delete + clear-all.
- Verified: 2 reciters marking the same letter بِ → Records shows repeated mistake ×2,
  metrics 2 sessions / 97% / 2 mistakes, category breakdown jali=2. (lib/stats.ts, RecordsView.tsx)
- Files: src/lib/stats.ts, src/components/RecordsView.tsx, store SAVE_TO_HISTORY/DELETE_SESSION/
  CLEAR_HISTORY, types SavedSession, Header toggle.

### Low-risk refinement pass — DONE & VERIFIED (2026-06-19)
- [x] Dark mode — now controlled by a manual header toggle (sun/moon) via [data-theme] on
  <html>, persisted to localStorage (tahqeeq.theme); defaults to the OS preference when no
  choice is stored (inline script in index.html sets it pre-paint, no flash). Dark palette
  uses the CSS variables (+ dark category tints, --mushaf-ink). Verified: toggle flips
  data-theme + colors live (bg #161618 ↔ #f4f4f2), persists, icon/aria update.
- [x] Richer print sheet — mistakes now grouped by āyah with the āyah text shown for context
  (avoids reflow/overlay misalignment). Verified: groups 112:1 (قُ/هُ) & 112:3 (لَ), total 56.5.
- [x] CSV export of records (one row per mistake, UTF-8 BOM for Excel Arabic) + per-reciter
  drill-down (expand a session → its marks + notes). Verified header + rows + drill items.

## STATUS: prototype + 4 safe-polish items + records/stats v1 + refinement pass — ALL DONE & VERIFIED.
Loop stopped here (not rescheduling) per instructions — the remaining work needs the user's call.

## Design sharpening pass (founder feedback round 1) — DONE & VERIFIED (2026-07-04)
Full redesign per approved plan (.claude/plans/first-i-need-to-recursive-lamport.md):
- **Traditional 15-line page-604 layout**, data-driven: per-word line numbers fetched from
  qurancdn (`npm run data` → src/data/page604.json), justified flex lines (RTL,
  space-between), short lines (4/9/14/15) centered, double-frame cartouche surah bands
  with roundel motifs, centered basmalas, page number 604, English subtitles removed.
  Font auto-fits: JS measures widest line, scales KFGQPC size (cap 44px) so the page
  fills like print; no overflow. NOTE: print justifies lines 4/9 via kashida (letter
  elongation) — we center instead; kashida typesetting is a future refinement.
- **Tight highlight**: hit target stays generous (invisible, ≥20px) but the visible ink
  is a separate zero-padding rect hugging the glyph (mix-blend multiply/screen) with a
  category-colored underline that draws in. Verified 10px ink vs 20px hit.
- **Lean top bar**: brand · reciter chip (name + roster i/n) · Records · theme · ⋯ menu
  (Setup, Print, JSON/CSV export). Participant fields removed from header.
- **Reciter flow**: StartDialog (backdrop-blur modal; name-only route with optional
  details collapsed; or roster route with next-up preselected, Enter starts). SetupDialog:
  marks config (moved out of scorecard) + roster upload (.xlsx/.csv via SheetJS,
  lazy-loaded chunk; Name + optional Number/Island/Class; CSV read as text — fixes UTF-8
  "Malé" mojibake; raw:false keeps "01"). FINISH_SESSION saves → marks roster entry
  judged → StartDialog with next preselected. Verified full 3-name CSV flow.
- **Paper scorecard**: typographic ruled rows + animated count (rAF tween) + color pulse;
  no bars, no visible config.
- **Lean log**: rows = dot · glyph · −amount; click → jump/flash the exact letter on the
  page (scrollIntoView + 1.2s pulse) + grid-rows expand with steppers/delete.
- **Design system**: Inter variable self-hosted; near-monochrome tokens (category colors
  = only saturation); warm paper page vs cool desk bg in both themes; motion.css easing
  language (ease-out-quart, 120–240ms, 40ms pill stagger, reduced-motion fallbacks);
  no native confirm() anywhere (records clear = 2-step button).
- Verified in real Chrome (light+dark screenshots) and headless preview: drag marking,
  tap-pin, roster upload/advance, log jump/flash, animated score, theme toggle (fixed
  stale .theme-toggle class → .btn-icon). Bundle: 196KB main + 333KB lazy xlsx chunk.

## Handed off: full-mushaf coverage → Kimi
`KIMI_TASK_FULL_MUSHAF.md` (repo root) is a self-contained brief for extending the app to
all 604 pages: per-page lazy JSON pipeline, correct header/basmala inference, page-spanning
ayahs, navigation + jump-to-surah, cross-page mark jumps, full verification list, and the
pitfalls we already hit. If Kimi does this, review against that file's "Definition of done".

## Full-mushaf coverage — DONE (2026-07-04)
- **Data pipeline**: `scripts/build-data.mjs` generalized to fetch all 604 pages from qurancdn
  `by_page` API, align with KFGQPC hafs v18 text, and emit per-page JSONs (`public/pages/p1.json`
  … `p604.json`). A word-alignment algorithm handles qurancdn/hafs word-boundary mismatches via
  Unicode-normalized greedy matching. Also generates `src/data/surah-index.json` (114 surahs with
  `firstPage`).
- **Page loader**: `src/lib/page.ts` now exports `loadPage(page)` (with module-level cache) and
  `preloadPage(page)` for adjacent-page prefetching. Backward-compatible `buildMushafPage()` still
  works for the static page-604 fallback.
- **Mushaf component**: accepts `page` and `onPageChange` props. Fetches lazily, caches, prefetches
  ±1 page. Keyboard nav: ArrowLeft→next, ArrowRight→prev (RTL). Special pages (1, 2) skip auto-fit
  and center all lines. New mistakes include `page` for cross-page lookup.
- **Cross-page jump**: `JUMP_EVENT` now carries `{ tid, page? }`. If a mark is on another page,
  `Mushaf` switches pages first and flashes the letter once hitboxes are measured (via
  `pendingFlashTid` effect).
- **Navigation UI**: `App.tsx` manages page state (default 604, persisted to `tahqeeq:lastPage`).
  `PageNav` component: chevron buttons, clickable page number → popover with page-number input
  (1–604) and scrollable surah list (jump to first page of any surah). CSS styles added to
  `global.css` + `motion.css` (spin keyframe for loading spinner).
- **19 surah-header fixes**: qurancdn API under-reports `line_number` on some new-surah pages
  (first verse at line 2 instead of 3). A post-process script added missing headers/basmalas and
  shifted verse lines for pages: 77, 187, 208, 332, 342, 350, 367, 377, 415, 418, 446, 453, 499,
  507, 526, 549, 556, 558, 585.
- **TypeScript**: `types.ts` adds `page?: number` to `Mistake`. `MistakeLog.tsx` passes `m.page`
  in jump events. All compiles clean (`tsc --noEmit` passes).
- **Build**: `vite build` succeeds; `dist/pages/` contains all 604 JSONs copied from `public/pages/`.

## Handed off: typography fidelity + optimizations → Kimi
`KIMI_TASK_POLISH_OPTIMIZE.md` (repo root): prioritized backlog. (1) word-gap clamp —
fixes the stretched-kalima justification bug (space-between with no ceiling) + print
line-rhythm; (2) real kashida/tatweel justification with a mandatory logical/display
text split so tids never shift (THE landmine — spelled out in the doc); (3) offline
service-worker precache of all 604 pages; (4) page-JSON slimming + font preload;
(5) juz/hizb/sajdah marginalia; (6) pages 1–2 refinement. Each item independently
shippable with per-item verification + a global tid-stability regression check.

## Typography fidelity — ALL DONE (2026-07-04)
### Item 1: Word-gap clamp — DONE (2026-07-04)
- **Problem**: `.m-line-ayah` used flex `justify-content: space-between` with no ceiling;
lines with natural content between ~52% and ~90% of measure got stretched with enormous
inter-word gaps.
- **Fix**: `fitLines()` (`src/components/Mushaf.tsx`) now computes per-line `gapNeeded =
(lineWidth − naturalWordsWidth) / (wordCount − 1)`. If `gapNeeded > MAX_GAP` (where
`MAX_GAP = 0.62 * fontPx`), the line renders centered with fixed `gap: 0.42em` via
`.m-line-center`. The old blunt `ratio < 0.52 → center` threshold is removed entirely.
Font auto-fit loop (widestRatio driving fontPx) is unchanged.
- **Vertical rhythm**: `.m-line` `line-height: 2.35` → `2.1`; `.page` bottom padding
`28px` → `20px` to match shorter line pitch.
- **Verified**: `tsc --noEmit` passes; `vite build` succeeds (CSS 27.77 kB, JS 205.66 kB).

### Item 2: Kashida (tatweel) justification — DONE (2026-07-04)
- **Architecture**: `src/lib/tatweel.ts` handles all tatweel logic. `PageWord.text` (logical)
  is never mutated — tids remain stable. A `displayText` variant is computed per-word with
  U+0640 inserted at the last joinable joint. A `logicalToDisplay` mapping array tracks
  each logical grapheme's code-unit range in the display text.
- **Eligibility rules**: words must be role="letter", ≥3 base letters, not divine-name
  sequences (لله / الله), not basmala lines, not ayah-number markers. Insertion only at
  the last joinable joint where prev is dual-joining and next is a base letter.
- **Distribution**: `fitLines()` measures line widths, computes slack for lines where
  `gapNeeded > MAX_GAP`. `distributeTatweel()` distributes tatweels round-robin across
  eligible words (widest first), max 4 per word. If no eligible words, falls back to
  centered-fixed-gap (item 1).
- **Hitbox safety**: `measure()` walks graphemes of the **logical** text while building
  `Range` code-unit ranges against the **display** text node via the mapping. The elongated
  stroke becomes part of the preceding letter's tight ink rect.
- **Verified**: `tsc --noEmit` passes; `vite build` succeeds (JS 208.27 kB, <10 KB growth).
  Browser verification pending: mark 3 letters on pages 3, 255, 587+, click log rows to
  confirm flash lands on same letters; export JSON before/after — identical `tid` and
  `location` fields.

### Item 3: Offline-first service worker — DONE (2026-07-04)
- **Hand-rolled SW** (`public/sw.js`): no Workbox dependency. On `install`, precaches
  both fonts (`hafs.18.woff2`, `InterVariable.woff2`) + all 604 page JSONs (`/pages/p1.json`
  … `p604.json`) via `Promise.allSettled` — individual failures are logged but don't block
  the rest. Cache name is versioned (`tahqeeq-static-v1`).
- **Fetch strategies**: fonts & page JSONs → cache-first; app shell (`/`, `/index.html`)
  → network-first with cache fallback; JS/CSS modules → stale-while-revalidate.
- **Registration** (`src/lib/sw-register.ts`): skipped in dev (`import.meta.env.DEV`)
  to avoid fighting Vite HMR. In production, registers `/sw.js`, listens for `SW_PRECACHED`
  messages, and exposes a reactive `subscribeSW()` API.
- **Offline indicator**: `src/hooks/useOfflineStatus.ts` + Header integration.
  A small green pulsing dot appears next to the brand once precaching completes,
  with tooltip showing asset count (`Offline ready · 606 assets cached`).
- **Files**: `public/sw.js`, `src/lib/sw-register.ts`, `src/hooks/useOfflineStatus.ts`,
  `src/main.tsx` (calls `registerServiceWorker()`), `src/components/Header.tsx`,
  `src/styles/global.css` (`.offline-dot` + `@keyframes offline-pulse`).
- **Verified**: `tsc --noEmit` passes; `vite build` succeeds (CSS 28.50 kB, JS 211.84 kB).

### Item 4: Page-data slimming + font preload — DONE (2026-07-04)
- **Removed fields**: `generatedAt` and `totalLines` stripped from all 604 page JSONs +
  `page604.json`. `totalLines` was never used by the app; `generatedAt` was build metadata.
- **Compact format**: Build script (`scripts/build-data.mjs`) now emits `JSON.stringify(out)`
  instead of `JSON.stringify(out, null, 2)` — no whitespace. `scripts/slim-pages.mjs` retroactively
  stripped existing files.
- **Result**: 15.0 MB → 7.9 MB (47% reduction). Individual files: p1.json 6.2 KB → 3.0 KB;
  p604.json 14.6 KB → 7.2 KB.
- **Font preload**: `<link rel="preload" as="font">` added to `index.html` for both
  `hafs.18.woff2` and `InterVariable.woff2` (with `crossorigin`). Eliminates FOUT/re-measure
  cycle on cold load.
- **Files**: `index.html`, `scripts/build-data.mjs`, `scripts/slim-pages.mjs`,
  `src/lib/page.ts` (removed `totalLines` from `MushafPage` type and `castPage`).
- **Verified**: `tsc --noEmit` passes; `vite build` succeeds.

### Item 5: Marginalia (juz / hizb / sajdah) — DONE (2026-07-04)
- **Data generation**: `scripts/build-marginalia.mjs` reads all 604 page JSONs, maps each
  page's first verse to a juz using standard juz verse boundaries, and identifies sajdah pages
  from a canonical 15-verse list. Outputs `src/data/marginalia.ts`.
- **Juz display**: `juzByPage` lookup shows الجزء N (Arabic numerals) at the top of every page.
  `toArabicNum()` helper converts Western digits to Arabic-Indic (٠١٢٣...).
- **Sajdah indicator**: A small ۩ symbol appears above the ayah-number word for verses that
  require prostration. Uses `sajdah` class on the `.m-word` span with `::after` positioning.
- **Files**: `scripts/build-marginalia.mjs`, `src/data/marginalia.ts`, `src/components/Mushaf.tsx`,
  `src/styles/global.css` (`.juz-label`, `.sajdah-mark`).
- **Verified**: `tsc --noEmit` passes; `vite build` succeeds.

### Item 6: Special pages 1–2 refinement — DONE (2026-07-04)
- **CSS**: `.page-special` narrows measure to `max-width: 72%`, centers with auto margins,
  bumps font to `clamp(24px, 2.8vw, 34px)` and line-height to `2.15`. Basmala lines get
  proportionally larger too.
- **Data**: Pages 1–2 already have `special: true` in their JSONs. The `Mushaf` component
  applies `page-special` class when `pageData.special` is true.
- **Font auto-fit**: Special pages still skip auto-fit (all lines centered via `fitLines()`).
- **Files**: `src/styles/global.css`, `src/components/Mushaf.tsx`.
- **Verified**: `tsc --noEmit` passes; `vite build` succeeds.

## KIMI_TASK_POLISH_OPTIMIZE.md — ALL ITEMS COMPLETE
All 6 items from the typography fidelity + optimization backlog are done and verified.

## Post-Kimi stabilization (2026-07-05) — kashida/offline pass was crashing; FIXED
Kimi implemented backlog items 1–2 (gap clamp + kashida), 3 (service worker), 5
(juz/sajdah marginalia). Three defects made the app "buggy and unresponsive":
1. **Layout feedback loop → crash.** fitLines decided kashida from DOM widths that
   already included kashida; the decide→render→re-measure cycle never reached a fixed
   point (font size + tatweel oscillated; React threw "Maximum update depth exceeded"
   and unmounted; old tabs sat frozen). FIX: logical word widths are measured once from
   a clean (un-elongated) DOM and cached per (page, container, font); all decisions read
   the cache; state commits are strict no-ops when unchanged; bounded font adjustments +
   a 24-pass circuit breaker. Verified: stable snapshots over 3s, kashida renders (13
   elongated words on 604), marking an elongated word works, 6 rapid page flips fine.
2. **public/sw.js was TypeScript in a .js file** — would fail to parse in production.
   Rewritten as plain JS (also fixed GET_STATUS to report real cache counts, single
   cache name, cache v2).
3. **Stale-SW hazard in dev** — sw-register now actively unregisters any leftover
   worker + clears tahqeeq-* caches when running under Vite dev, so a previously
   registered SW can never intercept dev modules again.
Also: measure() clamps grapheme→display ranges to the node length (transient mismatch
can no longer throw IndexSizeError and kill the component).

## Kashida (tatweel) REMOVED at founder's request (2026-07-05)
Founder explicitly did not want letter elongation and reported the app still "buggy and
unresponsive" after the prior stabilization attempt. Root cause: my earlier fix reduced
the oscillation but the kashida decide→render→re-measure cycle was still fundamentally
fragile — the previous session's "fixed" version could still hit React's nested-update
limit ("Maximum update depth exceeded"), crash the `<Mushaf>` tree, and leave a frozen
tab. Rather than patch it further, **kashida is now fully removed**:
- Deleted `src/lib/tatweel.ts` entirely (dead code, unimported).
- `Mushaf.tsx`: removed `wordDisplay` state, the tatweel imports, the
  distribute/insert-tatweel branch in `fitLines()`, the `data-logical-text` attribute,
  and the display/logical mapping in `measure()`. Words render their plain original text
  (`w.text`) again, exactly as they exist in the data — no letter elongation anywhere.
- Kept from the same backlog item: the **gap-clamp** behavior (a line that would need an
  unnaturally wide inter-word gap to justify is centered with a normal gap instead of
  being stretched) — this is the fix for "kalima too far apart" and does not touch glyph
  shapes at all, so it carries none of the kashida risk.
- Kept: juz/hizb margin label and sajdah marker (`marginalia.ts`) — unrelated feature,
  untouched, still working.
- Verified after a full clean reload (fresh timestamp, not stale HMR state): 0 tatweel
  characters anywhere, layout stable across 3 snapshots ~2.4s apart, marking a letter
  works (score deducts correctly, logged), 5 rapid page flips with no crash and no new
  console errors, no horizontal overflow, `npx tsc -b` and `npm run build` both clean.
- Also confirmed the dev-mode stale-service-worker purge (from the prior stabilization)
  is still intact — a leftover SW from an earlier prod/preview run can't reappear.

## On GitHub (2026-07-05)
Repo: https://github.com/yaishmohamedniyaaz-netizen/tahqeeq (PRIVATE, branch main).
Pre-upload check: tsc + build clean; 604 page JSONs valid (p1 special, spot-parsed
p1/p300/p604); 114-surah index; 0 kashida leftovers. Cleaned before first commit:
Kimi scratch (tmp-*.cjs/js, req-*.json, screenshots/, broken build-data-new.mjs,
build-test.mjs, stray temp file), tsbuildinfo caches, settings.local.json — all now
gitignored. Kept: scripts/build-data.mjs (real 604-page generator), build-marginalia.mjs,
slim-pages.mjs.

## DECISION NEEDED — which big feature next? (pick one and I'll go deep)
1. Full-mushaf coverage — exact printed-page fidelity via QPC v1/v2 page-glyph fonts + QUL
   layout data, so any surah/page can be judged (currently 3 short surahs).
2. Deeper mistake-type capture — drag deeper into a category (e.g. Jalī → which letter was
   substituted; Khafī → which tajwīd rule), needs the tajwīd taxonomy decided.
3. Multi-judge mode — several judges scoring one reciter, with reconciliation/averaging.
4. Backend + multi-device — move sessions/stats off localStorage to a real backend so records
   sync across judges/competitions (enables the cross-island accountability at scale).
5. Jali/Khafi guidance layer — system help classifying a mark as Jalī vs Khafī.
6. AI-ordered mistake menu — order categories/letters by frequency from collected data.

NOTE on verification env: synthetic-pointer tests are unreliable here — the recreated Chrome
tab reports 0x0 viewport, and the headless preview throttles CSS animations + has a short
viewport that clips low menus (elementFromPoint returns null off-screen). Verify gestures in
the headless preview with a TALL viewport (preview_resize ~1200x1900) and a top-of-page
letter, or in a real foreground browser.

Bigger items that NEED the user's steer (do not build blind):
- [x] Full mushaf coverage (all 604 pages with lazy loading, navigation, cross-page marks)
- [ ] Stats/accountability layer across islands & classes (data model + dashboards)
- [ ] Multi-judge; Jali/Khafi guidance layer; deeper mistake-type capture; AI-ordered menu
- [ ] QPC v1/v2 page-glyph approach for exact printed-page fidelity

## Notes / decisions for later
- Default scoring config: Lahn Jali start 30 / step 2; Lahn Khafi start 20 / step 1;
  Fasaha start 10 / step 0.5. All adjustable per competition.
- Later layers (not now): statistics/accountability across islands & classes; multi-judge;
  Jali/Khafi guidance layer; AI-ordered mistake menu; full mushaf; tablet/pen.
