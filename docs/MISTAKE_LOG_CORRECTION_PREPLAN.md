# Mistake log correction — implementation preplan

**Status:** planning checkpoint only. The defect investigation is complete; no application code is changed by this document.

**Purpose:** define the questions, evidence, and boundaries that the next implementation plan must settle before the correction pass begins.

## 1. Outcome of the next planning pass

The next plan must produce one bounded, reversible implementation slice that:

- makes compact judge-facing mistake labels use the semantic primary target, so a carried hamza is shown as `ء` rather than its ya, waw, alif, or tatweel carrier;
- preserves the exact marked Quran form and carrier metadata for audit, exports, review context, and the Mushaf itself;
- stops stacked mistake rows and Arabic diacritics from being clipped;
- keeps all current mistakes reachable in the compact rail through scrolling, with newest first;
- replaces the competing compact `History` and `View all` actions with one clear `View all` entry point, while retaining History inside the full panel;
- brings the Adu & Raagu value into the same score-column geometry as the other criteria; and
- adds regression coverage for the affected data, views, layouts, and exports.

This is a correction of presentation and navigation. It must not change marks, deductions, target identity, source Quran text, question ranges, or append-only judging history.

## 2. Confirmed constraints

These are inputs to the final implementation plan, not open design questions:

1. **The 1405H/QCF Mushaf remains authoritative.** The page glyphs, kalimah layout, word anchors, and visible Quran text are not rewritten to make a compact label easier to render.
2. **Primary target and full form remain separate.** `primaryGlyph` is the clean judge-facing target; `fullGlyph` retains the exact marked form and carrier. This follows the semantic target contract in [PRODUCT_FOUNDATION.md](./PRODUCT_FOUNDATION.md).
3. **Existing mistake evidence remains exact.** Do not destructively rewrite legacy `mistake.glyph` values or export payloads. Add display derivation and compatibility fallback instead.
4. **The live ordering remains newest first.** Fixing visibility must not silently turn the list into oldest first or reorder history.
5. **Every current mistake stays reachable.** The compact list may have a fixed visual height, but it must scroll rather than shrink rows or remove older current mistakes from the DOM.
6. **The full panel owns review depth.** The compact surface has one `View all` action. The full panel retains separate Current and History destinations.
7. **Same-kalimah grouping is deferred.** It remains the named grouping decision in [UNDECIDED_DECISIONS.md](./UNDECIDED_DECISIONS.md); it is not bundled into this correction pass.
8. **Adu & Raagu scoring semantics are unchanged.** This pass corrects the visible score alignment and typography only. Increment rules and competition allocation remain outside this defect slice unless a verified regression is found.

## 3. Evidence the final plan must be built around

### 3.1 Carried-hamza case

The primary fixture is page 199, ayah 9:75, kalimah 5, `لَئِنۡ` (`wordId: 9.75.4`). The compiled target already distinguishes:

- primary label: `ء`
- full marked form: `ئِ`
- target kind: `hamza`
- carrier: `ya`
- orthography role: `hamza-carrier`

The compact log currently renders the stored full glyph, which makes the carrier visually dominate. This is a display-selection defect, not bad Quran source data and not a reason to isolate or remove the carrier from the Mushaf.

The final plan must cover all known carrier families, not only this one: alif, waw, ya, and Quranic tatweel-plus-combining-hamza. Unicode's Arabic specification documents both the precomposed carrier forms and the Quranic tatweel convention: [Unicode Standard, Arabic](https://www.unicode.org/versions/Unicode16.0.0/core-spec/chapter-9/).

### 3.2 Stacked rows

The compact log is a column flex container. Its row wrappers retain the default ability to shrink, while overflow is clipped. Under a fixed desktop rail height, nominal 38-pixel rows compress as the mistake count grows; expanded detail can then extend outside a shrunken wrapper and disappear.

