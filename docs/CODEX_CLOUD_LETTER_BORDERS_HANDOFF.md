# Cloud continuation: visual letter borders

The owner requested this cloud transfer on 2026-11-08. Resume the existing work, rather than restarting. This is an intermediate backup, **not Checkpoint A completion or visual approval**. All local annotation workers stopped for transfer.

## Branch and scope

- Repository: `yaishmohamedniyaaz-netizen/Tanween-App` (formerly Tahqeeq-App; the old remote redirects).
- Continue on `codex/letter-borders-visual`, originally based on `claude/criterion-bar` at `2837f6f`.
- Read `docs/CODEX_TASK_LETTER_BORDERS_VISUAL.md`, its two prerequisite task documents, `AGENTS.md`, and `scripts/letter-masks/visual/STYLE_GUIDE.md`.
- Stop and hand back at **Checkpoint A**. Do not proceed to B/C. Never push main, merge to main, deploy, change src/, artwork, page data, targets, or approved borders.
- The owner explicitly resolved the extent conflict: **"Keep inside the box; flag the clipped ink for review".** See visual/extent-policy.json. Partial clipping is low confidence with a clipped-ink flag. Entirely absent targets are documented, visually evidenced withheld exceptions; never manufacture a2px letter slot.

## Saved state at transfer

The canonical records are `visual/annotations/rankNNN.jsonl` and frozen `visual/blind/decisions.jsonl`; `visual/decisions.jsonl` is their rebuilt merge. Drafts and generated images are not accepted decisions.

| Measure | Saved count |
| --- | ---: |
| Training approvals actually reviewed |95|
| Pilot spellings / words |100 /22,648|
| Total saved decisions, including frozen blind predictions |8,013|
| Pilot decisions with actual-view audits |7,992|
| Pilot withheld exceptions with actual-view audits |18|
| Pilot words still unresolved |14,638|
| Rebuilt guesses (37 approved records omitted) |7,976|
| Actual-view audit events / distinct audit image paths |921 /909|
| Reused evidence events |13|

The image cost is an audit count, not an exact model-token invoice; training views are tracked separately. Exact historical token usage is unavailable. The task began2026-11-06 and was interrupted across multiple sessions, so wall time is not active labor time. Current confidence across all decisions:2,370 high,2,259 medium,3,384 low. The pilot remains incomplete. `check_checkpoint.py` intentionally exits2 while incomplete.

Completed ranks:001-007,026-027,036-040,071-078. Completed here means all eligible words are accepted or explicitly withheld; it does not mean owner approval. Partial ranks:008,028,041. Rank079 has setup only;009-025,029-035,042-070,080-100 remain unannotated. Reconcile these labels with canonical files if continuing later.

Exact continuation notes:

- `visual/reviews/RESUME-007-025.md`: rank008 has120/609 saved representatives; next zero-based original offset120, plus all360 carries still to review.
- `visual/reviews/rank028/RESUME.md`:209/239 saved; original sheets07-10 viewed,20 reps/30 words remain uncut.
- `visual/reviews/rank041/RESUME.md`:90/174 saved; **30 current carry drafts unviewed**, then original sheets05 onward.
- `visual/reviews/rank078/RESUME.md`:076-078 complete;079 setup only,55 reps/99 words, no views/cuts.

Those notes predate the Linux portability patch; their Windows-only setup caveats are superseded by the setup section below. Keep their actual-view and pending-work distinctions.

## Evidence integrity exception to resolve first

One historical original-image hash differs: `visual/audit/rank005.jsonl` records a prior SHA for `visual/reviews/rank005/representatives-original-013.png`; the current PNG has different bytes, and the historical bytes were not found in the local evidence tree. Do not rewrite the old event or claim those bytes were recovered. The corresponding shaded-check013 evidence remains intact. Re-open the current original013 and its shaded check, inspect the six words (48.23.10,1.1.1,2.195.3,2.244.3,3.167.9,4.82.8), and append a clearly identified fresh audit event. Historical acceptance already has intact shaded-view evidence; preserve that history.

## Blind-test integrity

Thirty blind predictions were independently completed and frozen. Do not reannotate them, read their hidden approval coordinates, or rescore during continuation. Exclude IDs in `visual/blind/test-ids.json` when assigning ranks. Frozen decisions SHA256:

`766e716327f6ee1b0e2823ad8786b5b2181954b27c3939aa5aaa0954b969e046`

`visual/blind/freeze.json` uses `decisionsSha256`. No checkpoint-a-test.json exists. Use the guarded evaluate_checkpoint.py **once, only after the complete pilot gate passes**. Old rejected dashed guides are read from immutable git base2837f6f, not from newly generated guess files. The task's test approvals are on pages52,103,157,177,277,317,348,436,492,580; do not inspect those approval coordinates as a shortcut. Training pages1-2/dev approvals remain available.

## Cloud setup and validation

Select this repository in a private Codex Cloud environment. Fetch and switch to the existing branch before reading task files; do not create a replacement branch from main. The branch includes the original evidence images and pre-rendered Arabic label PNGs. Never regenerate existing evidence in place.

```bash
git fetch origin codex/letter-borders-visual
git switch codex/letter-borders-visual
bash scripts/letter-masks/visual/setup-cloud.sh --install-system
source .venv-letter-borders-visual/bin/activate
python scripts/letter-masks/visual/smoke_portability.py --output /tmp/tahqeeq-cloud-font-review
python scripts/letter-masks/visual/collect_progress.py
python scripts/letter-masks/visual/build_guess_files.py
python scripts/letter-masks/visual/check_checkpoint.py
```

The last command currently exits2 because14,638 words remain, which is expected. Do not weaken that gate. Setup installs Python image dependencies and Linux fonts; the Linux label fallback requires Pillow RAQM. Local Windows smoke checks cannot prove Linux rendering, so actually open the cloud smoke output before new annotation. If local-image vision is unavailable in the cloud toolset, stop with the concrete limitation; do not substitute algorithmic cuts or record unseen images as reviewed. Browser control is not necessary for this image-annotation stage.

Run applicable `node --experimental-strip-types --test scripts/letter-borders.test.mjs scripts/border-queue.test.mjs` checks. The previous full-corpus check_border_guesses.mts requires all77,433 words and therefore is not an appropriate completion check during this partial pilot. build_guess_files.py checks saved decision geometry/counts without populating undecided words.

## Continue through Checkpoint A

Delegate disjoint spelling-rank ranges if useful; never let two writers own the same annotation or audit file. Have one coordinator merge/build aggregate output after workers save. Persist every batch and append truthful image-view audits with observer, path, word IDs, phase and preferably SHA256. Generated drafts and file existence never prove a view.

For each representative: actually open its original at the task's scale with ruler/RTL app units; choose inner cuts manually from vision; render shaded spans; actually inspect and correct up to three passes. Carry by alignment only as drafts; actually inspect every copy. Archive evidence before overwriting. Keep one current decision per word and preserve superseded records separately.

After all100 pilot spellings have been reviewed, report withheld words separately, pass the completeness gate, score the frozen30 once, produce per-confidence measures and10 worst test images, generate the seeded200-word contact sheets (`20261107`), report cost honestly, append results/questions to the task document, run scoped validation, commit and push only this task branch. Then **stop at A for owner review**. No production publication is authorized.

Handoff confidence: practicality95/100 after setup checks; architecture/data safety94/100 with the documented historical image gap; visual certainty78/100 because many overlap/clipping judgments remain low confidence and the pilot has not been scored or approved.
