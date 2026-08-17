# True two-page Mushaf view — implementation plan

Status: implemented and verified on 16 August 2026

Prepared: 16 August 2026

Follow-up refinement, 16 August 2026: `Fit` is now the fresh-device default,
while an explicitly saved zoom remains unchanged. In Two pages, the shared page
selector occupies its own row above both papers, and Fit reserves that row before
calculating the uniform page scale. The desktop rail uses the remaining width
without displacing or overlapping either page.

Depends on:

- [`JUDGE_WORKSPACE_LAYOUT_AND_GUIDANCE_DETAILED_PLAN.md`](./JUDGE_WORKSPACE_LAYOUT_AND_GUIDANCE_DETAILED_PLAN.md)
- the implemented measured Mushaf viewport and uniform zoom contract
- the existing KFGQPC V1 1405H page, font, word-ID, and hitbox contracts

## 1. Verdict

Replace the current `Split page` behavior completely. It is not a two-page
Mushaf view: it takes one printed page and redistributes that page's lines into
two CSS columns. The new mode must render **two independent, consecutive 1405H
Mushaf pages**.

The recommended judging rule is:

- the selected page is on the right;
- the immediately following page is on the left;
- the two pages share one viewing frame, zoom level, scroll canvas, and
  navigation controller;
- page 604 is handled as the closing pair `603 + 604`;
- compact and phone layouts fall back to one real page without changing the
  saved desktop preference.

This is deliberately a **judging pair**, not an odd/even book-binding mode. A
question can start at any printed page. Showing `current + next` lets a passage
that crosses page 200 to 201 stay in one view; forcing a physical odd/even pair
could hide page 201 and defeat the stated judging purpose.

## 2. What is wrong today

The existing path has one page data object, one QCF page font, one page root,
and one hitbox collection. `pageLayout === "split"` changes only CSS grid
placement:

- lines 1–8 are placed in one column;
- lines 9–15 are placed in the other;
- a synthetic centre rule is drawn;
- the outer paper changes to a landscape aspect ratio.

This breaks the mental model of the 1405H Mushaf. It does not provide a second
page, a second page number, the next page's text, the next page's font, or the
next page's marking targets.

The replacement must remove the `.page-split` composition rather than layering
two real pages on top of it.

## 3. Research translated into product rules

The implementation should use the following evidence narrowly:

- [QUL's 1405H layout record](https://qul.tarteel.ai/mushaf_layouts/2?page_number=2)
  defines this Mushaf as 604 printed pages with 15-line page geometry. Tahqeeq
  must preserve those page boundaries instead of inventing a two-column page.
- [Quran Foundation's font-rendering guidance](https://github.com/quran/qf-api-docs/blob/main/docs/tutorials/fonts/font-rendering.md)
  treats QCF rendering as page-specific and recommends loading fonts only for
  the pages being displayed. A spread therefore needs both page assets and both
  page fonts; it must not reuse one page font across the pair.
- [Apple PDFKit's two-up mode](https://developer.apple.com/documentation/pdfkit/pdfdisplaymode/twoup?changes=lat_1&language=objc)
  treats the displayed pair as one scrolling unit. Tahqeeq should likewise
  give the pair one contained scroll canvas instead of two independently
  scrolling papers.
- [PDF.js exposes spread as its own view-mode radiogroup](https://github.com/mozilla/pdf.js/blob/master/web/viewer.html),
  separate from scrolling choices. Tahqeeq should keep `Full page` / `Two
  pages` as a view choice and keep zoom as a separate control.
- [Mushaf App describes one- or two-page RTL reading](https://www.mushafapp.com/)
  as an established Quran-reader pattern. It is useful confirmation of the
  direction, not an authority for Tahqeeq's judging behavior.

## 4. Locked product behavior

### 4.1 Naming

- UI label: **Two pages**.
- Single-page label: **Full page**.
- Remove `Split page` from visible copy, accessible labels, tests, and current
  documentation describing the live option.
- Internal canonical preference: `"full" | "spread"`.
- Read legacy stored `"split"` as `"spread"` once. Do not preserve the old
  visual behavior under a new name.

### 4.2 Pairing

Add one pure helper which is authoritative everywhere:

```ts
visibleMushafPages(anchorPage, layout, compact)
```

Expected desktop results:

| Input | Full page | Two pages |
| --- | --- | --- |
| 1 | `[1]` | `[1, 2]` |
| 2 | `[2]` | `[2, 3]` |
| 199 | `[199]` | `[199, 200]` |
| 603 | `[603]` | `[603, 604]` |
| 604 | `[604]` | `[603, 604]` |

The DOM order remains logical (`N`, then `N + 1`). CSS places `N` on the right
and `N + 1` on the left. Do not reverse the DOM and do not depend on accidental
flex-direction behavior.

### 4.3 Navigation

- Forward/back in Full page changes by one page.
- Forward/back in Two pages changes the anchor by two pages.
- Page 603/604 is the final pair; page 1/2 is the first pair.
- Arrow-key and wheel navigation use the same helper as the visible buttons.
- The shared page control displays `199–200`, not only `199`.
- Jump-to-page still accepts any exact number from 1 to 604. Jumping to 200
  shows `200 + 201`; jumping to 604 shows `603 + 604`.
- If a mistake jump targets the page already visible on the left, retain the
  current pair and only reveal/flash the target. Do not needlessly reload or
  change the anchor.
- Surah jumps use the surah's exact first page as the new anchor.

### 4.4 Question opening

- A prepared question still opens on its exact `startPage`.
- In Two pages, `startPage + 1` is therefore visible automatically.
- Use the assignment's existing `endPage` only to test and report whether the
  visible pair contains the complete prepared range. Do not change question
  selection or scoring rules in this release.
- Do not promise that every possible question fits two pages. When a prepared
  range exceeds the pair, navigation remains available and the stored range is
  unchanged.

## 5. Closely related fixes included in this update

These belong in the same release because a real pair cannot be reliable without
them.

### 5.1 Put the page-view switch beside live view controls

Move `Full page / Two pages` from the permanent Settings detail into the
existing nonmodal More-controls popover, directly above Mushaf size. The judge
can see the result while changing it and there is only one owner for live
Mushaf presentation controls.

Settings keeps theme, panel side, backup, restore, reset, and its existing
first-use guidance. Do not duplicate the page-view selector in both places.

### 5.2 One shared navigation surface

`PageNav` is currently embedded in one page's marginalia. Extract it from
`App.tsx` and render it once for the Mushaf composition.

- Each printed page retains its own page-specific Juz and Surah marginalia.
- Each page shows its own static page number.
- One interactive controller owns the range label, arrows, wheel handling,
  jump input, and Surah list.
- In the two-page composition, place the controller in a non-displacing shared
  gutter/overlay that never covers Quran ink.
- Full-page placement should remain visually consistent with the current
  accepted page rather than adding a permanent toolbar row.

### 5.3 Atomic pair loading and a real failure path

- Load both page JSON files and both page-specific QCF fonts as one requested
  view.
- Keep the previous complete page/pair visible until all requested page assets
  are ready.
- Never show one new page beside one stale page.
- Ignore late results from an older navigation request.
- If either page fails, retain the previous complete view and show one compact
  retry action outside the Quran ink.
- Preload the next and previous pair, not merely adjacent data that cannot form
  a complete view.

### 5.4 Correct coach-tip and tray collision behavior

- The marking coach must not cover either page. When the spread consumes the
  safe outer gutter, replay the guide from the More surface or use a safe shell
  edge without changing geometry.
- A word tray opened near the inner page edges must use the whole shell as its
  collision boundary and flip into visible space.
- Changing page view, pair, or zoom closes a stale tray before remeasurement.

### 5.5 Remove obsolete geometry

Delete the landscape single-paper rules:

- `.page-split`;
- the 8-row by 2-column line grid;
- the synthetic centre divider;
- split-only font-size overrides;
- split exceptions on opening and short pages.

The centre of the new view is the real gap between two independently bordered
pages.

## 6. Component architecture

Do not render two copies of today's `Mushaf` component. Two copies would install
duplicate global keyboard and mistake-jump listeners, create two independent
selection trays, and make navigation and loading race each other.

Refactor into one coordinator and reusable page surfaces.

### 6.1 `Mushaf` coordinator

Owns:

- authoritative visible-page list;
- atomic page/font loading state;
- keyboard, wheel, button, jump, and Surah navigation;
- the one global mistake-jump listener;
- active word, selected target, hovered category, and one `DragMenu`;
- page-tagged hitbox collections;
- pending flash target and exact target page;
- preloading neighboring pairs.

### 6.2 `MushafPageSurface`

Receives one ready `MushafPage` and renders exactly one existing 1405H page.
It owns no global navigation and no independent competition state.

Responsibilities:

- page-specific QCF font family;
- exact line, header, basmala, marginalia, sajdah, and ornament rendering;
- a page-local root/ref and hit-layer;
- measurement reports tagged with `page` and `wid`;
- pointer/keyboard target events reported to the coordinator;
- page-local static number and loading identity.

### 6.3 Page-tagged interaction contract

Extend `WordHitbox` and active selection metadata with the exact page number.
Every query remains scoped to its page root. A committed mistake continues to
store the exact source page from the selected surface; it must never inherit
the spread anchor by accident.

The hitbox registry should use a composite page/word key even though current
word IDs are stable. This makes the boundary explicit and prevents future
renderer changes from introducing cross-page selector bugs.

## 7. Fit, zoom, and scroll geometry

### 7.1 Compute a pair, not a fake aspect ratio

Do not give the spread an approximate `aspect-ratio` constant. Use the actual
single-page ratio and an explicit composed gap:

```text
pageWidth = (spreadWidth - spreadGap) / 2
pageHeight = pageWidth / 0.68
```

For a height-limited frame:

```text
spreadWidth = (availableHeight * 0.68 * 2) + spreadGap
```

Centralize the single-page ratio, maximum page width, spread gap, and frame
inset in `mushafFit.ts`. Fit chooses the minimum allowed by frame width, frame
height, and two maximum page widths.

### 7.2 Apply one uniform zoom

- Apply CSS `zoom` to the composed full-page or spread root, not separately to
  each paper.
- The two pages, gap, hit layers, static page numbers, and any page-local
  highlights scale together.
- The shared navigation overlay remains a UI control with readable target
  sizes; it does not shrink below the application's control minimum.
- Existing 75–150%, 5% step, 110% default, and Fit at 100% remain unchanged.
- Switching Full/Two pages preserves the chosen zoom; it does not silently
  reset the judge's preference. Fit remains one action away.

### 7.3 One scroll canvas

- The shell owns all overflow for the pair.
- Fit centres the complete pair with no document-level scrolling on supported
  desktop sizes.
- Above Fit, every outer and inner page edge remains reachable inside the
  shell.
- Changing zoom preserves the normalized centre of the pair.
- Changing anchor or layout resets to top/inline centre after the new complete
  view is ready.
- Do not create one scrollable box per page.

## 8. Responsive contract

True Two pages is a stable desktop workbench mode.

- At the existing stable-stage boundary (`min-width: 901px` and
  `min-height: 620px`), render the pair.
- Below that boundary, render one exact page using the current selected/anchor
  page while preserving the saved `spread` preference for the next wide view.
- Do not place two tiny pages side by side on a phone.
- Do not add the future phone judging dock, pinch gestures, or phone-specific
  page composition here; those remain in the dedicated mobile plan.
- The More control should make the desktop behavior understandable with the
  concise label `Two pages`; no permanent warning or settings paragraph is
  needed.

## 9. Preference migration and rollback safety

Keep the current device-local boundary and competition-data separation.

Normalization rules:

```text
full   -> full
spread -> spread
split  -> spread  (legacy migration)
other  -> fallback
```

The preference remains device-local and must not enter snapshots, judging
events, results, exports, or backups.

It is acceptable for an older rollback build to fall back to Full page when it
sees `spread`; it is safer than reviving the misleading split-one-page mode.
Document this in the migration test rather than writing two conflicting values.

## 10. Implementation sequence

### Gate 0 — pure view and navigation model

1. Add pure visible-page, forward, backward, jump-anchor, and visibility
   helpers.
2. Lock all boundary examples from pages 1 through 604.
3. Migrate legacy `split` to `spread` in preference normalization.

Gate: page pairing and navigation are deterministic without React or CSS.

### Gate 1 — extract one protected page surface

1. Move existing one-page rendering and measurement into
   `MushafPageSurface` without visual change.
2. Keep Full page as the only active path.
3. Re-run page 1, 2, 199, 300, 601, 602, and 604 geometry and marking tests.

Gate: Full page is pixel-equivalent and all source IDs/mistakes remain exact.

### Gate 2 — coordinator and atomic loading

1. Make `Mushaf` own ready page maps, navigation, jump routing, and tray state.
2. Add two-page atomic data/font loading and stale-request cancellation.
3. Add neighbor-pair preloading and retry behavior.

Gate: rapid navigation never mixes pages or fonts and one failed page cannot
leave a half-spread.

### Gate 3 — spread geometry and live controls

1. Add the two-page composed root and exact Fit math.
2. Apply one zoom and one scroll canvas.
3. Move Full/Two pages into More controls.
4. Remove Split page from Settings and delete obsolete CSS.
5. Render the shared page navigation once.

Gate: two independent papers are visible, correctly ordered, and controllable
without shrinking or reflowing either printed page internally.

### Gate 4 — interaction integration

1. Measure and mark words on both pages.
2. Verify inner-edge and outer-edge tray collision.
3. Route current and off-screen mistake jumps correctly.
4. Verify question opening, coach behavior, rail sides, and zoom transitions.

Gate: a mark made on either page stores that page's exact evidence and one
gesture still creates one event.

### Gate 5 — visual approval and release

Run the complete matrix, inspect the scoped diff for Quran/scoring changes,
then commit and publish only the approved build.

## 11. Expected file ownership

| File | Responsibility |
| --- | --- |
| `src/lib/mushafSpread.ts` | New pure visible-page and navigation helpers |
| `src/lib/devicePreferences.ts` | `full/spread` contract and legacy `split` migration |
| `src/lib/mushafFit.ts` | Exact one-page and pair Fit/rendered extents |
| `src/components/Mushaf.tsx` | Coordinator, page loading, navigation, jump, tray, page-tagged evidence |
| `src/components/MushafPageSurface.tsx` | One protected 1405H page renderer and page-local hit layer |
| `src/components/MushafViewport.tsx` | Full/spread composed extents and compact effective-layout fallback |
| `src/components/PageNav.tsx` | Extracted single navigation controller with page-range label |
| `src/components/MoreActionsPopover.tsx` | Full/Two pages live control plus existing size control |
| `src/components/SettingsWorkspace.tsx` | Remove the duplicate page-view field |
| `src/components/Header.tsx` | Pass layout value/setter to More controls |
| `src/App.tsx` | Retain anchor page and preference ownership; pass question range context |
| `src/styles/global.css` | Real spread, shared gutter/nav, pair scroll canvas, delete split CSS |
| `scripts/mushaf-spread.test.mjs` | Pure pairing/navigation/loading/source-boundary contracts |
| existing Mushaf/preference/workspace tests | Migration, Fit, hitbox, control, and regression updates |

The exact extraction boundary may change during implementation, but global
listeners and active tray state must have one owner.

## 12. Verification matrix

### Automated

- all pairing and boundary cases above;
- forward/back changes by one or two as appropriate;
- exact jump handling for 1, 2, 199, 200, 603, and 604;
- a visible left-page mistake jump does not change the pair;
- an off-pair mistake jump loads the correct pair and flashes the exact word;
- legacy `split` reads as `spread`; new writes never emit `split`;
- Full page remains source/geometry equivalent after extraction;
- both page JSON files and fonts are required before a pair becomes ready;
- a stale request cannot replace the latest pair;
- two page roots carry different `data-page` and QCF families;
- a mark on the left page records its exact page, word ID, target ID, and
  category once;
- Settings has no Page view selector and More controls has one accessible
  radiogroup;
- no `.page-split` selectors or line-redistribution logic remain;
- full repository test suite, TypeScript checks, production build, and
  `git diff --check` pass.

### Browser geometry and interaction

Test 1280×720, 1366×768, 1440×900, and 1600×900 at Fit, 110%, 125%, and 150%,
in both themes and both rail positions.

Protected page pairs:

- 1 + 2;
- 2 + 3, proving an even anchor is allowed;
- 199 + 200, including the previously inspected Arabic target evidence;
- 300 + 301;
- 601 + 602;
- 603 + 604.

For each relevant case verify:

- correct text/font/page number on both papers;
- current page on the right and next page on the left;
- no line from one page appears on the other;
- equal page dimensions and a real centre gap;
- Fit has no body overflow;
- 150% reaches all four outer corners and both inner edges;
- normalized zoom centre remains stable;
- page controls and coach never cover Quran ink;
- word press, long-press/slide, tray selection, keyboard selection, undo, and
  mistake jump work on both pages;
- rapid pair navigation never flashes a mismatched font;
- loading failure retains the prior complete view and Retry works.

Compact regression at 900×620, 768×1024, and 390×844:

- one real page is rendered;
- no horizontal document overflow;
- the stored Two pages preference is not destroyed;
- no desktop coach/spread control obstructs phone judging.

## 13. Protected behavior

This release must not change:

- KFGQPC V1 1405H glyphs, page files, line numbers, word ordering, or Quran
  source data;
- word IDs, target IDs, aliases, primary/full glyph evidence, or mistake
  history;
- scoring arithmetic, deductions, Adu / Raagu behavior, Finish requirements,
  judge ownership, or audit events;
- question selection, line-count policy, final-line policy, or frozen
  assignments;
- Results, workbook/CSV exports, records, competition setup, participant data,
  or backup/restore contracts;
- the separate phone-layout plan.

## 14. Explicit non-goals

- physical odd/even book-binding spreads;
- more than two simultaneous pages;
- automatic page turning from audio or speech alignment;
- dimming or blocking non-question words;
- changing question lengths so they always fit two pages;
- resizable/collapsible judge rail;
- mobile two-page mode or pinch-to-zoom;
- new Quran data, fonts, translations, or Dhivehi localization.

## 15. Release acceptance

The update is complete only when:

1. `Two pages` visibly contains two different consecutive printed 1405H pages.
2. The selected page is on the right and the next page is on the left.
3. Page 200 can be paired with page 201; the implementation is not restricted
   to odd/even physical spreads.
4. Both pages retain exact line composition, QCF font, source IDs, hitboxes,
   highlights, and mistake evidence.
5. The pair loads and scrolls atomically as one unit.
6. Navigation, exact page jump, question opening, and mistake jump all select
   the correct pair without unnecessary reloads.
7. Full/Two pages is available beside live Mushaf size controls and no duplicate
   remains in Settings.
8. The old one-page line split and every `.page-split` rule are gone.
9. Compact layouts show one usable page while preserving the desktop choice.
10. No scoring, Quran-source, competition, Results, or export behavior changes.

## 16. Implementation and verification record

- `Full page` and `Two pages` now live beside the real-time Mushaf size controls
  in More. The duplicate Settings choice was removed.
- A spread loads both page JSON files and both page-specific QCF fonts through
  one `Promise.all` boundary, then swaps the complete pair into view together.
  The prior complete view remains visible if the new pair cannot load, with a
  retry action instead of a partial page/font state.
- Every measured word hitbox carries its printed page number. Mistake commits,
  focus return, visible-page detection, and mistake-log jumps therefore remain
  exact when two pages are mounted.
- Navigation moves by two pages only in a desktop spread. Exact jumps can anchor
  even pages such as `200 + 201`; page 604 resolves to `603 + 604`.
- Browser QA at 1440 x 900 verified `603 + 604` and `199 + 200`, right/left
  ordering, equal paper geometry, both fonts ready, Fit without Mushaf-frame
  overflow, and no console errors.
- Follow-up browser QA at 1440 x 900 measured two equal 529.5 px papers, a
  separate 28 px selector row with a 4 px gap, a 316.8 px judging rail 12 px
  from the viewport edge, and no document overflow. At 390 x 844, the compact
  fallback remained one page with no horizontal overflow.
- Responsive QA at 390 x 844 verified one real page, no horizontal overflow,
  one-page navigation, and restoration of the saved two-page preference after
  returning to desktop width.
- The full 262-test suite passes, the production build passes, and
  `git diff --check` is clean.

## 17. Follow-up recorded on 17 August 2026

The true two-page implementation record remains unchanged. A later geometry
review identified a header-to-selector rhythm follow-up, consistent Full-page
stage padding, and live rail-side access for the wide judge workspace. See
[`JUDGE_WORKSPACE_FIT_RAIL_FINISH_FOLLOW_UP_PLAN.md`](./JUDGE_WORKSPACE_FIT_RAIL_FINISH_FOLLOW_UP_PLAN.md).
