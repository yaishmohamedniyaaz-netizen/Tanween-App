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
