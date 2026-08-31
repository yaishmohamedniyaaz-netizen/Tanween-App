# Mistake feedback, category colour, and Mushaf highlight — implementation plan

**Status:** implementation and automated validation complete. The user approved
commit and publication on 2026-08-31. Physical-device visual verification and
VoiceOver confirmation remain open and must not be reported as completed.

**Planning base:** `f659a8f` on
`claude/interactive-design-iterations-10qwpf`.

**Primary surfaces:** the active judging workspace in phone portrait and the
existing desktop judging rail. The mobile judge deck remains behind
`?mobileJudgeDeck=1` until its wider release gate is separately approved.

## 1. Approved outcome

This pass makes recorded mistakes quicker to confirm and easier to see without
changing what a mistake means, how it is scored, or where its evidence is
stored.

The completed slice must:

- show the mobile last-action strip for five seconds instead of twelve;
- keep immediate dismiss and Undo, with the Mistake Log as the persistent
  recovery route;
- standardize decorative category swatches to an 8 × 8px square where they
  identify a labelled criterion or mistake;
- retain category colour as the app's only saturated verdict signal;
- add a restrained category wash to a score row only after that criterion has
  lost marks;
- preserve the existing mobile `scoreChipTint` preference and its saved V5
  format;
- make permanent Mushaf mistake highlights legible in light and dark mode by
  combining a soft fill with a strong theme-aware edge;
- keep Quran glyphs, diacritics, word geometry, selection targets, and QCF
  source data untouched; and
- leave desktop and phone-landscape layout geometry unchanged apart from the
  intentionally approved category swatch and earned-row treatment.

## 2. Decisions locked for implementation

These choices are resolved for this pass and should not be reopened while
coding unless a named browser or accessibility gate fails.

### 2.1 Last-action timing and behaviour

1. `LAST_ACTION_VISIBLE_MS` becomes `5_000`.
2. Five seconds is the default because the strip contains an action and the
   judge is listening while reading it. Three seconds is not a variant in this
   pass.
3. A new mistake or restored/recategorized mistake restarts the five-second
   window for the new action, using the existing ledger-derived action key.
4. Undo removes the same mistake through the existing `REMOVE_MISTAKE` action.
5. Dismiss only hides the strip; it never changes the mistake or score.
6. The persistent Mistake Log remains the alternative route to inspect and
   Undo the mistake after the strip disappears.
7. The existing `lastMarkStrip: "on" | "off"` device preference and default
   remain unchanged. Do not add a duration preference or bump the preference
   schema.
8. The 44px criterion/last-action row remains fixed, so appearance and expiry
   never move the Mushaf or dock actions.

Research basis:

- W3C explicitly documents a five-second temporary status as acceptable when
  the same information or function remains available elsewhere:
  <https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html>
- Android documents Undo as the canonical Snackbar action and requires another
  way to perform it after dismissal:
  <https://developer.android.com/develop/ui/views/notifications/snackbar/action>
- Apple recommends integrated, proportionate feedback and easy recovery:
  <https://developer.apple.com/design/human-interface-guidelines/feedback>

### 2.2 Status-message accessibility

1. Keep the visible buttons ordinary, focusable controls; the status
   announcement must not take focus.
2. Add a permanently mounted, visually hidden status container inside the
   mobile deck before any mistake is recorded.
3. Update that container with an atomic sentence such as
   `Laḥn Jalī mistake recorded on [word], minus 2.` when the latest action
   changes.
4. Use `role="status"` and `aria-atomic="true"`; do not put the Undo and dismiss
   buttons inside that status role.
5. Do not announce the strip's visual expiry. Undo and dismiss already produce
   their own state changes.
6. Verify the announcement once with VoiceOver on an actual Apple device. A
   source assertion is not sufficient proof.

Reference:
<https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22.html>

### 2.3 Category swatches

1. Category swatches that sit beside a visible category/mistake label become
   8 × 8px, with a 2px radius.
2. This applies to:
   - `.sc-dot` in the scorecard and competition category summary;
   - `.log-dot` in the Mistake Log;
   - `.mobile-category-mark` in the last-action strip; and
   - `.mobile-criterion-label i` when the current tint policy shows a swatch.
3. The square is decorative and remains `aria-hidden`; the adjacent text
   carries the category name.
