# Letter-first mistake cards — revised plan

29 September 2026. Owner approved implementation, commit and publication.
Implemented the final refinement described below; earlier prototype notes are historical.
Source inspected: `fec07c28467fbe32e2a0a3427fba91b6699ec018`.

## Owner-selected direction

The owner chose **letters first**, removed written criterion names, and requested
a low-opacity category tint across
each whole card with a border in the same category colour. The related kalimah
belongs below the letter. The lower row reads kalimah, amount adjuster, then Undo from left to right. The word-first recommendation is superseded.

Owner correction, 29 September: **the letter and kalimah stay left-aligned;
the mark picker is in the middle of the kalimah row, with Undo at the far right.** The previous
Mushaf-facing evidence alignment and automatic mirroring were misunderstandings
and are withdrawn. This is now explicit, not an unanswered alignment choice.

## Proposed card and placement

**Closed:** semantic letter, current deduction, quiet disclosure chevron. The
entire surface has a pale category tint and fine same-category border. No category
square, repeated criterion name, or separate coloured word capsule.

**Open:** the same letter stays in the same horizontal position. The full kalimah
appears directly beneath it at the same left edge, with the deduction control
in the middle of that same line and Undo at the far right, separated from the picker by a clear gap. Hide the closed-row
deduction while its editable value is shown, retaining the column space so the
letter does not move. Only one card opens at a time.

| Presentation | Evidence alignment | Adjustment | Undo / scrollbar |
| --- | --- | --- | --- |
| Current left sidebar | Letter and kalimah share left edge | Middle, same row as kalimah | Undo far right; scrollbar outer left |
| Full-width phone sheet | Same left-aligned hierarchy | Middle, same row as kalimah where it fits | Undo far right; native sheet edge |
| Other rail positions | Retain this internal arrangement pending review | No automatic mirroring | Scrollbar follows existing rail preference |

Arabic text remains RTL within left-positioned blocks; controls remain LTR and keep
minus/value/plus order. Do not infer mouse input from screen width or change the
saved rail-side preference. The phone sheet has no Mushaf beside it, so it uses
a stable right-side control rather than inventing another directional rule.

## Geometry and density

- Keep existing rail width, Mushaf geometry and section alignment. Remove the old
  25px hanging detail indent and extra scrollbar displacement. Card edges align
  with the mistake section heading; preserve ordinary internal breathing space.
- Start with 8px card radius, 8px card spacing, 16px horizontal inner padding (12px in narrow cards),
  and the repository type scale: 27px letter, 21px kalimah, 14px live controls,
  12px optional review metadata. Inspect actual Quran ink and stacked marks.
- Put the primary letter at the left inner edge, with the closed summary amount
  and chevron toward the right. The whole kalimah starts at exactly the same
  left inset on the next line; the picker occupies the middle, with Undo at the far right. The entire
  header is the disclosure target; avoid a second tiny chevron button.
- Amount buttons and Undo each need independent, nonoverlapping 44 × 44px targets.
  Keep a gap between Undo and adjustment. Do not change numbers on hover or scroll.
- Prototype targets: roughly 44–48px closed; open height includes one shared
  kalimah/picker/Undo line. The old 130px result
  was for the rejected arrangement and must not be reused as evidence of this one.
  The reported list has only about 132px available: an open card may occupy it.
  Do not shrink controls or take space from notes/score/Mushaf to disguise density.
- Keep long kalimahs intact: no ellipsis, character splitting, letter spacing,
  guessed highlights, or Unicode rewriting. If a word exceeds the evidence
  column, give it a full-width row with the same alignment direction and let the
  card grow. Full content and actions remain reachable through the list/review.

## Documentation and colour assessment

`PRODUCT_FOUNDATION.md` separates the semantic primary glyph, exact full form and
immutable source span. Continue using `mistakePrimaryGlyph()` for the card's main
letter and the existing `wordText` / full-form fallback for its kalimah. No schema,
target identity, hydration policy or export changes are required.

`DESIGN_GRAMMAR.md` permits saturation for criterion identity and requires quiet
chrome, fixed Mushaf geometry, deliberate actions, nonduplicated information,
44px targets and measured contrast. The requested pale card fits this direction.
Primary letter identity becomes clearer; repeated criterion copy and swatches go.

Reuse existing category colours. Start around 8% colour in light appearance and
12% in dark appearance, with a more legible same-category border based on the
existing strong token. These are review values, not locked product tokens. Reduce
the fill if the rail competes with the Mushaf. Apply alpha to the background only,
not the card's text/controls. Arabic, numbers and actions retain normal ink colour.
Keep category treatment consistent when open/closed; use a separate focus cue.

**Trade-off:** tint plus coloured border still uses colour alone to distinguish
criteria. Screen-reader names do not resolve this for sighted users with colour
vision differences. Keep full category names in accessible row descriptions and
larger review. Show text when forced-colour mode removes category hues. Decide a
discoverable non-colour alternative for other users before claiming colour-accessible
live judging. Do not silently restore rejected labels to ordinary compact cards,
and do not claim that a darker border alone solves this issue.

