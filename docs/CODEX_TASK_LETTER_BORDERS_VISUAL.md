# Codex task: letter borders by looking, word by word (visual round)

Status: ready to hand over (6 November 2026).
Base branch: `claude/criterion-bar`. Work on a new branch `codex/letter-borders-visual`.
**Never push to `main`** (a push to main deploys the live app).

Read first:
1. `docs/CODEX_TASK_LETTER_BORDERS_ALL_PAGES.md`: the previous round and its hand-back. This round replaces its method.
2. `docs/CODEX_TASK_LETTER_BORDERS.md`: the rules for borders and everything tried before.

## The goal

Set the letter borders for every word of the Mushaf **the way the owner does: by looking at the word**. Use your own vision on rendered images, learn the owner's style from his approved words, and decide each repeated spelling once.

The owner has approved a large token budget for this. **Accuracy matters more than cost.** Do not fall back to cheap pixel heuristics where looking is possible.

## Why a new round

The previous round (`copy-joint-shape-v1`) failed on the hidden test: 64% of borders within 2 px; the short bar under the right letter 82.5%. The owner checked it by eye and rejected it. Examples:
- **مِن** (p588 `83.25.1`): the meem got 2 px and the noon got everything else.
- **بِهَا** (p141 `6.109.8`), **رَبَّنَا** (p52 `3.16.2`), **بِئۡسَمَا** (p14 `2.93.20`): one letter squeezed or misplaced.

About 6% of its words have a letter narrower than 10 artwork px. Pixel methods cannot see where one joined letter ends in this calligraphy. A careful visual reader can.

## Rules you must not break

All rules of the previous task still apply:
- Do not edit `public/mushaf/`, `src/lib/judgingUnits.ts`, the page data or `public/letter-borders/` (approved only).
- **No change to `src/`.**
- Letter units are the app's own (rule `qpc-hafs-v1-targets-4.0.0`): madd alifs merged into their carrier letter; silent letters are their own letters and need their own borders.
- Borders, per word with N letters:
  - exactly N+1 borders, right to left, strictly decreasing;
  - the outer ends are the word's ink edges;
  - every letter at least 2 artwork px wide.

