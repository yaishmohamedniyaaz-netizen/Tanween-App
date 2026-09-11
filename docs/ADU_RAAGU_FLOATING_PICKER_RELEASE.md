# Floating Adu / Raagu picker release

Owner approved committing, pushing and publishing the locally accepted fixes
on 11 September 2026. Number-grid work is excluded.

- Review uses one floating ruler surface inside the native dialog, without
  nested boxes or inline height expansion.
- Step buttons use the approved floating minus/value/plus tray, configured
  increment, disabled limits and Done action. Opening does not widen the table.
- Review matches the main phone control at 78 x 44px and desktop at 64 x 44px,
  retaining the smaller desktop visible face. Main deductions are centred.
- Scoring controller, required-mark validation, saved data, Quran presentation
  and the two existing input preferences are retained.

Validation: full suite 381 passed, one existing skip; final focused suite 52
passed; production build passed with the existing chunk-size warning.
Real-browser checks covered desktop 1280 x 720, phone 390 x 844 and dark
landscape 844 x 390. Opening the stepper retained dialog height and columns;
adjustments measured 44 x 44px. Explicit zero, half steps, maximum, repeated
invalid Save recovery, Done, picker-first Escape and modal focus were checked.
No recitation was saved during QA. Physical-phone/PWA acceptance is separate.

Confidence: practicality 96, architecture/data safety 95, visual certainty 90.
The owner accepted the local result. Grid prototypes, grid planning documents
and the unrelated offline-app test edit are outside this release.
