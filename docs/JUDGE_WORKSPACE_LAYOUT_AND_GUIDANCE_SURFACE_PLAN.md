# Judge workspace layout and guidance — surface plan

Status: direction implemented; retained as the option and decision record

Prepared: 16 August 2026

Parent plan: [`INTERFACE_SIMPLIFICATION_AND_JUDGING_FLOW_PLAN.md`](./INTERFACE_SIMPLIFICATION_AND_JUDGING_FLOW_PLAN.md)

Depends on: the implemented measured desktop Mushaf frame

Detailed researched contract:
[`JUDGE_WORKSPACE_LAYOUT_AND_GUIDANCE_DETAILED_PLAN.md`](./JUDGE_WORKSPACE_LAYOUT_AND_GUIDANCE_DETAILED_PLAN.md)

The detailed plan selects Option A, locks the zoom and workbench contracts, and
defines the geometry, accessibility, migration, and browser acceptance gates.
The provisional values below remain as the decision trail only.

## 1. Surface decision

The next update should address the judge workspace as one composition rather
than adding a zoom bar to the current layout.

The recommended direction is a **balanced wide workbench**:

- keep the current minimal two-column structure;
- make the Mushaf as large as the viewport safely allows;
- let a judge enlarge beyond Fit when readability matters;
- make the scoring rail slightly wider and more legible on wide screens;
- move first-use instruction into a temporary coach bubble that never changes
  the Mushaf's measured size;
- put live Mushaf sizing in the existing three-dot menu, not in Settings;
- preserve space in the architecture for a future consecutive two-page spread.

This keeps what is good about the present layout without accepting its current
undersized page and rail.

## 2. What the current implementation reveals

At a representative 1280x720 viewport, the deployed active judging screen
measures approximately:

- 892x613px for the Mushaf frame;
- 405x596px for the full Mushaf page at the current 100% maximum;
- 316px for the judging rail;
- 59px for the app header, plus 24px workspace padding on each side.

The page is height-limited even though the stage has substantial unused
horizontal space. The first-use marking banner is currently a normal-flow
element above the frame, so its height makes the Mushaf smaller. The code also
keeps that space until a reciter changes after the first mark. This avoids a
mid-gesture jump, but it preserves the wrong geometry.

The zoom preference is currently limited to 45–100% and exposed in Settings.
That makes Fit the maximum rather than one useful point in a larger readable
range.

## 3. Non-layout changes for this update

### 3.1 Replace the instruction strip with a coach bubble

The first-use marking instruction should:

- appear as a compact anchored bubble in an unused frame gutter;
- sit in an overlay layer and never participate in frame measurement;
- avoid covering Quran ink, marginalia, page navigation, selection trays, and
  the scoring rail;
- prefer the outer/right gutter when it is safe, but mirror or move when the
  rail is on that side or the available gutter is too narrow;
- include one clear dismissal and remain replayable from Help;
- retire after dismissal or the first successful mark;
- disappear without moving the Mushaf by even one pixel.

On a narrow fallback where there is no safe gutter, it should open from a small
Help affordance as a popover. It must never reserve a permanent row above the
Mushaf.

### 3.2 Move live Mushaf size into the three-dot menu

Remove the size control from the permanent Settings workspace. Add a compact
`Mushaf size` control inside the existing More actions menu:

- decrease button;
- native range input with live preview;
- increase button;
- current percentage;
- one Fit action.

The menu stays open while the slider or buttons are used, then closes by Escape,
outside click, or an explicit menu action. The result is visible immediately on
the Mushaf behind the menu. The same stored device preference remains in use;
no competition data is involved.

Fit remains a reliable reset, but it must no longer be the maximum. The exact
default, maximum, minimum, and step will be selected after side-by-side visual
testing. A provisional research target is a readable default slightly above
Fit and enough upper range for a judge to choose readability over seeing the
whole page at once. The old 45–100% range and the earlier 70–125% suggestion are
not confirmed rules.

## 4. Layout directions to prototype

All three directions must use the same real Mushaf and judging content so the
comparison is about composition, not attractive placeholder data.

### Option A — balanced wide workbench (recommended)

- Retain the stage plus one persistent scoring rail.
- Let the workspace use more of a wide laptop display instead of stopping at
  1280px.
- Reduce wasteful outer padding while retaining a calm frame around the work.
- Widen the rail modestly on larger screens and keep its controls at comfortable
  reading and touch sizes.
