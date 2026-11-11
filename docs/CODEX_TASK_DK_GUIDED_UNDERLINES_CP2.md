# Codex task: DigitalKhatt-guided underlines — Checkpoint 2

Status: ready to hand over (11 November 2026).
Branch: continue on **`codex/dk-guided-underlines`** (first merge `origin/claude/criterion-bar`).
**Never push to `main`.** Do not change `src/`, the artwork, page data, `public/mushaf-dk/` or approved borders.

Read first: `docs/CODEX_TASK_DK_GUIDED_UNDERLINES.md` (rules, formats, your Checkpoint 1 and 1b reports).

---

## 1. Where we are

- Bars v2 scored **91.67%** words fully right on a fresh 300 (seed 20261112). Target: **97%**.
- 88.6% of words pass the automatic checks; the rest show no bar.
- The bar rule (`bars_v2.py`) is mostly fine now. **Most remaining errors come from the
  letter labels** (which print ink belongs to which letter), from your 1b tags:
  1. **Stacked ج ح خ** (head above, bowl below): body split wrongly, short or end-point bar.
  2. **Lam and its carrier/neighbour:** stem ink given to the wrong letter.
  3. **Final ي bowl** returning under earlier letters.
  4. **Detached ink pieces** (not dots or harakat) pulling a bar to the wrong place.
  5. **100 words with colliding bars** after the 3 px minimum width (withheld as errors).

## 2. Goal of Checkpoint 2

Fix these patterns **in code**, then measure once on a new, untouched sample.

