# Codex long task: draw the pages with DigitalKhatt and colour the mistaken letter

Status: ready to hand over (9 November 2026).
Base branch: `claude/criterion-bar`. Work on a new branch **`codex/digitalkhatt-pages`**.
**Never push to `main`** (a push to main deploys the live app). Push your branch at every checkpoint; Cloudflare makes a preview for it.

The owner has many Codex tokens and wants a **long-horizon** effort. **Correctness matters more than cost.**

> **This task replaces the underline / letter-border work.**
> Stop `CODEX_TASK_LETTER_POSITIONS_LONG.md`, `CODEX_TASK_LETTER_BORDERS_VISUAL.md` and `CODEX_TASK_LETTER_BORDERS_ALL_PAGES.md`.
> Do not delete their code or data. The app keeps the underline code, switched off.

---

## 1. The goal in one picture

**See the prototype first:** <https://claude.ai/artifact/J4GKjAVpS8SzgmgQCv5ePZ> ("Letter Colour Test", pages 3 and 582). Its code is in `scripts/digitalkhatt/prototype/` (read its `README.md`).

What the judge sees in the new mode:

1. **The page is drawn from the DigitalKhatt old Madina font**, not from the scanned artwork image. Same lines, same words per line as our 1405 print.
2. **Tap a word** → the letter tray opens with the **big word** (also drawn with DigitalKhatt) and **one button per letter**.
3. Choose a letter and a criterion (Jali, Khafi, Fasaha).
4. The mark shows as:
   - **the whole word: a light wash** in the criterion's tint, *under* the ink;
   - **the mistaken letter itself: its own ink in the criterion's strong colour** (the letter body *and* its dots and harakat).
5. **No underline and no count circle** in this mode. The coloured letter shows which letter it is.

Why: the underline method has a ceiling. Two rounds (pixel rules and looking at every word) both stopped at about **84%** "short bar under the right letter". A vertical cut cannot split letters stacked on top of each other (على, لكم, بسم, lam-alif). DigitalKhatt draws **each letter as its own glyph**, so the letter is known exactly, with no guessing.

---

## 2. What Claude already checked (facts you can rely on, but re-verify at scale)

**Source:** `git clone https://github.com/DigitalKhatt/oldmadinafont` (tested at commit `adc60f3`, 2 November 2026).
- Font files: `fonts/oldmadina.otf`, `.ttf`, `.woff2`. **Font licence: SIL OFL 1.1** (`LICENSE`).
- Sample PDF: `old_Madinah_mushaf.pdf`, **605 pages**. **PDF page n+1 = Mushaf page n** (0-based PyMuPDF index n = Mushaf page n).
- The README says the font is "based on the old Madina Mushaf (1995)". Our app uses the **1405 AH print**. Line breaks matched on the pages Claude checked (3 and 582), but **you must check every page** (Phase 0).

**How the PDF is built:**
- Fonts are **Type3**. Each font's `/Encoding /Differences` gives readable glyph names: `alef.isol`, `behshape.init`, `onedotdown`, `fatha`, `space`, `endofaya1`, `surah_…`.
- PyMuPDF `page.get_texttrace()` order **equals** the `<use>` order in `pdftocairo -svg` output (asserted on pages 3 and 582).
- **Base** glyph families start a letter. **Mark** families (dots, harakat, `wasla`, `hamzaabove`/`below`, `smallalef`, `maddahabove`, …) belong to the previous base.
- Words end at `space` or `endofaya*`, and at a line change.

**Counts:**

| Page | DigitalKhatt words | App words (`role: letter`) | Note |
|---|---|---|---|
| 3 | 127 | 127 | equal |
| 582 | 109 | 105 | the basmala's 4 words are counted by DigitalKhatt |
| 1 | — | — | **355 `<use>` vs 356 trace entries**: prototype assert fails |

All **560 letters on page 3** were tappable and colourable in the prototype.

**Sizes (one page):**

| Asset | Raw | Gzip |
|---|---|---|
| Artwork PNG p3 / p582 (current app) | 189 KB / 201 KB | — |
| DigitalKhatt SVG p3 (pdftocairo, glyph outlines repeated per page) | 404 KB | 55 KB |
| DigitalKhatt SVG p582 (surah header images inflate it) | 1.78 MB | 218 KB |

---

## 3. Rules you must not break

