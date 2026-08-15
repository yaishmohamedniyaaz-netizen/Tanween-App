# Mistake log correction — implementation plan

**Status:** implemented and verified locally on 2026-08-15; commit and public
deployment pending final diff approval.

**Planning base:** `e96668a` (`codex/mark-chips`). The working tree also contains unrelated user-owned files and edits; those remain outside this plan.

**Preplan:** [MISTAKE_LOG_CORRECTION_PREPLAN.md](./MISTAKE_LOG_CORRECTION_PREPLAN.md)

## 1. Approved outcome for this slice

This update will correct the judge-facing mistake evidence and two related rail-layout defects without changing Quran source text, scoring, deductions, target identity, or historical evidence.

The completed slice must:

- show the semantic target `ء` in compact judge-facing places for a hamza carried by ya, waw, alif, or Quranic tatweel;
- retain the exact full marked form, such as `ئِ`, in the evidence model and exports;
- keep every current mistake mounted and reachable in newest-first order;
- prevent flex compression, expanded-row clipping, and Arabic tashkil clipping;
- present one compact `View all` action and keep Current/History navigation inside the full panel;
- keep the kalimah and Quran reference together in one category-tinted evidence pill;
- preserve the 24px minimum deduction-control hit area while making its geometry align with the evidence pill;
- center ordinary scores and the Adu & Raagu picker value in the same 66px score column; and
- normalize semantic letter statistics without changing stable location grouping or raw exports.

Same-kalimah grouping is not part of this update. It remains the named grouping
decision in [UNDECIDED_DECISIONS.md](./UNDECIDED_DECISIONS.md).

## 2. Lead decisions

These decisions are resolved for implementation and should not be reopened inside the coding pass.

### 2.1 Display and evidence

1. `Mistake.glyph` remains an immutable historical full-form snapshot. It is not renamed, stripped, or rewritten.
2. A pure shared helper supplies judge-facing glyphs:
   - `mistakePrimaryGlyph(mistake)` returns a non-empty `primaryGlyph`, otherwise the immutable `glyph`, otherwise `"—"`;
   - `mistakeFullGlyph(mistake)` returns a non-empty `fullGlyph`, otherwise the immutable `glyph`, otherwise `"—"`.
3. Do not infer a primary hamza by deleting carrier code points from an unresolved legacy string. Target-aware migration may hydrate the fields; unresolved evidence stays exact and readable.
4. Current V2 records missing either display field are eligible for the existing non-destructive target migration. This is field hydration, not evidence mutation.
5. Compact judge-facing surfaces use `mistakePrimaryGlyph`. Raw JSON/CSV exports continue using the stored `glyph` field in this slice.

### 2.2 Mistake list behavior

1. Current mistakes stay sorted by descending `ts`.
2. Remove the five-item data slice. The compact rail renders the complete current list; its existing height exposes the newest rows first and vertical scrolling reaches earlier rows.
3. The compact list does not group, virtualize, paginate, or reorder entries.
4. Only one row remains expanded at a time.
5. Opening a row dispatches the existing Mushaf jump and then scrolls that row's full bounds into the nearest visible part of the list after expansion layout completes.
6. The compact header shows one `View all` action when either:
   - more than five current mistakes exist; or
   - a judging action beyond the initial `session_started` event exists.
7. `View all` opens Current when current mistakes exist. If Current is empty but reviewable history exists, it opens History.
8. Inside the full panel, Current and History remain separate tabs. History remains reverse chronological and ungrouped.

### 2.3 Full-panel accessibility

1. The expanded side sheet is a labelled modal dialog with the existing backdrop.
2. Opening records the triggering element and focuses the Close button.
3. Escape closes the panel. Tab and Shift+Tab remain within the expanded panel while it is modal.
4. Closing by Close, Escape, or backdrop restores focus to the triggering `View all` button when it still exists.
5. Tabs expose `role="tab"`, `aria-selected`, `aria-controls`, and matching tab panels. Switching tabs does not mutate data or list order.

### 2.4 Arabic evidence geometry