The plan should specify a non-shrinking row contract and make the list itself the scroll owner. This follows the flex sizing and overflow behavior described by [CSS Flexible Box Layout](https://www.w3.org/TR/css-flexbox-1/) and [CSS Overflow](https://www.w3.org/TR/css-overflow-3/).

### 3.3 Arabic word pill

The detail pill combines tight line height, single-line layout, and hidden overflow. A word with stacked marks such as `لَئِنۡ` needs more ink height than the current line box permits, so marks are cropped. The final plan must use Arabic-aware line geometry and internal padding, not a larger arbitrary outer box. Relevant line-box behavior is defined in [CSS Inline Layout](https://www.w3.org/TR/css-inline-3/).

### 3.4 Adu & Raagu score column

The selected MarkPicker value currently uses different internal spacing and score typography from the ordinary criteria. Its numeric edge is visibly displaced. The final plan must define one shared score-column width and alignment rule for every criterion, including the boxed selector state.

## 4. Questions the implementation plan must resolve

The next planning pass must answer these before naming code changes:

### Data and display contract

- Where should the shared mistake-display helper live, and what exact inputs should it accept?
- What is the fallback order for current, legacy, and unresolved entries: stored `primaryGlyph`, target lookup, normalized legacy glyph, exact `glyph`, then a safe placeholder?
- Which surfaces use a primary label and which expose the exact full form alongside context?
- Should target hydration repair missing `primaryGlyph` and `fullGlyph` even when an older entry already reports the current target version?
- How will exact JSON backup/export behavior be proven unchanged?

### Compact log interaction

- Which element owns vertical scrolling, and how are its header and footer kept stable?
- When a row near the bottom expands, should it use `scrollIntoView`, a measured scroll adjustment after layout, or a CSS-only containment strategy?
- How are focus, keyboard activation, Escape, and focus return handled when `View all` opens and closes?
- What visible affordance tells the judge that more current mistakes exist below without adding noisy copy?
- How are undone entries represented between Current and History without changing their meaning?

### Arabic and RTL geometry

- What minimum block size, line height, and vertical padding allow the actual app font to show stacked tashkil without cropping?
- Where should the kalimah pill and ayah/surah coordinates sit in both narrow and wide rails?
- Which parts may truncate, wrap, or remain fixed? Quran text and the primary target must not be ellipsized into ambiguity.
- Does the solution remain correct for long kalimahs and all four hamza carrier forms?

### Score alignment

- Should all score values be geometrically centered in the existing score column, or aligned on a shared numeric edge? The user's current direction favors centering, so the plan must test that first.
- What shared width, font sizes, slash treatment, and line-height make ordinary values and MarkPicker values optically identical?
- Does the picker keep sufficient tap area without letting the hit target determine the text alignment?

## 5. Surface audit required before implementation

The final plan must include an explicit matrix for every consumer of mistake glyphs:

| Surface | Intended compact display | Exact evidence retained | Planning note |
|---|---|---|---|
| Mistake log | `primaryGlyph` | `fullGlyph`, target metadata, full kalimah | First correction surface |
| Judging history | `primaryGlyph` | exact entry and timestamp | Keep chronology ungrouped |
| Results review/drill-down | `primaryGlyph` | full kalimah/ayah and exact target available | Do not show the carrier as the judged letter |
| Printable result sheet | primary label plus sufficient word/ayah context | exact evidence remains in data/export | Confirm print readability |
| Most-marked-letter statistics | group by semantic primary target | exact findings remain individually inspectable | Prevent one letter fragmenting by carrier or tashkil |
| Most-marked-location statistics | primary label | stable `tid` remains the grouping key | Do not group locations by glyph alone |
| Backup/export | no lossy substitution | all stored exact fields | Contract must remain byte/field compatible where currently promised |

The audit should locate direct `mistake.glyph` rendering or grouping rather than fixing only the first visible component.

## 6. Required states for the interaction specification

The next plan must define the intended appearance and behavior for at least:

- no mistakes;
- one compact mistake;
- five mistakes that fit;
- nine mistakes that require scrolling;
- twenty mistakes under sustained judging;
- the newest row expanded;
- the bottom visible row expanded;
- an expanded row after a new mistake arrives;
- an undone mistake present only in History;
- a long kalimah with stacked tashkil;
- a carried hamza on alif, waw, ya, and tatweel;
- the full panel on Current and on History;
- left-rail and right-rail competition layouts;
- light and dark themes.

Same-kalimah visual grouping must not appear in these states until the named
grouping decision is resolved.

## 7. Shape of the final implementation plan

The next deliverable should be an implementation-ready plan containing:

1. **Rollback checkpoint:** exact clean base commit and a scoped comparison path.
2. **File inventory:** every source, style, test, fixture, and documentation file expected to change, with its reason.
3. **Display helper contract:** typed inputs, fallback behavior, and examples for ordinary letters and carrier hamza.
4. **Component state contract:** compact list, row expansion, full-panel navigation, focus, and scrolling behavior.
5. **CSS geometry contract:** row flex behavior, scroll ownership, Arabic line box, score column, responsive thresholds, and layering.
6. **Analytics and export contract:** semantic grouping rules and proof that exact evidence remains unchanged.
7. **Ordered implementation slices:** small commits or reviewable phases, each with a validation gate.
8. **Automated test list:** unit, component, rendered-layout, accessibility, and export regression tests.
9. **Browser QA script:** precise navigation and expected measurements at each target viewport.
10. **Reversal notes:** which change can be reverted independently if the visual direction is rejected.

The likely implementation order to evaluate is:

1. introduce the pure display helper and fixtures;
2. correct MistakeLog rendering, non-shrinking rows, scrolling, and View all navigation;
3. apply the display contract to History, Results, sheets, and statistics;
4. correct Arabic detail-pill geometry;
5. align the Adu & Raagu score column;
6. run cross-surface, responsive, export, and accessibility verification;
7. update the working log and decision documents only where outcomes were actually confirmed.

The final plan may reorder these if dependency inspection shows a safer boundary, but it must explain why.

## 8. Acceptance evidence required before coding is approved

### Automated evidence

- The page 199 fixture renders compact `ء`, retains full `ئِ`, and keeps `لَئِنۡ` readable with its marks.
- Ordinary letters and every carried-hamza family resolve to the correct compact label.
- Legacy or unresolved entries remain readable through a deterministic fallback.
- Judge-facing surfaces no longer choose raw `mistake.glyph` where a semantic primary label is required.
- Six, nine, and twenty current rows keep their intended height; the list scrolls and all entries remain mounted/reachable.
- Expanding the final reachable row reveals the full detail without clipping.
- The compact header exposes one `View all` action; History remains available inside the full panel.
- Newest-first ordering is unchanged in Current; chronological audit meaning is unchanged in History.
- Letter statistics group by primary target while location statistics retain stable target identity.
- Exact backup/export fields are unchanged by compact display normalization.
- Adu & Raagu and ordinary score text share the specified visual center or numeric edge within tolerance.

### Browser evidence

Run the same scripted scenario at desktop widths 1440, 1280, and 1024, and at 390 × 844 mobile. Cover both themes and both rail sides. Capture the one-, five-, nine-, and twenty-mistake states, the lower-row expansion, `View all`, History, a long Arabic word, and carrier-hamza examples.

The browser pass must check actual geometry (`clientHeight`, `scrollHeight`, row bounds, overflow, and score-column centers), not rely only on screenshots. Keyboard activation, modal focus containment, Escape, and focus return must also pass.

## 9. Research boundary

The defect mechanisms and governing standards are sufficiently identified for the next planning pass. Do not start another broad inspiration search. Additional research is justified only if inspection reveals an unresolved browser/font-metric behavior or an accessibility interaction not covered by the existing component model.

## 10. Stop gate

After this preplan, the next step is to write the exact implementation plan and present its visual/state decisions for approval. Application code should not change until that plan is accepted. Same-kalimah grouping remains explicitly outside the immediate correction pass.