- **No push to `main`.** Never.
- **The current artwork mode stays exactly as it is.** The new drawing sits behind a switch (see 6.1). Default stays **artwork** until the owner says otherwise.
- Do not edit `public/mushaf/` (artwork and page data), the approved borders in `public/letter-borders/`, or the letter-unit rules in `src/lib/judgingUnits.ts` (rule `qpc-hafs-v1-targets-4.0.0`).
- **Marks stay keyed by the app's own ids**: word id `wid` (for example `2.6.1`) and letter unit `tid` from `judgingTargetsOf`. A mark made in one drawing mode must show in the other mode and in saved sessions, results and replays.
- **Licence:** use the OFL font and DigitalKhatt's open tooling. Before shipping anything derived from `old_Madinah_mushaf.pdf` itself, **check its licence** (the OFL covers "Font Software"; the PDF may not be covered). If it is unclear, generate the layout yourself with DigitalKhatt's own engine (Phase 1, option B) and write down what you found. Add an attribution line (DigitalKhatt, OFL 1.1, sponsored by Tarteel) where the app lists credits.
- Present visible changes to the owner for approval (see `AGENTS.md`). Checkpoints below are where that happens.
- Every pipeline step must run again with **one command, deterministically**.

---

## 4. Phase 0: does DigitalKhatt match our print on every page?

Before building anything, **prove the layout matches** on all 604 pages.

For each page:
1. Lines: DigitalKhatt line count = app line count (`line` field in `public/mushaf/1405-artwork-5a5f9f3846158475/p{N}.json`).
2. Words per line: equal, after removing headers, basmala and ayah markers.
3. Word text: compare the DigitalKhatt word's letters with the app word's `text` (skeleton letters only, no harakat). Report every mismatch.
4. Rough position: the DigitalKhatt word's box, scaled to the artwork's 1920×3106 frame, overlaps the app word's `body` box (report the median and worst IoU per page).

Write `scripts/digitalkhatt/reports/parity.json` and a short `PARITY.md`:
- pages that match fully;
- pages with any difference, with the exact words.

**If more than a few pages differ, stop and report.** The owner decides whether the mode can show those pages (or falls back to the artwork for them).

---

## 5. Phase 1: the page-drawing pipeline

### 5.1 Choose how pages are delivered (measure, then decide)

Try at least these and **measure size, first-paint time and correctness**:

- **A. Pre-built per-page SVG** (like the prototype), cleaned:
  - one shared **glyph atlas** (each distinct glyph outline once, deduped by path hash across all pages), plus per page only `<use>` positions;
  - or per-page SVG with outlines inline. Compare total and per-page gzip/brotli size.
- **B. DigitalKhatt's own layout engine** (their justification-aware HarfBuzz fork / web or TypeScript renderer, see <https://github.com/DigitalKhatt>). Generate glyph ids and positions per page from the font yourself, at build time or in the browser. This also removes any dependence on the sample PDF.
- **C. The `.woff2` font plus per-page glyph positions**, drawn as SVG `<text>`/`<tspan>` with glyph positions, if the browser draws it identically. Check Safari/iPad especially.

Pick the option that is **exact, offline-friendly and small**. A judge's tablet may be offline after the first load: pages must work with the app's existing offline/cache logic (see `src/lib/fixedMushafPackage.ts`, `OfflineMushafPrompt.tsx`).

### 5.2 Per-page data (whatever option wins)

For each glyph you draw: `page`, `line`, `wid` (app word id, after mapping), `tid` (app letter unit, after mapping), whether it is a **base** or a **mark**, and its geometry (enough for a hit box).

Also per word: its **box** in page coordinates (from glyph geometry). The app needs it for taps, the wash and the tray.

Headers (surah names), basmala, ayah markers and ornaments: draw them, but give them **no** `wid`/`tid` unless the app already treats them as words.

### 5.3 Fix the known gaps
- Page 1 mismatch (355 vs 356).
- The prototype's letter labels are approximate (`label()` in `build.py`). The final mapping must come from the text, not from guessing shapes (Phase 2).
- Ids must be unique per page (the prototype prefixes `p{N}`), because two pages show side by side.

---

## 6. Phase 2: map DigitalKhatt letters to the app's letter units

The app judges **letter units** (`judgingTargetsOf` in `src/lib/judgingUnits.ts`, rule `qpc-hafs-v1-targets-4.0.0`). These differ from glyphs:

- **madd alifs are merged** into their carrier letter: the alif's glyphs get the carrier's `tid`;
- **silent letters** (written, not pronounced) are their own units and need their own colour;
- **dagger alif / small alif, small waw, small yeh**: decide per the app's rules (if a unit exists, it gets its glyphs; if not, it joins the letter it sits on);
- **lam-alif**: one ligature glyph or two glyphs; each unit must get the right part. If one glyph holds two units, report it: the owner decides how to colour it (both, or a split by outline);
- **dots, harakat, shadda, sukun, hamza** belong to the letter they sit on;
- **tatweel/kashida** joins the letter it extends (the left one, as in the earlier style guide).

Method: align the DigitalKhatt glyph sequence of each word with the app word's `text` and its units (a small sequence alignment, not shape guessing).

**Coverage report** `scripts/digitalkhatt/reports/mapping.json` + `MAPPING.md`:
- every app word has a DigitalKhatt word;
- **every app letter unit has at least one glyph**; target: **zero unmapped units** on all pages;
- glyphs with no unit (list them by kind);
- the special cases above, with counts and 10 examples each (images).

