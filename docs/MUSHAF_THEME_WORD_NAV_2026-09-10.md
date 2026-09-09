# Theme, separate word highlights and top navigation

Implemented locally at the owner's request. Retained fixed artwork proportions,
semantic identities, full touch targets and focus fading. Reused theme paper
tokens for the surface and fade washes; dark mode filters only the source ink
image, leaving marking colors independent. No new image download is needed.

Removed square connected highlight painting: marks and hover washes have 1.5
reference-pixel side insets and 3px corners. Fixed-artwork context shading now
uses one inset rectangle per word instead of merged ayah segments. Word hit
areas remain unchanged. The existing compact selector moves above the pages
with the same reserved height and 2px gap. The legacy renderer is untouched.

Chromium checks passed at 1400x900 and 390x900 in light and dark modes, including
two adjacent real findings, context shading, top-nav clearance and horizontal
overflow. Screenshots inspected. Evidence: outputs/theme-word-nav/results.json.
Production build and 22 scoped tests passed. No commit, push or publication.
Confidence: practicality 96/100; data safety 96/100; visual certainty 91/100.
Real-device and owner visual acceptance remain distinct from browser checks.
