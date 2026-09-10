# Combined replay release findings — fixes, 2026-09-10

Local changes only; not committed, pushed or published. Preserves the existing prototype flag and all recording/scoring formats.

## Resolved

1. Discard confirmation now wraps the editor in a disabled native fieldset. Save, remove, boundary edits and suggestion actions cannot be initiated behind that confirmation. Keep editing re-enables the editor. Discard has both a disabled saving state and a handler guard; the shared finish path also refuses to close while saving.
2. The dock's Word replay off state explicitly uses the surface background and ink foreground tokens, rather than inheriting a near-white browser button background in dark mode. On-state styling is retained.

## Evidence

- Added two regression wiring tests; focused replay/results/fixed-Mushaf suites: 70 passed.
- Main suite: 380 passed, one optional asset skip. Production build passed; existing large-bundle warning remains. Diff whitespace check passed.
- In-app Chromium, existing disposable sample: selected 109.1.0, edited start to 0.25, requested Close. Save matched `:disabled`; editor fieldset was disabled; focus was on Keep editing. Keep editing restored Save availability. Escape and Discard closed without saving the test edit.
- At 320x568 in dark mode, Word replay off computed foreground rgb(235,235,237), background rgb(28,28,32), contrast 14.27:1. Visually inspected readable label and compact dock.
- Saving-state handler guards are source-tested; no deliberately delayed real persistence operation was injected into the sample. Native iPhone/PWA and VoiceOver acceptance remain outstanding.

These resolve the two findings from the combined release check, not every remaining physical-device acceptance item. Publication should retain an explicit prototype URL unless default activation is separately requested.
