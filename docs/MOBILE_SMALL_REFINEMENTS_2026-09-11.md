# Approved mobile refinements

Owner approved commit and publication after browser review, 11 September 2026.

- Page selector: three separate rounded faces, 36px / 52px / 36px widths with 6px gaps. Preserves 28px visible height and 37px tap height. This explicitly retains the owner's height choice rather than claiming 44x44 touch compliance. Portrait-only styling; no page-fit height changes.
- Mistake expiry line: full to empty, anchored left, in the category colour at 40% opacity. Existing five-second deadline, reduced-motion handling and Undo remain unchanged.
- Review and save: numeric headings and values share column centres; desktop columns sit closer to the criterion labels. Adu / Raagu uses the scorecard's centred value presentation and 12px denominator styling. Opening the stepper reserves its column for the whole table rather than shifting just one row.

Validation: 19 mobile-calibration tests passed after selector changes; 58 Adu/Raagu, judging-workspace and mobile-deck tests passed after review alignment changes. Production build passed (existing bundle-size warning). Browser checks covered selector appearance and jump popup at 390px, desktop selector exclusion, countdown colours/direction/expiry, and review at 390px, 1280px and 320px. The narrow review body had no horizontal overflow; opening the ruler did not change marks. Owner reviewed the local result. Physical-phone acceptance remains distinct from browser viewport checks.

No scoring, records, artwork, preference schema or service-worker lifecycle changes. Prior unrelated offline QA edits and generated local comparison artifacts are excluded from this commit.

Confidence: practicality 96/100, architecture/data safety 98/100, visual certainty 90/100 after browser and owner review; this is not native-device certification.
