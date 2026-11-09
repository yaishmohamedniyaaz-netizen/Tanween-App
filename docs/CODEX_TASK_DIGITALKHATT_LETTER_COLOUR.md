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

**Learned from the research round** (`codex/letter-positions-research`, `scripts/letter-masks/research/CHECKPOINT_1.md`):
- Rendering the old Madina font with *stock* HarfBuzz and **warping it onto the artwork** reached only **78%** (CTC recogniser 84%). **Do not register onto the artwork again.** This task draws the page *from* DigitalKhatt, so no warping is needed.
- Licences checked there: the font is **OFL 1.1**; DigitalKhatt's justification HarfBuzz (`justification` branch of <https://github.com/DigitalKhatt/harfbuzz>) is **Old MIT**, with separate notices in some subfolders. The OFL does **not** automatically cover the sample PDF. `medinamushafanalyzer` has no licence: do not use it.
- HarfBuzz clusters are not always single letters (ligatures, shared marks). Map from glyph sequence to letter units explicitly (Phase 2).

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

---

## Codex hand-back, 9 November 2026: Phase 0 early stop

Base inspected: `5d08cfa3028dc711852c6f1aaa9082f4ed5e5972` on
`claude/criterion-bar`. Work is on `codex/digitalkhatt-pages`.
**The Phase 0 stop condition has been reached. Checkpoint 1 is not complete.**
No later checkpoint, app switch or runtime change has been attempted.

### Results

Measure | Result
--- | ---
Pages audited | 604/604
App / DigitalKhatt corpus words | 77,433 / 77,433
Physical corpus lines and per-line word counts | Equal on all 604 pages
Strict skeleton equality | 77,140/77,433 words; 382 complete pages
Strict notation differences | 293 words on 222 pages; all equal under an explicitly separate hamza-notation diagnostic
Whole-frame geometry | 1,851 of 77,433 word boxes have zero overlap, across 537 pages
Pages 1 / 2 | All 29 / 36 words fail the required literal-frame overlap check
Full strict text-and-position pass | 41/604 pages
Phase 2 unit mapping / unmapped units | Not run; no zero-unmapped claim
A: SVG/atlas size and first paint | Not measured; stopped before Phase 1
B: source engine size and first paint | Official route identified, not built or measured
C: positioned font text / Safari correctness | Not measured
Tablet performance / contact and colour sheets | Not run; no visual approval claimed

Reports: [short parity report](../scripts/digitalkhatt/reports/PARITY.md),
[all-page table and every exact text difference](../scripts/digitalkhatt/reports/PARITY_DETAILS.md),
[machine-readable report with every zero-overlap word and its boxes](../scripts/digitalkhatt/reports/parity.json),
[licensing](../scripts/digitalkhatt/reports/LICENSING.md), and
[validation and cost record](../scripts/digitalkhatt/reports/VALIDATION.md).

### What this does and does not establish

The line breaks and number of words per line match everywhere. The PDF has
explicit `/ActualText`, so the comparison does not infer Arabic from the
prototype's approximate shape labels. All 848,524 glyph shows were checked by
font and code against PyMuPDF traces. This is extraction proof, not yet proof of
each glyph's visible letter identity or ownership by an app letter unit.

The 293 strict text differences are notation variants such as app
`ٱلۡأٓخِرِ` versus PDF `ٱلْـٔ͏َاخِرِ`, and below-seat versus above-seat hamza.
The audit lists them rather than silently changing the religious text or
judging rules. A separate documented diagnostic compares all these cases equal.
It is not an approved mapping policy and is not evidence of different recited
words.

Position was tested exactly as requested: scale the full 256×410 PDF frame to
1920×3106, without crop fitting, warping or artwork registration. Bounds are
the declared Type3 d1 bounds, not raster-measured tight ink. On most affected
later pages only a few words fail; “537 pages” does **not** mean every word on
those pages fails. Pages 1–2 have large vertical-layout differences. The required
overlap condition still fails on far more than a few pages, so work stops here.

### Questions for the owner

1. May the DigitalKhatt mode use its own geometry despite these literal-frame
   differences, with dedicated handling or artwork fallback for pages 1–2?
   Otherwise, should pages failing this gate remain in artwork mode? No fallback
   or fitting policy has been chosen automatically.
2. May the documented hamza-notation equivalences be used for the future
   glyph-to-app-text alignment, while preserving every app `wid`, `tid` and the
   unchanged `qpc-hafs-v1-targets-4.0.0` rules?

### Licence findings

The font is explicitly SIL OFL 1.1, credited to DigitalKhatt and sponsored by
Tarteel. The sample PDF's independent reuse grant remains unclear; the OFL does
not automatically cover the entire PDF. No PDF, extracted outlines, rendered
sheets or PDF-derived production assets are shipped by this audit.

