# Active Mushaf completion plan: faithful artwork, practical selection

Next update: [normal-app integration and reliable delivery](./MUSHAF_INTEGRATION_DELIVERY_PLAN_2026-09-09.md).
That plan expands the remaining stages and records the accepted fade default.

Latest implementation: [Stage 2 local checkpoint](./MUSHAF_STAGE2_RESULTS_2026-09-09.md).
The practical corpus check and real judging flow now work in an isolated local
integration harness. Normal App-entry activation and full delivery remain open.

## Direction and scope

This is the active implementation plan. It supersedes the next-implementation
and fixed-master plans wherever they require exact ownership of every ink
fragment before progressing. Their observations and test results remain evidence.

The owner approved practical word selection on unchanged original artwork,
accepting that tapping a rare overhanging vowel mark may select the neighboring
word. This is an interaction trade-off, not permission to alter Quran text,
merge semantic words, lose selectable words, or change judging rules.

The present request is to revise the plan. No production renderer changes or
publication are part of this planning pass.

## What the finished result should do

- Preserve the pinned source page artwork and its proportions. Scale the page
  and its overlays together; never change letter spacing to fit a screen.
- Give every selected word on the same line the same highlight top and bottom.
  Stop highlights at the intended word region and line ends. Do not wash surah
  headings, basmala gaps or empty page margins as ordinary recitation rows.
- Use ordinary, stable word regions for selection. A tap on the main body of
  a word must select that word. Exact ownership of tiny projecting marks is
  not a release requirement.
- Adjacent highlights of the same style may join visually. Each word remains
  independently selectable and independently saved. Different judging states
  remain distinguishable. Ayah markers remain visible but are not mark targets.
- Preserve existing letter selection through the letter tray, categories,
  undo, question navigation, score totals and saved/exported evidence.
- Retain the accepted compact separate bottom selector, paper color #fbfaf7,
  rounded page surfaces and current zoom scope. Make the requested modest
  desktop positioning correction in the actual shell; handle the two special
  opening-page compositions separately without stretching their artwork.

This preserves the chosen digital master. Literal identity with a specified
physical 1405 printing still needs reference verification; neither the package
name nor passing software checks proves that claim.

## Reuse and simplification

Reuse pinned artwork, page/word IDs, correspondence audits, the established
p254 combined-source-glyph split, shared line bands, loading/integrity guards,
and the existing judging interaction owners. The 262 interaction and 74
read-only page checks are historical baseline evidence, not proof of the new
selection policy. Adapt relevant tests; do not preserve tests that demand the
discarded pixel-ownership policy.

Stop expanding remote-contour tracing, per-pixel selection masks and manual
corrections whose sole purpose is assigning tiny overhangs. Keep that research
archived; do not put it on the runtime path. Existing evidence-backed body
corrections may be retained as versioned build data when they prevent a real
selection defect. They must not grow into a page-by-page runtime patch system.

The five current complete-page overlap flags are not automatically blockers.
They must be tested under the practical policy. Missing or incorrect IDs,
unreachable short words, ordinary body taps choosing neighbors, and highlights
spilling into empty margins remain blockers.

## One simple selection policy to prove

Generate geometry before shipping, in original page coordinates. Start from
source word regions with the existing verified body corrections. Keep source
reading order and semantic identity; never divide a line into equal word widths.

For neighboring words, choose a shared boundary in the gap between their main
bodies where available. Where their envelopes overlap, use one deterministic
division between their body centers, bounded by the neighboring word order.
This is a proposed practical selection rule, not a claim about which word owns
every visible pixel. Validate body anchors, positive widths, order and usable
short-word access. Failed validations must be reported, not silently repaired
by arbitrary minimum-width expansion or word removal.

Reserve marker regions as non-selectable. Keep gaps outside line endpoints
and non-recitation rows inactive. Decide joins from common boundaries, not by
stretching selections to the full page width. Selection and highlight rectangles
share the page transform; input mapping must not depend on zoom-specific tuning.

