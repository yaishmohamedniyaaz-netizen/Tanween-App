# Pilot: DigitalKhatt-guided letter colouring on the 1405 print

Claude, 9 November 2026. The print stays exactly as it is; DigitalKhatt only
tells which print ink belongs to which letter unit (tid).

## Method (`dkguide.py`)

1. **Print word ink:** every ink piece touching the word's `body` box, kept whole
   (pieces mostly outside the box belong to a neighbour).
2. **DigitalKhatt word:** each letter unit rendered as its own mask from
   `public/mushaf-dk/dk-web-4213fab-v1` (1 unit = 1 artwork px). Waqf signs are
   rendered as "no letter" so they stay uncoloured.
3. **Align:** box fit, then a small search over scale (±6%) and shift (±4 px)
   that minimises the distance from print ink to DK ink; then TV-L1 optical flow
   (scikit-image) for the non-rigid part.
4. **Letter bodies:** every print ink pixel takes the letter of the nearest
   aligned DK letter pixel.
5. **Marks (dots, harakat, signs):** a piece is a mark if it is small or sits
   mostly outside the letter band. Marks are matched to DK marks **in reading
   order**, separately above and below the letters (dynamic programming; one
   print mark may equal two touching DK marks, e.g. hamza + sukun). Order is kept
   even when the two drawings stack letters differently (لكم).
6. **Underline** (`bars`): the x-range of each letter's lower ink.

About 0.35 s per word on one CPU core (77,433 words ≈ 7.5 core-hours).

## Result: 48 random words (seed 20261109), checked by eye

The method was tuned on 9 hand-picked hard words only (`s1g`), not on these.

| | Words |
| --- | --- |
| Every letter and mark right | 40 / 48 (83%) |
| Letter bodies right, one small mark wrong | 7 / 48 (2 unsure) |
| A letter body wrong | 1 / 48 (66.9.5 وَٱغۡلُظۡ: the alif took the غ colour) |
| **Letter bodies right** | **47 / 48 (98%)** |

Mark errors seen: a sukun given to the next letter (وَحَشَرۡنَا, لِلۡإِسۡلَٰمِ),
sukun and the dot inside a waqf ج swapped (8.52.5), the tip of a long stroke on the
neighbour (وَكَذَٰلِكَ, بِئۡسَ).

For comparison, the earlier underline methods on the print reached 82–84%
"bar under the right letter".

## Sheets

`pilot-sheets/r0..r5.jpg` (the 48 words), `s1g.jpg` (hard words). Each tile:
DigitalKhatt word (left) and the print word (right), same colour per letter,
underlines below.

## Next

- Fix the mark cases above: waqf pieces matched only to waqf, a size check for
  sukun vs dots, and long strokes split at the nearest DK letter boundary.
- Self-checks that flag a word for review instead of guessing: mark counts
  differ between print and DK, poor alignment score, a letter with no ink.
- Output and app: a per-page label image (letter index per ink pixel) and
  colouring the print's own ink of the marked letter.
