# Approved judging continuity release

Includes the approved setup disclosure, return navigation, and preview loading
fixes in `4005574`, plus the following approved judging changes:

- Begin judging retains the prepared Mushaf page, pan, and scale.
- Review stays open during recording finalization, prevents duplicate saves,
  and hands off to the next reciter inside the same native modal.
- Reciter selection and question drawing keep a stable heading, restore queue
  scroll and focus, and respect reduced motion. Storage recovery remains visible.
- The Review and save Adu / Raagu picker matches the main scorecard: 80px
  width, 44px touch area, 28px visible border, centered decimal values.

Religious text, scoring rules, finalized evidence, storage formats, and device
preferences retain their existing contracts. QA uses isolated synthetic sessions.

## Validation

- Production build passed, including TypeScript and the Quran index check
  (6,236 ayahs against 8,820 recitation lines). Existing bundle-size warning remains.
- Full suite: 436 passed, one skipped, zero failed.
- Begin continuity: 18 browser cases and focused navigation/scale checks passed.
- Save handoff: 28 browser cases plus two finalization-error/retry cases passed.
- Queue: 20 viewport/motion cases, eight edge cases, and two embedded cases passed;
  heading drift and scaled frames were zero. Actual numbered-question flow checked.
- Review mark box: 42 values across ruler/stepper modes and 1191px, 390px, 320px
  viewports; matches main geometry, retains touch area and keyboard adjustment.
- User approved desktop/mobile previews before authorizing commit and publication.

Browser evidence is retained locally under `outputs/begin-continuity-fix/`,
`outputs/save-handoff-fix/`, `outputs/queue-motion-focus-fix/`, and
`outputs/review-mark-box/`. Screenshots and transient reports are excluded from
the release commit. Physical-device Safari and stylus behavior were not rechecked
in this visual-only slice.

Confidence: practicality 98/100; architecture/data safety 98/100;
visual certainty 95/100, based on approved desktop and compact browser previews.
