# Slice B: explicit word-tap prototype

2026-09-08. Slice A checkpoint pushed as `9f57ca4` to
`codex/results-overview-first`; no Sites publication.

This continuation starts Slice B in `scripts/qa/word-navigation.html` only.
The participant workspace has not been rewired or redesigned.

- Optional explicit playback-request contract; word selection alone is not autoplay.
- Fresh identity/index/revision validation before a tapped word starts playing.
- One reviewed occurrence permits playback; repeats, approximate timing and recorded
  ayah spans need deliberate choice. Missing timing never implies a skipped word.
- Tap intent remains bound to its original source; a source change is not a new tap.
- Isolated Replay on/off controls and two Quran word buttons use synthetic tones.
  Repeated taps are distinct requests; turning Replay off cancels autoplay.

Verified: 432 automated tests passed, one optional Tilawa-assets skip; TypeScript
passed. Build passed before the final source-binding guard; latest guard typechecked.
Chromium interactions confirmed off-mode silence, on-mode word playback starting at
0.5 seconds in Part 2, repeated-word restart, unavailable-word cancellation and mode
off cancellation. These checks do not measure Quran alignment accuracy.

Remaining: full adversarial React media checks from Slice A; prototype repetition and
approximate controls in browser; Back 3 seconds; one compact transport with secondary
timing tools; participant Mushaf wiring, stable phone geometry and visual approval.
Physical Safari/PWA and real-audio timing benchmarks remain separate acceptance gates.

Slice B changes are uncommitted and unpublished. Preserve existing scoring, findings,
recording bytes, timing revisions and preferences. Do not describe this prototype as
the completed participant replay interface.

Confidence: practicality 90/100; architecture/data safety 90/100; visual certainty
75/100 pending the actual participant-screen composition and approval.

## Second prototype pass

Added Back 3 seconds for explicit-tap consumers only. It clamps to the current
part's start, preserves paused/playing state and cancels pending navigation;
cross-part rewind is intentionally not implied by its accessible label.
Choosing an occurrence now starts it directly in tap mode. The selected occurrence
survives the child-player remount when its recording part changes.

Added separate repeated and approximate synthetic fixtures. Chromium verified:
repeated-word tap stayed silent; selecting Part 3 started at 0.500 seconds and
retained that selection; Pause then Back 3 returned to zero without playing;
approximate-word tap stayed silent and explicit Preview started at 0.500 seconds.
Full suite passed 432 tests with one existing skip; latest build passed.

Still a prototype: no participant-screen layout changes, no new highlighting,
no publish or further push. Final compact composition and real-device acceptance
remain open. Earlier Slice A adversarial playback gates remain open as documented.

## Participant-screen integration prototype

Actual ParticipantReviewWorkspace now enables the integration only with
`?wordReplayPrototype=1`. Replay is off by default and resets when the workspace
becomes inactive. Marked-word taps route to playback in Replay mode; findings-list
actions still inspect findings. Off-mode taps inspect normally. One recording panel
owns the player outside the mobile finding overlay. Dormant empty inspector hidden.
No correctness coloring or playback-follow coloring is introduced.

Used fresh sample-only QA origin 127.0.0.1:5205 because the older origin failed its
data-safety guard; no existing data was cleared or guard bypassed. Fixture retains
its sample/session/history guards and explicitly permits this additional local port.
Browser checks: marked reviewed word plays; approximate word needs preview; off-mode
opens inspector; exactly one player. Desktop passage before/after playback remained
892 x 539.85 CSS pixels. Desktop 1280x800 and portrait 393x852 visually inspected.
Phone panel is readable but still scroll-based and not the final compact dock.

432 tests passed, one optional skip. Build passed before the last conditional empty-
inspector cleanup; TypeScript should be rechecked after it. No commit/push/publication.
Remaining: fixed/reserved compact transport design, full viewport/dark-mode matrix,
adversarial playback checks and physical-device acceptance. Visual confidence remains
75/100; this is not approved final UI.

