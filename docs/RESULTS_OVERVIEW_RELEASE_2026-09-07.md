# Results overview release candidate

## Scope

The new Results overview is the default; `?resultsOverview=0` retains the older
interface as a temporary fallback. This release includes the already-built
participant workspace and direct saved-interval replay. It does not claim that
the whole replay roadmap is complete: automatic coverage shading and discovery
across recording parts remain deferred.

Retained: existing scoring, ledger, notes, original recordings, export formats,
live judging composition and Analysis content. Recomposition: one roster-first
overview with participant detail and secondary source/import tools. Removed:
repeated completeness labels on ordinary rows and the default preview-link gate.
No new approval states or authenticated authority system were introduced.

## Finishing changes

- Criteria received describes the count accurately; it is not a judge count.
- Complete-source summary excludes absent participants from its denominator.
- Absent participants remain visible at the end, with contradictions disclosed.
- Attendance continues to use the current roster; the immutable snapshot stores
  identity, not attendance. Missing live entries do not delete frozen evidence.
- Source and official scores remain distinguished. Missing marks stay unknown.
- Returning from Previous/Next in detail restores the original list anchor/page.
- Competition/version key already resets the overview's local selections.
- Added focus outlines and an accessible description of the score table.

## Validation

- 409 automated tests: 408 passed, one existing skip for absent local Tilawa assets.
- Browser fixture expanded to 23 participants; fixture is dev-only and not bundled.
- Checked page 1 to page 3, absent rows last, no-match reset, and crossing from the
  tenth participant to the next then returning to the original focused row/page.
- Light and dark layouts inspected. Desktop: 1024x768, 1280x800, 1400x900.
  Compact: 393x852 (browser reported 394 CSS px), 320x740.
- No horizontal document overflow in measured compact and desktop checks.
- Landscape 852x393 checked without horizontal overflow; the table scrolls vertically.
- Normal root URL verified to open the overview without a preview query flag.
- Opened participant passage and word inspector. Switching to Analysis left no
  audio element active; returning to Review retained the participant.
- Base verified against current origin/main and latest Sites version 117:
  b4ac5b23c0a44d78c3e282b6e4cc010236a39d8b. No newer remote changes at that check.

Real iOS/PWA acceptance, screen-reader testing, 200% text zoom, exhaustive import
UI testing and pixel-identical baseline comparison are not claimed. Earlier
synthetic-audio tests prove routing, not Quran recognition accuracy.

Publication requested by the user; public-audience confirmation requested using
the Sites release workflow. Release outcome is reported separately after hosting.

Confidence: practicality 94/100; architecture/data safety 92/100;
visual certainty 84/100, pending physical-device and user acceptance.
