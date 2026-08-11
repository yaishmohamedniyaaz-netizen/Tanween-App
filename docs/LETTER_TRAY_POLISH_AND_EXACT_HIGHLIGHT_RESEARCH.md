# Letter tray polish and exact-highlight research

Status: research and implementation boundary only; no runtime changes in this pass  
Date: 2026-08-11  
Product boundary: judge view only

## Decision in plain language

The next release should fix the small tray and its active outlines, while keeping
the printed Mushaf word selected as a whole and the exact recitation target
selected inside the connected letter rail.

That is not a compromise caused by unfinished CSS. The 1405H QPC V1 page font
represents each printed word as one page-specific glyph. The browser can measure
the word, but it does not receive separate printable shapes or positions for the
letters inside that word. A narrow colour box placed over an estimated fraction
of the word would sometimes point at the wrong connected letter and would look
more certain than it really is.

Changing the judge or assigned criteria during an active recitation is also
feasible, but it must be a separate data-safety checkpoint. Earlier deductions
must keep their original judge and assignment; a change can only apply from the
recorded handoff onward.

## 1. Confirmed visual causes

### 1.1 A one-target word looks like an empty two-column tray

The selector currently enforces a `104px` minimum picker width for every word.
A single target is still a `44px` button and the row uses right-to-left flex
layout, so the target sits at the right of a surface large enough to resemble a
two-target tray.

The correction is deterministic:

- keep the interactive target at `44 x 44px`;
- make a one-target outer picker `52px` wide, including its padding and border;
- center the only target inside it;
- center that compact picker over the word and relative to the wider mistake
  category stack;
- preserve the existing sizes for two or more targets so this change cannot
  disturb the accepted long-word rail.

### 1.2 The blue active outline misses rounded corners

The rounded corners live on `.category-stack`, while the active inset outline
is drawn on a `.pill` whose radius is zero. The parent also clips overflow. The
result is a rectangular active line inside a separately rounded surface, with
small unpainted corner areas or a clipped focus outline.

The correction should give the actual exposed row the same corner radius as the
surface and draw the active/focus ring on an inset pseudo-element clipped to
that radius. `DragMenu` should mark the visually outer row explicitly instead
of depending on `:first-child` or `:last-child`, because the upward version
reverses visual order.

## 2. What “exact letter selection” can mean

There are two different requirements which should not be merged:

1. **Exact judgement target:** the saved mistake identifies the reviewed target
   inside the word, including its source span, full marked form, clean tray
   label, target version, and judge. Tahqeeq can do this reliably through the
   connected rail and history.
2. **Exact painted area in the printed word:** only the pixels belonging to that
   target change colour on the 1405H page. The current QPC V1 font does not
   expose this mapping.

QUL documents QPC V1 as a glyph-based, page-by-page font in which every Quranic
word is represented by a single glyph. Browser text ranges can highlight
characters that exist as separate ranges in DOM text, but the QPC word on the
page is one private glyph code. HarfBuzz can preserve character-to-glyph cluster
information when it shapes normal character text, including ligatures; it
cannot reconstruct letter boundaries that were never supplied inside a
precomposed whole-word glyph.

Sources:

- [QUL glyph-based font documentation](https://qul.tarteel.ai/docs/glyph-based)
- [QUL QPC V1 word-by-word resource](https://qul.tarteel.ai/resources/quran-script/57)
- [W3C CSS Custom Highlight API](https://www.w3.org/TR/css-highlight-api-1/)
- [HarfBuzz cluster documentation](https://harfbuzz.github.io/working-with-harfbuzz-clusters.html)
- [FreeType outline and bounding-box documentation](https://freetype.org/freetype2/docs/reference/ft2-outline_processing.html)

## 3. Feasible rendering choices

| Choice | Printed-page fidelity | Exact-target reliability | Work size | Decision |
|---|---:|---:|---:|---|
| Whole printed word wash + exact rail ring | 100% of current QPC page | High | Small | Ship now |
| Estimate a target rectangle from its order in the word | Preserves print but paints guessed pixels | Low on connected Arabic, ligatures, marks, and unequal letter widths | Small prototype | Reject for judging |
| Overlay character-based Unicode text and use browser ranges | Changes shaping, spacing, and sometimes line fit | Medium; clusters and ligatures still need policy | Large | Do not mix with the accepted 1405H renderer |
| Extract every QPC glyph outline and create reviewed per-target masks | Can preserve the print | Potentially high only after mapping and review | Very large corpus project | Research track only |

FreeType can extract the outline and bounding box of a complete glyph, but the
outline is a collection of curves, not a labelled list saying which contour is
lam, ha, a dot, a vowel, or a shared joining stroke. Automatic contour splitting
would therefore be an inference, not evidence. The difficulty is the missing
semantic map, not the number of CSS boxes.

### Recommended visible behaviour

- On pointer down, lightly select the complete printed word.
- In the connected rail, use a full, crisp rectangular ring around the exact
  target. One target remains visibly selected while the category is previewed.
- The chosen category changes the word's light colour wash and the target ring;
  it does not obscure the Arabic ink.
- After committing, the mistake history stores and displays the exact target.
- Reopening a mistake returns to the same word with the saved rail target
  already selected.
- Do not draw a narrow estimated box over the source word or claim pixel-level
  exactness.

This gives a judge an unambiguous letter decision without manufacturing an
unreliable location inside a single printed glyph.

## 4. Active-recitation assignment changes

The current app freezes `activeAssignment` when the reciter starts and rejects
panel, judge, and scoring configuration changes until the session finishes.
That protects old deductions, but it makes a legitimate judge handoff
impossible.

The safe behaviour is:

### Before the first mistake

- Allow the full judge assignment setup to be corrected.
- Keep the scoring amounts frozen to the values with which the reciter started.
- Record that the assignment was corrected, even though no deduction existed.

### After at least one mistake

- The button says **Change from now**.
- Close any open word/letter tray before the change.
- Show a direct confirmation: “Earlier marks remain with Judge 1. New marks
  will be recorded for Judge 2.”
- Save an `assignment_changed` event containing the old assignment, the new
  assignment, time, event order, and an optional short reason.
- Give every later mistake the new assignment-version ID.
- Never relabel, recalculate, or move an earlier mistake.
- Keep deduction amounts fixed for the attempt. Changing the size of a Jali,
  Khafi, or Fasaha deduction during recitation remains prohibited.
- If the new panel leaves a criterion uncovered or assigns it twice, do not
  activate it.

At finish, the attempt must present each assignment segment separately. This
is why the handoff belongs beside Results Safety's shared attempt and
judge-section work. Merely enabling the existing disabled button would produce
one saved section with mixed ownership and is not acceptable.

## 5. Recommended checkpoint order

### Tray checkpoint T1 — one focused implementation turn

1. Create a rollback branch and capture current one-target and rounded-corner
   screenshots.
2. Add failing layout tests for one target at centered `52px` width and keep the
   existing two-to-eleven-target expectations.
3. Add an explicit `single-unit` state to the rail and center its target.
4. Mark the visually exposed category row and give its active/focus overlay the
   correct inherited corners in both upward and downward layouts.
5. Keep the whole-word wash and strengthen the exact rail target state; do not
   add an approximate source-letter overlay.
6. Test mouse, held drag, pinned tap, keyboard, light/dark themes, and tray
   placement near all four viewport edges.
7. Run the selector contract, layout, target, TypeScript, and production build
   checks; compare before/after screenshots; publish only the verified commit.

This checkpoint is small enough for one careful implementation turn.

### Assignment checkpoint A1 — data-safe handoff

1. Add versioned assignment segments and `assignment_changed` events.
2. Stamp every mistake with its assignment-version ID.
3. Permit correction before the first mistake and “from now” handoff after it.
4. Show current judge/criteria plus a compact previous-handoff indication in
   the judge-only panel.
5. Group the finished attempt into separate judge sections without mixing
   owners.
6. Test no-mark correction, handoff after marks, undo/restore across a handoff,
   reopen, invalid panel coverage, refresh recovery, and finalization.

This should be planned together with Results Safety 3A/3B rather than hidden in
the tray polish commit.

## 6. Effort and rough token ranges

These are order-of-magnitude agent-work ranges, not API billing quotes or a
guarantee. Tool output, browser QA, and unexpected regressions can move them.

| Work | Likely agent-token range | Delivery expectation |
|---|---:|---|
| One-target tray + correct rounded active/focus rings | 8k–18k | One turn |
| Stronger exact rail feedback and history reopen behaviour | 10k–25k | Can join T1 if the existing reopen seam is clean |
| Safe active-assignment handoff and assignment segments | 35k–80k | Separate substantial turn/checkpoint |
| Character-overlay prototype for on-page letter colour | 60k–150k | Prototype only; cannot pass reliability gate |
| Corpus-wide QPC per-target masks | 300k–800k+ plus qualified human review | Multi-stage research/data project, not a normal feature turn |

More tokens cannot create the missing letter-to-outline ground truth. A true
mask system would also require a versioned mask format, source/font hashes,
coverage reports for all 604 pages, and expert review of every rule class and
changed target.

## 7. Acceptance gates

T1 is complete only when:

- one target appears as one centered `44px` control inside a compact `52px`
  surface;
- a two-target word and every longer word keep their accepted geometry;
- Jali, Khafi, and Fasaha active/focus rings fully trace the exposed rounded
  corners whether the tray opens upward or downward;
- no ring or colour fill crosses outside the selector surface;
- the source word remains fully legible in every preview colour;
- the exact target remains visibly selected in the rail through preview and
  commit;
- pointer, tap, keyboard, page-edge, mobile-size, zoom, and dark-mode tests pass;
- the QPC glyph, font, line layout, target compiler, mistake meaning, and saved
  history have no unintended change.

A1 is complete only when:

- a judge can change responsibility during a recitation;
- the interface says exactly when the change takes effect;
- old marks retain their original owner and rule snapshot;
- new marks use the new assignment version;
- invalid or overlapping coverage is blocked;
- refresh, reopen, undo, and finalization preserve the handoff history;
- no combined score silently mixes separate judge sections.

## 8. Confidence

| Finding or decision | Confidence |
|---|---:|
| The `104px` minimum and RTL row cause the one-target geometry defect | 99% |
| Parent/child radius mismatch causes the incomplete active corners | 98% |
| T1 is safely deliverable in one careful implementation turn | 94% |
| Exact target identity is reliable in the connected rail/history | 94% |
| Exact target pixels inside the current QPC word can be inferred reliably without new reviewed data | 10% |
| Assignment changes are safe only when they are versioned and apply forward | 97% |

