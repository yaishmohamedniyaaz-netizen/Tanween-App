# Mistake tray redesign — planning round

**Superseded on 29 September 2026:** the owner chose letter-first, whole-card
category tint and border, and Mushaf-facing controls. The current plan is
[`LETTER_FIRST_MISTAKE_TRAY_PLAN.md`](./LETTER_FIRST_MISTAKE_TRAY_PLAN.md).
Everything below is retained as the earlier proposal and its evidence, not
the current recommendation or an unresolved choice of primary hierarchy.

Date: 29 September 2026. Status: proposal and isolated comparison only.

No application source, scoring, storage, or deployed site changed. This plan is
based on the owner's four browser comments and the current implementation at
`fec07c28467fbe32e2a0a3427fba91b6699ec018`.

## Intended result

A judge can recognise a finding, open its controls, adjust or undo it, and keep
their place in the list. Quran words remain intact and legible. The scrollbar
does not push the list inward or change its width when content expands.

Recommended direction: **word first**. Show the whole kalimah in the closed row,
with its semantic marked letter and category on a quieter second line. Expansion
reveals the amount controls and Undo. A **letter first** alternative retains a
shorter closed row and puts the unboxed whole word above the expanded actions.
Neither alternative groups findings: each row remains one exact finding.

## What the evidence establishes

The supplied screenshots show the native scrollbar arrows, the displaced list,
the tinted word/reference capsule, and reference wrapping for the longer word.
Read-only browser inspection at 1191 × 668 confirmed:

- sidebar width 300px; mistake list height about 132px;
- about 16.4px consumed by the scrollbar gutter plus the extra left padding;
- a 25px indent inside expanded rows, reducing the remaining detail width;
- only about 83px for the word/reference capsule after action columns;
- 24 × 24px amount buttons and a 24px-high Undo button;
- collapsed detail controls still appear in the accessibility tree. Keyboard
  reachability must be checked and closed content must become inert or unmounted.

Source explanation: `MistakeLog.tsx` puts the word, reference, amount control and
Undo in one `.log-detail-line`. The pill inherits `flex-wrap: wrap`. The native
scrollport uses `scrollbar-gutter: stable`, extra side padding, and RTL direction
to follow a left-side score rail. An older plan and tests explicitly preserve
the pill, 25px indent, and 24px controls; those presentation assertions will need
revision once the replacement is approved.

## Proposed arrangement

| Part | Proposal | Useful result |
| --- | --- | --- |
| Closed row | Whole word; category and marked letter beneath; deduction and chevron at the other end | Identify the word without opening several repeated letter rows |
| Expanded row | Separate, aligned action row; at least 44 × 44px amount buttons; separated Undo | No competition between Arabic text and controls |
| Word | Plain Quran text, no coloured capsule, no inserted spans to highlight a guessed character | Preserve shaping, stacked marks, and exact evidence |
| Category | Small existing category-coloured dot plus text | Colour remains meaningful without tinting the whole word |
| Location | Omit numeric coordinates from the compact rail; show a quiet isolated reference in View all and the phone review sheet | Keep live judging calm while retaining review context |
| List | Shared left/right alignment with the section heading; light separators instead of a stack of nested boxes | More usable width and less visual noise |
| Scrollbar | Narrow native thumb, no arrows where supported, in the existing outer panel margin | Preserve native scrolling without shifting the row content |

The semantic marked letter stays visible; a whole-word heading must never imply
that the complete word was judged incorrect. Exact character highlighting within
the word is deferred because it requires verified target ranges and shaping.
Starting/ending phrase labels stay visible where needed to distinguish evidence;
printed Basmala and legacy/unresolved records must not acquire invented coordinates.

The word-first trade-off is lower closed-row density. With about 132px available,
expect approximately one open finding or fewer closed rows than today. The
comparison deliberately uses that available height. Do not silently take room
from notes, score controls, or Mushaf geometry to make the proposal look better.

## Retained, recomposed, removed

- **Retained:** chosen score-rail side, exact target and glyph evidence, individual
  finding IDs, newest-first current list, current jump-to-word behaviour, existing
  deduction semantics, Undo/History/Restore, View all, and phone sheet entry points.