Measure text contrast on the actual tint, and required control/focus cues against
adjacent colours. A pale supplementary fill does not itself need to become a
saturated block to meet a blanket 3:1 target.

- [W3C: Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)
- [W3C: Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)

## Retained, recomposed, removed

| Retained | Recomposed | Removed from ordinary compact cards |
| --- | --- | --- |
| Semantic letter and exact full evidence | Letter and kalimah at a shared left edge | Criterion name and category square |
| One finding per row, newest first | Full-card tint and same-category border | Separate tinted kalimah capsule |
| Existing target navigation, adjustment, Undo, History/Restore | Kalimah left and picker right on the same row; Undo below left | 25px indent and excess gutter space |
| Chosen rail side and phone sheet entry | Stable disclosure, reveal and focus | 24px targets and duplicate visible amount |
| Stored locations, scoring, ledger and exports | Quiet location metadata in larger review | Numeric coordinates crowding the kalimah |

Keep existing 0.5 adjustment and zero-floor semantics. A card is one finding,
not a verdict on the entire word. Same-kalimah grouping remains undecided (item 24).
Printed Basmala and phrase evidence remain distinct and keep necessary context;
never fabricate a Quran coordinate. Page swiping and word-press delay are outside
this presentation slice.

## Scroll, focus and smoothness

1. Keep native overflow/momentum. Consolidate scrollbar rules, suppress arrow
   buttons in supporting engines, and retain a native accessible fallback. Keep
   the bar at the outer rail edge, away from Mushaf-facing correction controls.
2. Absorb the native gutter into existing margins. Card edges must remain stable
   with/without overflow and on both sides. Removing `stable` alone can cause shifts.
3. Finger/pen list scrolling cannot turn a Mushaf page, adjust an amount or Undo.
   The list stays outside the page-swipe region; use deliberate click activation.
4. Opening a Quran finding keeps its existing target jump; phrase evidence does
   not dispatch a Quran jump. Disclosure and scrolling produce no ledger event.
5. Replace the current two auto-scroll opportunities with one minimal reveal
   within the list. Never move the shell or repeatedly correct against a finger.
6. Closed actions are inert/unmounted and absent from the accessibility tree/tab
   order. Maintain disclosure semantics, useful focus after correction/Undo,
   Current/History navigation, modal Escape/containment and opener focus return.
7. Font sizing and the evidence alignment anchor stay fixed during disclosure,
   scrolling and amount changes. Respect reduced motion. No custom scroll engine,
   scroll-driven React rerenders or new gesture library.

Browser selection of classic/overlay scrollbars prevents an identical Apple-like
appearance guarantee everywhere. Standard scrollbar properties can override
WebKit styling, so select compatible rules and verify actual supported engines.

- [MDN: scrollbar-gutter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scrollbar-gutter)
- [MDN: scrollbar styling precedence](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::-webkit-scrollbar)

## Evidence and implementation gates

Current-app measurements at 1191 × 668 from the first planning round: 300px rail,
approximately 132px list viewport, 16.4px gutter/padding displacement, 25px detail
indent, about 83px for the cramped word/reference capsule, and 24px controls.
Collapsed actions appeared in the accessibility tree. These identify defects;
they are not proof of the proposed design.

The corrected isolated preview shows the requested left-aligned card, using
sample data and the existing Hafs font. It initially uses a roomier review area
to compare tinted cards; the current 132px constraint also requires inspection.
Its sample reset is not a production Restore change, and View all demonstrates
metadata visibility rather than implementing the full existing review flow.

After review of the direction:

1. **One real card:** `MistakeLog.tsx` and scoped CSS, with existing actions and
   exact evidence. Review short/long words, hamza and missing legacy word text.
2. **Complete tray:** outer scrollbar, shared kalimah/picker row, short-height fit,
   stable reveal/focus, phone sheet and non-colour fallback. No adjacent redesign.
3. **Behaviour/data checks:** visible score, active IDs, ledger event count/type,
   reload and export after adjustment, Undo and History restore. Retain semantic
   and data tests; replace assertions insisting on the old pill/indent/24px controls
   with browser checks of the intended behaviour.
4. **Visual approval/release:** actual desktop and compact review, owner approval,
   scoped tests, proportionate full validation, diff review, commit, push, publish
   and hosted verification when release is requested.

Cover 1400 × 900, 1280 × 800, reported 1191 × 668, 1024 × 768, tablet portrait,
390 × 844 and 320 × 568; both themes/sides and zoom; Chromium/Windows,
Safari/WebKit and Firefox fallback. Physical finger/pen and Safari/PWA comfort
remain separate acceptance checks.

Fixtures: 0/1/5/20 findings; top/middle/last open; same letter in different words;
multiple targets in one word; long stacked-mark words; carried hamza; Basmala;
phrase evidence; legacy/unresolved targets. Require complete ink, nonoverlapping
44px targets, stable edges, no horizontal overflow/hidden controls/accidental
events, useful focus, and unchanged Mushaf geometry.

## Confidence and remaining decisions

**Practicality 93/100; architecture/data safety 97/100; visual certainty 82/100.**
The letter hierarchy matches the semantic contract and fits one component.
Colour contrast, longest-word layout, phone integration and physical-device feel
still need in-app proof and owner visual approval.

