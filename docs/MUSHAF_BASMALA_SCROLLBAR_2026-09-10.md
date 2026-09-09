# Selected openings and scrollbar side

The fixed surface now consults existing range line classes before fading the
gap that contains a surah opening and its unnumbered bismillah. If the bismillah
belongs to the question, the opening stays clear; context openings still fade.
This uses existing source coordinates and range semantics without adding
selectable targets or modifying any Quran package files.

Desktop mistakes/current-history scrollers now follow the scorecard side:
left rail sets scroller RTL and restores child LTR, with padding mirrored.
Right rail and mobile retain their existing native direction. Explicit Arabic
direction inside rows remains unchanged.

Bounded browser check: page 604 range starting at 112:1 and crossing into 113:1,
desktop and compact, both themes. Selected openings clear; 114 opening faded.
Selected/context markers inspected without a clearly reproduced half-fade;
marker geometry intentionally unchanged. No exhaustive all-page pixel audit.
Results and screenshots in outputs/theme-word-nav. Production build and 16
question-evidence/fixed-page tests passed. No commit or publication.

Confidence: practicality 95/100, data safety 96/100, visual certainty 90/100.
The reported intermittent marker edge remains unconfirmed, not claimed fixed.