1. The whole kalimah stays in the category-tinted pill. The surah/ayah reference remains immediately adjacent inside that pill.
2. The Quran word may not use ellipsis or hidden ink. Remove the tight 1.2 line height and give the app's Quran font enough line box and block padding for stacked marks.
3. Keep the word as one RTL unit. Do not insert breaking opportunities inside Quran text.
4. The Latin-numeric reference is isolated with `<bdi>` so bidirectional ordering does not move punctuation around the Arabic word.
5. The deduction stepper retains 24px buttons for target-size compliance. Its border, value, and icons are vertically centered within the same evidence row; reducing the clickable target below 24px is not accepted.

### 2.5 Adu & Raagu alignment

1. The fourth grid column remains 66px for every score row.
2. `.sc-score` and `.mark-picker` both center their complete `value / maximum` group within that column.
3. Ordinary and picker values use 14px/500; both maximum fragments use 12px/400 and the same muted color.
4. The picker border remains because it communicates editability. The visible control contains only the value and maximum.
5. Gesture, keyboard, step, and competition-setting behavior are unchanged. This slice does not alter the existing 0.5-capable interaction.

## 3. Architecture and file-level changes

### 3.1 New semantic display helper

**Add:** `src/lib/mistakeDisplay.ts`

Implement two pure exported functions over a narrow `Pick<Mistake, "primaryGlyph" | "fullGlyph" | "glyph">` input.

Required properties:

- deterministic and side-effect free;
- preserves Unicode exactly—no normalization, code-point deletion, or trimming of returned source text beyond checking whether a candidate is empty;
- has no dependency on React, page loading, the target compiler, or global state; and
- can be imported by components, statistics, and Node tests.

Suggested contract:

```ts
type MistakeGlyphEvidence = Pick<Mistake, "primaryGlyph" | "fullGlyph" | "glyph">;

export function mistakePrimaryGlyph(mistake: MistakeGlyphEvidence): string;
export function mistakeFullGlyph(mistake: MistakeGlyphEvidence): string;
```

Only the primary helper is expected in current compact UI. The full helper prevents future callers from re-implementing a different fallback and is exercised by tests.

### 3.2 Target hydration

**Change:** `src/state/migrateTargets.ts:109-117`

Extend the existing legacy/current-field eligibility predicate with:

```ts
!mistake.primaryGlyph || !mistake.fullGlyph
```

Do not change `patchForWord`, `unresolvedPatch`, page grouping, or the exclusion of mutable/historical `glyph` from patches. Existing `APPLY_TARGET_MIGRATION` behavior in `src/state/store.tsx:1167-1192` already projects patched event snapshots into current and saved sessions and should remain untouched unless a failing test proves otherwise.

### 3.3 Compact log and full panel

**Change:** `src/components/MistakeLog.tsx:1-214`

Data and copy changes:

- import `useLayoutEffect`, `useRef`, and `mistakePrimaryGlyph`;
- keep `ordered`, remove `visible` and `slice(0, 5)`;
- map `ordered` in both compact and expanded Current views;
- render `mistakePrimaryGlyph(mistake)` in `.log-glyph`;
- keep `mistake.wordText || mistakeFullGlyph(mistake)` for the whole-kalimah fallback;
- replace the compact History button with the single conditional `View all` action;
- calculate `hasReviewHistory` by ignoring an isolated `session_started` event;
- open Current when it has rows, otherwise History;
- change the empty copy inside an expanded Current tab to `No current mistakes.` while retaining the compact instruction when no evidence has been recorded; and
- render the reference in `<bdi className="log-kalimah-ref t-num">`.

Row visibility changes:

- retain refs for the list and each rendered row;
- after `openId` changes to a row, use a layout effect plus one animation frame to call `scrollIntoView({ block: "nearest", inline: "nearest" })` on that row;
- do not use smooth scrolling, because judging should remain immediate and reduced-motion-safe; and
- clear a stale `openId` if its mistake is undone.

Expanded-panel changes:

- add stable IDs for the panel title, Current tab/panel, and History tab/panel;
- apply dialog semantics only while expanded;
- record and restore the opener;
- focus Close on open;
- implement Escape and a small focus loop inside the existing component; and
- preserve backdrop-click closing and both rail-side layouts.

Do not introduce a general dialog abstraction in this slice. That would widen the diff beyond the named defect.

### 3.4 Shared history and review surfaces

**Change:** `src/components/JudgingHistory.tsx:1-150`

- import and use `mistakePrimaryGlyph` at the existing `.history-glyph` seam;
- retain all event copy, category resolution, restore rules, and reverse chronological order; and
- do not synthesize a glyph for amount/note/recategorization events that do not carry a full `Mistake` object.