- **Recomposed:** row hierarchy, expanded action placement, scrollbar space within
  existing panel margins, disclosure visibility/focus, and open-row positioning.
- **Removed from the compact presentation:** tinted kalimah capsule, forced
  reference beside Arabic text, 25px hanging indent, 24px action targets, duplicate
  visible deduction while editing, and extra gutter padding that displaces rows.

The current adjustment uses 0.5 changes and clamps at zero. Preserve that behaviour
in this presentation slice; do not treat this design as a new competition rule.

## Interaction and smoothness

1. One row is open at a time. Opening a Quran finding retains the current jump to
   its stored target. Opening phrase evidence never dispatches a Quran page jump.
2. Vertical touch/pen scrolling must not activate a row, adjust an amount, or Undo.
   Use native click semantics and keep scrolling out of the Mushaf swipe handler.
3. Keep the list width stable before/after opening, deleting, and restoring. Never
   refit text because a scrollbar becomes visible.
4. Replace the current two separate auto-scroll opportunities with one deliberate
   reveal within the list after expansion. Preserve the selected row's position
   where possible; do not smooth-scroll against an active finger or move the shell.
5. Amount changes keep the same row open. Undo removes only the selected finding,
   updates the visible score through the existing reducer, and puts keyboard
   focus somewhere useful. History remains the production restore route.
6. Closed controls are absent from tab order and the accessibility tree. Disclosure
   buttons expose `aria-expanded` and `aria-controls`. Current/History, Escape,
   modal focus containment and return focus continue working.
7. Use a brief disclosure transition only if it does not cause text movement or
   repeated scroll corrections; respect reduced motion. Do not add scroll-linked
   React rerenders, a custom scrolling engine, or another gesture library.

## Scrollbar implementation decision

Preserve native overflow, momentum and keyboard scrolling. First consolidate the
existing scrollbar rules. In engines supporting the WebKit scrollbar selectors,
use an explicit narrow track/thumb and suppress scrollbar buttons, with standard
properties reset so they do not override the detailed styling. In other engines,
use the supported standard thin scrollbar and retain an accessible native fallback.

Absorb the actual reserved gutter into the existing outer panel margin; remove
the separate 6px content displacement. Keep row edges aligned on both rail sides
and with/without overflow. Do not merely remove `stable` and accept a width jump.
Native overlay scrollbars need no extra reserved gutter. If CSS cannot maintain
alignment across the supported engines, use a small measured gutter value on resize,
not per scroll frame. Forced-colour/system accessibility settings take precedence.

The browser chooses classic versus overlay scrollbars, so CSS cannot guarantee
an identical Apple-style overlay everywhere. Arrow removal outside supported
styling engines remains a browser acceptance question, not a solved claim.

Primary references:

- [MDN: scrollbar-gutter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scrollbar-gutter)
- [MDN: scrollbar-width](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scrollbar-width)
- [MDN: scrollbar pseudo-elements and precedence](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::-webkit-scrollbar)

## Implementation sequence after the design choice

1. **Prove one row in context.** Build the chosen layout with the real Quran font,
   short/long words, hamza variants, repeated words, phrase evidence and missing
   legacy word text. Review in the existing desktop rail and compact phone sheet.
2. **Complete the list.** Integrate native scrolling, outer-edge gutter alignment,
   one open row, stable focus and minimal reveal behaviour. Check left/right rails
   and Current/History without widening or moving the Mushaf.
3. **Verify correction behaviour.** Exercise one amount change, Undo, History
   restore, reload, and export; compare visible scores, active finding IDs, ledger
   entries and stored snapshots. Scrolling and disclosure create no ledger events.
4. **Visual approval and release.** Present actual desktop/compact results for
   owner approval. Then scoped tests, proportionate full validation, diff review,
   commit, push, publish, and verify the exact hosted build when release is requested.

Expected production files: `src/components/MistakeLog.tsx`, narrowly scoped blocks
in `src/styles/global.css`, and relevant presentation/browser regression tests.
Read `MobileJudgeDeck.tsx` integration before editing it; change it only if needed.
Avoid changes to reducers, storage, exports, Quran assets and navigation machinery.

## Acceptance matrix

