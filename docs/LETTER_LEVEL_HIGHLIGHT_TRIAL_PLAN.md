# Letter-level highlight trial plan

Status: trial started 1 November 2026. Not approved for the app. Nothing here
changes saved mistakes, scoring or Quran text; it only changes what the page
highlight could cover later.

## Goal

Today a mistake highlights the whole printed kalimah on the page. The goal is to
highlight only the letter (with its dots and haraka) that the mistake is about,
on the same 1405H page artwork the app already shows.

## Owner rules so far

- Style for now (4 November 2026): keep the word block, and add a solid bar
  in the criteria colour under the marked letter's span. All tints sit behind
  the ink, so the letters keep their own colour.
- Because the bar needs only where a letter starts and ends, the mapping is
  the borders between letters, not a pixel mask. Letters sit side by side with
  no gaps or overlaps; the review screen sets these borders.
- The letter and its haraka are treated together.
- A different colour for the haraka is undecided (see `UNDECIDED_DECISIONS.md`,
  item 35).
- Known limit: stacked letters share the same horizontal space, so their bars
  overlap.
- Bar placement (5 November 2026): inside the word block, along its bottom
  edge, not below it.
- Bar settings (decided 5 November 2026): 2.25 px thick at desktop page size,
  square ends, full letter width; word block about 18% in light (22/14 of that
  in dark), drawn behind the ink. Bar colour: the criterion colour in light,
  the lighter criterion colour in dark. Comparison script:
  `scripts/letter-masks/thickness_compare.py`.

## Silent letters (decided 5 November 2026: faded own letter)

Letters that are written but never pronounced stay their own targets. The
letter tray draws them faded (38% strength, no other mark); a tutorial will
explain the fading. Reason: a reciter can still err on them, and the mistake
belongs to that letter, for example pronouncing the nun in مِّن رَّبِّهِمۡ
(leaving the idgham) or saying the lam in ٱلرَّحۡمَٰنِ. The page bar then sits
under the silent letter only.

Silent letters (rule version `qpc-hafs-v1-targets-4.0.0`):

- A bare letter before a shadda letter in the same word (lam shamsiyyah and
  other complete idgham, for example ٱلرَّحۡمَٰنِ, أَرَدتُّمۡ): 2,988.
- A letter with the small round zero (U+0652 in the QPC text, for example the
  waw of أُوْلَٰٓئِكَ): 264.
- A bare final letter when the next word starts with a shadda (for example
  مِّن رَّبِّهِمۡ, قُلُوبِهِم مَّرَضٞ, قَد تَّبَيَّنَ): 1,598.
- A nun before a letter without shadda (ikhfa, ghunna idgham such as
  مَن يَقُولُ) is pronounced in part and is not marked silent.

Not yet decided: the first lam of ٱللَّه (2,667) and the plural alif of قَالُواْ
(3,703) stay merged as before; hamzat al-wasl (13,819) stays a normal letter
although it is silent when reading on from the word before.

History: on 5 November 2026 these letters were first merged into the sound
that carries them (option B, rule 3.0.0, never released). The owner flagged
مِّن: the nun can be pronounced by mistake. Marks saved under 3.0.0 on a merged
lam and shadda letter move to the shadda letter.

## Why this needs mapping work

- The page is a fixed picture (1920 × 3106 PNG per page, from the pinned Quran
  iOS 1405H artwork). The app knows each word's box, not its letters.
- Inside a word, dots and harakat are usually separate ink pieces. Letters that
  join are one ink piece, so they need cut lines.
- The same word is often drawn differently on different pages (stretched
  letters, moved harakat). Reuse must therefore work on letter shapes, not only
  on whole words.

## Measured on all 604 pages (scripts in `scripts/letter-masks/`)

| Measure | Result |
| --- | --- |
| Letter words | 77,433 |
| Different word spellings | 21,116 (13,959 appear only once) |
| Letters | 325,961 |
| Words where the ink-piece count matches the text | 90.9% |
| Letters standing alone in their own piece (no cut needed) | 21.3% of letters in matching words |
| First automatic cut lines, pages 1–3, 50, 300, 500 | 4% look clean, 36% need a check, 60% fail |

The simple cut rule (cut where only a thin baseline stroke remains) is not good
enough on its own. Stacked letters (for example lam over meem) cannot be split
with a straight vertical line. This is the main work.

## Method: approve a few, reuse the rest

1. A program proposes letter areas for each word.
2. Every word gets a channel:
   - **Green**: matches shapes already approved. Accepted, but a random sample
     is checked by a person.
   - **Yellow**: near match. One click to approve or fix.
   - **Red**: new shape or failed split. Fixed by hand once; it becomes a new
     approved pattern.
3. Approved cuts are reused by shape matching, run as plain code (no AI cost per
   word).
4. If any random check of a green word is wrong, stop the batch and find out why.

## Who does what

- AI models (strong model for rules and hard cases; cheaper models or Codex for
  repeated coding and batch runs) build and run the tools.
- No model decides that a letter area is correct. Only a person's approval and
  the random checks do.

## Trial steps

1. Review screen: shows a word large, proposed letter areas, lets the reviewer
   approve, move or bend a cut line, or paint pixels to a letter (needed for
   stacked letters).
2. Owner reviews pages 1–2.
3. Reuse those approvals on pages 3–20. Measure green / yellow / red rates,
   wrong greens in random checks, and review time per word.
4. Decide on the full 604 pages from those numbers.

## First review results (5 November 2026)

- 22 of 65 words on pages 1–2 approved (all on page 1); 15 of them with the
  border tool.
- Automatic first guess vs the owner's borders, between letters, at desktop
  page size: median 1.5 px off, mean 3.9 px; 42% within 1 px, 58% within 2 px.
  The two outer ends of a word were exact.
- Meaning: the first guess is not good enough to accept without review yet.
  Learning from these 15 words did not help yet: a width prior per letter
  (median 1.7 px, 53% within 2 px) and the Hafs font's letter positions
  (median 4.2 px, 22% within 2 px) were both worse than the first guess.
  Too few approved letters; shape matching needs more. Handed over as
  `docs/CODEX_TASK_LETTER_BORDERS.md`.

## Open checks

- Licence: the artwork fetch script states it "does not establish artwork
  redistribution permission". Letter maps made from the artwork need the same
  check before release.
- Mistakes that cover more than one letter or cross two words, lam-alif and
  other joined shapes, stacked letters, small letters and signs: rules needed.
