# Marking order prototype: criterion bar (6 November 2026)

Branch `claude/criterion-bar` (experimental, not on main). Tablet and PC only.

## Current build (round 2, 6 November 2026)

Built from the owner decisions below and the research in `docs/CRITERION_ISLAND_RESEARCH.md`.

| Decision | Default | How it works |
| --- | --- | --- |
| How you mark | Criterion first | Three separate modes, never mixed: Criterion first, Drag and hold, Word first |
| After a mark | Stays chosen | The criterion stays until another is picked or it is tapped again |
| Nothing chosen | Island shakes | A word tap opens nothing. A word that already has the judge's mark still opens, so undo stays one tap away |
| Colour on the page | Frame only | A rounded line around the pages; words and tray letters are not tinted |
| Settings | Bottom-right corner | A separate 44px button; the panel opens beside the island |
| Escape | Tray first | Escape closes an open tray; with no tray it clears the choice |

Drag and hold (the drag-and-hold behaviour was still open; this is the version built for testing):

- Drag a criterion from the island onto a word. The label follows the finger until the tray opens.
- Rest on a word to open its tray. Passing over other words on the way to the tray does not move it (220 ms rest).
- Lift on a letter: marks it. Lift on a word: its tray stays open with the criterion, and one tap marks. Lift anywhere else: nothing is marked.
- A tap on an island button in this mode only shakes the island.

Look switches (test only, Settings → Look). One set will be kept:

- Chosen button: Solid (default) or Soft + edge.
- Khafi colour: Current #d58e3a (default) or Deeper #a16300.
- Buttons at rest: Paper (default) or Tinted.
- Shape: Squares (default) or Rows.
- Corners: 12, 16 or 20 (default).
- Gap: 8 or 12 (default).
- Mushaf frame: 3px (default), 2px or Off.
- Keyboard focus ring: Neutral (default) or Blue.

Other settings: Hold to keep and Keys 1 · 2 · 3 (Criterion first only), Criteria in the letter tray, Island side, Island size, Pen tap and double tap, Pen only.

## Not built, and why

- Voice: the judge's voice would go into the recitation recording.
- Mark the place now, choose the criterion later: marks without a criterion change the score model; needs an owner decision first.
- Separate magnifier: the letter tray already shows the chosen word's letters large above the finger; sliding to change the word would clash with sliding to a letter.

## Needs a real tablet

Holding a bar button with one finger while tapping a word with another was
tested in code (the bar's finger is excluded from page gestures) but needs a
check on a real iPad or Android tablet. Pen double tap needs a real pen.

## Owner decisions (6 November 2026, after trying the preview)

- Modes are separate settings, never mixed: Criterion first (default), Drag and hold, Word first.
- After a mark the criterion stays chosen until another is picked or it is tapped again. No "Next mark" wording.
- Criterion first: tapping a word with nothing chosen opens nothing; the island shakes once.
- Only the Mushaf frame shows the chosen colour; words are not tinted.
- The island buttons are large squares in the scorecard square's design (option 1); rows with a small square
  and the name are option 2. Solid and softer fills, edges, gaps and the panel behind are being chosen in the
  Criterion island lab (claude.ai artifact), where saved combinations can be read back.
- The settings opener is a separate small button in the bottom-right corner.
- Still open: drag-and-hold details (release on a word but not a letter; how to cancel).
