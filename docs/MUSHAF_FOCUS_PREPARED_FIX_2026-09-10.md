# Context artwork and prepared recording spacing

Local fixes requested after the offline/default checkpoint:

- Fade mode now covers artwork outside all word-row bands, including surah
  ornaments and unnumbered bismillahs. The existing 65% paper wash, source
  coordinates and opening-page offset are reused. Selected word areas are never
  covered by these extra regions. Numbered Quran words (including Al-Fatiha's
  bismillah) retain ordinary question selection behavior. Focus off leaves the
  artwork untouched.
- Removed a stray `+` before the recording CSS comment that invalidated the
  base card selector. Restored its intended padding, border and 12px bottom
  margin; disabled flex shrinking on the card. Retained the compact mobile row
  and existing recording and judging actions.

Verified in Chromium at 1400x900, 1400x650, 390x844 and 390x650 with pages 604,
2 and 1. Screenshots inspected; no recording/button overlap, no horizontal
overflow, no decoration wash crossing a word region, and focus off restores
the decoration. Results: `outputs/focus-prepared/results.json`. The disposable
QA fixture first starts a session before preparing, because restored prepared
state correctly requires a live competition.

Production build and 29 scoped tests passed. The local compiled preview on
port 5302 was restarted. Existing service-worker windows must close to apply
the waiting update. No commit, push or publication. Native phones not tested.

Confidence: practicality 97/100, architecture/data safety 96/100, visual
certainty 92/100. Browser evidence is not owner visual approval.
