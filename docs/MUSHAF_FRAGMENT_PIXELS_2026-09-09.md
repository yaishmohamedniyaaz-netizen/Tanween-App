# Detached fragment pixel investigation

Continuation of the registered-boundary work. Source artwork and production
judging behavior are unchanged.

## Result

Traced complete 8-connected source-alpha components for all 56 remote contour
candidates across 54 glyph pieces. Unlike counting ink inside a rectangle,
this follows any connected shape outside the search rectangle and therefore
does not mistake a piece of a neighboring letter for an isolated fragment.

Initial windows: 28 empty, 4 containing only isolated components, 24 touching
extended ink. These counts describe search windows, not ownership outcomes.
An additional eight-pixel margin was then inspected on every side.

Five small, isolated source-pixel islands are now explicitly located:

| Existing word ID | Source pixel bounds (exclusive right/bottom) | Pixels |
| --- | --- | ---: |
| `2.196.53` | 1565,2828–1568,2831 | 5 |
| `7.58.8` | 26,56–28,59 | 6 |
| `17.111.17` | 618,1822–619,1824 | 2 |
| `31.17.1` | 306,2097–308,2102 | 10 |
| `31.33.5` | 342,1636–345,1640 | 9 |

The word IDs identify the source contours under investigation, not newly
approved runtime owners. p293 reconfirms the previously reviewed two-pixel
case. The other four remain attribution candidates. Exact pixels are stored,
so a future approved mask need not activate transparent corners of a box.

## Important corrections and unresolved cases

- p158's six-pixel island is outside the first predicted window. The nearby
  body registration was strong, but its remote projection still drifted.
  Empty-window detection cannot certify that a fragment is absent. Eight
  pixels is an exploration margin, not a certified universal error bound.
- On p11 and p53, the nondegenerate remote-contour windows intersect larger
  connected marks of 247 and 496 pixels. Neither complete component can be
  attributed to the remote word based only on contact or proximity.
- On p485, the expanded window reaches a 266-pixel mark; the original small
  window is empty. Fragment contribution/ownership remains unresolved.
- The 48 zero-width/height contour cases still retain their source records.
  Neighboring ink in a projected window does not justify assigning it to a
  degenerate contour, nor does this investigation delete any source outline.

## Checks

26 checks passed: source-island bounds, counts and alpha values; no missing
ink within reported island bounds; component traversal beyond window edges;
diagonal connectivity; faint alpha at the page edge; empty-window handling;
complete 56-contour coverage; and no ownership approved by detection.

The first contact sheet, covering all eight nondegenerate contours, was
visually inspected. Other sheets are generated evidence, not claimed as
visually reviewed. These are forensic magnified crops, not UI changes.

Scripts: `inspect_fragment_pixels.py`, then `verify_fragment_pixels.py`, in
`outputs/mushaf-word-boundary-2026-09-09/`. Outputs include
`fragment-pixel-components.json`, exact small-component pixels,
`fragment-pixel-verification.json` and five contact sheets.

## Next implementation gate

Before enabling more fragment hit regions, establish source-contour attribution
for the four additional isolated islands and resolve the three nondegenerate
cases touching larger marks. Do not turn connected-component detection into
automatic semantic ownership. Preserve the existing four-word interactive
probe while this evidence is prepared.

Confidence: practicality 95/100, architecture/data safety 94/100, visual
certainty 82/100 for expanding fragment interactions. The method is useful;
unresolved ownership keeps the runtime expansion below the release gate.