**Change:** `src/components/RecordsView.tsx:551-565`

- import and use `mistakePrimaryGlyph` for `.drill-glyph`;
- keep the saved label, category, amount, session identity, and ordering unchanged.

**Change:** `src/components/ResultSheet.tsx:153-163`

- import and use `mistakePrimaryGlyph` in the printed glyph cell;
- keep the full ayah text and stored location beside it, which supply the printed Quran context; and
- make no pagination or print-layout redesign in this pass.

### 3.5 Statistics

**Change:** `src/lib/stats.ts:1-103`

- import `mistakePrimaryGlyph`;
- key `letterMap` by the semantic primary label;
- initialize each stable `tid` location's visible glyph with the same primary label;
- retain `tid` as the location-map key;
- retain counts, deductions, category aggregation, filters, limits, and sort behavior; and
- keep the public `RecordsStats` shape unchanged (`glyph` remains the view-field name).

This prevents `ء`, `ئِ`, `ؤُ`, and other full forms from fragmenting one judge-facing hamza statistic, while distinct target locations remain distinct.

### 3.6 CSS: mistake rail

**Change:** `src/styles/global.css:4752-5057` and `src/styles/global.css:6648-6715`

Required declarations and effects:

- `.mistake-panel .log` becomes the explicit flexing scroll owner (`flex: 1 1 auto`, `min-height: 0`, `overflow-y: auto`, `overscroll-behavior: contain`);
- `.log-row-wrap` receives `flex: 0 0 auto` so its 38px row and expanded content cannot be compressed;
- preserve wrapper overflow for rounded-corner/expansion clipping, but ensure the wrapper grows to the complete opened content before scrolling;
- keep `.log-glyph` centered and give it a diacritic-safe line box if carrier fixtures show any remaining crop;
- preserve the tinted `.log-kalimah` background and adjacent reference;
- remove `overflow: hidden`, `text-overflow: ellipsis`, and the 1.2 line height from the Quran word override;
- target Quran-word line height `1.5-1.6` with at least 1px internal block padding, finalized against the actual font in browser QA;
- keep `.log-adjust` and `.step-btn` at a 24px minimum hit target and center them against the pill;
- keep the full-panel Current and History scroll owners independent; and
- add visible `:focus-visible` treatment to View all, Close, tabs, rows, step buttons, and Undo only where the global focus rule does not already cover them.

Do not change the 420px desktop sheet width or the existing 390px mobile inset unless browser evidence shows clipping after the line-height correction.

### 3.7 CSS: score column

**Change:** `src/styles/global.css:4674-4716` and `src/styles/global.css:8137-8195`

- keep the shared fourth track at 66px;
- change `.sc-score` from right alignment to centered alignment and add `white-space: nowrap`;
- keep `.mark-picker` at 66px with its internal value/maximum group centered;
- change `.mark-picker-of` to 12px/400 to match `.sc-of`;
- preserve tabular numerals, border, hover/open states, hit area, and reason field; and
- do not change `.sc-deducted`, which is a separate 42px deduction column.

Browser acceptance is based on the center of the complete score string, not the right edge of individual digits. The ordinary score group and picker group must be within 1 CSS pixel of the fourth track's center.

### 3.8 Exports remain exact

**Do not change:** `src/lib/exportSession.ts:80-89` or `src/lib/exportSession.ts:191-203`

JSON and CSV continue exporting the immutable `glyph` snapshot. This plan intentionally separates compact judge-facing semantics from raw evidence compatibility. Tests must lock this down.

## 4. Tests and fixtures

### 4.1 Add one focused test file

**Add:** `scripts/mistake-display.test.mjs`

The test file should import the pure helpers, `computeRecords`, and Node's file-reading utilities for the few source/CSS contracts that cannot be rendered in the existing test runner.

Required cases:

1. A current page-199 fixture with `primaryGlyph: "ء"`, `fullGlyph: "ئِ"`, `glyph: "ئِ"`, and `wordText: "لَئِنۡ"` returns primary `ء` and full `ئِ` without changing the word.
2. Representative alif-, waw-, ya-, and tatweel-carried hamza fixtures all return `ء` as primary and preserve their distinct full forms.
3. An ordinary target returns its primary/full values unchanged.
4. A legacy record without new fields falls back to its immutable `glyph` for both helpers.
5. Empty optional fields fall back deterministically; no Unicode normalization occurs.
6. `computeRecords` combines full-form hamza variants under one primary `ء` top-letter entry.
7. `computeRecords` still keeps separate `tid` locations and shows each location's primary label.
8. Source contract: compact MistakeLog maps `ordered`, contains no `slice(0, 5)`, exposes one compact `View all`, and renders the shared helper.
9. Source contract: History, Records drill-down, and ResultSheet import the helper and do not render `mistake.glyph`/`m.glyph` directly at their glyph seams.
10. Source contract: JSON and CSV export lines still use raw `glyph`.
11. CSS contract: `.log-row-wrap` cannot shrink; the log is the scroll owner; the Quran word has no ellipsis/hidden overflow; score values are centered; both maximum fragments use 12px.

### 4.2 Extend target migration tests

**Change:** `scripts/target-migration.test.mjs:127-148`

Add cases proving:

- a version-current record missing `primaryGlyph` is hydrated;
- a version-current record missing `fullGlyph` is hydrated;
- hydration does not patch immutable `glyph`, amount, note, category, or timestamp;
- a fully complete V2 record still performs no page load; and
- an unresolved target still receives only unresolved metadata and retains the original glyph.

### 4.3 Update the existing visual/source contract

**Change:** `scripts/adu-raagu.test.mjs:466-492`

- update the kalimah fallback assertion to the shared full-glyph helper;
- retain the category-tint, adjacent reference, one-line evidence structure, 24px stepper target, and under-letter tray checks;
- add the shared centered score-column and matched maximum typography assertions; and
- retain all gesture, 0.5 selection, keyboard, and competition-setting tests unchanged.

### 4.4 Test command registration

**Change:** `package.json`

Add `scripts/mistake-display.test.mjs` to `npm test` beside the target-migration and judging-ledger checks. Do not add a new test framework or dependency.

## 5. Browser QA script

Use the deployed-equivalent local Vite build after automated checks pass. Test with real QCF assets, not synthetic Latin placeholders.

### 5.1 Core scenario

1. Start/reopen a judging session on page 199.
2. Navigate to 9:75 and select the hamza target in `لَئِنۡ`.
3. Record enough findings to capture one, five, nine, and twenty current rows across targets/categories.
4. Confirm compact hamza label `ء`; confirm the Mushaf still shows the exact word untouched.
5. Expand the page-199 row and capture the tinted kalimah/reference pill with all tashkil visible.
6. Expand the lowest visible row and verify the scroll position adjusts just enough to reveal all details.
7. Scroll to the oldest current mistake and back to the newest; confirm no row height compression.
8. Open `View all`; switch Current/History; close through Close, Escape, and backdrop; confirm focus return each time.
9. Undo a mistake, open History, restore it, and confirm chronology and score are unchanged.
10. Open Adu & Raagu and compare its closed value with every ordinary criterion before changing a mark. Verify drag, click, arrow keys, typing, and 0.5 commits still work.

### 5.2 Viewport and theme matrix

Run the core state at:

- 1440 × 900 desktop;
- 1280 × 800 desktop;
- 1024 × 768 narrow desktop/tablet;
- 390 × 844 phone.

At minimum, repeat the nine-row, lower-row-expanded, and full-panel states in both light and dark themes and with the judging rail on both left and right.

### 5.3 Required measurements

Capture console/browser evidence for:

- each closed `.log-row` height at or above 38px;
- each `.log-row-wrap` flex shrink value of `0`;
- compact list `scrollHeight > clientHeight` when nine/twenty rows exist;
- the expanded row's bottom bound inside the visible scrollport after auto-scroll;
- Quran word `scrollHeight <= clientHeight` with `لَئِنۡ` and no clipped ink in the screenshot;
- no horizontal overflow at 390px;
- ordinary `.sc-score` group center and `.mark-picker` group center within 1 CSS pixel; and
- focus remaining within the modal while open and returning to View all on close.

Do not approve the diff from screenshots alone.

## 6. Automated validation gate

Run in this order:

```powershell
npm.cmd test
npm.cmd run build
git diff --check
```

Then run the browser QA matrix. A broad pre-existing warning may be reported separately, but any failure in the new helper, migration, log, statistics, export, Adu & Raagu, TypeScript, build, or browser geometry blocks approval.

