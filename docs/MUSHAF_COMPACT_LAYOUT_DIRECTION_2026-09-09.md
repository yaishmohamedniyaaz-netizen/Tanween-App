# Compact Mushaf shell: short planning pass

Follow-up: the three isolated alternatives and measured trade-offs are now available in [compact alternatives results](./MUSHAF_COMPACT_ALTERNATIVES_2026-09-09.md). The planning record below describes the preceding inspection, not the latest implementation status.

2026-09-09. Owner feedback supersedes the previous bottom-metadata proposal. Revision 3 is not visually accepted. This pass inspects the current rendering and records direction; it changes no UI, zoom behavior, page artwork or word geometry.

## Observations

A fresh Chromium inspection of pages 50–51 at 1400×900 confirms the imbalance. The image starts only 1 CSS pixel inside the sheet's top boundary (the border, with no shell padding); the source surah heading therefore sits conspicuously close to that edge. The top corner radius is 3px, versus 9px at the bottom. The entire desktop metadata footer is 64px high and the central selector housing is 196×64px. Its own outline, shadow, large rounded cap and visible “Pages” label make it read as an extra panel.

Screenshot: `outputs/mushaf-bounded-proof-2026-09-09/compact-planning-before.png`. These measurements diagnose the shell, not a fault in the source Quran artwork. The exact user's browser viewport was not inspected.

## Direction now agreed

- Retain centered pages, current paper color, unchanged artwork and the previous compact selector's number/range, arrows and interaction as the reference.
- Remove surah/juz metadata from the default footer; retain the ability to add optional metadata later without reserving an empty tall band now. Keep modest page numerals where they clarify each page of the spread, but omit redundant words such as “Page”/“Pages.” Accessible names remain available without visible labels.
- Replace the large footer/housing with a small control and a subtle rounded connection at the inner page edges. The seam should be softened, not concealed with another oversized pill.
- Add a modest, consistent outer inset above the artwork and slightly rounder top corners. Evaluate surah-opening pages specifically. Do not crop a surah banner, bend the image, change interline spacing or individually reposition glyphs. Check the artwork and its hit layer as one surface whenever padding is later implemented.
- Freeze zoom exactly as it is. Do not add desktop zoom requirements, revise the mobile slider, or expand pinch/landscape work in this compact-shell phase.

## Three directions for the next visual comparison

1. **Previous compact selector with rounded joins:** keep the old control's visual density; add small curved transitions where its paper-colored backing meets the two inner page corners. Leading candidate because it changes the least.
2. **Slim integrated bridge:** one shallow connection across the gap, with arrows and the number/range embedded directly, minimal outline and no separate shadow.
3. **No filled bridge:** retain two subtly rounded page bottoms; place the compact selector directly in the background gap beneath the seam. Use as a control to test whether any connecting decoration is actually useful.

Do not settle dimensions or pick a winner from prose. Compare all three with identical page scale, viewport, paper color and Quran content; then compare final Fit to measure whether reclaimed footer height benefits reading. Start with a surah-opening page (50), an ordinary dense page (576), and a multi-surah page (604). Use 2 for the unusual opening-page whitespace if a candidate needs further checking.

## Research and review brief

Use the project's design grammar: the Mushaf receives the space, each control has one home, and decoration must not compete with judging. Consult established minimal-interface guidance and pointer-target guidance. Visually smaller controls must retain usable, non-overlapping hit areas and visible keyboard focus; invisible hit padding must not intrude into selectable Quran text. W3C's 24×24 CSS-pixel AA target minimum (with exceptions) is a floor, not an instruction to shrink every control to 24px. Preserve appropriate existing touch accommodations.

For the next phase, inspect the original PageNav component and live resolved styles, research relevant compact document-reader/navigation patterns, and create three bounded alternatives for side-by-side visual judgment. Score crowding near surah headings, footer area, seam continuity, text size, readability of page numbers, and control reachability. Do not broaden into a whole app redesign. Word-boundary validation remains a separate unresolved production gate, not something this visual pass has solved.

Sources: [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum), [NN/g aesthetic and minimalist design](https://www.nngroup.com/articles/aesthetic-minimalist-design/), plus the local `docs/DESIGN_GRAMMAR.md`. NN/g supports removing information that competes with the primary task; it does not prescribe a particular bridge shape or corner radius. No new implementation or acceptance tests were run; only current-state inspection.

Confidence in this direction: practicality **94/100**, architecture/data safety **95/100**, visual certainty **76/100**. The direction is actionable for research/prototyping; no proposed bridge shape has been visually accepted.