- Layouts: 1400 × 900, 1280 × 800, the reported 1191 × 668, 1024 × 768, an iPad-sized
  portrait layout, 390 × 844, and 320 × 568; light/dark, both rail sides, text zoom.
- Inputs/engines: Chromium on Windows; Safari/WebKit on phone/tablet and installed
  PWA where available; Firefox fallback; mouse, wheel, keyboard, finger and pen.
  Browser emulation is not physical Pencil or iPhone acceptance.
- Lists: empty, one, five, twenty; top/middle/last open; repeated words at different
  locations and separate targets in the same word; live addition while scrolled.
- Words: the owner's `فِي` and `ٱلنَّفَّٰثَٰتِ`, short/long words with stacked marks,
  semantic hamza/full-form evidence, printed Basmala, starting/ending phrases,
  legacy missing word text and unresolved targets. No Unicode rewriting or ellipsis.
- Pass conditions: no arrows in supported target browsers; no row-edge shift when
  overflow appears; no clipped Quran ink or inaccessible actions; action targets
  at least 44 × 44px without overlap; no invisible focus targets; no unexpected
  shell scroll or accidental ledger event; no Mushaf size/position regression.

Update old source-contract tests that assert the retired visual arrangement;
retain all semantic display, immutable export, scoring and ledger coverage. Add
behavioural browser assertions for the actual regression, rather than replacing
one set of CSS-string checks with another. Run scoped suites, full app tests,
production build and diff checks before release.

## Planning evidence and remaining decisions

An isolated interactive comparison shows **Word first** and **Letter first** with
the existing Hafs font and representative sample words. It demonstrates layout,
disclosure, amount changes and sample Undo; its small Restore affordance only lets
the example be reset. It is not the application, a saved judging session, full
View all/History implementation, or a physical-device smoothness test.

Owner choices are recorded in `UNDECIDED_DECISIONS.md`, item 33. Same-kalimah grouping
remains item 24 and is not part of this redesign. Word-press delay and page swipe
behaviour remain a separate previously deferred slice.

Confidence for the proposed scope: **practicality 92/100; architecture/data safety
96/100; visual certainty 80/100**. The row-level cause is measured and the proposal
fits existing component boundaries. The short tray's density trade-off, actual
phone sheet, cross-browser scrollbar treatment and owner preference still need
the in-app prototype and visual approval before production readiness.

Isolated browser review: the word-first comparison was inspected at desktop
width and a 320 × 568 viewport. At the latter, the host constrained the component
to 272px; its open word/action row measured 126.5px inside a 132px scrollport.
The Hafs font loaded, action controls measured at least 44 × 44px, and no document
horizontal overflow was observed. Sample adjustment, Undo, and restore were
exercised; restoring and reopening kept the complete row within the list. These
are comparison-prototype observations, not application or device acceptance.

## Selective integration checkpoint — 13 October 2026

Chunk 1: generate and verify the standalone-letter bounds from the shipped Hafs
font. Implemented with mandatory HarfBuzz verification and a safe unknown-glyph
fallback; no Quran text or font asset was changed.

Chunk 2: integrate the 40px tonal letter tile into the existing mistake rows,
retain the neutral card and disclosure, and give deduction/Undo controls 44px
minimum targets. Implemented locally. The separate colour dot is removed; the
category remains in the accessible row name. Existing coordinate visibility and
preexisting row/action edits are retained. Hairline is only a code comparison.

Chunk 3: validation and owner review. Full suite: 436 passed, 1 skipped; production
build passed; diff whitespace check passed. Desktop light/dark, 390px phone sheet,
and 820px tablet View all were inspected in Chromium. The font generator verified
32 glyphs; this is not perceptual approval of every glyph. Phone evidence is at
outputs/mistake-tray-plan/tile-phone.jpg. Physical devices, forced-colour rendering,
full glyph visual review, and the broader acceptance matrix above remain open.

Next separate slice: scrollbar geometry and clipping with long lists, after the
current tile/row direction is reviewed. Coordinate removal remains an explicit
product choice. No commit, push, or publication at this checkpoint.

Confidence: practicality 92/100; architecture/data safety 96/100; visual certainty
80/100 pending owner review and the remaining visual/device checks.

## Scrollbar and disclosure follow-up — 13 October 2026