An official PDF-independent generator and whole-glyph layout export exist in
VisualMetaFont. Its root licence is AGPL v3, separate from the font OFL. The
generator, its source/layout inputs and settings need their own review before
selecting Phase 1 option B. Exact regeneration of this June 2026 sample has not
been demonstrated. `medinamushafanalyzer` was not used.

### Validation, confidence and cost

- 14 focused Python tests passed with the pinned PDF.
- A separate 604-page rerun produced byte-identical reports in 57.668 seconds.
- Node 22.18.0: `npm test` passed 497 tests with one existing optional
  Tilawa-assets skip; TypeScript and production build passed.
- Protected artwork, page data, approved borders, judging-unit rules and all
  runtime source files are unchanged. The prior research branch is untouched.
- Confidence for this audit: practicality **95/100**, architecture/data safety
  **98/100**, visual certainty **88/100** for the demonstrated frame mismatch,
  not an approval of all-page rendering.
- Four complete audit executions, one early aborted development pass, focused
  probes and two read-only reviews. Total end-to-end time and token counts were
  not instrumented; no precise total is claimed.

The branch contains an audit, not a new DigitalKhatt UI preview. Do not proceed
to the pipeline, switch or Checkpoint 2 without the owner's gate decision.

---

## Codex continuation, 9 November 2026: word/unit proof and native pipeline

After the owner approved continuing with page/line/reading-order correspondence
and DigitalKhatt's own geometry, the investigation continued on
`codex/digitalkhatt-pages`. The owner also approved parallel work and asked to
proceed at full speed. The original Phase 0 findings above remain unchanged.

**The mapping and PDF-independent pipeline milestones are complete. The full
Checkpoint 1 is not complete: there is no app drawing switch or new UI preview.**
No runtime code, protected artwork, approved borders, judging-unit rules, saved
IDs or scoring contracts were changed. No main push or deployment is part of
this handback.

### Correspondence and ownership

Measure | Verified result
--- | ---
Pages / unique app words | 604 / 77,433
Same physical lines and words per line | All pages, both PDF audit and independent native source
Strict skeleton pairs / explicit notation cases | 77,140 / 293
Notation classes | 277 long initial hamza; 13 below-yeh; 1 below-waw; 2 exact singleton cases
PDF source-span target coverage | 298,431/298,431; zero unmapped/shared/unresolved
PDF owned glyphs / decorative waqf | 757,512 / 4,358
Independent fitted native target coverage | 298,431/298,431 with nonempty outlines; zero unmapped/shared/unresolved
Native visible owned glyphs | 757,526
Native no-target word-internal glyphs | 4,358 waqf signs and 5,860 empty space placeholders
Native supplementary singleton overrides needed | Zero in the fitted profile

Word pairing uses the existing app `wid`, physical line and reading-order slot,
never artwork overlap or approximate shape labels. The 293 exceptions are exact,
logged, directional classifications, not blanket hamza normalization. Raw source
and app texts remain unchanged. The app's own Node function generates every
`tid`; its hashes and rule version are checked.

Native ownership was audited independently from its own UTF-16 clusters,
glyph names, line/word bounds and nonempty contours. PDF glyph indices were not
transferred. A coarser default native profile needed a narrowly reviewed singleton
rule; the final fitted profile has finer clusters and does not need it. Geometric
mark attachment is not treated as semantic letter ownership.

Reports: [word correspondence](../scripts/digitalkhatt/reports/WORD_MAPPING.md),
[PDF-source unit mapping](../scripts/digitalkhatt/reports/MAPPING.md),
[native unit mapping](../scripts/digitalkhatt/reports/NATIVE_MAPPING.md),
[independent mapping review](../scripts/digitalkhatt/reports/INDEPENDENT_REVIEW.md),
and [native review](../scripts/digitalkhatt/reports/NATIVE_REVIEW.md).

### Source generation, size measurements and geometry

The official MIT website corpus contains the complete old-Madina text. A new
source-only SQLite adapter feeds the official native engine and the OFL font,
without reading the sample PDF. The engine was built in isolated research
scratch, with one documented Linux `dlopen` portability patch and explicit
compiler warning adjustments. No engine binary or third-party runtime code is
included in the app.

Measure | Verified result
--- | ---
Native corpus generation | All 604 pages, 9,046 lines, 854,159 nonheading glyph placements
Direct outline variants | 4,306; no missing non-space contours
Fitted native generation time | 32.13 s, 32.81 s, 28.93 s in three research runs
Native binary | 9,758,305 bytes raw; 4,335,075 gzip; 2,415,830 Brotli 9
Text sidecar | 1,797,218 bytes raw; 245,333 Brotli 9
Shared SVG atlas + all page placements | 988,061 + 11,737,856 bytes Brotli 9
Original native-frame ink audit | Six low-meem marks extend below the bottom; no horizontal advance overflow
Separate uniform bottom-padding candidate | +120 source units; zero clipped ink on all 604 pages; all glyph coordinates unchanged
Browser first paint / tablet / Safari | Not measured: Chromium IPC socket creation blocked in this executor

