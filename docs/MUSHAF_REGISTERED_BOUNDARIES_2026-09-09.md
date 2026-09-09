# Source-registered boundary evidence

## Result

The 54 previously flagged glyph pieces now have registered body positions
against the unchanged source PNGs on 46 pages. The comparison also includes
46 controls selected by deterministic SHA256 rank on different, unflagged
lines of those pages, before examining match results.

All 100 diagnostic crops were visually inspected in ten contact sheets.
The registered body boxes locate the intended shapes. They are font-outline
envelopes, not exact ink masks or approved interactive hitboxes. Several
envelopes extend beyond the raster ink because contour/control-point bounds
and rasterized visible bounds differ.

Normalized cross-correlation ranges from 0.8855 for the flagged sample and
0.8969 for controls upwards. These are image-matching scores, not confidence
percentages or religious-text certification. No second spatial peak was
within 0.1 of the best match; near-best horizontal endpoint spread was at
most 3.45 source pixels in the searched parameter grid.

## Findings that changed the approach

- All non-remote contours must contribute to the body envelope, including
  small nearby details. The earlier scan's size-based envelope omitted a
  22-font-unit extent at `45.8.10`. Registration now recomputes the body from
  every contour except the explicitly identified remote candidates.
- On page 555, `63.11.2`, the source rectangle does not span the distant
  font-header point. Using that rectangle to estimate font scale incorrectly
  narrowed the search window and produced a 0.2296 match. The generic weak-
  match fallback includes the whole original rectangle, obtaining a 0.94
  match at the correct visible word. This rejects the previous affine model
  as final coordinate authority; it is only a search seed.
- The 54 glyph pieces include 56 remote candidate contours. Eight have both
  nonzero width and height; 48 have zero width or height in their font bounds.
  A degenerate contour is not automatically permission to discard it or
  assign nearby visible ink to another word.
- 28 of the 56 predicted fragment windows contain no nontransparent source
  pixels. The other 28 contain ink that may include a neighboring word.
  Window pixel counts alone do not establish fragment ownership.

## Corpus diagnostic with registered horizontal envelopes

| Check | Original | Earlier approximate body model | Registered body model |
| --- | ---: | ---: | ---: |
| Severe narrowed partitions | 59 | 0 | 0 |
| Adjacent min-x order inversions | 25 | 0 | 0 |
| Same-line horizontal intersections | 6,872 | 6,802 | 6,800 |
| Metadata / role failures | 0 / 0 | 0 / 0 | 0 / 0 |
| Associated coordinate IDs | 88,246 | 88,246 | 88,246 |

The registered model replaces only the horizontal envelopes of the 54
flagged pieces. Vertical line bands, exact remote fragment ownership and
the remaining 6,800 intersections are not resolved by this result.
Intersections are not necessarily defects; calligraphic overhangs can be
legitimate. The controls test the registration method on other lines of
the affected pages, not unseen editions or a representative 604-page sample.

## Validation and artifacts

- 551 independent evidence checks passed: complete flagged coverage, control
  separation, original page/font hashes, unchanged semantic identities,
  all retained contour bounds, finite in-page positions, p293 agreement
  with earlier registration, and corpus association/order checks.
- The earlier 13 source/shape/pixel checks passed again.
- No production source, Quran data, preferences or judging ledger changed.
- No additional interactive targets enabled or new release published.

Reproduce from the repository root using the bundled Python runtime:

1. `outputs/mushaf-word-boundary-2026-09-09/register_corpus.py`
2. `outputs/mushaf-word-boundary-2026-09-09/review_registration.py`
3. `outputs/mushaf-word-boundary-2026-09-09/audit.py --registered-model`
4. `outputs/mushaf-word-boundary-2026-09-09/verify_registration.py`

The registration script reuses matching image/font/body entries from its
prior report. For a clean algorithm rerun, retain a copy of the report and
run with no `corpus-registration.json` present. The stored results include
source hashes, search windows, fit parameters, competing spatial peaks and
fragment inspection windows. Contact sheets are source-artwork crops with
diagnostic overlays; source PNG files remain unchanged.

Primary sources: [original fonts and generator](https://github.com/quran/quran.com-images/tree/dbda5689691defc7e3b28314cc2d035ff027795c)
and [1405 source images](https://github.com/quran/quran-ios/tree/422ece54cee15d474654dc11466f8e2f0e39c3e6/Example/QuranEngineApp/Resources/hafs_1405/images_1920).

## Next work and retained layout direction

Resolve fragment pixel ownership first, prioritizing the eight nondegenerate
contours and any windows touching neighboring ink. Then generate complete
word regions and shared line bands, preserve marker/non-marker roles, and
expand the isolated interaction probe with the same integrity and gesture
guards. Main-body registration alone must not enable a whole page.

The owner accepts the hosted layout for this stage; no additional layout
review round is needed now. Keep mobile centering, later lower desktop
artwork slightly around surah headings, and position Al-Fatihah/opening
Al-Baqarah according to the physical reference. Keep the separate bottom
selector and frozen zoom scope. This is not a new spacing redesign.

Confidence in proceeding to fragment/interaction preparation: practicality
95/100, architecture/data safety 93/100, visual certainty 85/100. This is
readiness for the next bounded slice, not production-release acceptance.
