# Focused connected-body candidate

This is a manual method-development experiment on 24 existing pilot words, not a new production predictor. It applies the historical [training guide](../STYLE_GUIDE.md) more explicitly at connected bodies, then checks the actual short-bar placement. It does not replace visual judgment with proportional cuts or an ink-projection heuristic.

## Diagnosis and intervention

Checkpoint A's frozen test achieved 59/90 inner borders within 2 display pixels (65.6%) and 101/120 short bars contained (84.2%). The original 85%/95% targets remain unmet. The high category achieved 23/36 inner borders within tolerance, so its label did not establish calibrated reliability. Those historical outputs remain unchanged; no evaluator was run in this phase.

The opened diagnostic images for 35.12.21 and 20.86.8 and training examples 2.5.1 and 2.194.1 were inspected during the initial improvement session. Their exposure is explicit in [study-audit.jsonl](study-audit.jsonl). They suggest a recurring risk: treating a visible tooth or upright as the whole letter, then allocating the remaining curved body to a neighbor. This is a qualitative diagnosis, not a measured frequency estimate across the pilot.

For each candidate, locate the complete body and its curved baseline before deciding whether a connecting run is an inserted thin stretch. An inserted thin stretch follows the historical left-letter convention; a curve that forms the body is not automatically such a stretch. Marks help identify the body but do not pull its boundary sideways. Inspect shaded spans and the central 40% short bars after proposing cuts. Reconsider cuts that center a bar on a tiny tooth while leaving its continuous body to the neighbor.

The strongest examples are compact فيه: the ya span in 23.77.10 grows from 9 to 39 source pixels, including its curved baseline before the ha descent. For compact لكم, the lam in 12.9.6 grows from 11 to 34 source pixels; the kaf/mim boundary also moves to separate the principal body positions. These are coordinate changes and visual judgments, not new accuracy results. Extended kaf drawings already had useful broad spans, and three were retained unchanged. Stacked على receives only small refinements: horizontal overlap prevents clean ownership of every stroke, so uncertainty persists. لم mostly receives small join refinements, with one unchanged control.

## Selection and actual review

Four fixed spelling ranks (017 على, 054 لكم, 082 فيه, 086 لم) each contribute compact and extended cluster examples. Among clusters with at least three decided non-approved members, select aspect extremes; take the representative and first two eligible members by page/ID. Aspect is used only for sampling, never to generate cuts. The frozen [selection](selection.json) contains eight representatives and sixteen individually inspected members. All 125 approved IDs, including the 30 old test IDs, are excluded. This targeted sample is not random and has no approved reference labels.

All 24 originals, all baseline shaded spans and all final candidate shaded spans were actually inspected. Each member has its own manual rationale and decision, not an unchecked transferred representative cut. Six original sheets and six candidate-v2 sheets cover the set. Two fa-side refinements (11.116.23 and 6.139.15) were then rendered and reviewed in [candidate-v3-01](images/candidate-v3-01.png); the final digests require that later evidence. Earlier draft files and images remain preserved. The six candidate-v1 images were generated but were not viewed and are not used to authorize annotations.

The workbench selects examples, renders supplied cuts, records explicitly requested actual views, and validates evidence and geometry. It contains no cut-estimation algorithm. Each accepted row is bound to a full-record digest in a matching shaded-image audit event. An edit to a cut, confidence, or rationale invalidates that binding until corresponding evidence is reviewed. Hashes establish byte/record identity, not the truth of visual quality; the named observer remains responsible for the actual review.

## Clipping and conservative confidence

All cuts stay within immutable word boxes. Eleven cases have a mark tip outside the box; thirteen have no observed clipping. No selected target body is partly or wholly absent. The independent [clipping review](CLIPPING_REVIEW.md) preserves its mistaken overview conclusion for 12.9.6 and explicitly corrects it after a 10x source-detail view. A tiny antialiased mark tip is still flagged, but is distinguished from a missing body. None of the historical 32 withheld exceptions was changed or absorbed into candidate totals.

For this candidate, `medium` means a visually clearer, unclipped body/join interpretation; `low` means clipping or a meaningful join/stacking ambiguity. Both are uncalibrated review labels. Stacked-overlap and clipped-ink flags require low; high is rejected. The sample changes from 22 low / 2 medium to 19 low / 5 medium because three individually reviewed, unclipped forms were judged clearer. This is not empirical calibration and does not establish a probability of correctness. Historical high labels are not retroactively edited.

Wholly absent target bodies must remain evidence-backed withheld exceptions. This fixed candidate has none; the helper deliberately accepts only its 24 reviewed present-body cases. It is not a general missing-target workflow and must not be used to force invented slots into future absent cases.

## Evaluation boundary and owner questions

The [fresh-label audit](FRESH_LABEL_AUDIT.md) reconciles all 125 available approvals to 95 exposed training and 30 opened test words. There are zero untouched approved labels. Therefore this candidate claims neither improved generalization nor a new unbiased score. Self-review and the independent clipping check cannot replace owner reference borders.

The [owner-review request](owner-review-request.json) lists these 24 targeted cases without supplying reference coordinates. Owner labels for them would resolve these development cases, not retroactively turn this selected/tuned set into a blind holdout. A later generalization claim needs a separately selected untouched reference set, predictions frozen before answers are opened, and a declared sampling/metric protocol. No such fresh test has been manufactured here.

Questions for review:

1. Do the broader ya curved-body spans in فيه match the intended boundary before ha, in both compact and extended drawings?
2. In compact لكم, is the lam/kaf cut through the lower join a better useful projection than the previous upright-only lam span?
3. In stacked على, should the bar favor the upper core, baseline junction, or perceived whole-letter center when these disagree? The small candidate shifts remain provisional.

Proceeding beyond this isolated review candidate requires owner feedback. No B/C expansion, public guess replacement, prototype switch, main change or deployment is included.
