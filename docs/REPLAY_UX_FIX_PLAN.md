# Replay UX correction plan

Status: planning and current-version audit only, 2026-09-10. No application edits
in this pass. This is an addendum to WORD_FIRST_REPLAY_IMPLEMENTATION_PLAN.md;
its historical source findings are not a description of today's implementation.

## Non-negotiable listening contract

A printed kalima is an audio navigation anchor, not a clip. One eligible saved
word position starts at max(0, onset - 0.5 seconds), and playback continues past
the word and ayah until paused, redirected, interrupted or the recording ends.
Verified consecutive parts may continue within the same source; an unavailable
part stops continuation with an explanation. Never silently skip gaps or switch
participant/judge audio. Lead-in cannot recover sound absent from the recording.

The existing specialist interval audition may remain in timing correction only,
explicitly labelled as a short interval preview. Its repeat/end-boundary behavior
must never leak into normal word-tap playback. No mandatory word review and no
correct/incorrect recitation coloring. Saved timing is not a pronunciation verdict.

## Current-version evidence

Audited the integration worktree based on 55d0590, using its existing server at
127.0.0.1:5207/?wordReplayPrototype=1. Used only the disposable sample competition.
Did not reset or reseed it, record a microphone, or save timing/score changes.
The older port-5205 replay branch is not the integration being assessed.

| Check | Evidence | Interpretation |
| --- | --- | --- |
| Saved first word | Fixture onset 1.0s/end 1.5s; tap sought 0.5s; audio subsequently reached 4.0s and ended | Continuous playback past the word works for this fixture |
| Pause/resume | Pause after word tap left media paused at 0.5s; Play remained available | Preserve the existing explicit transport controls |
| Participant change | Changed to participant 02 after Play; new participant view had zero audio elements | Prior player unmounted; not proof of every delayed-load race |
| Repeated word | Third word offered two occurrences at 1s and 2s; choosing the second sought 1.5s | Keep explicit occurrence selection; no first/last guessing |
| Missing timing | A different word showed no saved timing and retained the main recording controls | Correct abstention, but message is verbose and remote from the word |
| No audio | Participant 02 showed recording-unavailable message | Keep the explanation; disable unavailable word replay rather than suggesting readiness |
| Keyboard seek | Home -> ArrowRight produced 0.01s; value text exposed time and duration | Accessible naming exists, but ordinary seeking is impractically fine |
| 393x852 settled portrait | Recording panel top 836.56px, height 288px, content 307px in the no-timing state | Controls are off-screen and the card scrolls inside the page |
| 375x667 settled portrait | Panel top 807.16px, height 288px | The same problem is worse on shorter phones |
| 852x393 requested landscape | Browser reported height 394px; side panel top 156.85px, height 252.2px | Side arrangement is more appropriate here than taking bottom space |
| 1280x800 | Two pages plus right recording rail; occurrence state expands the rail | Retain the basic wide arrangement, simplify its contents |
| Previous audit: 1024x768 | Panel began around 688px below the spread | This intermediate-width arrangement needs a different player home |
| Previous audit: 1400x900 | Side rail visible; advanced timing form pushed findings below the viewport | Separate listening and correction surfaces |

Measurements are CSS pixels after assets settled unless noted. Crossing the
compact breakpoint temporarily showed a loading placeholder; do not confuse
transient geometry with the settled layout. Previous-audit rows are explicitly
not fresh measurements from this pass. Physical iPhone, PWA safe areas, VoiceOver,
full offline, audio quality and real onset accuracy have not been accepted.

Focused baseline: 29 tests passed across word-replay-navigation, word-replay-choices
and fixed-replay-integration. A source assertion named "reserves phone space" does
not prove usable viewport placement; browser geometry above is the stronger check.

## Source diagnosis and ownership

- ParticipantReviewWorkspace owns selected word/finding, replay mode and source
  context. Retain that ownership. Current fixed-renderer compact boundary is 900px;
  phone styling changes at 760px and a side rail returns at 1280px. Coordinate these
  layout decisions rather than independently adding another breakpoint.
- participantReviewWorkspace.css gives the phone replay panel height:288px and
  overflow-y:auto, while the entire panel follows the full passage in document flow.
- RecitationReplayPlayer initializes playback to null and also uses null for a
  completed unavailable lookup. Split loading, unavailable and failed lookup in
  ephemeral UI state; do not change saved recording formats.
- RecitationEvidenceSpan sets aria-pressed for unmarked selected words but does
  not apply the visible selected class used by marked words. Fix selection styling
  without changing Quran word bounds or the existing category marks.
- RecitationReplayPlayer combines source selection, transport, continuous word
  navigation and interval editing. Extract presentational pieces, not a second
  audio engine. Keep its epoch/cancellation and identity checks.
- SessionRecordingPlayer and the recording vault remain the source of playback
  data. Do not duplicate audio elements for desktop/mobile or fetch/decode again
  merely because the viewport changes.