- Keep the Mushaf centred in the remaining stage and allow contained scrolling
  above Fit.
- Align the header utility cluster and rail edge deliberately rather than
  allowing them to appear unrelated.

Why it leads: it improves legibility without hiding judging controls or
discarding the current minimal architecture. It is also the safest base for a
future spread.

### Option B — Mushaf-first focus rail

- Give the Mushaf nearly the full canvas.
- Let the scoring rail contract to a summary and expand on demand.
- Keep essential score and Finish state visible when contracted.

Trade-off: the Quran becomes more prominent, but repeated opening and closing
can slow judges and hide important state. This should be tested, not adopted by
default.

### Option C — wider professional control rail

- Use a substantially wider rail with clearer category rows, mistakes, and
  notes.
- Use the remaining canvas for the Mushaf, relying on Fit and contained zoom.
- Reserve this arrangement for sufficiently wide screens.

Trade-off: it is comfortable for detailed judging but can constrain the
existing split-page layout and a future two-page spread on ordinary laptops.

No bottom dock or multi-card dashboard direction is proposed for desktop. Both
would consume the scarce vertical dimension that already limits the Mushaf.

## 5. Recommended first release boundary

The first implementation should combine only these related corrections:

1. Remove the normal-flow instruction banner and add the non-displacing coach
   bubble.
2. Reclaim vertical room from workspace chrome where it can be removed without
   crowding the interface.
3. Broaden the desktop canvas and modestly enlarge the scoring rail at wide
   viewports.
4. Move live Mushaf size from Settings into More actions.
5. Make Fit a reset point inside a larger supported range and choose a more
   readable tested default.
6. Preserve frame-owned scrolling, fixed Mushaf composition, and hitbox
   remeasurement.

Do not combine the collapsible rail or the future two-page spread with this
release. Either would add a second major interaction decision before the base
workspace proportions are correct.

## 6. Future two-page consideration

The existing `Split page` option reformats one printed page into two columns. It
is not the proposed future view of two consecutive printed Mushaf pages.

This update should avoid hard-coding the frame or menu to only the current
`full` and `split` modes. A later `spread` mode may need:

- two consecutive page renderers with preserved page boundaries;
- question-range awareness so both relevant pages can be shown together;
- paired page navigation and correct right-to-left ordering;
- marking, hitbox, mistake-jump, and source-ID isolation per page;
- a wide-screen-only fallback when two readable pages cannot fit.

That is an architectural allowance only. No spread implementation belongs in
the next release.

## 7. Detailed research and artifact comparison

Before implementation, build three disposable layout studies corresponding to
Options A, B, and C. Claude artifacts may be used for this comparison, but they
should not edit the production screen.

Each study should show the same active judging state at 1280x720 and 1440x900,
including:

- the same representative Mushaf page;
- the same score, categories, mistakes, notes, and Finish action;
- the first-use coach bubble;
- the open More actions menu with live Mushaf sizing;
- both left-rail and right-rail placement where relevant.

Compare measured page size, rail scanability, empty-space use, obstruction,
number of hidden actions, and the visual jump between guidance shown/hidden.
The detailed research should then lock the control geometry, breakpoint policy,
and zoom values.

## 8. Approval gate

The chosen implementation is acceptable only when:

- showing or dismissing guidance causes zero Mushaf or rail movement;
- the default page is materially larger than the current deployed page at the
  representative laptop viewport;
- a judge can preview and change size without leaving the judging screen;
- Fit, enlargement, page navigation, marking trays, and mistake jumps remain
  stable;
- the rail is more legible without covering or unnecessarily shrinking the
  Mushaf;
- pages 1, 2, 199, 300, 601, 602, and 604 retain their source geometry;
- full and existing split-page modes pass at representative desktop sizes;
- phone judging remains unaffected and governed by its separate plan;
- competition records, scoring rules, and Quran data have no diff.

## 9. Decisions for the detailed pass

1. Select Option A, B, or C after the artifact comparison; Option A is the
   current recommendation.
2. Lock the tested default, minimum, maximum, and step for Mushaf size.
3. Lock coach-bubble anchoring and collision behavior for both rail sides.
4. Decide the exact wide-screen rail width and workspace maximum.
5. Decide whether the collapsed focus rail deserves a separate later release.

Until that comparison is complete, this plan chooses the product direction and
release boundary, not final pixel values.