4. Do not replace genuine underlines, borders, progress indicators, selection
   edges, analysis bars, or result accents merely because they are rectangular.
5. Do not create different shape codes for the four categories in this pass.
   Their text labels remain present in score and log surfaces.

This keeps the square a compact colour key rather than pretending its shape
alone identifies a category. Colour is supplementary to text, consistent with
WCAG 1.4.1:
<https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html>

### 2.4 Scorecard colour treatment

1. Desktop score rows gain an `is-earned` state when their effective deduction
   is greater than zero.
2. `is-earned` uses a low-attention category wash derived from the row's
   category token; the label and score text remain normal ink rather than
   category-coloured text.
3. A zero-deduction or pending impression row remains neutral.
4. The 8 × 8px square remains visible in every row, including neutral rows.
5. The mobile criterion strip keeps its existing policy:
   - `off`: neutral cells with visible square swatches;
   - `earned`: wash only after a deduction, the current default;
   - `always`: wash in all assigned cells.
6. Do not apply `scoreChipTint` to desktop. The desktop earned-row treatment is
   a fixed presentation rule, not a new preference or migration.
7. Row tint must not change row height, grid tracks, score alignment, mark
   picker geometry, or hover/focus behaviour.

The visual hierarchy is therefore:

- square = category identity;
- wash = this criterion has produced a deduction;
- deduction and score text = exact result.

### 2.5 Permanent Mushaf mistake highlight

1. Keep the current word-sized translucent wash; do not put opacity on the
   Quran glyph itself.
2. Stop relying on `mix-blend-mode` as the only means of making the verdict
   visible.
3. Add explicit light- and dark-theme mark-fill tokens for every category.
   Existing category identity values (`--c`, `--c-strong`) remain the source of
   hue; the new fill token must be composed against `--page-paper`.
4. Add a 2px `--c-strong` block-end edge to the existing
   `.glyph-ink.marked::before` layer. Because that layer already extends below
   the glyph by `--mark-wash-pad-bottom` (4–7px), the edge must sit in the
   reserved wash padding rather than cross the Arabic ink.
5. If browser screenshots show the edge touching a kasrah or other lower
   diacritic at any tested page scale, use a 1px inset outline around the
   padded wash layer as the fallback. Do not move or edit Quran glyphs.
6. The permanent marker must remain still. The existing 1.2s flash may run
   immediately after recording, but no continuing pulse or animation is added.
7. Multiple mistakes retain the existing numeric count badge.
8. Hover/armed selection stays neutral before commit, preserving the design
   grammar distinction between selection and verdict.
9. Results evidence keeps its existing category underline in this pass. It is
   a useful precedent, not a target for a broad results redesign.

The current wash calculates to only about 1.17–1.31:1 against the page paper.
The strong edge tokens calculate to about 6.42–9.59:1, giving a robust visible
boundary while allowing the fill to remain respectful and unobtrusive. Treat
3:1 as the minimum target for the required graphical edge:
<https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html>

VS Code uses the same layered family of patterns—translucent diagnostic
background plus a distinct squiggle/border while keeping text readable:
<https://code.visualstudio.com/api/references/theme-color>

## 3. Contracts that must not change

Do not change:

- `computeScores`, `impressionScore`, category starting marks, deductions, or
  impression requirements;
- mistake creation, target identity, chronology, Undo/restore semantics, or
  event payloads;
- session persistence, saved-session format, exports, or evidence snapshots;
- Quran text, page JSON, QCF fonts, cluster geometry, hit boxes, or word IDs;
- notes, Finish validation, competition rules, participant assignment, or judge
  category assignment;
- `lastMarkStrip` and `scoreChipTint` enum values, defaults, storage key, or V5
  normalization; or
- the mobile deck activation rule and query flag.

No unresolved competition or judging rule is introduced by this plan, so
`docs/UNDECIDED_DECISIONS.md` does not need a new product-rule entry.

## 4. File-level implementation

### Slice A — timing and status semantics

**Change:** `src/components/MobileJudgeDeck.tsx`

- set the duration constant to `5_000`;
- preserve the current event-derived expiry calculation so reopening an old
  session does not show a stale last action;
- add the pre-mounted hidden status container outside the interactive strip;
- derive one complete announcement string from the latest action; and
- keep Undo, dismiss, open-evidence, and sheet behaviour unchanged.