## Retain / recompose / remove

Retain: fixed artwork, one/two-page preference, Quran range, results/navigation,
score disclosure, findings and their colors, inline reasons, source identity,
original audio, timing revisions and the current continuous-play resolver.

Recompose: one player, selected-word feedback, fallback/occurrence presentation,
source details and specialist correction tools. Scope styles to participant replay.

Remove from the normal listening view: the 288px internally scrolling card,
repeated helper paragraphs, revision numbers, decimal timing inputs, duplicate
primary replay actions and the ambiguous label "Replay off".

## Layout specification to prototype first

One review shell owns the available viewport height. Inside it, one content
scroller holds the passage/findings; the compact player has a separately reserved
row when docked. It is not an overlay over the Quran and not another scrollable
card. Account for the actual header and safe areas once, not twice. Focused words
must scroll fully into the unobscured content area.

| Space available | Player placement | Page behavior |
| --- | --- | --- |
| Phone portrait | Bottom row of the review shell | Keep current width/aspect; page may scroll above player |
| Medium desktop with spread | Bottom row, provisionally through 1279px | Preserve spread; do not place player after the whole spread |
| Wide desktop | Stable side rail, same player component | Preserve two-page preference and current page geometry |
| Short landscape | Compact side rail when readable widths fit | Avoid a bottom player consuming scarce height; preserve existing page mode |

These are prototype rules, not arbitrary device detection. Validate actual content
width/height at boundary sizes (760/761, 900/901, 1279/1280), long labels and enlarged
text before locking breakpoints. Do not change live judging or its landscape rules.

Candidate portrait player: two 44px rows, 8px gap and 8px top/bottom padding = 112px
plus bottom safe area. This is a test target, not an approved fixed dimension.
Context row: selected kalima/status, labelled Word replay on/off control, More.
Transport row: Play/Pause, -3s, seek/time. At insufficient width, use a defined
expanded layout, not smaller targets or clipped Quran text. Essential actions
remain at least 44px; 14px regular labels and 12px secondary metadata use app tokens.

Normal loading/playing/paused/error transitions do not change the player's reserved
geometry. At 200% text or a software keyboard, accessibility takes priority over
the 112px target: allow the shell to reflow without clipping controls. The whole
Mushaf, header and player cannot always fit together at full size; prefer scrolling
the passage over shrinking or distorting it. Do not promise a full-page fit on all
phones. No decorative waveform or continuous attention-seeking animation.

## Interaction and wording contract

Word replay starts off for a new participant, preserving deliberate entry and
normal finding inspection. Label it "Word replay", show On/Off and expose its
state accessibly. It controls word taps, not the ordinary Play button. Disable it
with a short explanation when no usable audio is available. Turning it off pauses
and cancels pending word playback; ordinary Play remains usable afterward.

| State | Primary feedback/action | Audio policy |
| --- | --- | --- |
| Loading source | Loading recording… | No premature unavailable warning |
| Ready, no word | Play/Pause and timeline | Normal recording playback |
| Saved word | Selected kalima + Saved position | Start 0.5s earlier; continue |
| Approximate only | Selected kalima + Approximate + Preview | Require deliberate Preview; never label it exact |
| Multiple occurrences | Select occurrence; time-labelled choices | Pause prior target; selected occurrence starts continuous playback |
| Reviewed ayah fallback | Play from ayah / recorded ayah span | Explicit action; never claim word timing or a missing true ayah start |
| No timing | No saved position + recording controls | Do not guess, mark skipped, or keep unrelated old target playing |
| No audio | Recording unavailable on this device + Details | Preserve findings; do not offer working-looking controls |
| Failed preparation | Could not open replay + Retry if actionable | Stop stale target; no surprise delayed autoplay |
| End / missing next part | End of recording / Next part unavailable | Keep controls available; no automatic cross-source fallback |

Routine state feedback stays in one reserved context area. Approximate Preview
replaces that area's idle action rather than adding a paragraph/button stack.
Repetitions use a temporary choice surface opened by the word tap, with 44px rows
such as "First time · 0:01" and "Second time · 0:02". There is an explicit Close;
closing makes no seek, leaves audio paused and restores focus to the tapped word.
Never auto-dismiss a required decision after a timer. If there are many occurrences,
scroll that deliberate chooser, not the everyday player.

Source name stays visible where hiding it could misattribute audio. Put revision,
hash, recording-part details and correction controls behind More. Part-local time
must say which part it belongs to when several parts exist; no invented total clock
across unrecorded gaps. Do not switch audio because a different score source was
selected without resetting the playback context safely.

Selected-word indication is neutral, non-obscuring and consistent on marked and
unmarked words. The transport context identifies the tapped anchor, not a claim
about the exact word currently being spoken. Do not add predicted live highlighting.
In word replay mode, accessible word labels describe replay rather than inspection.

