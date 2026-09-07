# Results refinement checkpoint

Local, uncommitted follow-up to the published results overview. No scoring,
saved evidence, export formats, or device preference formats changed.

## Implemented

- Pass the existing Mushaf layout preference from App to the review workspace.
- Desktop dual view shows two verified passage pages in right-to-left order.
  Hide Quran page navigation when the visible group contains the whole passage;
  longer passages retain navigation by spread. Mobile keeps one-page navigation.
- At 761–1279px, place findings below the spread rather than squeezing pages.
  Selecting a word brings its inspector into view. At 1280px and above, retain
  the side inspector. No changes to the live Mushaf component.
- Score details stay optional and close on outside pointer interaction, Escape,
  the summary toggle or the explicit Close button. Inside interactions are not
  dismissed. Switching to Analysis closes an open score disclosure.
- Numbered result pages include the active page, endpoints and gaps for long
  lists. Controls wrap on small screens instead of overflowing.
- Search, filter and division selector share a measured 48px height and top edge.

## Browser evidence

- 1280x800: two pages visible, no redundant pager; page 603 on the right and 604
  on the left after correcting inherited explicit grid-column placement.
- 1024x768: findings below the spread; no horizontal overflow.
- 1400x900 dark: selection on page 604 updates the inspector correctly.
- 393x852: one page visible and page navigation retained; outside tap and Escape
  both close score details, with Escape returning focus to the summary.
- Changed the saved layout through the normal Full page / Two pages controls;
  desktop review followed the preference. Restored Two pages after testing.
- Jumped directly between result pages 1 and 3. At 320x740 all page controls
  remained reachable, with no horizontal overflow.
- Results heading shares the same outer left edge in list and participant views;
  no speculative global heading offset was added.

## Remaining / limitations

- The requested actual-letter change is deferred until the user identifies the
  exact "arrow card". Do not replace an unrelated count or guess a Quran letter.
- Long and odd-ended passage groups are covered by unit tests, not yet a
  multi-spread real-recitation browser fixture. Physical iOS/PWA acceptance and
  user visual approval remain outstanding.
- Four new navigation tests; full suite: 413 tests, 412 pass, one existing skip.

Confidence: practicality 93/100; architecture/data safety 94/100;
visual certainty 83/100 pending user and real-device acceptance.
