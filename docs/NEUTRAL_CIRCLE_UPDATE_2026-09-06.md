# Attached neutral count circle

Supersedes plain-count collision suppression at the user's request.

- A neutral circle attaches to the word's top-right corner, independent of its width or line position. No stacking, criterion colour, extra panel or size-based hiding.
- Two or more findings only. Single-digit circle12px with9px numeral; multi-digit circles grow minimally while remaining circular. The smaller type is explicitly requested for this indicator; marking targets retain their existing size.
- Removed reserved slots, word/ornament collision suppression and the associated extra geometry collection. Existing word measurement provides the anchor. This restores corner attachment, not an exhaustive guarantee of glyph clearance across all pages.
- Same judge-scoped distinct finding count; same click forwarding to source word. Hover previews and held-pointer marking retained.

Verification:375 tests and build passed, diff check passed. Isolated Chromium checks at1400x900,1280x720,946x698,390x844,320x568 each showed all five multiple-finding test words, including short words and later lines, with no single-finding indicators. Word selection from the circle, hover preview, add, recategorise, short-hold cancellation and undo passed. Desktop/narrow screenshots inspected. Evidence:outputs/neutral-circle; harness:tmp/neutral-circle-qa.mjs. No physical device or whole-corpus visual certification.

Confidence: practicality 95/100; data safety 97/100; visual certainty 90/100 for the reviewed design. The user accepted this version for pushing on 6 September 2026. This record covers the approved circle and hover changes only; segmentation remains a separate planning task. Publication is separate from this Git release.