Everyday seek: propose 1s arrow-key steps, Home/End and optional 5s PageUp/PageDown;
keep sub-second precision in the explicit timing editor. Preserve native range
semantics, intelligible elapsed/duration value text and 44px interaction height.
Do not announce the ticking time on every audio event; announce meaningful status
changes without stealing focus. Validate actual VoiceOver behavior separately.

## Specialist tools: one deliberate layer

Reuse the project's suitable dialog/focus primitives after inspecting their API.
Proposed Replay tools drawer contains grouped source details and timing correction,
with the selected kalima visible, a clear Close and reliable Escape/focus return.
No nested modal stack. Occurrence choice and timing correction are mutually exclusive.
This deliberate layer may temporarily obscure part of the workspace; the persistent
player never does. Closing it restores the same page position and player geometry.

The correction surface uses the same audio owner. If modal, all controls needed
while correcting must be inside it; do not trap focus away from the only Pause
button. Opening correction pauses normal playback; closing never auto-resumes.
Move one transport presentation or share its controller, never mount a second
player. Saving retains the existing revision/conflict checks; dismissing does not
silently save edits. Changes to unsaved drafts need explicit discard handling.

## Implementation slices and gates

1. State clarity and characterization: cover loading vs unavailable, source reset,
   continued playback past word/ayah, explicit correction clips and fine/coarse
   seek semantics. Preserve baseline screenshots and record failing geometry tests.
2. Layout-only prototype behind wordReplayPrototype=1: one transport presentation,
   reserved dock/side rail, stable passage and source identity. Show 393x852,
   375x667, 852x393, 1024x768 and 1280x800. Owner visual approval before proceeding
   with broad visible work or committing. Do not silently promote the prototype.
3. Word action/feedback: mode labels, neutral selection, approximate action and
   occurrence chooser. Check 1 word tap for a unique saved position after entering
   mode; one additional deliberate action for approximate/repeated choices.
4. Tools extraction: separate source/correction UI without changing audio ownership,
   evidence, revisions or save behavior. Test Close/Escape/focus/draft protection.
5. Integrated regression and physical acceptance before release authorization.

Required matrix: 320, 375, 393 portrait widths; 852x393 landscape; 1024x768,
1280x800, 1400x900; both themes; full/spread; 200% text; reduced motion; keyboard;
long Arabic words/participant names; empty findings and many findings. Basic player
must have no internal scrolling. Verify last page line and focused word can be
fully revealed, even under the dock and around the keyboard/safe area.

Playback matrix: saved, approximate, repeated, ayah-only, no-timing, no-audio,
stale source/revision, delayed decode, failed media, rapid taps, pause while loading,
pause/resume, page navigation, participant exit, hidden/background, consecutive and
missing parts. Native delayed-play rejection must expose a usable Play action.
Check a correct audio identity, not just a moving timer. Keep physical Safari/PWA,
VoiceOver, real recordings, storage pressure and cached-offline acceptance distinct
from Chromium fixture and source-test results.

Protect live judging, scoring, ledger, notes, original media, preference format,
exports and Add reason presentation. No new dependency/model, cloud processing,
analysis tab, automatic pronunciation verdict or mandatory approval hierarchy.
Release remains: scoped tests -> broader tests/build -> diff review -> explicit
visual approval -> requested commit/push/publication -> verify hosted result.

## Guidance checked and its actual implications

- [NN/g: Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/):
  supports deferring specialist controls, not hiding frequent playback controls or
  required uncertainty decisions. This is a disclosure layer, not a review workflow.
- [W3C: Media slider pattern and example](https://www.w3.org/WAI/ARIA/apg/patterns/slider/):
  keyboard navigation and meaningful time values; explicitly warns that touch
  assistive technology needs device testing. It does not prescribe our 1s step.
- [W3C: Modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/):
  focus entry/containment/return, Escape and a visible close control for modal tools.
- [W3C: Focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html):
  sticky footers can hide focus. Reserve actual layout space and test focus visibility;
  the product target is full visibility, stronger than minimum partial visibility.
- [W3C: Target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html):
  AA minimum is 24px with exceptions; 44px is our stronger product target, not a claim
  that WCAG requires every printed word to become a 44px box. Do not distort Quran
  geometry; provide an accessible equivalent word-selection route in replay tools.
- [W3C: Status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html):
  meaningful progress/results can be announced without moving focus. Assess live
  status frequency so playback does not become continuous screen-reader chatter.

Apple's motion URL returned a JavaScript-only placeholder in the research tool;
no specific Apple timing prescription is asserted. Motion values remain product
prototype choices governed by the app's existing tokens and reduced-motion rules.

Confidence: practicality 94/100, architecture/data safety 94/100, visual certainty
81/100. Suitable to begin a bounded layout prototype, not final visual acceptance.
Open visual decision: exact dock height and fit-based switching thresholds. Open
technical acceptance: physical-device playback and automatic onset accuracy.