**Change:** `scripts/mobile-judge-deck.test.mjs`

- lock the five-second constant;
- lock the pre-mounted `role="status"` and `aria-atomic="true"` container;
- assert that interactive controls are not nested inside the status container;
- retain the latest-ledger-action and Undo-retirement tests; and
- add a source case proving the old twelve-second duration is absent.

### Slice B — square category swatches

**Change:** `src/styles/global.css`

- standardize the four named category-swatch selectors to 8 × 8px and 2px
  radius;
- keep the existing grid tracks and gaps unless a measured alignment failure
  requires a selector-local correction; and
- leave all unrelated rectangular verdict/progress treatments untouched.

**Change:** `scripts/visual-controls.test.mjs` and/or
`scripts/mobile-judge-deck.test.mjs`

- add source/CSS contracts for the four square selectors;
- assert that no interactive target is reduced to 8px—the swatches remain
  decorative children of normal rows or controls; and
- keep existing 44px live-control checks.

### Slice C — desktop earned-row wash

**Change:** `src/components/ScorePanel.tsx`

- add `is-earned` only when the displayed deduction is greater than zero;
- ensure pending impression rows do not receive it; and
- avoid adding local score calculations that could diverge from existing
  scoring data.

**Change:** `src/styles/global.css`

- tint `.sc-row.is-earned` with a theme-aware category wash;
- retain current separators, grid, height, picker, text colours, and score
  alignment; and
- give hover/focus/open states precedence where needed so interactivity remains
  obvious.

**Change:** focused score/visual source tests

- cover zero, positive, fractional, fully deducted, and pending impression
  rows;
- prove the treatment is class/presentation only; and
- retain score-value and Adu/Raagu picker assertions.

### Slice D — legible live Mushaf evidence

**Change:** `src/styles/global.css`

- define explicit light and dark permanent-mark fill tokens;
- apply them only to committed `.glyph-ink.marked` evidence;
- add the strong edge within the existing padded pseudo-element;
- preserve neutral hold/armed styles and the flash lifecycle; and
- add forced-colors/high-contrast fallback if browser inspection shows the
  category layer disappears under system overrides.

**Change:** `scripts/solid-mushaf.test.mjs` and/or a new narrowly named visual
contract test only if the existing test cannot express these rules.

- assert separate light/dark permanent-fill tokens;
- assert a strong non-fill edge exists;
- assert glyph opacity and Quran text colour are not changed;
- assert armed/hover remains neutral; and
- retain multi-mark count and flash contracts.

## 5. Implementation and review order

Work in four reversible checkpoints:

1. **Timing/accessibility:** implement Slice A, run focused tests, and manually
   observe one five-second cycle before touching colour.
2. **Swatches:** implement Slice B and compare marker alignment on mobile and
   desktop without any row tint.
3. **Score rows:** implement Slice C and compare neutral versus earned rows for
   all four categories in both themes.
4. **Mushaf evidence:** implement Slice D last, after QCF fonts load, because it
   has the highest religious-text and visual-fidelity risk.

Do not combine all four slices into one unreviewed visual sweep. If a later
slice is rejected, the earlier verified behaviour should remain independently
revertible.

## 6. Browser QA matrix

Use a built local app with real QCF assets. Browser zoom must be 100%.

### 6.1 Core state

Create one active session containing:

- one mistake in each pinpointed category;
- a repeated mistake on one word to expose the count badge;
- zero and non-zero score rows;
- a pending Adu/Raagu impression before selection and a completed selection;
- enough mistakes to scroll the log; and
- one newly recorded mistake for the last-action timing test.

### 6.2 Viewports

- 393 × 852 phone portrait with `?mobileJudgeDeck=1`;
- 390 × 844 phone portrait;
- phone landscape at approximately 852 × 393;
- 1024 × 768 desktop/narrow landscape;
- 1280 × 800 desktop; and
- 1400 × 900 desktop.

Desktop and phone landscape must be compared against same-state baseline
screenshots. Their composition may not change beyond the approved square
swatches, earned score-row wash, and improved Mushaf evidence.

### 6.3 Theme and state matrix

At minimum capture:

- light and dark mode;
- all four category colours;
- neutral score row and earned score row;
- last-action visible, dismissed, expired, and disabled by preference;
- a single marked word and a multi-mark word;
- Mushaf Fit and the next larger supported scale where geometry permits;
- ordinary, hover/focus, armed-before-commit, flash, and committed states; and
- score/mistake sheets open and closed on mobile.