Letter-first hierarchy and ordinary tinted-card treatment are owner-selected.
The left-aligned evidence and picker on the same line are now owner-confirmed.
Remaining details: numeric location visibility in compact versus review,
long-word/narrow-space fallback, and non-colour identification.
See `UNDECIDED_DECISIONS.md`, item 33.

## Earlier corrected alignment preview checks — superseded by inline Undo

The corrected isolated preview was inspected in a browser at desktop and
320 × 568. Letter and kalimah share the exact left inset; the picker is on the
right with its vertical centre matching the kalimah. The compact rail measures
272px wide, with no horizontal overflow observed. The picker is 44px high.
The open card now measures 145.6px including the separate Undo row, so fitting
all actions inside the existing 132px scrollport remains an implementation
decision; the previous 130.3px result does not apply. These are prototype checks,
not app integration or physical-device approval.

## Earlier comparison checks — geometry superseded

These checks describe the earlier, rejected alignment. They are retained as
historical evidence only; the current card requires fresh geometry checks.
The unchanged palette's contrast measurements still apply to the same colours.

- Desktop inspection of the left rail and 320 × 568 inspection of both rail
  placements. The latter constrained the component to 272px; no horizontal
  document overflow was observed. The existing Hafs font loaded successfully.
- Letter and kalimah shared the same right edge within 0.01px in the left-rail
  sample; the mirrored sample aligned them left and put adjustment on the left.
- In a light-theme QA copy constrained to the reported 132px scrollport, the
  open long-word card measured 130.3px and remained fully visible. Adjustment
  buttons measured 44 × 44px; Undo measured 50 × 44px.
- The sample amount changed from 1 to 1.5; Undo reduced five rows to four;
  resetting the example restored five rows. No production data was involved.
- Measured contrast against the card fill: Khafi/Jali borders 3.14/3.56 in
  light appearance and 4.48/4.31 in dark; Undo text at least 4.81 in light and
  6.35 in dark; primary text at least 15.79 in light and 11.79 in dark.
  These ratios do not resolve the colour-only identification limitation.
- No browser console errors were reported in the inspected comparison. Browser
  sizing was restored and the temporary QA tab/server were closed after review.

The ordinary comparison starts with a 244px list for viewing neighbouring category
cards. Its design controls allow reducing available height to 132px. The separate
QA copy used 132px directly; no additional space was taken from the actual app.

## Latest refinement: inset evidence, middle adjuster, rightmost Undo

Owner requested Undo at the far right and the adjuster in the middle. Retained:
letter-first hierarchy, exact kalimah, category wash/border and existing actions.
Recomposed: one shared lower row and consistent evidence inset. Removed: separate
Undo row and the cramped 8px evidence inset. No application code or data changed.

Use 16px evidence insets normally, 12px in narrow cards, 8px between cards,
and 8px between lower-row groups (6px at compact width). The entire letter
header stays clickable. All three action buttons retain independent 44px square
targets; only the numeric display is narrower. Values keep tabular numerals.
The adjuster is the middle group, not forced to the geometric centre of the card.

This follows proximity/grouping guidance: related evidence shares an alignment,
and neighbouring actions retain distinct space. The exact inset is a visual
judgment, not a universal prescribed number. Sources:
- https://www.nngroup.com/articles/gestalt-proximity/
- https://www.w3.org/WAI/WCAG21/Understanding/target-size/

Browser checked at desktop and 320 × 568 in dark appearance. At compact width,
letter and word have identical left coordinates, all lower-row groups share a
vertical centre, the word has a 16px gap before the adjuster, and Undo sits 6px
after it. Open card height is 103.6px, versus the previous 145.6px. No horizontal
overflow observed. Adjustment from 1 to 1.5 was verified; all action targets
measure 44 × 44px. Light appearance, unusually long words, real application
integration and physical-device acceptance remain unverified for this revision.

Confidence: practicality 94/100; architecture/data safety 97/100; visual
certainty 84/100. Planning preview only; owner approval and integration checks
are still required before release.

## Implementation validation

Implemented the approved letter-first inset, category card tint, middle adjuster
and rightmost Undo in the existing MistakeLog component. Removed the word capsule
and compact references; accessible labels and full desktop review retain context.
Mobile sheet follows the same quiet cards, with location available in accessible
labels and History. Closed details are removed from keyboard navigation. Opening
a card scrolls only its list, not the surrounding page. Oversized evidence keeps
the action group together on the next line rather than shrinking touch targets.

Verified in the app: 1191 � 668 desktop in light/dark, 1024 � 768 tablet,
390 � 844 and 320 � 568 phone. Checked short and long words, whole-card tints,
44px controls, arrow-free desktop scrollbar, adjustment (2 to 2.5), Undo,
History restore, and reload persistence. Final suite: 428 passed, 1 skipped,
0 failed. Production build passed with the existing bundle-size advisory.
Physical-device feel and Safari-specific rendering are not claimed.

Confidence after implementation checks: practicality 95/100,
architecture/data safety 97/100, visual certainty 90/100.
