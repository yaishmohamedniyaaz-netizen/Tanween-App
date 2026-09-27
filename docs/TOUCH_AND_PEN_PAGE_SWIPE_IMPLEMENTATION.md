# Tanween touch and pen page swiping

Date: 26 September 2026.

## Continuous-motion revision (approved for release)

The owner rejected the released motion because it waited for release to change
pages. The local revision replaces the 40px nudge and separate entrance with a
continuous strip: the outgoing view and decoded adjacent view follow touch or
pen at 1:1 displacement, including reversal while held. Release settles from
that exact position; the live judging view takes over at the same geometry.

Retained: Quran artwork, page sizing, shading, annotations, scoring, word-start
ownership, navigation controls and input exclusions. Recomposed: page motion.
Removed: capped movement and the second entrance animation.

Adjacent presentations reuse the bounded decoded resource owners and are warmed
before contact. They are inert and omit marking targets, navigation listeners,
and header-control rendering (including external portals). One live view owns
all judging. No extra artwork cache or persistence schema was introduced.
Resize clears retained overlay dimensions. Mobile Fit centers the rendered
width, not the unscaled artwork reference box's scroll extent.

Validation: 30 focused tests; full suite 428 passed, one optional skip; production
build; held touch/pen movement, reversal and handover within 1.1px at seven widths
from 320 to 1400; prepared-screen handover; cancellation, rotation, repeated
turns, mouse exclusion, zoom/pan, load recovery, marking and persistence.
Five settled light/dark screenshot comparisons match the baseline exactly.
Four printed-Bismillah browser cases pass correction, reload and backup checks.

Motion review: <http://127.0.0.1:5320/outputs/swipe-qa/review.html>.
Evidence: `outputs/swipe-qa/continuous-*`, `browser-results.json`, and
`visual-regression.json`. The recordings show held contact with an orange dot,
reversal, touch forward, pen backward and a cancelled short drag.

On 27 September 2026 the owner approved the preview and requested publication
after committing. The deployment record identifies the final commit and version.
Physical iPad/Pencil, Safari,
palm handling and installed-PWA feel remain unverified. Unavailable neighbors
retain the coherent loading fallback; no blank page is exposed. Word-start
delay remains deferred. Confidence: practicality 90/100, architecture/data
safety 94/100, visual certainty 85/100; owner motion approval is recorded above.

## Version 139 history (superseded motion)

Status: implemented and browser-verified. On 26 September 2026, after reviewing
the local preview, the owner explicitly requested "commit publish". Release is
authorized with physical-device acceptance still unverified. The deployment
record identifies the final published commit and version.

## Source and isolation

Branch: `codex/touch-pen-page-swipe`, in `.worktrees/touch-pen-page-swipe`.
Base: `3dfb0cb526087438eb299c9ef3202266a9acb2cc` (printed Bismillah release).
The original working directory and its unrelated changes were preserved.

The release branch was checked against the remote. The hosted application was
also compared with a clean baseline build: CSS matched, and the main JavaScript
matched after normalizing imported chunk filenames. The XLSX chunk hash differed;
this is not a claim of byte-identical full-build provenance. No dependencies or
lockfile were changed in this feature.

## Interaction delivered

- `touch` and `pen` contacts can turn the main Mushaf at every responsive width.
  Mouse, trackpad cursor dragging, and unknown pointer types do not gain swiping.
- Start on blank paper, gaps outside the complete word targets, or the stage
  margin. Existing word regions, printed Bismillah, and attached mistake markers
  keep marking ownership. Moving across text after a background start cannot mark.
- Right moves forward; left moves back. Compact/single views move one page;
  spreads move two. Existing page buttons, entry, and keyboard navigation remain.
- Intent locks after 12 CSS pixels with horizontal displacement at least 1.5
  times vertical displacement. Release needs `clamp(48, 12% of stage width, 96)`
  pixels and the same directional dominance. One release requests at most one
  view; there is no speed shortcut or navigation queue.
- The complete page/spread follows gently, capped at 40 pixels. Incomplete
  gestures settle over 160 ms; a ready destination enters over 200 ms. Reduced
  motion uses an immediate coherent swap. Words cannot be marked during motion.
- Native vertical scrolling and pinch zoom remain available. When the page
  overflows horizontally, or the browser is already pinch-zoomed, native panning
  owns the gesture. There is no automatic pan-to-page-turn handoff at an edge.
- A second reported contact, cancellation, unexpected capture loss, blur,
  hidden document, Escape, scroll takeover, view change, or resize cancels the
  gesture. A pen plus a reported palm/finger is conservatively cancelled.
- An open marking tray consumes the first blank-area contact as dismissal.
  Controls and dialogs retain their interaction. A later fresh contact can swipe.
