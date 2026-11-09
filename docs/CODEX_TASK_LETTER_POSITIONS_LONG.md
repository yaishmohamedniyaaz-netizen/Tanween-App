# Codex long task: find a better way to locate every letter (research and build)

Status: ready to hand over (8 November 2026).
Base branch: `claude/criterion-bar`. Work on a new branch `codex/letter-positions-research`.
**Never push to `main`.** Never change `src/`, the artwork, the page data, the letter units or the approved borders.

The owner has many Codex tokens for this and wants a **long-horizon** effort.
**Goal: underlines that are right for about half of the Mushaf first (the most common ~1,000 spellings = 56% of words), then the rest.**

## Read first
1. `docs/CODEX_TASK_LETTER_BORDERS.md`: the rules for borders, and the methods tried in the first rounds.
2. `docs/CODEX_TASK_LETTER_BORDERS_ALL_PAGES.md` and its hand-back: the pixel round, 64% / 82.5%.
3. `docs/CODEX_TASK_LETTER_BORDERS_VISUAL.md`, `scripts/letter-masks/visual/CHECKPOINT_A_RESULTS.md` and `scripts/letter-masks/visual/candidate-v2/README.md` (on `codex/letter-borders-visual`): the visual round, 65.6% / 84.2%. Its style guide is useful.

## What we learned (do not repeat these mistakes)

- **Two very different methods reached nearly the same result.**
  - Pixel rules: 64% of borders within 2 px; short bar under the right letter 82.5%.
  - Looking at every word: 65.6% / 84.2%.
- **The ceiling is the model, not the effort.** A border is *one vertical line*, so it cannot split letters that sit on top of each other: على, لكم, لمح, بسم, the lam-alif ligatures.
- The same spelling is drawn in many ways. The top 100 spellings come in 6,068 strict shape clusters.
- All 125 approvals are now exposed. They are **development data only** and can't be a fair test any more.

## Two changes to how the problem is posed

1. **The app needs a bar under each letter, not exact borders.**
   - The real question is: *where does the bar for letter k go, and how wide is it?*
   - Primary measure: **the bar lies fully under the right letter's ink.**
2. **Use 2-D letter regions instead of vertical cuts.**
   - Label each ink pixel with the letter it belongs to (a mask per letter).
   - The bar for a letter is then derived from its own mask, for example the x-range of its lower part. This copes with stacked letters.
   - Overlapping bars are allowed in the output (see Output). The app can be changed to draw them.

## Workstreams

Try each one. Begin with a **small feasibility test on the development words** (pages 1–2 and the 95 training approvals). Give each a short written verdict before you scale it up. Run them in parallel where you can.

### W1. Font rendering and 2-D image registration
1. Render each word with fonts whose glyphs are single letters, and use HarfBuzz to get *which pixels belong to which letter*.
2. Candidate fonts:
   - **DigitalKhatt "old Madina" font**: <https://github.com/DigitalKhatt/oldmadinafont>.
     - It is built to reproduce the old Madina Mushaf.
     - **Check first** that it matches *this* 1405 calligraphy: compare 50 words by eye and by overlap.
     - Its justification-aware HarfBuzz fork: <https://github.com/DigitalKhatt>.
   - KFGQPC Uthmanic Script HAFS;
   - Amiri Quran;
   - any other Uthmani Naskh font you find.
3. Register the rendering onto the artwork word with **non-rigid 2-D warping**, for example B-spline registration (SimpleITK or elastix), optical flow, or thin-plate splines on skeleton points.
4. Carry the per-letter masks through the warp.
5. The earlier 1-D (x only) font warp reached 78% within 2 px on pages 1–2. 2-D should do better on stacked letters. Measure it.