| Measure | Target |
| --- | --- |
| Words fully right (every bar under its own letter) | **≥ 97%** |
| Letters right (each letter's bar judged on its own) | report it; expected ≥ 99% |
| Words with bars (pass automatic checks) | report it; must not fall below 85% |

**Letter-level score (new):** for each sampled word, also count how many of its letters'
bars are right and how many are wrong. Judges mark one letter at a time, so this number
matters most to the owner.

## 3. Development data and test data (keep them apart)

- **Development (you may look and tune):** every word reviewed before — the Checkpoint 1
  reviews, the 89 recheck and the fresh 300 of 1b — plus Claude's `review-v2/` examples.
  Build `checkpoint2/dev-failures.json`: all of these with verdict `wrong` or `unsure`,
  or tag `label-wrong`, with their pattern tag (1–5 above, or `other`).
- **Regression set:** 120 dev words that were **right** in 1b, chosen at random (seed
  20261113-reg). A fix must not break them.
- **Test (never look before the end):** a fresh 300 `ok` words, seed **20261114**, drawn
  only after the final full run, excluding **every** word ID ever reviewed (same
  exclusion rules as 1b, plus all 1b reviews).

## 4. Fix one pattern at a time (small loops)

For each pattern, in this order: **5 → 4 → 2 → 1 → 3**.

1. Write the change as a new, separate function or flag (keep v2 runnable). Name it
   `labels_v3` / `bars_v3` options, e.g. `--fix-stems`.
2. Run it on that pattern's dev failures **and** the 120 regression words (computer only).
3. Look at **one sheet** of the changed words only (words whose bars did not change need no look).
4. Keep the fix only if it repairs more dev failures than it breaks regression words, and
   breaks **at most 1** regression word. Otherwise drop it and write why.
5. Record per fix: fixed / still wrong / newly broken, in `checkpoint2/fix-log.json`.

### Ideas to try (you may find better ones; write down what you tried)

- **Pattern 5 (colliding bars):** never widen a bar into a neighbour; if the 3 px minimum
  cannot fit, centre a 3 px bar inside the letter's own body columns and shrink the
  neighbour by the same amount. Only if that also fails, withhold the word.
- **Pattern 4 (detached ink):** a separate piece of ink that is not a mark must be matched
  to a DigitalKhatt piece the same way marks are (reading order, above/below/inside band),
  never by nearest pixel alone. A piece with no partner gets no letter and does not count
  for any bar.
- **Pattern 2 (stems):** find tall vertical strokes in the print (long vertical runs of
  ink) and in the DigitalKhatt word, match them one-to-one in reading order, and give each
  print stem **whole** to the matched letter before the nearest-pixel step.
- **Pattern 1 (stacked ج ح خ) and general label quality:** replace "nearest DigitalKhatt
  pixel" with **growing along the ink**: seed each letter with print pixels whose aligned
  DigitalKhatt pixel is deep inside that letter (at least 3 px from any other letter),
  then grow the seeds through connected ink (a watershed on the ink, cost = distance to
  that letter's aligned DigitalKhatt shape). Ink is then split where strokes join, not
  where straight-line distance happens to cut.
- **Pattern 3 (final ي bowl):** the bowl of a final ي, ى or ن that returns under earlier
  letters should give the bar only the part **left of** the previous letter (bars_v2
  already does this when it can see it; check why it fails and fix the body detection).

## 5. Then one full run and one test

1. Rerun all 604 pages with the kept fixes (computer only). `"method": "dk-guided-v3"`.
   Keep the 1b automatic checks; re-finalise the fit threshold on the new run.
2. Freeze the test sample (seed 20261114) **before** looking at any of it.
3. Check the **first 100**. **Early stop:** if fewer than 95 are fully right, stop and
   report (saves tokens).
4. Otherwise check the other 200.
5. Judge each word as in 1b (bars at one height; dots and harakat ignored; follow the app's
   letter units, including merged madd alifs), and also count right/wrong **letters**.

## 6. Token budget and weekly limit

- Expected: about 5 sheets per fix (≈ 25 sheets) + 13 sheets for the test ≈ **40 sheets**.
- **Hard stop at 50 sheets.** If you reach it, finish the current step, save, push and report.
- Resumable as before: `checkpoint2/progress.json` says which fixes are done and where to continue.
- Never repeat a full run without a kept fix since the last one.

## 7. Report (append to the end of this file), push, stop

- Per fix: what changed, fixed / still wrong / newly broken, kept or dropped.
- Test: words fully right, letters right, words with bars; failure patterns left.
- Old vs new: 1b (91.67% words) vs Checkpoint 2, clearly marked as **different samples**.
- Sheets looked at, run time; token use if you can measure it, else `null`.
- Push `codex/dk-guided-underlines`. **Not main.** Say the commit id. **Stop.**

## Progress handoff to Fable

The owner requested stopping this session and handing off the remainder.
Merged `origin/claude/criterion-bar` at `3e9dd02` into the task branch with merge
`e3efc58`. Development/exclusion inputs and the opt-in experiments are saved.
Patterns 5, 4 and 2 were dropped after their guarded trials; no fix is kept.
Pattern 1 has a computer comparison and an **unviewed** changed-word sheet;
pattern 3 has not been run. Three sheets have been viewed, leaving 47 of 50.
No full v3 run or fresh seed-20261114 sample has started. Existing public bars
and protected app/artwork paths are unchanged. Ten focused tests and the draft
runner's isolated self-check pass; this is not completed CP2 validation.

See [the complete Fable handoff](FABLE_HANDOFF_DK_GUIDED_CP2.md) and
`checkpoint2/progress.json` for the exact next step, evidence, commands and
remaining acceptance gates. CP1b's 91.67% remains the latest completed fresh
measurement. No new accuracy or production-readiness claim is made.

---

## Checkpoint 2 report (Fable, 10–11 November 2026)

Status: **complete**. Method `dk-guided-v3`, kept fixes `stacked2` + `bowl2`.
Machine-readable copy: `scripts/letter-masks/dk_guided/checkpoint2/results.json`.

### Result

| Measure | Target | Checkpoint 2 |
| --- | --- | --- |
| Words fully right (fresh 300, seed 20261114) | ≥ 97% | **97.67%** (293 of 300; 3 wrong, 4 unsure) |
| Letters right | report; expected ≥ 99% | **99.13%** (1259 of 1270; 7 wrong, 4 unsure) |
| Words with bars, automatic checks | ≥ 85% | **88.65%** (68,643 of 77,433) |
| Words with bars after withholding seen errors | — | 88.60% (68,609; 36 words withheld by eye) |

- Early-stop gate: 95 of the first 100 were fully right. The gate is "at least 95", so it
  passed **with no margin**. One more doubtful word would have stopped the test.
- **Old vs new, different samples:** Checkpoint 1b scored 91.67% on its own fresh 300
  (seed 20261112). Checkpoint 2 scored 97.67% on another fresh 300 (seed 20261114).
  The two numbers come from different words and different reviewers, so the 6-point
  difference is not a clean measurement of the gain.
- With 300 words, the 95% range for 97.67% is roughly 95.3% to 98.9% (Wilson interval).
  The result meets the target but does not prove the true rate is above 97%.

### Limits of this measurement (read before relying on it)

1. **The same model wrote the two kept fixes and judged the test.** An independent
   review of the 14 test sheets is advisable before the bars are shown to judges.
2. Sheets were judged at reduced size. Edges closer than about 10–15 px could not be
   checked. Where I could not confirm a bar, I recorded `unsure`, not `ok`.
3. Judgement calls recorded as `ok` (bars under the right letters, but one bar runs
   partly under a neighbour): الشيطن ×3 (37, 140, 264: ي bar runs under part of the ط
   loop), الطرف (247: lam bar runs under part of the ط loop), ههنا (49), ألحقنا (296).
   A stricter reviewer could mark some of these `unsure`; six such changes would put the
   score at 95.67%.

### Per fix

| Pattern | Change | Fixed | Still wrong | Newly broken | Kept |
| --- | --- | --- | --- | --- | --- |
| 5 colliding bars | integer allocation inside own columns | 0 | 24 | 0 | dropped |
| 4 detached ink | same-count component matching | 0 | 0 | 2 | dropped |
| 2 stems | upright-run matching | 0 | 16 | 1 | dropped |
| 1 stacked ج ح خ (labels) | connected-ink growth | 0 | 9 | 0 | dropped |
| 3 final ي bowl (Codex version) | body detection | 0 | not viewed | — | dropped on computer evidence |
| **1r2 `stacked2`** | bar rule: the letter sitting on a ج/ح/خ keeps its dense core at its right side; the ج/ح/خ gets the rest | 10 (+2 stayed right) | 4 | 0 | **kept** |
| **3r2 `bowl2`** | same rule for a word-final ي/ى whose bowl returns under the letter before it | 10 | 3 | 0 | **kept** |

Details and word IDs are in `checkpoint2/fix-log.json`. The owner's rule of zero newly
broken regression words was applied (stricter than "at most 1" above).

### Full run

- 604 pages, 77,433 words, 0 page errors. Run time about 2 h 40 min on 2 cores
  (two background sessions; the run resumed from saved pages).
- Labels and targets are identical to v2 for all 77,433 words. Bars changed in 2,322
  words (3.0%); 22 words gained bars and 2 lost them.
- Fit threshold re-finalised on this run: 4.9888 (90th percentile).
- Failed automatic checks: fit 7,744; coverage 1,064; narrow-bar 92; overlap 73;
  invalid geometry 73.
- Protected paths (`src/`, artwork, page data, `public/mushaf-dk/`, approved borders)
  are unchanged. Nothing was wired into the app, deployed, or exported as colour files.

### Failure patterns left (7 of 300 test words)

- **Lam and its neighbour, label wrong (5 words):** 6.69.8 and 7.38.7 (lam before a
  swash kaf: the lam stem or the kaf knot is given to the wrong letter), 6.66.4 (lam
  stem given to the alif in ٱلحق), 33.19.29 and 20.68.5 (lam bar may not sit under the stem).
- **Heh body given to the ي before it (1 word):** 25.42.8 عليها.
- **Very narrow ي bar before a final ن (1 word):** 22.53.5.
- Still open from the development set: a lam stem standing in the middle of a ج/ح/خ
  body, detached ink, and the 73 words with colliding bars. All remaining patterns are
  label errors, not bar-rule errors. Pattern 2 (stems) is the most useful next target.

### Evidence and counts

- Sheets viewed: **20 of 50** (3 by Codex, 3 pattern trials by Fable, 14 test sheets).
  Each sheet was viewed once.
- Test sample frozen at 2026-11-10T22:51:06Z, before any test sheet was viewed.
  46,726 eligible words; 24,204 word IDs excluded (all earlier reviews and exposures).
- Evidence: `checkpoint2/test/` (sample, frozen predictions, sheets, `audit.jsonl`,
  `decisions.jsonl`), `checkpoint2/validation.json`, `checkpoint2/results.json`.
- Tests: 14 focused tests pass. `validate_cp2.py --finish` passes.
- Token use: `null` (not measurable in this session).
- Commit id: see the commit that adds this report on `codex/dk-guided-underlines`
  (stated in the hand-back message). **Not pushed to main.**

### After the report: look at the 7 failed test words (11 November 2026, no fix kept)

The owner asked for a fix for the remaining errors. The 7 failed test words were drawn
again at double size next to the DigitalKhatt reference letters (they are development
data now; the recorded test result is unchanged).

**What the closer look shows**

- 3 of the 7 are in fact right: 33.19.29, 20.68.5 and 22.53.5 (recorded `unsure` only
  because the test sheet was too small to see the lam stem or the ي tooth).
- 4 are real errors, with three different causes:
  1. **Swash kaf (6.69.8, 7.38.7):** the print uses the long S-shaped kaf, the
     DigitalKhatt reference uses the plain kaf. The shapes cannot be laid on each other,
     so the lam stem or the kaf knot goes to the neighbour letter.
  2. **Lam joined into ح (6.66.4):** alif and lam stand closer in print than in the
     reference; the lam stem is split between the alif and the ح.
  3. **Stretched join (25.42.8):** the print has a long join line between ه and ا that
     the reference does not have, so the ه body is matched to the ي. The long fatha
     above is also counted as letter body.
- Optical flow hides these cases: after the flow step every print pixel lies on some
  reference ink, so the stored `fit` value does not show the wrong match.

**Three quick attempts, all dropped (computer evidence only, nothing viewed as a sheet)**

| Attempt | Result |
| --- | --- |
| Column matching (dynamic time warping of column profiles) before the flow step | Repaired the ه of 25.42.8 only. Did not repair 6.66.4 or 7.38.7. Moved labels in 33.19.29, which was right. |
| Treat pieces already matched as marks as non-body when sizing bars | Changed bars in many of the 120 regression words (up to 26 px). Too broad to keep under the zero-break rule. |
| Withhold words where a tall stroke is split between letters or owned by a letter without a stem | Flagged 42 of the 120 right regression words (tails of م and ي count as tall strokes). Not usable as a check. |

**Suggested next step for whoever continues:** treat the causes one at a time. The swash
kaf is the clearest: detect it in print (kaf with a long upper arm and a knot beside the
previous letter) and label the knot and arm as kaf by rule, not by the reference shape.
Each kept fix needs the full run (about 2 h 40 min) and a new fresh sample, because the
seed-20261114 sample is now used.
