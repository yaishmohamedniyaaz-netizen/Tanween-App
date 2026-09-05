# Portrait gap correction — 2026-09-05

Status: implemented and browser-tested. The user explicitly authorized commit
and publication to the existing mobile site for remote review. Physical iPhone
visual acceptance remains pending; publication is not that acceptance.

## Cause and bounded correction

The user's installed-iOS Ready screenshot exposed an asymmetric clearance:
the single-page layout reserved a 44px Return row plus a 4px gap even when
Return was absent. The previous clearance-clamped translation becomes zero
when safe areas make the frame height-limited. It therefore did not address
the reported device case.

- Retained: exact paper fit formula, aspect ratio, glyph/line rendering,
  page navigation on the paper, existing dock and header footprints.
- Recomposed: in portrait Ready/active single-page mode, Return temporarily
  occupies the header participant control's space. It retains the reciter name
  on a secondary line and a 44px target. Tapping returns to the question and
  restores the normal participant control. This is a visible interaction change
  requiring user acceptance, not merely a CSS offset.
- Removed: the empty Return row from the paper's layout and its compensating
  translation. The paper itself is now centred within the same stage.

The header control is a portal rendered from the existing visible-page check,
with the same page-change handler as the desktop control. There is no duplicate
judging state, question assignment, saved preference, or scoring logic. CSS
exposes only one Return presentation; the header version is hidden outside the
portrait deck/prepared scope. Desktop/spread retains its existing Return control.

## Browser evidence

All sizes below are CSS pixels. This is a real Chromium browser with simulated
safe-area custom properties, NOT a physical iPhone or native WebKit test.

393 × 852, safe top 59 / bottom 34:

| Measurement | Before (36b7e29 CSS) | After |
| --- | ---: | ---: |
| Header bottom | 114 | 114 |
| Paper top | 166 | 142 |
| Paper width | 363.11 | 363.11 |
| Paper height | 533.99 | 533.99 |
| Header-to-paper gap | 52 | 28 |
| Paper-to-deck gap | 4.41 | 28.41 |

Ready and active both measured paper x14.84 / y142 / w363.11 / h533.99 with
the simulated insets. In the direct browser flow without insets, Ready -> Begin
retained x8 / y118.86 / w377.59 / h555.28 exactly. Sample data was isolated on
localhost, separate from the user's 127.0.0.1 workspace and the hosted site.

Navigation away from the question and Return was exercised at phone width:
one visible Return button, 44px high, entirely within the existing header;
the paper's complete bounding rectangle was unchanged. The original desktop
Return button had a zero-size hidden rectangle in portrait. Both dark and light
presentations were inspected. Page navigation stayed within the paper's top
margin, above the Quran text.

The 320 × 568 frame with deliberately large 59/34 simulated insets retained its
existing 170 × 250 paper, now centred with 28px top clearance. This verifies
containment and stability, not that this extreme size provides ideal readability.
At 320px, the Return label was shortened to keep the destination number visible:
its measured text width and available width both fit at 92px. The participant
name may ellipsize, as it already does in the normal header. Return was activated
successfully at this width.

Protected 1024 × 768, 1280 × 800, 1400 × 900 and 852 × 393 landscape frames:
baseline/current CSS screenshot comparisons showed zero changed application
pixels. The baseline stylesheet was copied from the pre-edit checkout. Each pair
used the same sample state, page, theme and frame; only the stylesheet changed.
Harness controls were excluded. Screenshots use the browser's capture scaling,
not a claim of physical-device pixel density.
The mobile positive-control comparison changed 113,362 captured pixels, confirming
that the stylesheet swap was effective rather than a false zero-difference check.

Evidence files are local under outputs/mobile-sizing-qa-20260905; do not publish
the harness, sample data or screenshots as application assets.

## Validation and remaining gates

- 357 existing tests pass; the old source guard requiring the empty row was
  updated to protect the new header placement and original visibility condition.
- Production build passes, with the existing large-bundle warning.
- No changes to scoring, ledger, notes, Finish validation, exports, question
  data, font assets or persisted formats.
- Physical iOS Safari/installed-PWA review and explicit user visual acceptance
  remain outstanding. No claim that the complete device matrix is finished.

Confidence: practicality 94/100; architecture/data safety 98/100;
visual certainty 85/100 for tested browser frames, pending iPhone acceptance.