---

## 7. Phase 3: build it into the app (behind a switch)

### 7.1 The switch
In **Marking settings** (`src/components/MarkingSettings.tsx`, stored in `src/lib/markingPreferences.ts`): **"Page drawing: Print (artwork) / DigitalKhatt"**. Default **Print**. Normalise old saved preferences safely.

### 7.2 Drawing the page
- Draw the DigitalKhatt page in the same place and size as the artwork (`Mushaf.tsx`, `FixedMushafPageSurface.tsx`, `fixedMushaf.css`). Two-page spreads, zoom, mobile and the calibrated layouts must still fit.
- Ink uses `currentColor`, so **light and dark mode** work.
- **Faded lines** (lines outside the question) fade exactly like now; **marks on faded lines stay bright** (see the existing `outside-question` rule in `fixedMushaf.css`).
- Fetch pages lazily, cache them, and preload neighbours like `preloadPage` does now.

### 7.3 Taps and the tray
- Word hit boxes come from **DigitalKhatt geometry** in this mode (not the artwork boxes).
- The tray's big word is drawn with DigitalKhatt; one button per **letter unit**, in reading order, with silent letters shown faded as now.
- All existing marking orders keep working: criterion first, drag-and-hold, word first, the scorecard rows as criterion buttons, hold to keep, keys, pen settings.

### 7.4 How a mark looks (match the prototype)
- **Word wash**: the word's box filled with the criterion's **tint**, under the ink. With several marks on one word, use the latest mark's tint.
- **Letter colour**: every glyph of the marked unit (base and marks) drawn in the criterion's **strong** colour. Several letters in one word may be marked with different criteria.
- Colours: reuse the app's criterion tokens (`--isl-strong`, `--isl-container` per `.cat-*` in `src/styles/global.css`, light and dark). The prototype used `--jali #ca244d`, `--khafi #d58e3a`, `--fasaha #3358d4` and tints `#fbe3e6`, `#f8ead6`, `#e2e8fa` (dark `#49282b`, `#442e15`, `#27324d`).
- **Word-level criteria** (marks with no letter): word wash only.
- **No underline, no count circle** in this mode (`underlineFor`, `lettersUnderlined`, `summary.marker` in `Mushaf.tsx`).
- Undo, remove and repeated mistakes work as now.

### 7.5 Every place that shows marks on a page
Find all of them (search for where marks are drawn on words) and make each follow the switch, or list why not. At least: the judging Mushaf, the question preview (`QuestionMushafPreview.tsx`), replay (`ReplayKalima.tsx`, `RecitationReplayPlayer.tsx`), participant results (`ParticipantResultDetail.tsx`, `ResultSheet.tsx`).

### 7.6 Tests
- Keep all existing tests passing (`npm test`, `npx tsc -b`, `npm run build`).
- Add tests: mapping coverage for a sample of pages, the preference switch, a mark showing the right glyphs coloured, marks surviving a switch between modes.

---

## 8. Phase 4: check it by looking

- **Side-by-side sheets** (artwork | DigitalKhatt) for 30 random pages (seed **20261109**) plus pages 1, 2, 3, 50, 187, 293, 582, 600, 604: `scripts/digitalkhatt/contact/`.
- **Colour sheets**: 200 random words (seed 20261109), each with one random unit coloured, plus 40 stacked-letter and lam-alif words. The owner checks these by eye.
- **Performance** on a mid-range tablet profile (Playwright, CPU ×4 slowdown): page turn time and memory, artwork vs DigitalKhatt.

---

## 9. Checkpoints (stop and hand back at each)

**Checkpoint 1: proof and pipeline.**
- Phase 0 parity report for **all pages**.
- The delivery option you chose, with the measurements for A/B/C.
- Phase 2 mapping report for **all pages** (zero unmapped units, or a clear list).
- The switch working in the app for **pages 1–3, 50, 187, 293, 582, 600, 604** at least, on your pushed branch (preview URL).
- Sheets from Phase 4 for those pages.
- **Stop.** Claude shows the owner; the owner decides.

**Checkpoint 2: everything.**
- All 604 pages in the app behind the switch, offline caching included.
- All places from 7.5.
- Full sheets, performance numbers, tests.
- **Stop.**

---

## 10. Hand back (at each checkpoint)

- Push `codex/digitalkhatt-pages`. **Not main.** Say the commit id.
- Append to the end of this file:
  - results tables (parity, mapping, sizes, performance);
  - what failed, what you are unsure of, and the **questions for the owner** (for example: how to colour one glyph that holds two units);
  - the licence findings;
  - honest cost counts (time, tokens if known).
- Then Claude reviews the branch, shows the owner the preview and sheets, and asks for approval.
