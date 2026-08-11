# Letter tray V2 — next update plan

Status: implementation-ready plan; no runtime changes in this planning pass  
Date: 2026-08-11  
Release boundary: semantic recitation targets + connected tray reliability  
Parent decision record: [`PRODUCT_FOUNDATION.md`](./PRODUCT_FOUNDATION.md)

## 1. Outcome

The next update should make one promise:

> After a judge chooses a word, Tahqeeq never commits a deduction until the
> judge explicitly identifies one reviewed recitation target and one mistake
> category. The target remains traceable to the exact QPC source span, even
> when the tray shows a simplified glyph.

This is one coherent update. It is not safe to ship only the CSS or only the
new Arabic grouping because the current display glyph, semantic span, saved ID,
gesture state, and mistake record all depend on one another.

The coding work is feasible in one sustained implementation turn, divided into
internal passes and verification gates. A claim that every Hafs grouping rule
is religiously final is not possible in one turn because the grouping authority
and golden fixtures require a qualified reviewer.

## 2. Evidence from the current app

### 2.1 Live desktop and mobile inspection

The current build was exercised at its normal desktop composition and with a
390 × 844 CSS-pixel mobile viewport.

| Finding | Current evidence | Consequence |
|---|---|---|
| Full marked glyph is overloaded | `JudgingUnit.glyph` is used for the rail, log, and saved record | The fa in `فَّٰ` is crowded because the tray cannot choose a clean label independently |
| No semantic alif grouping yet | `وَتَوَاصَوۡاْ` still opens as `وَ | تَ | وَ | ا | صَ | وۡ | اْ` | Styling cannot fix the incorrect seven-target interaction |
| First unit is selected implicitly | `Mushaf.tsx` opens with `firstUnit.tid` | A direct drag into a category can record the first unit even when the judge never chose it |
| Six units fit well | Page 604 fa fixture produced six cells about 43.7 × 44px on desktop and 42.9 × 43.1px in the emulated mobile viewport | The general connected-rail geometry is usable |
| Seven units shrink | Page 601 Al-Asr fixture produced seven cells about 40.6 × 44px | Frequent longer words fall below the intended 44px touch target |
| Category rows are smaller | Current category buttons are 40px high | Increase them to the same reliable 44px interaction rhythm |
| Keyboard events leak | Pressing ArrowLeft inside the page-601 tray navigated the Mushaf to page 602 while leaving the tray open | Page navigation and tray navigation need strict event isolation and page-change cleanup |
| Whole-word page selection works | The QCF word remains one solid page glyph; the rail is separate | Preserve this architecture; do not return to approximate per-letter page overlays |
| Pointer tracking foundation is sound | The page uses pointer capture and `document.elementFromPoint()` while dragging | Keep this mechanism and make its state transitions explicit |

### 2.2 Corpus scale

A scan of the locked 604 current page files found:

- 77,882 recited word records;
- 5,612 words with seven or more current raw targets;
- a maximum of 11 raw targets;
- 27 words with ten or eleven targets;
- 15,537 words containing a precomposed hamza-carrier form in a broad source
  pattern scan;
- 2,971 words matching the broad final-waw/alif pattern scan;
- four exact `وَتَوَاصَوۡاْ` occurrences: two on page 594 and two on page 601.

Therefore, page-specific patches are not sufficient. The implementation needs
a deterministic full-corpus compiler plus a small reviewed override layer.

## 3. Scope

### 3.1 In scope

1. Split exact source form from the clean tray label.
2. Introduce versioned, deterministic recitation-target IDs and legacy aliases.
3. Implement only the explicitly declared V2 target policies.
4. Migrate active and historical saved mistakes without silently losing their
   original IDs or glyph snapshots.
5. Remove the implicit first-letter selection.
6. Keep a reliable one-stroke pointer path and a complete tap path.
7. Guarantee 44 × 44px tray and category targets without shrinking long words.
8. Correct viewport placement, focus behavior, keyboard isolation, and dialog
   cleanup.
