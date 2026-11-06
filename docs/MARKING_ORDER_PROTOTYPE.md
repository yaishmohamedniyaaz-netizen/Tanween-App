# Marking order prototype: criterion bar (6 November 2026)

Branch `claude/criterion-bar` (experimental, not on main). Tablet and PC only.

## Defaults (the recommended path)

| Decision | Default | How it works |
| --- | --- | --- |
| Order | Both | Choose a criterion on the bar first, or tap the word first as today |
| Bar tap | Next mark | A tapped criterion is used for one mark, then turns off; tap it again to cancel |
| Hold to keep | On | Hold a bar button or key: the criterion stays on only while held |
| Keys | 1 · 2 · 3 | Each number presses the visible bar button with that number |
| Bar side | Away from scorecard | The bar gets its own column; pages shrink a little, no line is covered |
| Misclick guards | On | Word and whole Mushaf frame show the chosen colour; undo as before |

## Other options (Marking settings)

Open from the slider icon under the bar, or More → Marking.

- Order: Criterion first (a word tap without a criterion shows "Choose a criterion first"), Word first (no bar; today's flow).
- Bar tap: Stays on (until tapped again).
- Hold to keep: Off.
- Keys: Off.
- Pen tap and double tap: in the letter tray, pen tap = first criterion, double tap (within 350 ms) = second.
- Pen only: fingers and palm cannot mark the page; the bar still takes fingers.
- Bar side: left or right. Bar size: large.

Settings are saved on the device (device preferences), no account needed.

## Ways to mark with the bar

1. Bar, then word, then letter (tap the letter in the tray).
2. Bar, then press the word and slide to the letter, lift (one movement).
3. Word, then letter, then bar (the bar marks the chosen letter at once).
4. Hold a bar button or key, mark several letters, let go.

## Not built, and why

- Voice: the judge's voice would go into the recitation recording.
- Mark the place now, choose the criterion later: marks without a criterion change the score model; needs an owner decision first.
- Separate magnifier: the letter tray already shows the chosen word's letters large above the finger; sliding to change the word would clash with sliding to a letter.

## Needs a real tablet

Holding a bar button with one finger while tapping a word with another was
tested in code (the bar's finger is excluded from page gestures) but needs a
check on a real iPad or Android tablet. Pen double tap needs a real pen.