## Compact controls and delayed-start guard

Removed the duplicate Play word action after an explicit reviewed-word tap; the
normal transport and another word tap remain available. Approximate previews and
unresolved occurrence choices retain explicit actions. Shortened mode instructions.
This reduces panel height but is not yet the planned reserved-height mobile dock.

Added a playback-intent guard and visible Pause state while the browser play promise
is pending. A stale rejected attempt cannot overwrite a newer play attempt's state.
The dev fixture can deliberately hold/release the next browser play call. Chromium
test: hold play, press Pause, release play; late play event is immediately paused.
This verifies cancellation recovery, not a guarantee of zero transient audio frames.
HMR can replay retained prototype intent after edits; do not confuse development
reload behavior with a tested production navigation path.

Latest full suite: 432 passed, one optional skip. Latest production build passed.
Changes remain uncommitted/unpublished. Still required: broader lifecycle regression,
final compact geometry, dark mode/viewport matrix and real iPhone acceptance.

## Reserved phone panel and recovery regression

Prototype phone panel now reserves 288 CSS pixels below the passage, with internal
scrolling for expanded timing tools and a sticky Recording heading. No floating
overlay or Mushaf-sizing changes. Retains existing transport and timing state.
393x852 Chromium screenshots inspected collapsed and expanded: internal scrolling
appears and the panel stays bounded. DOM measurement calls timed out, so exact
before/after coordinate invariance is not claimed; screenshots also reflect page
scrolling when opening controls. Wider viewport/dark-mode matrix remains open.

Fixed a confirmed stale playback-blocked error after successful retry, clearing
only that specific error on accepted playback (not revision/save errors).
Disposable fixture now supports rejected play and player unmount controls; the
delayed-unmount scenario still requires execution.

Validation: main suite 432 passed / 1 optional skip; separate word-navigation suite
17 passed; all 11 browser lifecycle checks passed; production build and diff check
passed. Existing large-bundle warning remains. No commit, push or publication.
Physical Safari/PWA playback, real-recitation accuracy and user visual acceptance
remain unverified. Confidence: practicality 90, data safety 92, visual certainty 78.

## UI completion pass

Replay UI implementation is complete for the existing experimental flag, pending
visual acceptance. Styled the mode toggle with existing neutral tokens, repaired
the seek-width cascade, gave the seek target 44px height, added keyboard-focus
outlines and accessible elapsed/total time text. Manual transport actions now clear
stale end-of-recording messages. No new motion, coloring, preference or scoring state.

Chromium screenshots inspected at 320x740, 375x812, 393x852 (dark), 852x393,
1024x768, 1280x800 and 1400x900. Controls remain reachable through normal scrolling;
phone timing tools scroll inside the reserved panel. Dual-page rendering retained.
These are visual inspections, not pixel-diff or physical-device acceptance.
Delayed-play -> unmount -> release -> remount browser case passed: event trace empty,
new player paused at zero with no old autoplay. Previous 11 lifecycle cases passed.
Main suite 432 pass / 1 optional skip, separate replay suite now 18 pass.

Publishing handoff: retain `?wordReplayPrototype=1` for the experimental preview;
the ordinary URL intentionally retains the approved existing review UI. Do not
silently promote to default or publish automatic timing accuracy claims. No commit,
push or publish in this pass. Fetch before release to preserve newer remote work.
User visual approval and physical iPhone/Safari/PWA, VoiceOver, 200% text, offline
and real-recitation benchmark remain acceptance tasks, not missing UI components.
Confidence: practicality 92, architecture/data safety 92, visual certainty 85.

Final cleanup: Replay off hides the selected-word action rather than leaving a
duplicate Play word button; whole-recording transport remains available. Browser
snapshot verified. Final main/replay suites and production build passed after this
cleanup; existing bundle-size warning only. No release operations performed.