9. Add corpus, migration, interaction, mobile, and visual acceptance tests.

### 3.2 Explicitly out of scope

- changing the QPC V1 page glyphs, fonts, lines, headers, or ayah markers;
- drawing approximate letter boxes over the QCF page word;
- removing tashkeel from the Mushaf or saved evidence;
- redesigning the accepted connected-runway concept;
- changing scoring rules, mistake cards, results, questions, or audio;
- claiming unreviewed target policies are authoritative Hafs rulings;
- publishing automatically before the release gates pass.

## 4. Data contract

### 4.1 Source lock

Before target-code changes:

1. create `checkpoint/pre-letter-tray-v2-20260811` from the accepted baseline;
2. record the current Git commit, `MUSHAF_DATA_VERSION`, layout name, QUL/Quran
   Foundation endpoints, page-file hashes, and aggregate source hash;
3. record the applicable KFGQPC, QUL, and Quran Foundation reuse terms or leave
   official distribution blocked if the terms have not been resolved;
4. do not rebuild or relabel the QPC page data during this update.

The target compiler operates on the semantic `word.text` already paired with
the QPC V1 glyph. The page glyph remains the print source of truth.

### 4.2 V2 target type

The existing `glyph` field must be separated:

```ts
type RecitationTarget = {
  id: string;                 // stable V2 ID, not an array index
  wordId: string;             // existing surah.ayah.word identity
  sourceStart: number;        // UTF-16 offsets into exact word.text
  sourceEnd: number;
  primaryGlyph: string;       // clean rail label, e.g. ف or ء
  fullGlyph: string;          // exact source slice, e.g. فَّٰ or ئِ
  kind: "letter" | "hamza" | "contextual";
  carrier?: "alif" | "waw" | "ya" | "tatweel";
  features: string[];         // shadda, fatha, dagger-alif, madd, etc.
  ruleId: string;
  reviewStatus: "baseline" | "reviewed" | "override" | "blocked";
  aliases: string[];          // old @uN and legacy grapheme IDs
};
```

`primaryGlyph` is presentation. `fullGlyph`, source span, word identity, data
version, and rule version are evidence. Changing the label must never change the
meaning of an existing saved mistake.

### 4.3 Stable ID policy

New IDs should derive from the locked word identity and the target's source
anchor, not its array position. A suitable shape is:

```text
{wordId}@r{sourceStart}
```

The exact string can change during implementation, but it must satisfy:

- deterministic output from identical source/rule versions;
- uniqueness inside a word;
- stability when a later target elsewhere in the word is merged;
- stability when a reviewed target classification changes while its source
  locus stays the same;
- explicit aliases for every V1 `wordId@uN` absorbed by the target;
- no silent auto-resolution when one old target would split ambiguously.

### 4.4 V2 rule boundary

Implement the following as named policies with fixtures, not scattered Unicode
conditions:

1. Ordinary consonant: clean base as `primaryGlyph`; retain all marks in
   `fullGlyph` and `features`.
2. Shadda, vowel, tanwin, sukun, dagger alif, small waw/ya, and Quranic signs:
   attach to their reviewed host; never become empty chips.
3. QPC tatweel + combining hamza: one hamza target with primary `ء` and exact
   full source span.
4. Precomposed hamza on alif, waw, or ya: primary `ء`; retain the complete
   carrier form and carrier metadata.
5. Allah forms: preserve the existing explicit wasl + geminated-lam + ha policy,
   including prefixes, behind named fixtures.
6. Plain madd alif after its sounding host: candidate merge into that host.
7. Final plural/silent alif: candidate merge into the preceding waw locus.
8. Hamzat al-wasl: remains explicitly addressable in this release.
9. Ayah markers and ornaments: never targets.

Rules 6 and 7, the Allah family, and the hamza interaction label require the
named Hafs/QPC V1 reviewer gate already described in the product foundation.
Unknown rule classes remain deterministic baseline targets or become blocked in
official mode; the compiler must never invent an undocumented merge.