Owner accepted the first slice and asked to continue. This second local slice
retains the letter tiles and native scrolling, removes negative scrollbar margins
and competing one-sided padding, and uses balanced stable gutters. Supporting
Chromium/WebKit engines use a button-free 8px scrollbar; Firefox retains its thin
native fallback. MDN documents why non-auto scrollbar-width overrides the custom
pseudo-elements: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scrollbar-width

Long-list browser QA found the existing scrollIntoView call ran before disclosure
finished expanding. A ResizeObserver now follows the row height and adjusts only
the mistake list's scrollTop. Rows taller than the viewport remain manually
scrollable without repeatedly chasing their bottom. Observers are disconnected
when the open row or panel changes.

The isolated sample on port 5379 contains 20 generated QA findings; the user's
existing sample on port 5346 was not changed. At 1191x668 and 390x844, both card
insets measured 10px, the last open row and controls remained reachable, there was
no horizontal list overflow, and window.scrollY stayed 0. Chromium reports no
scrollbar buttons. Evidence: scroll-desktop.jpg and scroll-phone.jpg in
outputs/mistake-tray-plan. 48 relevant tests and the production build passed.
Physical devices, Firefox/Safari appearance, and owner approval of this second
slice remain outstanding. No commit/push/publish.

Confidence: practicality 94/100; architecture/data safety 96/100; visual certainty
86/100 for the inspected Chromium layouts, pending owner and device review.

## Density comparison — 13 October 2026

Owner requested two screenshot candidates. These are QA-only CSS variants in
outputs/mistake-tray-plan/density-a.css and density-b.css; neither is the default.
Both hide the redundant Notes heading and retain the notes field. NotesBox now
has an explicit textarea accessible name, independent of the visible heading.

At 1191x668 with 20 QA findings: A fits 3 closed rows (57.6px outer row height,
181.4px list height); B fits 4 (45.6px outer row height, 197.4px list height).
B uses 36px letter tiles and 44px row buttons. Open-row adjustment and Undo
buttons remain at least 44x44px. Opening a row leaves 2 complete rows in A and
3 in B. Neither measured horizontal overflow. Phone sheet visually inspected;
comparison CSS is limited to desktop rail widths, not expanded View all.
Screenshots: density-a-desktop.jpg, density-b-desktop.jpg, and matching expanded
images. Counts depend on viewport height. No commit or publication.

Recommend B for density, pending owner choice. Confidence for these prototypes:
practicality 94/100; architecture/data safety 98/100; visual certainty 88/100.

## Finished slim preview — 13 October 2026

Owner selected B and authorised continuing to a finished local preview. The slim
rail is now integrated in global.css, without loading the comparison stylesheets.
The desktop rail uses 36px letter tiles and 44px row buttons; the visible Notes
heading is hidden on desktop, with an explicit accessible name on its textarea.
Expanded View all and the phone sheet keep the larger rows. Coordinates remain
as shown in the selected preview; no new setting or stored-state change.

Final integration also makes collapsed disclosure contents inert and excludes
those controls from the panel focus trap. Removed the obsolete transition-end
scrollIntoView handler: ResizeObserver keeps expansion within the list without
scrolling ancestors. Browser keyboard check confirmed Tab moves from one closed
row to the next rather than into hidden deduction controls.

Checked the production component at 1191x668: 4 closed rows; 3 complete findings
when one is open. Checked last-row expansion at 320x568, with no horizontal list
overflow and window.scrollY=0, and dark View all at 1024x768. The full test suite
passed 436 tests with 1 skipped. Preview images are final-slim-desktop.jpg,
final-slim-phone.jpg, and final-slim-dark-review.jpg under outputs/mistake-tray-plan.
The dedicated sample server uses QA data on port 5379; the user's original sample
remains on port 5346. No commit, push, or deployment was requested for this stage.

Local preview scope is complete after production build verification. Physical
phone/Pencil, Safari/Firefox, and forced-colour rendering are not verified by these
Chromium checks and remain release follow-up checks. Confidence: practicality
95/100; architecture/data safety 97/100; visual certainty 90/100 for tested views.
Final production build passed, including TypeScript and Sites artifact preparation. The existing large-bundle advisory remains; no build errors. Local preview completion is verified.
