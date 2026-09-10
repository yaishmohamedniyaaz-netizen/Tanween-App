# Fixed Mushaf + results/replay integration

Base: 55d05904309df5b6e9a6cba79d7fc6a4d7c89188.
Branch: codex/fixed-mushaf-replay-integration.
Source: results-overview 9f57ca4 plus its existing uncommitted Slice B files.
Both source worktrees were left untouched. No merge commit, push or publication.

## First pass

Imported only results/replay components, helpers, scoped styles and tests.
App keeps the fixed live renderer and now passes the existing page preference to
Results. RecitationEvidenceSpan combines the fixed artwork loader/retry behavior
with saved-word selection and passage-window navigation. One shared window decides
which artwork pages load and display. Fixed review follows the renderer's 900px
compact breakpoint and actual aspect ratio. A marked-word tap invokes one route,
not both finding and replay handlers. Focus waits for the rendered target and runs
once per explicit finding request, allowing subsequent manual browsing.

Unchanged from base: offline pipeline/assets, live scorecard styles, preference
format/default, recorder hook, audio vault, scoring, reducer and saved types.
The replay-mode UI still requires ?wordReplayPrototype=1; no automatic promotion.

## Checks

Main base suite: 380 passed, 1 optional asset skip. Added results/workspace/choice/
navigation suites: 32 passed. Replay navigation suite: 18 passed. Fixed Mushaf
package/geometry suite: 11 passed. Integration contracts: 3 passed. Final production
build and diff check passed after ratio/layout changes; existing bundle warning only.

In-app Chromium: 1280x800 shows two fixed-artwork pages in participant review;
393x852 shows one, Next reaches page 604. Marked-word tap starts synthetic audio
at 0.5 seconds then reaches the recording end. This is interaction evidence, not
real Quran alignment accuracy. Fresh sample-only fixture uses port 5207 with all
sample/session/history guards retained. Port 5206 had pre-existing browser data;
it was not cleared or replaced.

## Next pass / not complete

- Analysis removal and inline Add reason are implemented; see the second pass below.
- Full multi-page, repeated finding focus, no-audio, changed-source and lifecycle
  tests on the integrated renderer; dark mode, remaining breakpoints and iPhone.
- Bring any missing behavioral regression tests into the combined default test
  command; do not copy scorecard-specific expectations that conflict with base.
- User visual approval, remote reconciliation and release gates remain open.

Practicality 92; data safety 91; visual certainty 80. Browser spot checks are not
final visual acceptance, physical Safari/PWA acceptance or full offline proof.

## Second pass: Analysis removal and inline reasons

Removed the redundant Review/Analysis tabs and the Analysis panel. Results,
judge-history filters, imports and exports remain. No scoring or saved-data
format changes. The slim desktop reason editor now uses the existing inline
editor and note-saving action; standard mode retains its existing input.
Desktop-only reason styles are isolated in scorePanelReason.css.

Validation: main suite 380 passed / one optional asset skip; the six added
integration/results/replay suites passed 53 tests. Updated obsolete tests that
required the removed Analysis screen or separate desktop reason dialog.
Browser spot checks covered Results at 393x852 and the inline reason at
1280x800 in light and dark modes. Saving and reopening retained the test note;
the editor was inside the scorecard, not a dialog. Opening it left page 308's
bounding rectangle exactly unchanged. The test note was subsequently cleared
using Done. All interactions used the disposable port-5207 sample fixture.

Remaining: broader integrated replay lifecycle/device checks and user visual
approval. Not committed, pushed or published. Confidence: practicality 93,
architecture/data safety 92, visual certainty 82; no physical iPhone claim.