And for this round:
- **A guess is never an approval.** Write only to `public/letter-borders-guess/` (replace the previous round's files; keep the same format).
- **Do not look at the 30 hidden test approvals while annotating.**
  - These are the "test" half of the 60-word sample (`sample_compare.py ... test`).
  - Annotate those words blind like any other word; score them only at the checkpoint.
  - Pages 1–2 and the "dev" half are yours to learn from.

## Step 1: learn the owner's style, and write it down

1. Render every training approval (95 words) as a large image:
   - the word crop, scaled so the ink is about 400 px tall, on white;
   - each letter's span shaded in alternating light colours;
   - the borders as thin lines;
   - the letter list printed under it, right to left.
2. **Look at them all.** Write `scripts/letter-masks/visual/STYLE_GUIDE.md`: how the owner places a border, in plain rules with an example image for each. At least:
   - stretched joins (kashida): who gets the stretch? (Earlier data says the **left** letter.);
   - letters stacked on top of each other (for example لمح, لج, the start of بسم): where the vertical cut goes when letters overlap;
   - lam-alif and other ligatures;
   - dots, hamza and small letters above or below: they do not move a border;
   - silent letters and merged madd alifs;
   - word-final letters with long tails (ن ى ه ي): how much tail goes to the letter;
   - anything else you notice.
3. Note every rule you are **unsure** of as a question for the owner.

This guide is your reference for every later decision. Keep it short and visual.

## Step 2: group the repeats

Use the app's own word text (`public/mushaf/1405-artwork-5a5f9f3846158475/p{N}.json`, field `text`) to count repeats. **No internet list is needed.** This is the exact text of this Mushaf, so it is more reliable than outside lists, which use other editions. Measured from it:

| | |
| --- | --- |
| Words (letter role) | 77,433 |
| Distinct spellings | 21,116 |
| Spellings used once | 13,959 |
| Top 40 spellings cover | 20% of all words |
| Top 100 | 29% |
| Top 500 | 48% |
| Top 1,000 | 56% |
| Top 2,000 | 64% |
| Top 5,000 | 76% |

**The same spelling is not always drawn the same way.** Line justification stretches some drawings, and joins change. So within each spelling:
1. Cluster the drawings by shape (for example: crop the body, normalise the height, align, image correlation).
2. Keep drawings together only when they really match. One spelling may give several clusters.
3. For each cluster, pick the drawing nearest its centre as the **representative**.

Write `scripts/letter-masks/visual/groups.json`: spelling → clusters → member word ids, with the representative marked.

## Step 3: decide each representative by looking

For each representative, most frequent first:
1. Render the word large, with:
   - a ruler of artwork-px ticks along the bottom (every 5 px, labelled every 20);
   - the letter list right to left with the letter names;
   - the previous round's guess as a faint dashed line (a starting point only, often wrong).
2. Using the style guide, decide the N+1 borders.
3. **Check your own work:** render your borders as shaded letter spans and look again. Fix anything that looks wrong. Up to three passes.
4. Mark your confidence honestly:
   - `high`: clear joins;
   - `medium`: one doubtful border;
   - `low`: stacked or overlapping letters where a vertical cut cannot be clean.
5. Save each decision as you go (see Resuming), with a one-line reason for any border you were unsure about.

## Step 4: carry each decision to its cluster, and check by looking

1. Carry the representative's borders to every member, by aligning the drawings (warp along x).
2. **Check every carried word by looking**, in sheets of 20 to 30 words, each shown with its shaded letter spans.
3. A member that looks wrong is decided on its own, as in step 3.
4. Words of spellings used once go straight through step 3.

## Checkpoints (stop and hand back at each)

**Checkpoint A: pilot (top 100 spellings, 29% of the Mushaf).**
- Report:
  - the score on the 30 hidden test words, using the same measures as the previous round's table;
  - the measures per confidence level;
  - the cost: images viewed, decisions made, rough tokens and time.
- Make `contact/visual-pilot-*.png`: 200 random words from the pilot, seed 20261107, with shaded spans, for the owner to check by eye.
- Add the style-guide questions.
- **Stop here.** The owner checks the sheets and decides whether to continue.

**Checkpoint B:** top 2,000 spellings (64%). Same report.

**Checkpoint C:** everything. Same report, plus the full-Mushaf structure checks of the previous round (`check_border_guesses.mts`, `check_border_guess_ink.py`).

**Targets on the hidden test:**
- borders within 2 px: at least **85%**;
- short bar fully under the right letter: at least **95%**;
- `high` confidence really at least 95% right.

## Resuming

The job will span several sessions. Keep everything resumable:
- `scripts/letter-masks/visual/decisions.jsonl`, one line per decided word: `wid`, `page`, `x` (borders), `confidence`, `source` (`visual` or `visual-copy`), `cluster`, `note`.
- `scripts/letter-masks/visual/progress.json`: which clusters are done, the counts, and the running cost.
- `scripts/letter-masks/visual/build_guess_files.py`: rebuilds `public/letter-borders-guess/p{N}.json` from `decisions.jsonl` at any time.
  - Same format as now.
  - Words not decided yet keep **no** entry (better no underline than a wrong one).
  - `method: "visual-v1"`.
- Commit and push at least at every checkpoint, so nothing is lost.

## Hand back (at each checkpoint)

- Push `codex/letter-borders-visual`. **Not main.**
- Append to this file:
  - the results table and cost;
  - the 10 worst test words, with images;
  - the style-guide questions for the owner.
- Then Claude:
  - switches the app's prototype to the new guesses;
  - shows the owner the sheets and questions.

### Cloud continuation — intermediate snapshot, 2026-11-08 11:17 UTC

Continued only on `codex/letter-borders-visual` from `e9c81c4`. Linux RAQM is available; the actual synthetic Arabic smoke image was opened and read. The rank005 original013 evidence gap was addressed first by directly reopening the current original and intact shaded check, inspecting all six specified words, and appending two fresh SHA-backed audit events (`cloud-root-20261108`). Historical events remain unchanged; historical original bytes were not recovered. Current original SHA is `364caf3ed8db7ae0f51b4c51186fa25f310962f18d65ac49cf5a5e63ef04fa37`; shaded check SHA remains `89bcb722f8f78dd2153410ff06133455b375b7fcfc66706c52085087f4a88672`.

The saved 11:16:55 UTC aggregate contains 14,276 pilot decisions, 25 reviewed withheld exceptions, 8,347 unresolved words, and 52 complete ranks out of 100 (22,648 pilot words). There are 14,297 total decisions including frozen non-pilot test words, 1,969 actual-view audit events and 1,928 distinct audited image paths across historical and continuation work. These are cumulative audit counts, not a claim that all images were newly opened this session. Exact token usage is unavailable. Direct reviews have been ongoing since approximately 10:50 UTC; parallel agent times overlap and are not summed as elapsed wall time.

Checkpoint A remains incomplete. No hidden answers were inspected, no scoring was run, and no evaluation outputs are claimed. Frozen decisions SHA256 remains `766e716327f6ee1b0e2823ad8786b5b2181954b27c3939aa5aaa0954b969e046`. The completeness command correctly returns exit2 while unresolved words remain. Scoped Node tests passed10/10 earlier in this continuation. Source, artwork, page data, judging targets, approved borders, and blind files are untouched. Working drafts are retained as drafts; only canonical saved decisions count.

Rank028–032 reviews are complete (rank032 has214 decisions+2withheld); rank-specific RESUME files and archived shaded evidence identify corrections. Visual review exposed occasional outer endpoints from piece ownership that omitted a visible detached alif. Such endpoints were corrected manually only after viewing, within the immutable word box, and shaded results were reopened. Owner question for later review: how should marginal alif traces be distinguished from meaningful surviving body slivers? Absent bodies are withheld; recognizable partial black stems are retained low with `clipped-ink`, with evidence preserved for owner adjudication.


### Cloud progress snapshot — 2026-11-08 11:32 UTC

Rank034 completed 209/209 words (93 representatives,116 carried;172low,37high), all directly viewed with SHA-backed evidence. Geometry/count/coverage and all41 image audit hashes pass. Aggregate snapshot:18,065 pilot decisions;26 reviewed withheld exceptions;4,557 unresolved;69 of100 ranks fully decided/withheld and reviewed. Gate remains incomplete; no scoring or hidden-answer access. Blind predictions SHA256 remains766e716327f6ee1b0e2823ad8786b5b2181954b27c3939aa5aaa0954b969e046. Cumulative recorded actual-view events2,566 across2,516 audited paths; these include historical and current observers, not an exact token invoice. Exact token usage unavailable. Roughly42minutes elapsed cloud wall time since10:50, concurrent review continues.

Rank033 also completed211 words with full visual evidence. Rank035 initialized next. A mistyped nonexistent checkpoint_gate.py invocation performed no evaluation; canonical check_checkpoint.py was then run successfully and reported incomplete, as expected.


### Cloud progress snapshot — 2026-11-08 11:41 UTC

Saved aggregate:20,533 pilot decisions;27 reviewed withheld exceptions;2,088 unresolved words;83 of100 complete ranks. Rank035 completed205/205 (62 representative originals,143 carried words),36 actual-view events with SHA verification;112low,89high,4medium. The first-pass nun/waw refinements and destination66.8.26 correction are preserved separately; all final shaded spans were reopened. No missing-target exception in rank035. Geometry/count/coverage and every rank035 audit hash pass. Cumulative audit totals2,933 actual-view events and2,852 distinct paths include prior sessions. Roughly52minutes cloud elapsed wall time since10:50; parallel review times overlap. Exact token usage unavailable. Full gate remains incomplete(exit2); no hidden answers inspected or scoring performed.

## Complete pilot gate before evaluation —2026-11-08 12:07UTC

All100ranks now complete:22,616pilot decisions,32 separately withheld absent-target exceptions,zero unresolved,all22,648pilot words visually reviewed. Canonical total22,637 includes21frozen non-pilot test words. No evaluation has yet run at this snapshot. Final independent integrity audit is being completed before the single guarded evaluation. Scoped tests passed10/10; build emitted22,577guesses and omitted60existing-approved decisions. Frozen SHA unchanged. Rank054 context reconciliation and every carry review are saved; borders and source boxes remain immutable.

## Checkpoint A handback —2026-11-08

**Pilot completion passed; visual quality targets failed. Stop for owner review.** All 100 spelling ranks are complete: 22,616 pilot decisions, 32 separately withheld absent-target exceptions, zero unresolved, 22,648 reviewed words (29.25% of 77,433). The rank files contain 22,607 decisions; nine frozen test predictions are also in the pilot. Including 21 frozen non-pilot words, the consolidated file contains 22,637 decisions. Withheld words have no fabricated slot or emitted guess.

The frozen 30 were evaluated exactly once after the full completeness gate and independent numeric/evidence checks passed. The blind prediction file retains SHA256 `766e716327f6ee1b0e2823ad8786b5b2181954b27c3939aa5aaa0954b969e046`. No annotation or frozen prediction changed after evaluation. [Pre-evaluation snapshot](../scripts/letter-masks/visual/reviews/PRE_EVALUATION_PILOT_SNAPSHOT.json); [Saved evaluation](../scripts/letter-masks/visual/checkpoint-a-test.json).

| Confidence | Words | Inner borders | Letters | Median error px | Borders ≤2 px | Borders >5 px | Words ≤2 px | Exact words | Short bar contained |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| All | 30 | 90 | 120 | 1.73 | 65.6% | 15.6% | 30.0% | 0.0% | 84.2% |
| high | 16 | 36 | 52 | 1.36 | 63.9% | 25.0% | 37.5% | 0.0% | 86.5% |
| medium | 2 | 10 | 12 | 1.36 | 80.0% | 0.0% | 50.0% | 0.0% | 83.3% |
| low | 12 | 44 | 56 | 1.97 | 63.6% | 11.4% | 16.7% | 0.0% | 82.1% |

Errors use display scale 473.6/1920. Border percentages measure inner borders; word tolerance includes all endpoints. Short bars use the central 40% of each predicted span and must lie entirely inside the approved span. The overall 65.6% border result misses 85%;84.2% short-bar containment misses 95%. High-confidence predictions reach only 63.9% for inner borders and 86.5% for short bars (37.5% whole-word tolerance), so the confidence calibration target also fails. The medium group has only two words. The previous rejected round was 64%/82.5%; this result is only a small numerical improvement and is not evidence for scale-up.

### Ten worst frozen test words

All ten comparisons were actually opened after evaluation. Left is the unchanged frozen prediction; right is the saved approval used by the single evaluation. This is diagnostic evidence, not retuning.

| Word | Confidence | Maximum error px | Comparison image |
|---|---|---:|---|
| 35.13.23 | low | 11.35 | [Open comparison](../scripts/letter-masks/visual/contact/visual-test-worst-01-35.13.23.png) |
| 76.29.8 | high | 11.10 | [Open comparison](../scripts/letter-masks/visual/contact/visual-test-worst-02-76.29.8.png) |
| 8.2.13 | high | 8.63 | [Open comparison](../scripts/letter-masks/visual/contact/visual-test-worst-03-8.2.13.png) |
| 35.12.21 | high | 8.39 | [Open comparison](../scripts/letter-masks/visual/contact/visual-test-worst-04-35.12.21.png) |
| 16.92.29 | low | 8.14 | [Open comparison](../scripts/letter-masks/visual/contact/visual-test-worst-05-16.92.29.png) |
| 8.2.11 | high | 7.65 | [Open comparison](../scripts/letter-masks/visual/contact/visual-test-worst-06-8.2.11.png) |
| 20.83.4 | low | 7.40 | [Open comparison](../scripts/letter-masks/visual/contact/visual-test-worst-07-20.83.4.png) |
| 35.14.12 | low | 6.66 | [Open comparison](../scripts/letter-masks/visual/contact/visual-test-worst-08-35.14.12.png) |
| 20.86.8 | high | 6.17 | [Open comparison](../scripts/letter-masks/visual/contact/visual-test-worst-09-20.86.8.png) |
| 23.97.6 | high | 5.67 | [Open comparison](../scripts/letter-masks/visual/contact/visual-test-worst-10-23.97.6.png) |

Visual observation: 35.13.23 leaves a very narrow nun span;76.29.8 and 35.12.21 under-allocate connected ya spans;20.86.8 under-allocates the lam connection. These examples show systematic join/body-allocation problems beyond crop clipping. Vertical cuts through stacked or returning strokes remain uncertain. No corrective annotations were made from these opened test answers.

### Seeded pilot sheets

Exactly 200 unique decided pilot words were sampled with `random.Random(20261107).sample(sorted(decided pilot IDs),200)`;32 withheld words are excluded and reported separately. Ten 20-word shaded sheets were generated and actually opened. Their immutable sampled IDs and image SHA256 values are in [the contact manifest](../scripts/letter-masks/visual/contact/checkpoint-a-manifest.json). Generating an image never created an audit claim; [the separate actual-view audit](../scripts/letter-masks/visual/audit/checkpoint-a-contact.jsonl) records the later views. These views are not owner approval.

[Sheet 01](../scripts/letter-masks/visual/contact/visual-pilot-01.png) · [Sheet 02](../scripts/letter-masks/visual/contact/visual-pilot-02.png) · [Sheet 03](../scripts/letter-masks/visual/contact/visual-pilot-03.png) · [Sheet 04](../scripts/letter-masks/visual/contact/visual-pilot-04.png) · [Sheet 05](../scripts/letter-masks/visual/contact/visual-pilot-05.png) · [Sheet 06](../scripts/letter-masks/visual/contact/visual-pilot-06.png) · [Sheet 07](../scripts/letter-masks/visual/contact/visual-pilot-07.png) · [Sheet 08](../scripts/letter-masks/visual/contact/visual-pilot-08.png) · [Sheet 09](../scripts/letter-masks/visual/contact/visual-pilot-09.png) · [Sheet 10](../scripts/letter-masks/visual/contact/visual-pilot-10.png)

### Withheld exceptions —32, excluded from decisions

Each fixed word box lacks an entire target body or retains only a marginal trace/connector. All 32 have actual image review and a matching hashed evidence event. Original records remain preserved; the table links current evidence and the exception record.

| Word | Reason | Evidence | Exception record |
|---|---|---|---|
| 10.85.2 | Original viewed individually: whole alif body is outside immutable box; no honest target span. | [Image](../scripts/letter-masks/visual/reviews/rank005/missing-cluster-member-original.png) | [Record](../scripts/letter-masks/visual/reviews/rank005/pending-owner.json) |
| 2.171.4 | Actual original review: wasl mark fragment survives at right edge, but alif target body entirely absent below it. No target slot invented. | [Image](../scripts/letter-masks/visual/reviews/rank032/representatives-07.png) | [Record](../scripts/letter-masks/visual/reviews/rank032/pending-owner.json) |
| 21.56.4 | Direct original review shows the alif/wasl target body entirely beyond immutable right crop edge; only a wasl mark fragment remains. No empty target span invented. | [Image](../scripts/letter-masks/visual/reviews/rank041/representatives-09.png) | [Record](../scripts/letter-masks/visual/reviews/rank041/pending-owner.json) |
| 22.11.1 | Original 006 actually reviewed: initial alif target body absent from fixed crop; only partial wasla and negligible edge trace, no defensible body slot. Entire word withheld; box immutable. | [Image](../scripts/letter-masks/visual/reviews/rank094/representatives-check-006.png) | [Record](../scripts/letter-masks/visual/reviews/rank094/pending-owner.json) |
| 24.43.2 | Immutable right edge omits the alif body; only marginal trace below clipped hamza survives. No useful target body to allocate without inventing a slot. Original representatives-original-008.png actually reviewed. | [Image](../scripts/letter-masks/visual/reviews/rank079/representatives-check-008.png) | [Record](../scripts/letter-masks/visual/reviews/rank079/pending-owner.json) |
| 25.63.5 | Exact app target 1 wasl has no visible body inside the immutable word box. The rightmost visible upright belongs to lam in the lam-alif ligature. No invented slot or out-of-box border was created. | [Image](../scripts/letter-masks/visual/reviews/rank039/representatives-09.png) | [Record](../scripts/letter-masks/visual/reviews/rank039/pending-owner.json) |
| 27.40.25 | The immutable crop contains mim and small upper marks, but the alif carrier body is entirely outside the right edge. No target slot invented. | [Image](../scripts/letter-masks/visual/reviews/rank077/representatives-check-006.png) | [Record](../scripts/letter-masks/visual/reviews/rank077/pending-owner.json) |
| 3.167.9 | Alif body wholly absent from immutable crop; no honest target span can be placed. | [Image](../scripts/letter-masks/visual/reviews/rank005/representatives-check-013.png) | [Record](../scripts/letter-masks/visual/reviews/rank005/pending-owner.json) |
| 30.30.19 | Original 007 actually reviewed: initial alif and wasla entirely absent from fixed crop; lam/nun-alif/sin remain. Entire word withheld rather than inventing an alif slot. | [Image](../scripts/letter-masks/visual/reviews/rank094/representatives-check-007.png) | [Record](../scripts/letter-masks/visual/reviews/rank094/pending-owner.json) |
| 30.41.5 | Ba upright/head entirely absent beyond immutable right crop; only long joining baseline and meem-alif remain. Do not invent ba slot from connector. | [Image](../scripts/letter-masks/visual/reviews/rank024/representatives-original-007.png) | [Record](../scripts/letter-masks/visual/reviews/rank024/pending-owner.json) |
| 33.37.46 | Entire alif body lies outside immutable box; cannot place honest target span. | [Image](../scripts/letter-masks/visual/reviews/rank005/representatives-check-014.png) | [Record](../scripts/letter-masks/visual/reviews/rank005/pending-owner.json) |
| 33.38.19 | Entire alif body lies outside immutable box; no honest alif span can be placed. | [Image](../scripts/letter-masks/visual/reviews/rank005/representatives-check-015.png) | [Record](../scripts/letter-masks/visual/reviews/rank005/pending-owner.json) |
| 33.71.4 | Actual original and wider red-box context show initial lam upright/head entirely beyond immutable right edge. Only connector/base continues inside; no principal lam body slot invented. | [Image](../scripts/letter-masks/visual/reviews/rank054/root-33.71.4-context.png) | [Record](../scripts/letter-masks/visual/reviews/rank054/pending-owner.json) |
| 34.36.10 | Original 007 actually reviewed: initial alif body absent apart from negligible anti-aliased edge trace; partial wasla remains. No defensible full target body slot, entire word withheld within immutable box. | [Image](../scripts/letter-masks/visual/reviews/rank094/representatives-check-007.png) | [Record](../scripts/letter-masks/visual/reviews/rank094/pending-owner.json) |
| 35.10.21 | Actual image inspection: initial alif carrier body entirely absent inside immutable box. Only clipped attached marks remain at right edge; no invented carrier slot. | [Image](../scripts/letter-masks/visual/reviews/rank060/representatives-10.png) | [Record](../scripts/letter-masks/visual/reviews/rank060/pending-owner.json) |
| 35.11.32 | Entire alif body lies outside immutable box; no honest alif span can be placed. | [Image](../scripts/letter-masks/visual/reviews/rank005/representatives-check-015.png) | [Record](../scripts/letter-masks/visual/reviews/rank005/pending-owner.json) |
| 35.3.10 | Entire alif body lies outside immutable box; no honest alif span can be placed. | [Image](../scripts/letter-masks/visual/reviews/rank005/representatives-check-015.png) | [Record](../scripts/letter-masks/visual/reviews/rank005/pending-owner.json) |
| 35.39.1 | Direct enlarged original review: alif body absent except a marginal gray edge trace; only clipped wasl mark remains recognizable. No empty span invented. | [Image](../scripts/letter-masks/visual/reviews/rank032/carry35.39.1-original.png) | [Record](../scripts/letter-masks/visual/reviews/rank032/pending-owner.json) |
| 37.168.1 | Alif stem body entirely outside immutable right edge; only clipped hamza above nun remains. Original representatives-original-009.png actually reviewed; no fabricated slot. | [Image](../scripts/letter-masks/visual/reviews/rank079/representatives-check-009.png) | [Record](../scripts/letter-masks/visual/reviews/rank079/pending-owner.json) |
| 4.5.6 | Actual image inspection: initial alif carrier wholly absent within immutable body. Attached mark alone cannot justify fabricating a carrier span. Owner instructed keep inside box; no valid complete target sequence can be drawn. | [Image](../scripts/letter-masks/visual/reviews/rank006/representatives-original-013.png) | [Record](../scripts/letter-masks/visual/reviews/rank006/pending-owner.json) |
| 4.58.21 | Actual image inspection: detached initial alif carrier wholly absent within immutable body. Only merged paired-lam and final ha bodies remain; no invented target slot. | [Image](../scripts/letter-masks/visual/reviews/rank010/representatives-original-012.png) | [Record](../scripts/letter-masks/visual/reviews/rank010/pending-owner.json) |
| 4.59.16 | Owner requires borders inside box and clipped-ink flags; the entire alif body is missing so no honest target slot is available. Withheld, not awaiting policy. | [Image](../scripts/letter-masks/visual/reviews/rank005/representatives-check-012.png) | [Record](../scripts/letter-masks/visual/reviews/rank005/pending-owner.json) |
| 4.95.27 | Actual image inspection: initial alif carrier wholly absent within immutable body. Attached mark alone cannot justify fabricating a carrier span. Owner instructed keep inside box; no valid complete target sequence can be drawn. | [Image](../scripts/letter-masks/visual/reviews/rank006/representatives-original-014.png) | [Record](../scripts/letter-masks/visual/reviews/rank006/pending-owner.json) |
| 40.33.11 | Actual image inspection: initial alif carrier wholly absent within immutable body. Attached mark alone cannot justify fabricating a carrier span. Owner instructed keep inside box; no valid complete target sequence can be drawn. | [Image](../scripts/letter-masks/visual/reviews/rank006/representatives-original-015.png) | [Record](../scripts/letter-masks/visual/reviews/rank006/pending-owner.json) |
| 42.42.3 | The wasl-alif body is entirely outside the immutable box; no visually grounded span can be drawn inside it. No guess emitted. | [Image](../scripts/letter-masks/visual/reviews/rank002/representatives-33.png) | [Record](../scripts/letter-masks/visual/reviews/rank002/pending-owner.json) |
| 46.20.2 | The wasl-alif body is entirely outside the immutable box; no visually grounded span can be drawn inside it. No guess emitted. | [Image](../scripts/letter-masks/visual/reviews/rank002/representatives-33.png) | [Record](../scripts/letter-masks/visual/reviews/rank002/pending-owner.json) |
| 51.52.11 | Actual original and enlarged image show waw plus clipped hamza/vowel fragments, but entire alif body is outside immutable crop. No honest alif body span exists; withheld rather than fabricated. | [Image](../scripts/letter-masks/visual/reviews/rank022/cloud-check-009.png) | [Record](../scripts/letter-masks/visual/reviews/rank022/pending-owner.json) |
| 57.10.6 | Entire alif body lies outside immutable box; no honest alif span can be placed. | [Image](../scripts/letter-masks/visual/reviews/rank005/representatives-check-015.png) | [Record](../scripts/letter-masks/visual/reviews/rank005/pending-owner.json) |
| 57.5.5 | Entire alif body lies outside immutable box; no honest alif span can be placed. | [Image](../scripts/letter-masks/visual/reviews/rank005/representatives-check-015.png) | [Record](../scripts/letter-masks/visual/reviews/rank005/pending-owner.json) |
| 58.7.2 | Alif body absent from immutable right crop apart from tiny marginal trace; clipped hamza above survives. Original representatives-original-009.png actually reviewed; no fabricated slot. | [Image](../scripts/letter-masks/visual/reviews/rank079/representatives-check-009.png) | [Record](../scripts/letter-masks/visual/reviews/rank079/pending-owner.json) |
| 61.11.6 | Entire alif body is outside immutable crop; no honest target span. | [Image](../scripts/letter-masks/visual/reviews/rank005/representatives-check-016.png) | [Record](../scripts/letter-masks/visual/reviews/rank005/pending-owner.json) |
| 62.11.12 | Entire alif body is outside immutable crop; no honest target span. | [Image](../scripts/letter-masks/visual/reviews/rank005/representatives-check-016.png) | [Record](../scripts/letter-masks/visual/reviews/rank005/pending-owner.json) |

### Cost and verification

The handoff baseline had 8,013 total decisions (7,992 pilot),18 withheld, 921 actual-view events and 893 distinct audited paths. This continuation added 14,624 decisions and 14 withheld exceptions. Current cumulative audit counts are 3,320 actual-view events and 3,139 distinct paths; the continuation added 2,399 events and 2,246 additional paths. Repeated image views count as events, not new images. The legacy `auditedImagePaths` counter also includes generated-only records; the actual-view-only distinct-path total above is the review cost. Twenty final contact/comparison images are included. Historical training-view counters remain separately recorded; the actual Linux Arabic smoke image was also opened at setup and RAQM was confirmed.

Approximate cloud wall time: 10:50–12:13 UTC on 2026-11-08, about 84 minutes at report time. Parallel observer durations overlap and are not added as labor time. Historical work began 2026-11-06 across interrupted sessions. Exact tokens and a defensible rough numeric token estimate are unavailable; no invented accounting is reported. See[machine-readable summary](../scripts/letter-masks/visual/checkpoint-a-summary.json).

- Completeness: 100/100 ranks, zero unresolved, all pilot words reviewed;32 exceptions separately accounted for.
- Scoped Node tests: 10 passed, 0 failed. Exact target N+1, finite coordinates, strictly descending≥2 px spans, immutable-box containment, rank membership, duplicate checks and frozen-test exclusion passed.
- Final builder: 22,577 guess entries;60 decisions already having approved borders omitted. All undecided/withheld words retain no guess entry.
- All new cloud audit hashes, original representative coverage and shaded/carry coverage passed. The independent audit is [CLOUD_INTEGRITY_AUDIT_20261108.md](../scripts/letter-masks/visual/reviews/CLOUD_INTEGRITY_AUDIT_20261108.md).
- Source, artwork, page data, judging targets, approved borders and blind files are unchanged frome 9 c 81 c 4. Only the authorized task branch is pushed. No main merge, deployment, prototype switch, CheckpointB orC was performed.

Historical provenance caveats remain visible: 163 old view events lack hashes; the old rank 005 original 013 hash still differs, with fresh current original/check reviews covering its six words. Historical bytes were not recovered. Fourteen legacy whole-groups hash stamps are stale, while exact word-box, target-unit and membership comparisons pass. The fresh rank 039 absence review adds current SHA evidence without rewriting its old event. Coverage and hashes validate records, not another observer’s visual judgment.

### Owner style-guide questions and next boundary

1. For a connected medial letter, confirm how much of the baseline connector belongs to it before the following bowl/head. The frozen ya/nun examples above show this boundary remains poorly calibrated.
2. For vertically stacked/returning bodies such as على and لكم, confirm the preferred compromise for a single x-boundary when no vertical split can contain every stroke and keep the short bar under the intended body.
3. Confirm whether minimal antialiased mark-tip crossings should remain clipped-ink/low, or be distinguished from material letter-body clipping. This pilot conservatively flags them; boxes were never expanded.
4. Review the 200-word sheets and 32 withheld cases before authorizing any future revision. If the method is revised, use fresh evaluation data; do not reuse these now-opened 30 answers as a new blind test.

Confidence: practicality 60/100 (workflow completed, but quality and review cost do not justify scale-up);architecture/data safety 95/100 (scoped invariants and freeze passed, with explicit historical provenance limits);visual certainty 55/100 (quality targets and high-confidence calibration failed). **Checkpoint A handback is complete; owner approval remains pending. Do not proceed to B/C or publication.**