### W2. A recogniser trained on this Mushaf, plus forced alignment
1. The Mushaf has **8,820 lines whose exact text we know**. That is a large, perfectly labelled set of line images.
2. Train a line recogniser (CTC) on them. For example, use **kraken** (`ketos train`; kraken can output per-character boxes, see <https://kraken.re/4.0/advanced.html>) or a small CRNN in PyTorch.
3. Then **force-align the known text** to get a position for every character.
4. Map characters to the app's letter units (`judgingTargetsOf`). Diacritics are separate characters in the text and must be folded into their letters.
5. CTC alignments are often "peaky": they find a letter's centre well but not its edges. That may be enough for a centred short bar. Measure it.
6. Avoid leakage: train on all lines, but report results only on words whose approvals were not used to tune the alignment settings.

### W3. A letter-mask classifier (segmentation network)
1. Train a small segmentation model, such as a U-Net, that labels each ink pixel with a letter of the known letter sequence.
2. Training data:
   - (a) **synthetic** words rendered from the W1 fonts, with exact masks and strong augmentation (stroke width, kashida stretch, slant, noise);
   - (b) **pseudo-labels**: artwork words where W1 and W2 agree;
   - (c) the owner's approvals, converted to masks.
3. Also try conditioning the model on the letter sequence.
4. A pre-trained open model is welcome as a starting point if it helps. Record its name, licence and link.

### W4. Agreement and confidence
- Combine W1–W3.
- **Where independent methods agree within a few px, mark the result `high`.**
- Calibrate on the development data, then check on the fresh test (below).
- A `high` that is right less than 95% of the time is not allowed.

### W5. Look for existing work (written report)
Search for projects that have already solved letter positions on Mushaf pages or in Naskh calligraphy:
- Quranic Universal Library / Tarteel (<https://qul.tarteel.ai/>): fonts, layouts. So far only word-level positions have been found; confirm.
- quran.com-images and the per-page QCF V1 fonts: word glyphs. Check whether word glyph outlines split into letter contours.
- DigitalKhatt `medinamushafanalyzer`;
- papers on Arabic character segmentation and text-image alignment;
- other open-source OCR (Calamari, PaddleOCR Arabic, TrOCR-Arabic).

Write `scripts/letter-masks/research/EXISTING_WORK.md`: what each one offers, its licence, a link, and whether it helps. **Do not use any data whose licence forbids it.**

## Human review loop (the owner approves here, in Claude)

The owner will approve common words in a **review grid** (built by Claude):
- about 30 words per screen, with the proposed bars;
- tap to accept, or fix the bars;
- families of the same drawing grouped together.

Claude exports each approved batch to `scripts/letter-masks/approved/batch-NNN.json`, in the existing approval format plus optional `bars`.

What you must do:
1. **Produce the proposals for the grid:** `scripts/letter-masks/review/proposals-NNN.json`.
   - Most common spellings first, grouped into families.
   - Fields per word: `wid`, `page`, `tids`, `x` (borders) and/or `bars` (per letter `[left, right]` in artwork px), `confidence`, `family`, `spellingRank`, `method`.
   - Start with the top 1,000 spellings.
2. **A fresh test.** Before you train on any new batch, put **15% of its words, chosen at random with seed 20261108** in `scripts/letter-masks/approved/heldout-NNN.json`.
   - Never train or tune on them.
   - Score them only at checkpoints.
   - This becomes the first fair test since round 1.
3. After each new batch: retrain, re-propose for the families not yet approved, and report the change. This is active learning.

## Measures (every report)
On the development data, and at checkpoints on the fresh held-out words:
- **Short bar (40%, centred) fully under the right letter**: the main measure.
- The bar's centre inside the right letter's approved span.
- Borders within 2 px, where borders still apply.
- All of the above **per confidence level**, and for **stacked-letter words** separately.
- Coverage: the share of all 77,433 words with a `high` result.

**Targets:**
- short bar at least **95%**;
- `high` really at least 95% right.

## Checkpoints (stop and hand back at each)
- **Checkpoint 1: research verdicts.**
  - W1–W3 feasibility on the development words;
  - the W5 report;
  - which method or combination to scale, with numbers and images;
  - proposals for the **top 100 spellings** for the owner's grid.
- **Checkpoint 2:** proposals for the top 1,000 spellings, retrained after the owner's first batches, scored on the fresh held-out words.
- **Checkpoint 3:** the rest of the Mushaf, only if Checkpoint 2 meets the targets.

## Output (always)
- `public/letter-borders-guess/` (same format as now): only words with a result that passed its checks. **No entry is better than a wrong one.** If a letter has its own bar, add `bars`, a per-letter `[left, right]` list.
- Code under `scripts/letter-masks/research/`. Every step must run again with one command, deterministically.
- Contact sheets of 200 random words with seed 20261108, plus stacked-letter examples, under `scripts/letter-masks/contact/`.
- Append the results, cost (honest counts), what failed and open questions to the end of this file.
- Push `codex/letter-positions-research` at every checkpoint. **Not main.**


## Checkpoint 1 hand-back — 9 November 2026

**Stopped at Checkpoint 1.** Full research verdict, provenance, metrics, images, counts and questions: [`scripts/letter-masks/research/CHECKPOINT_1.md`](../scripts/letter-masks/research/CHECKPOINT_1.md). Source baseline was `1166bedebe53c710607dee23647f2f479a5ed732`; work is on `codex/letter-positions-research` only. These are faithfully reconstructed and newly executed experiments, not recovered original lost output files.

- W1 genuine 2-D font-mask registration: Old Madina 293/376 (77.9%) contained bars among emitted development targets, 293/389 (75.3%) with abstentions counted as misses; Amiri 308/389 (79.2%). High outline overlap does not prove ownership.
- W2 real 40-line CRNN/CTC feasibility: 328/389 (84.3%) development bars, 97.9% centres in historic spans; 0% training CER, 28.4% separate text-validation CER. Geometry scores are from training lines and exposed development approvals.
- W3 weak geometry/conditioned/synthetic U-Nets: 47%, 53%, 50% regular-development bar containment. Weak spans and synthetic glyphs do not establish true artwork ownership. Bounded augmentation only; zero unverified pseudo-label words trained.
- W4 W1/CTC agreement: 92.1% on 31 words or 90.6% on 32 words. Tighter subsets are too small and exposed to certify 95%. All proposals remain low. High coverage: 0/77,433.
- W5 primary-source/licence report found no verified reusable 1405 per-letter mask source; restrictive or unresolved assets were not imported.
- Owner review: 22,577 proposals over the top 100 spellings/6,068 strict families, including 100 newly inferred representatives and 22,477 clearly marked historical suggestions. Excludes 39 approved pilot words and 32 missing-body words. No blind family propagation. All 200 seeded random pilot-word views plus 100 new-representative views were opened.
- Every accuracy number is a historic vertical-span proxy, not true 2-D ink-ownership truth. All 125 old approvals are exposed; fresh heldout count is zero. The future batch splitter is implemented/tested but not run on an invented batch.
- **Preservation exception:** later instruction required retaining existing public guess maps. All 605 files/77,308 legacy entries remain unchanged. The empty trusted research export is staged separately under `research/validated-guesses/`, not installed into the app.
- Verification: full bounded one-command reproduction passed; deterministic duplicate prototype runs plus third integrated run matched prediction/artifact hashes. Node 22.18 full suite: 497 pass, 1 optional skip, 0 fail. Build passed with existing large-chunk warning. Protected source, scripture, artwork, page data, units and approvals unchanged.
- Rebuild cost: three W1 190-case development passes plus three 100-representative passes; three CTC fits/21,600 line updates; nine U-Net fits/4,860 updates; 760 synthetic render attempts including readiness audits (744 accepted). Renderer test probes and setup/review work are additional. No GPU or paid OCR/inference API; token/dollar total unavailable. Full timings are in the linked report.
- Failures/limits: lost original workspace, unavailable original commit/large files, interrupted initial publication, later reconstructed-workspace loss recovered from a verified new archive; font correspondence failures, CTC overfit, weak segmentation labels and no fresh ownership test. Nothing reached the 95% gate.

Recommendation: do not scale trusted output yet. Obtain a new owner-reviewed batch and true stacked/ligature ownership examples; freeze 15% before any retraining. Decide whether to pursue anchored/topology-preserving W1 plus CTC centre proposals. Public-map replacement and overlapping app bars remain separate future decisions. Await owner instruction before Checkpoint 2; never push to main.