The native default policy was rejected because it left visibly overfull lines.
The candidate instead uses the engine's own `decl-policy`, `font-size-xscale`,
`standard` shrink settings. This is source layout, not registration or warping
onto the artwork. The native binary, sidecar and placement stream reproduced
byte-for-byte across all three fitted runs.

The six original-frame cases are p26 `2.176.12`, p294 `18.15.9`, p378 `27.22.11`,
p407 `30.32.7`, p589 `84.25.8`, and p601 `105.5.2`. The largest overshoot is
89.46 source units. The original failures remain recorded; the separate padded
candidate changes only the canvas height, uniformly across all pages. It has
not been silently selected as the production frame.

Nine source-generated checkpoint pages were rendered and sampled visually.
Decorative surah headings are deliberately omitted pending a licensed treatment.
Sizes exclude those decorations, app ownership metadata, the runtime renderer
and offline packaging. Option C, positioned static font text, does not yet have
proof of exact native parameterized glyph reproduction. No production delivery
winner or browser performance result is claimed.

### Source-only review deliverables

- A nine-page A3 comparison PDF places unchanged artwork beside the fitted,
  padded native body. Every page explicitly labels omitted decorative headings
  and the unapproved frame candidate. All nine PDF pages were rendered and
  inspected; no image cropping or layout overlap was found. The PDF repeats
  byte-for-byte (6,814,728 bytes, SHA256
  `6bb95a9a61ea836307876d04fc847cb7de3d06c82d84a8d4de7937bc0bf5b15c`).
- Fourteen source-native color sheets cover 200 seeded random words, 40
  text-selected lam-alif/stack candidates, five exact hard cases and nine
  checkpoint-page word examples: 254 distinct words in total. Every nonempty
  binary/placement occurrence was linked by line, cluster, glyph identity,
  final offsets and advance before coloring. All 29 output files reproduced
  byte-for-byte. Eleven focused color-proof tests pass.
- Actual hard-case, first random and first special-sheet pixels were inspected.
  Letter bodies, dots and assigned marks are colored together; waqf stays black.
  This is sampled visual evidence. The 40 special words are transparently
  selected by text, not a claim of 40 independently approved stacked shapes.
  The nine color examples are word crops, not complete colored page views.

These artifacts are delivered separately for review, not committed as production
assets. [COLOUR_PROOF.md](../scripts/digitalkhatt/reports/COLOUR_PROOF.md) records
selection, linkage, exact cases and remaining visual limits. The source pipeline
README includes the reproducible color and contact-sheet commands.

Details and reproducible commands: [source pipeline](../scripts/digitalkhatt/reports/PIPELINE_FEASIBILITY.md),
[machine measurements](../scripts/digitalkhatt/reports/native-pipeline.json),
[build instructions](../scripts/digitalkhatt/source_pipeline/BUILD_NATIVE.md),
and [local SVG measurements](../scripts/digitalkhatt/reports/SVG_RESEARCH.md).

### Licensing and remaining checkpoint work

The source route uses the OFL font, MIT website text and an AGPL build-time
generator, each with its own notices and pinned provenance. It avoids the sample
PDF's unresolved redistribution grant. A future app package must retain the
required notices and the DigitalKhatt / OFL 1.1 / sponsored-by-Tarteel credit.
Neither PDF-derived assets nor new native production assets are shipped here.

Before claiming Checkpoint 1:

1. Review the native frame and the source-generated visual proofs. Adopt an
   explicit no-clipping frame policy and licensed heading/ornament treatment.
2. Build the nine-page settings switch, renderer, word geometry and tray using
   the verified native IDs; keep artwork default and preserve all saved marks.
3. Test the actual browser/app, switching, color ownership, offline behavior and
   tablet/Safari rendering. Source-span coverage is not complete outline or
   interaction correctness.
4. Complete the required visual review and choose delivery based on measured
   app performance, then stop for owner approval before Checkpoint 2.

### Validation, confidence and cost

The PDF research aggregate ran twice and all nine reports were byte-identical.
The original parity files are unchanged. The 39 focused Python tests passed.
Four source-output safety tests and 14 native mapping tests passed, with a
separate all-page native mapping rerun producing identical reports. Node
22.18.0 passed 497 app tests with one existing optional skip; TypeScript and the
production build passed. The browser harness could not launch, including an
approved elevated attempt; no restriction was bypassed and no result invented.
The final source-pipeline suite, including the 11 color-proof tests, passed all
29 tests; together with the 39 core research tests, 68 focused tests passed.

Confidence: practicality **95/100** for the proved mapping/native pipeline;
architecture/data safety **96/100** with protected app contracts unchanged;
visual certainty **75/100** for sampled source glyph ownership, not production
approval. Browser behavior, full colored review and omitted headings remain
explicit limits.

Parallel work covered word exceptions, glyph ownership, source generation and
independent reviews. Multiple development probes and full-corpus runs were
performed. Native generation timings are measured above; total wall time and
token counts were not instrumented. No precise total cost is claimed.