## Stage 1: prove the simpler method and check its scale

Implement practical selection for all recited words on p254, p293 and p412 in
the isolated proof. Remove tiny-fragment overrides from this branch of the
proof so the test actually exercises the simpler method. Keep earlier proof
results available as historical comparisons.

Check ordinary taps, short words, line ends, adjacent independent findings,
uniform highlight bands, markers, scrolling cancellation and page changes on
desktop and compact viewports. Inspect the previously flagged overlaps under
this policy; an overhang alone is acceptable, a wrong body selection is not.

Run one automated geometry/identity sweep across all 604 pages before deeper
integration. Use the available metadata and build data; no new full-corpus
pixel matching is required. Report missing/duplicate IDs, role/line mismatches,
zero or inverted regions, invalid body anchors, off-page regions and suspicious
short targets at supported fit sizes. Geometry checks do not prove touch usability.

Gate: the three pages work as complete pages and the corpus sweep identifies
no unaddressed structural loss of words. Review flagged usability cases plus
opening pages, surah starts, dense lines and short endings. Do not manually
inspect every diacritic. If failures recur across a class of words, repair the
common geometry rule or reassess the coordinate source once; do not begin an
unbounded sequence of isolated patches. Record remaining cases and scope before
continuing if the shared rule cannot meet ordinary selection quality.

## Stage 2: complete one real judging flow

Adapt the fixed page surface into the existing app behind a reversible development
switch. Reuse the real ledger, letter tray and navigation; do not copy the proof's
disposable record store or sample-only page selector.

Complete and test this flow: open an assigned passage, select a word and letter,
record a finding, change its category, undo, navigate away and return, reload,
and inspect the exported evidence. Confirm target IDs and score totals against
the existing behavior. Scrolling, cancellation and stale page loads must not
create findings. Page image/data mismatch must prevent marking visibly.

Apply the approved bottom controls and modest positioning adjustment here,
checking real score-panel widths and single/spread layouts. Avoid another layout
alternatives round. Existing zoom preferences stay supported; no new zoom feature.

Gate: one complete actual judging workflow works without changed scoring or
evidence contracts, and desktop/compact browser checks support the composition.

## Stage 3: complete delivery and release checks

Package all pages coherently. Confirm asset provenance and applicable reuse
terms, measure the real download size, load only a small working set of images,
and avoid decoding the entire Quran into memory. Preserve the app's existing
offline requirements: verify missing-image recovery, interrupted updates,
fresh offline reload after installation and sustained navigation. Full-package
delivery is still real implementation work; the simplified hit regions do not
remove it. Do not promise full offline readiness before these checks pass.

Run corpus validation on the exact generated package, targeted interaction tests,
and proportionate app validation. Inspect representative pages in the actual
app and perform touch/scroll/page-turn checks on real target devices. Browser
emulation is not native-device acceptance.

Present the integrated preview for one meaningful owner review, rather than
repeated diagnostic approvals. Then follow authorized scoped commit, push,
publication and hosted verification, retaining the previous coherent renderer
for rollback until acceptance. Production release authorization remains distinct
from the already authorized isolated public preview.

## Efficiency and reporting rules

- Deliver one usable increment per stage. Report what now works, the remaining
  blocker, and whether results are local, public-preview or production.
- Reuse audits and tests; rerun affected checks after changes. Do not rerun
  expensive corpus pixel analysis or broaden tests simply to increase counts.
- Investigate concrete selection failures, not every geometric overlap.
- No new border variants, metadata layouts, Unicode mode, pinch gestures,
  desktop zoom redesign or physical-edition certification inside this slice.
- No reliable total compute/time estimate yet. Stage 1 establishes whether
  practical geometry generalizes. Avoid an overall completion percentage that
  treats prototype checks as completed app integration.

Plan confidence: practicality 92/100; architecture/data safety 94/100;
visual and selection certainty 82/100 until Stage 1 is observed. These are
judgment scores, not measured accuracy or a production-readiness claim.