### 6.4 Measurements and acceptance

Record:

- last-action visibility at approximately 0s, 4.9s, and 5.1s;
- immediate replacement when a second mistake is recorded;
- criterion strip restoration with no dock-height or Mushaf-position change;
- all named swatches at 8 × 8px;
- zero horizontal overflow at both portrait sizes;
- unchanged score row height, score-column width, and MarkPicker geometry;
- text contrast at 4.5:1 where normal-sized text is required;
- strong permanent-mark edge at 3:1 or greater against `--page-paper`;
- no Quran glyph, kasrah, shaddah, or other diacritic touched by the edge;
- permanent evidence still recognizable with category fill temporarily
  disabled in DevTools; and
- no console errors during record, dismiss, Undo, open-log, theme change, and
  page navigation.

Physical-device claims require physical-device checks. Desktop emulation does
not prove iOS PWA rendering, VoiceOver announcement, or display contrast.

## 7. Automated validation gate

Run focused tests after each slice, then the full gate:

```powershell
npm.cmd test
npm.cmd run build
git diff --check
```

Any failure in scoring, ledger history, device preferences, Mushaf geometry,
exports, Finish validation, mobile deck activation, or existing desktop layout
blocks approval even if the new visuals look correct.

## 8. Commit, publication, and rollback

Do not commit or publish before the user sees and approves the 393 × 852 light
and dark result.

Recommended commit split after approval and full validation:

1. `fix: shorten and announce mobile mistake feedback`
   - five-second timing, status semantics, and focused tests;
2. `style: clarify category markers and earned score rows`
   - square swatches, desktop earned-row wash, and visual contracts;
3. `fix: strengthen Mushaf mistake evidence contrast`
   - theme-specific mark tokens, strong edge, and Mushaf tests.

Stage only these validated files plus this plan and the final verification note.
The existing untracked `.private/`, `outputs/`, and `tmp/` directories are
user-owned and stay out of every commit.

After push, publish the exact reviewed SHA through the repository's configured
Sites workflow, wait for success, open the hosted build, and repeat the phone
portrait timing plus light/dark mark smoke checks. Push, publish, and hosted
visual verification must be reported separately.

## 9. Explicit exclusions

This pass does not include:

- scoring, deduction, competition-rule, or assignment changes;
- new saved preferences or a preference migration;
- Results-screen redesign;
- Mistake Log information architecture changes;
- audio recording, Tilawa alignment, timestamps, or playback;
- Quran text, QCF font, page geometry, target schema, or hit-box changes;
- broad replacement of every rectangular accent in the application;
- animated or pulsing permanent mistakes;
- category-specific shape language;
- an automatic production activation of `mobileJudgeDeck`; or
- a general dark-mode redesign.

## 10. Final approval checklist

Implementation is ready to commit only when all are true:

- five seconds feels sufficient on the actual judging task and twelve seconds
  is absent;
- the criterion strip returns without layout movement;
- Undo remains available from the persistent Mistake Log;
- VoiceOver announces one complete status without moving focus;
- all intended swatches are square and all genuine bars remain intact;
- desktop earned rows are quieter than the last-action strip but clearly
  distinguishable from neutral rows;
- light and dark permanent marks are easy to find without obscuring Quran text;
- lower diacritics remain visibly untouched at every tested scale;
- scoring, ledger, saved preferences, exports, notes, Finish, and assignments
  behave exactly as before;
- desktop and phone-landscape baseline comparisons show only the approved
  visual differences;
- full tests, build, diff check, and browser console checks pass;
- unrelated worktree files are absent from the staged diff; and
- the user explicitly approves the visible result before commit/publication.

## 11. Confidence gate

- **Practicality: 95/100.** Each change has a narrow existing seam and can be
  implemented in reversible slices.
- **Architecture/data safety: 98/100.** The plan changes timing, semantics, and
  presentation without changing scoring, ledger, persistence, or evidence.
- **Visual certainty: 82/100 before prototype.** Square swatches and five-second
  timing are highly predictable; the live Mushaf edge must still be seen with
  real QCF diacritics in light and dark mode. It becomes implementation-ready
  only after the named browser and device checks pass.