### 4.5 Mandatory fixtures

- `ٱلنَّفَّٰثَٰتِ` → six targets, primary `ٱ | ل | ن | ف | ث | ت`, while the fa
  target retains `فَّٰ` and its shadda/fatha/dagger-alif features;
- all four `وَتَوَاصَوۡاْ` occurrences → proposed five targets
  `وَ | تَ | وَا | صَ | وۡاْ`;
- `سُئِلَ` → primary `س | ء | ل`, with `ئِ` retained as the middle full form;
- `يَسۡـَٔلُونَ` → the QPC encoded hamza remains reachable;
- Allah with no prefix and with `و`, `ف`, `ب`, `ك`, and `ل` prefixes;
- plain alif, dagger alif, madd, small waw, small ya, shadda, and tanwin;
- the longest 10- and 11-target words;
- pause/ayah/hizb/sajdah ornaments.

## 5. Saved-data migration

### 5.1 Mistake snapshot

New mistakes should store:

```ts
targetId
targetVersion
wordId
sourceStart
sourceEnd
primaryGlyph
fullGlyph
originalTargetId?      // retained for migrated records
migrationStatus?       // exact | auto-merged | unresolved
```

Keep the existing `glyph` snapshot readable during migration. Do not rewrite a
historical glyph merely because the current tray label is cleaner.

### 5.2 One-time migration behavior

1. Back up the untouched V1 local state under a versioned backup key.
2. Migrate both active mistakes and every saved session.
3. Resolve V1 IDs through the target's alias list.
4. Many-to-one merges may become `auto-merged` while preserving the original
   ID and glyph.
5. A future one-to-many ambiguity becomes `unresolved`; it is never assigned to
   an arbitrary new target.
6. Running migration twice produces exactly the same state.
7. If migration throws, retain V1 state and show a recoverable diagnostic; do
   not start with an empty history.

## 6. Interaction state machine

The current implicit first unit should be replaced with explicit states:

```text
closed
  -> word-armed / no target
  -> target-selected
  -> category-preview
  -> committed

word-armed
  -> pinned tap mode
  -> cancelled
```

### 6.1 One-stroke pointer path

1. Pointer down on a word highlights the whole source word and opens the tray.
2. No letter is selected yet.
3. The existing pointer capture keeps receiving the gesture.
4. `document.elementFromPoint()` identifies the rail cell currently under the
   pointer; entering a cell selects that exact target.
5. Categories cannot preview or commit until a target is selected.
6. Entering Jali, then Khafi, then Fasaha previews the category color on the
   whole source word while retaining the rail target ring.
7. Pointer up commits only when both target and category are present.
8. Pointer up elsewhere or `pointercancel` closes without a deduction.

This removes the most dangerous current failure: committing the first target
without an explicit target choice.

### 6.2 Tap path

1. A quick word tap pins the tray.
2. Tap one target; the category buttons then become enabled.
3. Tap a category to commit.
4. Tap the backdrop or press Escape to cancel.
5. The word remains selected as a whole on the page; the exact target is shown
   only by the rail's full selection ring.

### 6.3 Scroll and touch-action decision

Keep `touch-action: none` only on active word hit regions and preserve
`pan-y pinch-zoom` on the page. The Pointer Events specification explains that
`touch-action: none` prevents viewport panning for a gesture that begins there,
while `pan-y` permits the browser to claim a vertical gesture and issue
`pointercancel`. Tahqeeq's vertical one-stroke category path therefore cannot
reliably share the same word-origin gesture with normal vertical scrolling.

The safe compromise for this release is:

- continuous judging gestures remain protected on word hit regions;
- scrolling/pinch zoom remains available from page space outside word hits;
- the pinned tap path is always available;
- do not attempt to change `touch-action` after pointer down, because the
  browser has already decided the gesture policy.

