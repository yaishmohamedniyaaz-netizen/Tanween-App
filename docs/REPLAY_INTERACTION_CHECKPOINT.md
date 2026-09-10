# Replay interaction slice — 2026-09-10

Local implementation, not committed/pushed/published. Owner asked to defer combined visual review until after publication; this removes the intermediate approval pause, not the regression checks.

## Retained / changed

Retained one audio owner, saved sample-clock positions, 0.5-second lead-in, continuous normal playback, explicit interval correction, scoring, evidence, notes and preference formats.

Changed: explicit Word replay on/off wording; mode-off pause including ordinary playback; pending lookup cancellation; neutral selection outline on unmarked words; replay-aware accessible word names; separate source loading/unavailable/failed states with Retry for failed storage reads; source identity guard against a transient unavailable message; disabled word mode when source audio is unavailable.

Approximate and repeated choices now appear beside the compact player rather than requiring Details. They are temporary nonmodal disclosures, with explicit Close/Escape and focus return to the selected word. No automatic dismissal timer or guessed occurrence. Answered choices return to recording details without stopping the selected playback. A fresh repeated-word tap requires a fresh choice. Timing correction remains in its existing panel; extracting that surface is a separate slice.

Everyday keyboard arrows seek 1 second, PageUp/PageDown 5 seconds, Home/End reach recording boundaries. Pointer seeking and correction retain subsecond precision. Ticking output is not a live announcement.

## Evidence

- Main suite: 380 passed, one optional asset skip; focused suites: 55 passed. Focused source assertions are wiring checks, not browser or physical-device proof.
- In-app Chromium sample recording: approximate tap remained paused; deliberate Preview started playback. Repeated occurrence 2 started at 1.5s for its 2s anchor and continued to 4s recording end.
- A fresh repeated tap displayed both choices again, paused. Close and Escape removed the disclosure and returned focus to the tapped word.
- Mode-off originally failed when Play had started after a dismissed choice; reproduced, fixed with explicit mode-state cancellation, and retested. Mode-off paused; ordinary Play worked afterward.
- Participant exit removed the old audio element. Missing-recording participant had zero audio elements, a disabled Word replay control and a clear local-unavailable message.
- Home then ArrowRight resulted in a 1-second audio position while paused.
- Compact 393x852 disclosure and desktop 1280x800 inspected visually. Additional full-matrix device/theme/accessibility acceptance remains for the combined release.

## Open release checks

Actual iPhone/PWA audio, VoiceOver/touch exploration, forced storage-read failure/Retry and delayed real-device loading have not been manually accepted. Neutral selection is an anchor, never an assessment of pronunciation. Specialist timing tools and full combined release verification remain. No production readiness percentage is inferred from test counts.

Confidence: practicality 93/100; architecture/data safety 93/100; visual certainty 82/100 pending combined owner review and physical device checks.