## 7. Documentation updates during implementation

**Change after verification:**

- `docs/MISTAKE_LOG_CORRECTION_IMPLEMENTATION_PLAN.md`: change status to Implemented and add commit/deployment evidence.
- `PROGRESS.md`: add a concise dated entry covering the semantic glyph correction, scroll/clipping fix, score alignment, tests, and public version.
- `docs/UNDECIDED_DECISIONS.md`: leave the same-kalimah grouping decision
  unresolved; only append implementation evidence clarifying that this pass
  intentionally retained the flat newest-first list.

**Do not change:**

- `docs/PRODUCT_FOUNDATION.md`, because it already establishes the primary/full glyph separation;
- `docs/MOBILE_MUSHAF_AND_PHONE_JUDGING_PLAN.md`, which is a separate untracked future plan;
- `.gitignore`, `.private/`, `tmp/`, or unrelated result/settings documentation.

## 8. Diff review and rollback

Before editing application files:

1. record `git status --short` and `git rev-parse HEAD`;
2. preserve all unrelated dirty files exactly as found;
3. review only the paths named in this plan; and
4. keep semantic-display/log work separable from score-alignment work.

Recommended commit split after all validation passes:

1. `fix: correct mistake evidence display and scrolling`
   - helper, migration, log, downstream surfaces, statistics, tests, and directly related docs;
2. `fix: center judging rail score controls`
   - score CSS, relevant Adu & Raagu contract assertions, and its verification note.

Push both commits together only after the lead reviews the complete diff. Publish the exact pushed commit through the repository's Sites workflow, wait for `succeeded`, open the public URL, and repeat the page-199 smoke check against the deployed build. If the user rejects the score visual, the second commit can be reverted without removing the evidence correction.

## 9. Explicit exclusions

Do not include any of the following:

- same-kalimah grouping;
- audio recording, Tilawa/Tarteel alignment, or timestamps;
- OCR or participant import work;
- a new results-screen redesign;
- Quran source/QCF glyph changes;
- a new target schema version;
- score allocation or deduction-rule changes;
- Adu & Raagu selector redesign beyond the closed-value alignment;
- export schema expansion;
- mobile Mushaf reflow work;
- general modal/dialog refactoring; or
- unrelated formatting and cleanup.

## 10. Final approval checklist

The lead approves implementation only when all are true:

- page 199 shows `ء` in compact evidence and preserves `لَئِنۡ`/`ئِ` exactly elsewhere;
- every carrier family and legacy fallback passes;
- all current mistakes remain mounted, newest first, non-shrinking, and scrollable;
- the lower expanded row and all Arabic marks are fully visible;
- compact navigation contains one `View all`, with History inside;
- focus and keyboard behavior pass;
- Records, History, ResultSheet, and statistics use the intended semantic display;
- raw JSON/CSV evidence remains unchanged;
- Adu & Raagu and ordinary scores share one measured center;
- full tests, build, diff check, and browser matrix pass;
- unrelated dirty files are absent from the implementation diff;
- the two commits match their declared scopes; and
- the public deployment resolves to the reviewed commit and passes the deployed smoke check.

## 11. Local implementation evidence

- The page-199 `لَئِنۡ` fixture renders semantic `ء` in the mistake row while
  retaining full `ئِ` and the whole marked kalimah in evidence.
- Nine desktop rows measured at 39.6px with `flex-shrink: 0`; the 260px compact
  list measured 388px of scrollable content instead of compressing its rows.
- The lower expanded row measured 87.5px and was fully contained after its
  expansion transition completed. The Arabic word's `clientHeight` and
  `scrollHeight` both measured 30px, with no hidden ink.
- Ordinary score and Adu & Raagu picker centers matched exactly at desktop,
  narrow desktop, phone, and both rail sides. No tested viewport produced
  horizontal document overflow.
- The full panel stayed within 390 × 844, opened as a modal on Current, kept
  keyboard focus inside, exposed History as a tab, closed with Escape, and
  returned focus to View all.
- Light/dark themes, 1440 × 900, 1280 × 800, 1024 × 768, 390 × 844, left/right
  rails, and the page-199 hamza case passed without browser-console errors.
- `npm.cmd test` passed 241 tests, the production build succeeded, and
  `git diff --check` is required again immediately before commit.