- The current coherent page stays visible while a destination loads. Pending
  navigation disables marking and offers Retry on failure and Stay on this page.

The hold-to-mark delay and swipes that begin on a word remain deferred.

## Architecture and preservation

The pure `mushafPageGesture` controller has no judging writer. One stage-level
hook handles ownership and motion, using pointer identity and the current view
generation. Movement updates one composition transform through animation frames;
it does not update React state on every pointer move. Listeners are attached once
per mounted fixed-Mushaf stage and cleaned up on unmount or disabling the feature.

Marking and swiping share `wordAtPoint`, including the marker's extended area.
Navigation uses the existing `moveMushafView` and page-change callback. Tablets
now reuse the existing ready-view owner instead of dropping the rendered page
during loading. Ownership remains bounded to three single-page resources on the
calibrated phone route, or three views/up to six page resources elsewhere; no
second decoded-image cache or duplicate live judging surface was added.

Rotation testing found a stale native panning policy between the fit commit and
ResizeObserver delivery. The policy now refreshes in the layout commit. Temporary
slide overflow is ignored when deciding whether the user has enlarged the page.

Retained: Quran artwork/identities, scoring, evidence, saved-data formats, device
preferences, letter tray, page controls, score rail, and compact dock.
Recomposed: background gesture ownership, ready-page coordination, and page motion.
Removed: no controls or existing input methods. The page-first layout and
deliberate-release behavior follow `DESIGN_GRAMMAR.md`.

## Verification

| Check | Result |
| --- | --- |
| Full `npm test` | 428 passed, 1 existing optional Tilawa-assets skip, 0 failures |
| `npm run test:page-swipe` | 28 passed: intent/cancellation plus ready-page and ready-view ownership |
| `npm run test:fixed-mushaf` | 14 passed |
| `npm run test:mobile-calibration` | 20 passed |
| TypeScript and production build | Passed; existing large-chunk warning remains |
| Native browser touch/pen checks | Passed at 320x568, 390x844, 430x932, 768x1024, 1024x768, 1180x820, 1400x900 |
| Settled screenshot comparison with base | Exact PNG match for 390/768/1024 light and 390/1024 dark |
| Printed Bismillah browser regression | Passed on desktop/phone, pages 2/585/604, including correction, undo, reload, separate opening phrase, completed backup |

The swipe browser suite covers both directions/types, mouse exclusion, word
ownership, evidence equality, marking/correction/reload, reduced motion,
boundaries, dark theme/opposite rail, actual enlarged-page horizontal panning,
load failure/return/retry path, mixed pen/touch, capture loss, rotation during
contact, 12 consecutive forward/back turns, and prepared-recital navigation.
The rotation check uses a fresh gesture immediately after layout readiness;
no artificial settle delay was added to hide the failure.

Browser input is Chromium CDP touch/pen emulation in fresh test contexts. It is
not physical iPad, Apple Pencil, Safari, Android, Windows pen, or installed-PWA
acceptance. Screenshots establish settled appearance, not perceived smoothness.
No hardware frame-rate, memory, battery, or recording-continuity claim is made.
Existing resource-owner tests establish ownership bounds, not browser memory use.

Evidence lives in `outputs/swipe-qa/`: `browser-results.json`, `browser-tests.log`,
`visual-regression.json`, `full-tests.log`, `focused-tests.log`, `build.log`,
`printed-basmala-regression.log`, screenshots and two motion recordings.
The complete regression suite was rerun after the rotation fix; the final
focused suite, complete browser suite, TypeScript, and build also cover it.

## Review and release gates

Local review: <http://127.0.0.1:5346/outputs/swipe-qa/review.html>.
The recordings show finger-forward, pen-back, and a short non-turning gesture.
The linked interactive sample uses a separate local origin from earlier previews.
The local address is available on this computer only.

Physical follow-up: check a real phone and iPad/Pencil for comfortable start
regions, direction, palm contact,
pinch/pan, rotation, browser-edge gestures, and immediate deliberate marking after
turns. Check installed-PWA and ongoing recording where used. If ordinary palm
contact cancels Pencil navigation, revisit the mixed-contact policy explicitly.
Keep the word-start delay as a separate decision after this slice is assessed.

The owner authorized release before physical acceptance: scoped validation,
final diff review, commit, push, publish, and hosted verification in that order. Do not silently
merge the separate main-branch security work or the original dirty directory.

Confidence: practicality **90/100** (device comfort still pending), architecture
and data safety **94/100** (bounded owners and no evidence changes in regression),
visual certainty **85/100** (browser layout/motion reviewed and release approved;
physical feel still unverified). These are judgments, not test coverage percentages.
