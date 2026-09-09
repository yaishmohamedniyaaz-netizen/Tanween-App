# Theme transition and mistakes scrollbar check

The page inherited a background-color transition while the source image filter
and context washes changed immediately. Removed the transition only from the
fixed-artwork page so these layers update together; other UI transitions remain.
No geometry, theme preference, saved finding or scrolling contract changed.

Chromium sampled 20 frames per viewport (1400 and 390 pixels), alternating light
and dark four times. Page paper and context wash colors matched on every frame,
and the page transition duration remained zero. Build passed. Evidence:
outputs/theme-transition/results.json and build.txt.

A disposable long-list visual comparison moved the native scrollbar left with
RTL on the scroller and LTR restored on rows. It introduced an outer gutter that
pushed cards away from the heading alignment. This is a visual judgment, not a
universal prohibition on left scrollbars. Kept the current right-side scrollbar;
no scrollbar production change. Trial screenshots use cloned DOM rows, not extra
saved findings. Current platform guidance emphasizes native scroll behavior and
not obscuring interactive content:
https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/scroll-controls

Local only; no commit or publication. Confidence for the theme correction:
practicality 98/100, data safety 98/100, visual certainty 92/100. Scrollbar-side
recommendation visual confidence 80/100; the owner's preference can still differ.

Owner follow-up: selector visuals reduced to 30px on desktop and 24px on compact screens (44px mobile touch targets retained). Increased selector-to-page gap from 2px to 8px and reserved navigation height from 38px to 44px. Desktop/mobile light/dark checks rerun and screenshots inspected in outputs/theme-word-nav/.
