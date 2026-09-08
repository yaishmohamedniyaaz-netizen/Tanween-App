# Judging spacing patch — 2026-09-08

Base: `3ba8f85e4d8ba385b58d39c1d0a5c72db5d990f7`, branch `codex/results-overview-first`.

## Scope

- Restore the prepared recording container's intended padding and 12px separation from Begin. A stray `+` before its CSS comment invalidated the selector.
- Enlarge only the live Adu/Raagu border: desktop 56×26 to 64×30px. Preserve number typography, placement, and 44px button height.
- Give Finish scores a common right edge and denominator size. Use a 28px visible border inside the unchanged 44px picker hit target.
- No scoring, saved preferences, recording logic, Mushaf geometry, results, or Analysis changes.

## Evidence

- Full suite: 414 passed, one skipped (local Tilawa release assets unavailable).
- Production build and diff whitespace check passed; existing Vite chunk-size warning remains.
- In-app Chromium: prepared screen checked at 1280×800 and requested 393×852 (actual CSS width 394). Desktop recording-to-Begin gap changed from 0 to 12px. Mobile prepared dock retains its existing compact overrides and does not inherit the restored desktop padding.
- Entered 17.5 using the real score input with an isolated sample competition allocating 20 Adu/Raagu marks.
- Finish visually inspected at 1024×768, 1280×800, 1400×900, approximately 393×852, and 852×393 landscape. Landscape retains internal scrolling with footer actions visible.
- Light and dark Finish checked. All four score numerals end at the same measured x coordinate (324.75px in compact view) after matching denominator typography; score font remains 14.5px.
- Finish ruler opens and Escape closes it. Keep judging returns to the live session.

Dev fixture: `/scripts/qa/judging-spacing.html` on 127.0.0.1:5204. Explicit sample-only load; not a production entry point. It intentionally uses a 110-point sample total to test 17.5 without changing other criterion allocations.

Physical iOS/PWA acceptance and user visual approval remain pending. Nothing committed or published in this pass.

An unrelated pre-existing stray `+` before the results-review CSS comment remains untouched; it is outside this patch.

## Follow-up: Finish picker, first slice

User rejected the fixed-width Finish field and whole-dialog growth. The field now uses content width with symmetric 8px padding and a 44px minimum hit target. The ruler is an anchored overlay, not a new layout row; its duplicate outer surface is removed. Only opacity animates (120ms), disabled for reduced motion. Short windows (500px high or below) anchor the ruler within the dialog instead of behind the scrolling body/footer.

Measured compact dialog before and after opening: x17, y207.9375, width359.6, height436.125 in both states. Visually checked compact portrait, desktop and short landscape. The short-landscape clipping found during QA was corrected and rechecked. Existing scoring and gesture code is unchanged. Physical touch/VoiceOver acceptance remains unverified.

Guidance: Apple HIG Motion (https://developer.apple.com/design/human-interface-guidelines/motion), W3C APG Slider (https://www.w3.org/WAI/ARIA/apg/patterns/slider/). Anchoring and sizing are product-specific design judgments, not prescribed dimensions from those sources.

Next separate slices, not implemented: slim live rail deduction/field spacing; full-width reason field with a small top gap; slim default only for fresh preferences, preserving explicit saved choices; More menu stacking above the page selector. User requested one-at-a-time changes.

## Follow-up: slim rail, second slice

Finish interaction approved by user before this slice. Desktop rail now uses 8px column gaps and a 40px deduction column; the Adu/Raagu field sizes to its text with symmetric 4px padding and minimum 44px hit width. Number typography and score-column center are retained. Reason controls span all columns with 12px row spacing, separating their hit target from the score control (measured 0.5px clear in slim mode). Standard inline reason input also spans the complete row.

Slim is now the default when no valid density choice exists. Explicit saved Standard and Slim values still win; storage version and format unchanged. Legacy settings without this field inherit the new default.

Full suite: 415 passed, one skipped. Browser: slim inspected at 1024×768 and 1400×900, portrait approximately 393×852 checked for desktop-rule isolation. Reason dialog opens and closes without score changes. More-menu stacking is the remaining separate slice. No commit or publication yet.