Source: [W3C Pointer Events](https://www.w3.org/TR/pointerevents/).

## 7. Tray UI and geometry

### 7.1 Visual hierarchy

- Do not repeat the kalimah inside the popup.
- Display only `primaryGlyph` in the rail.
- Keep the exact word visible on the Mushaf immediately beside the callout.
- Use a neutral full rectangular ring around the selected target, not a
  bottom-only underline.
- When a category is previewed, recolor the selected ring and use a very light
  whole-word wash plus underline; never paint an opaque layer over the text.
- Preserve the accepted near-monochrome design with category colors used only
  for active meaning.
- Preserve physical order nearest the source: Jali, then Khafi, then Fasaha.

The complete marked form remains in the accessible name, mistake record, log,
and details. It is not squeezed back into the small primary rail label.

### 7.2 Target sizing

- rail cells: `flex: 0 0 44px; min-width: 44px; min-height: 44px`;
- category rows: minimum 44px;
- never shrink cells merely to fit the maximum card width;
- short words remain compact;
- use a responsive maximum rail width of roughly
  `min(360px, visualViewport.width - 24px)`;
- words wider than the rail scroll horizontally with hidden but operable
  scrollbars and visible edge-fade affordances.

WCAG 2.2 requires at least 24 × 24 CSS pixels at Level AA, while its enhanced
criterion and Apple's touch guidance use 44 × 44. This is a frequent,
consequential judge action, so V2 should adopt 44 rather than the legal minimum.

Sources: [WCAG 2.5.8 minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum),
[WCAG 2.5.5 enhanced](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced),
[Apple button guidance](https://developer.apple.com/design/human-interface-guidelines/buttons?changes=latest_1__8).

### 7.3 Long-word behavior

At 390px, seven 44px targets plus padding can fit if the unnecessary 304px cap
is removed. Eight or more may need horizontal travel.

- In pinned mode, selecting by keyboard or tap scrolls the selected cell fully
  into view.
- In continuous mode, a narrow edge zone may auto-scroll the rail while the
  pointer is held near an edge. This must be requestAnimationFrame-driven,
  capped, and cancelled immediately on release/cancel.
- If edge auto-scroll cannot pass mobile tests, retain correct 44px cells and
  require the pinned/tap path for off-screen targets rather than shrinking or
  guessing.

### 7.4 Viewport placement

Replace the fixed `anchor.top > viewportHeight * 0.58` rule with available-space
placement:

1. measure the complete fixed-height tray;
2. read the visual viewport's width, height, and offsets when available;
3. calculate free space above and below the word;
4. choose the side that fits; otherwise choose the larger side and clamp;
5. keep 12px safe gutters and the callout pointer inside rounded corners;
6. recompute on visual-viewport resize/scroll, orientation change, page zoom,
   and layout change;
7. close the tray whenever its page or word disappears.

Mobile browsers can shrink the visual viewport without changing the layout
viewport, especially during pinch zoom or an on-screen keyboard. Source:
[MDN VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport).

## 8. Keyboard and accessibility reliability

### 8.1 Fix the confirmed page-navigation leak

- Mushaf-level ArrowLeft/ArrowRight navigation must return immediately when
  `event.defaultPrevented` is true or the target is inside the tray, dialog, or
  another interactive control.
- The tray handler should stop propagation for handled arrow keys.
- A page change, layout change, or source-data change closes the tray.
- Add a regression test reproducing page 601 → 602 leakage.

### 8.2 Exact-target semantics

The rail is a mutually exclusive choice, so use a horizontal `radiogroup` with
radio semantics or an equivalently tested native-control pattern. The selected
target exposes `aria-checked`; the visible and accessible labels should include
position and full form, for example “Letter 4 of 6, فَّٰ, fa with shadda and
dagger alif.”

W3C's toolbar example uses a radio group—not independent toggles—for a set where
only one item can be selected. Source:
[WAI-ARIA toolbar example](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/examples/toolbar/).

### 8.3 Pinned dialog behavior

- Enter/Space on a keyboard-focusable word opens pinned mode.
- Move focus into the tray only for pinned mode, not during a held pointer
  gesture.
- Left/Right moves through the RTL rail without changing pages.
- The outward arrow moves from the selected target to Jali; continuing moves
  Jali → Khafi → Fasaha.
- Tab and Shift+Tab remain inside a modal pinned tray.
- Escape cancels and returns focus to the invoking word.
- Commit returns focus to the word or the next logical judging location.
- Add a visible focus treatment on the source word hit region.

Source: [WAI-ARIA dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

## 9. File-level implementation map

| File | Planned change |
|---|---|
| `src/lib/judgingUnits.ts` | Replace overloaded `glyph` output with the versioned V2 target contract and named policy functions |
| `src/lib/recitationTargetRules.ts` | New pure feature/rule module; no React or DOM dependencies |
| `src/data/recitationTargetOverrides.ts` | Small reviewed word/rule override table with reason and approval metadata |
| `src/lib/recitationTargetIds.ts` | Stable IDs, V1 aliases, and ambiguity-safe resolution |
| `src/lib/targetManifest.ts` | Source/rule versions and aggregate manifest constants |
| `scripts/audit-targets.mjs` | Full 604-page deterministic compiler audit, counts, hashes, unknowns, and changed-target report |
| `src/types.ts` | Add target version/span/full/primary/migration metadata to mistakes without deleting legacy fields |
| `src/state/migrateTargets.ts` | One-time backup and idempotent active/history migration |
| `src/state/store.tsx` | Call migration safely and preserve failure recovery |
| `src/components/Mushaf.tsx` | Explicit no-target state, guarded category commit, page-change cleanup, pointer state machine, keyboard word activation |
| `src/components/DragMenu.tsx` | Primary labels, radio semantics, disabled categories until selection, focus containment, long-rail behavior |
| `src/lib/selectorLayout.ts` | 44px no-shrink sizing and visual-viewport vertical/horizontal placement |
| `src/styles/global.css` | Strong selected ring, 44px targets, overflow fades, safe light washes, source focus state |
| `src/components/HintBanner.tsx` | Explain “word → exact target → category”; no claim that holding is the only path |
| `scripts/selection-units.test.mjs` | V2 semantic fixtures and source-span assertions |
| `scripts/selector-layout.test.mjs` | 320/360/390/768 widths, 1–11 targets, no shrink, safe placement |
| `scripts/selector-contract.test.mjs` | Explicit target gate, category order, roles, keyboard isolation contract |
| `scripts/target-migration.test.mjs` | Exact, many-to-one, unresolved, backup, and idempotence fixtures |
| `tests/letter-tray.spec.ts` | New browser interaction suite for mouse, touch-sized viewport, keyboard, cancel, page change, and long rails |

The exact file split may be adjusted during implementation, but the pure target
compiler, state migration, interaction controller, and visual component should
not be collapsed into one file.

## 10. Verification matrix

### 10.1 Pure and corpus tests

- every one of the 604 page files loads;
- all 77,882 recited words emit at least one target;
- source spans are ordered, non-overlapping, and fully classified;
- every target has a nonempty clean primary label and exact full form;
- every target ID is unique within its word;
- every V1 ID is resolved, explicitly merged, or explicitly unresolved;
- no ayah or standalone ornament becomes selectable;
- all four `وَتَوَاصَوۡاْ` fixtures have identical policy output;
- outputs and the audit manifest are byte-reproducible;
- the changed-target report is reviewed before publishing.

### 10.2 Browser interaction tests

Run at 320 × 568, 390 × 844, 768 × 1024, and 1440 × 900:

1. word opens with no selected target;
2. category cannot commit before a target;
3. tap target → tap category records the correct stable ID and full form;
4. pointer down → target → Jali → release records exactly one mistake;
5. pointer cancel records nothing;
6. moving target A → B before release records B only;
7. the whole source word remains legible under neutral/category preview;
8. every visible target and category is at least 44 × 44px;
9. no tray edge leaves the visual viewport;
10. an 11-target word can reach both ends without cell shrinkage;
11. ArrowLeft/ArrowRight changes target, never the Mushaf page;
12. Escape closes and page change closes;
13. pinned focus remains contained and returns correctly;
14. light/dark and 70%/100%/130% Mushaf zoom remain legible;
15. split view and page-edge words anchor correctly.

### 10.3 Required real-device checks

Automated emulation is not enough for the release gate. Test at least:

- one recent iPhone Safari;
- one Android Chrome device;
- desktop Chrome with mouse;
- keyboard-only desktop flow;
- one slow/older phone if available.

Record screen video for the one-stroke path on each phone so accidental scroll,
pointer cancellation, occlusion by the finger, and delayed category preview can
be reviewed.

## 11. Implementation passes

### Pass 0 — checkpoint and frozen evidence

- create rollback branch and before screenshots;
- freeze source/rule versions and corpus counts;
- add failing fixtures for the two reported words, implicit-first-target bug,
  and keyboard page leak.

Gate: failures reproduce the current defects without changing the page renderer.

### Pass 1 — target model and migration

- implement V2 target contract and named policies;
- add stable IDs and aliases;
- migrate active/history records through a backed-up, idempotent path;
- generate the full corpus audit and changed-target report.

Gate: pure/corpus/migration suite passes; reviewer-dependent rules remain marked.

### Pass 2 — connected tray interaction

- remove implicit first target;
- render clean primary glyphs;
- enforce target-before-category;
- implement 44px no-shrink geometry and long-rail behavior;
- fix page-key leakage, focus, cancellation, and page-change cleanup;
- preserve whole-word source feedback.

Gate: automated interaction suite passes at every viewport.

### Pass 3 — review and release candidate

- compare desktop/mobile before and after;
- run real-device one-stroke and tap tests;
- review changed Arabic fixtures and overrides;
- run tests, TypeScript, production build, diff check, and service-worker/cache
  version review;
- prepare one reversible release commit.

Gate: no unresolved high-severity interaction or migration failures. Reviewer-
dependent policies cannot be labelled official until approval is recorded.

## 12. Acceptance criteria

The update is complete only when:

- `ٱلنَّفَّٰثَٰتِ` shows clean `ف` in the rail without losing `فَّٰ` in evidence;
- `وَتَوَاصَوۡاْ` follows the approved five-target policy in every occurrence;
- carried hamza shows a clean hamza locus while preserving the carrier span;
- opening a word selects no target implicitly;
- a category cannot commit without an explicit target;
- all visible tray controls are at least 44 × 44px;
- long words do not shrink targets;
- one-stroke, tap, Escape, pointer-cancel, and keyboard paths are deterministic;
- tray arrow keys never change pages;
- page/layout changes never leave a stale tray on screen;
- old mistakes/history survive migration and retain their original snapshots;
- the page glyph renderer and QPC V1 line layout have no diff;
- all automated and real-device gates pass.

## 13. Risk and confidence

| Decision | Confidence |
|---|---:|
| Split primary tray glyph from exact full source form | 99% |
| Keep whole-word page selection and exact selection in the rail | 98% |
| Require explicit target before enabling category commit | 97% |
| Use 44px no-shrink targets and horizontal overflow for long words | 97% |
| Keep pointer capture + `elementFromPoint()` for one-stroke tracking | 94% |
| Fix the complete code slice in one sustained implementation turn | 85% |
| Ship all V2 target policies without a qualified review gate | 20% |

The largest engineering risks are saved-ID migration, long-word edge scrolling,
and mobile browser pointer cancellation. The largest authority risk is treating
a useful UI grouping as if it were automatically a complete Hafs ruling. The
plan contains separate gates for both.
