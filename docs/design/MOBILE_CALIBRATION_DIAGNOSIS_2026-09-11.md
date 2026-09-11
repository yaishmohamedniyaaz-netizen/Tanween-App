# Mobile calibration: diagnosis before implementation

Research only, 11 September 2026. No product-source changes, commit, push or publication.

## Verified source and publication

- Fetched GitHub and checked remote branch heads. `codex/fixed-mushaf-replay-integration` is at `363702d42085e7440bf2a6753123d91da224d212`.
- The corresponding checkout is `C:/Users/idraw/Downloads/tahqeeq-fixed-replay-integration`. Its product source and requested documents match the remote. The existing modification to `scripts/qa/offline-app.ts` was preserved.
- The original `Tahqeeq APP` checkout is on a different branch with unrelated dirty work; it was not switched or reset.
- Read AGENTS.md, DESIGN_GRAMMAR.md, MOBILE_CALIBRATION_IMPLEMENTATION.md, MOBILE_CALIBRATION_SAFETY_REPORT.md, UNDECIDED_DECISIONS.md, and `docs/design/MOBILE_CALIBRATION_NEXT_RESEARCH.md`. None is missing.
- Sites reports version 125, source `d2b372a58d6ceadeb3b594730cee465921946a90`, with successful publication. The live page returned HTTP 200 and loaded `/assets/index-BBMccVeG.js`. The difference from that source to the current GitHub head is two planning documents only.
- The implementation document's historical “not committed/published” wording is stale; it describes its original checkpoint. This is not evidence that today's published build lacks calibration.

## Findings and bounded proposals

### 1. Ready page changes still discard the ready view — confirmed

`useFixedMushafPages.ts:23-45` clears the visible page state and disposes/revokes the previous image on every page-set change. `ConnectedFixedMushaf.tsx:32` consequently unmounts the Mushaf and substitutes the loading screen. The persistent cache contains compressed bytes, not a retained ready presentation.

The destination passes through Cache Storage lookup, SHA-256 verification, JSON parsing, artwork/semantic compatibility checks, a new blob URL and image decoding (`fixedMushafStorage.ts`, `fixedMushafPackage.ts:79-108`). Afterward Mushaf mounts again with empty `pageData`; its own effect admits even the supplied fixed data asynchronously (`Mushaf.tsx:227-258`). Instrumentation observed the initial loading state followed by another brief interval before the page element appears.

Both warming paths exclude fixed artwork: `PageNav.tsx:37` returns when `prefetchFonts` is false, and `Mushaf.tsx:262` returns when fixed pages are present. Enabling QCF-font prefetch would not prepare the fixed PNG package.

Published Chromium measurements, one sequence on this Windows machine:

| Destination | Package network requests | Loading-state onset to matching page DOM | PNG decode |
| --- | ---: | ---: | ---: |
| First adjacent 603 | 3 | 103.5 ms | 20.3 ms |
| Revisited 604 | 0 | 40.5 ms | 22.5 ms |
| First 601 | 3 | 103.1 ms | 21.0 ms |
| Revisited 601 | 0 | 41.0 ms | 20.9 ms |
| First distant 255 | 3 | 103.9 ms | 20.2 ms |

These are instrumented DOM timings, not physical-phone frame timings or a performance guarantee. Local source reproduced the same lifecycle. Cached navigation also succeeded with network disabled while retaining the loading interruption.

Full-package follow-up also completed against the published build: the real download UI saved 1813 package files (manifest plus three assets for each of 604 pages), then reported “Mushaf ready offline / All 604 pages are saved.” A fresh offline reload succeeded. Offline jumps 604→603→604→255→256→255 all displayed the loading state; loading onset to matching page DOM was approximately 48.5, 39.4, 48.1, 52.2 and 39.5 ms. This was disposable Chromium with `navigator.standalone` simulated to expose the real download UI, not a physical installed-PWA acceptance test. The final follow-up report contains no browser/runner errors.

Propose a bounded ready-page owner for portrait calibration: keep the current page and prepare immediate neighbors; deduplicate in-flight work; retain verification, package identity, cancellation and explicit disposal. Investigate a three-page budget before choosing it: one raw 1920×3106 RGBA image is about 23.9 MB, before browser overhead. Never decode all 604 pages.

Commit displayed page number, calibrated fit dimensions, artwork, semantic data, word targets and question-return state together. A ready cache hit must avoid both loading layers. During a cold jump, keep the old page honestly labelled, cancel its tray and disable marking until the new coherent view is ready; give restrained pending/error/retry feedback. Rapid requests must never let a stale result replace the latest target. Preserve the existing desktop/spread and legacy paths in this first slice.

Preparing an image before attaching/swapping it follows the [HTMLImageElement.decode guidance](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode). The existing verification checks are safeguards to retain, not the proposed target for removal.

### 2. Portrait scrolling — not reproduced in the tested engine

At 320×568, 390×844 and 430×932, local and published views had document height equal to viewport height, zero document scroll after wheel input, and zero Mushaf-shell scroll. Additional Chromium touch pans across margins and artwork, with simulated safe areas, also left both positions at zero and preserved the recorded sample state.

The portrait app already uses `height:100svh`, constrained grid rows and clipped stage/shell containers. The root document has no judging-specific overscroll rule. That leaves native overscroll/bounce and keyboard-driven visual viewport movement as hypotheses, not established causes. A blanket `touch-action:none` or global scroll lock is not justified by these measurements and could damage selection, pinch zoom and other screens.

Asked the owner for phone, browser, browser-tab versus installed-app mode, and whether movement starts before keypad use. Next check must distinguish actual document scroll, nested scroll, visual viewport pan and rubber-band bounce. Only then prototype a portrait-judging root overscroll boundary or viewport correction. Preserve scrollable dialogs/sheets, intentional zoom and all landscape behavior.

The existing landscape case at 844×390 has a 1105px document and is scrollable. It remains a separate pre-existing limitation; no landscape fix is proposed.

### 3. Page-jump keypad glitch — credible mechanism, native reproduction pending

The earlier transform-animation correction is present: calibration uses opacity-only popup animation. Normal popup opening in current Chromium is stable and horizontally contained.

The popup is still absolutely positioned inside the lower navigation, capped by `55svh`, with no visual-viewport resize/scroll handling. The number input has both `autoFocus` and a requestAnimationFrame focus/select effect, without `preventScroll`; it computes to 14px. These facts justify checking focus-induced scrolling/zoom as well as keyboard occlusion, but do not prove a particular iOS symptom.

An ordinary browser resize to 390×500 kept the popup contained. This is explicitly not a native-keyboard test: mobile keyboards can shrink only the visual viewport while leaving CSS viewport dimensions unchanged. See [Chrome's viewport explanation](https://developer.chrome.com/blog/viewport-resize-behavior) and [VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport).

Propose one focus path with `preventScroll`, then a portrait-only popup placement constrained by the actual visual viewport, using resize and scroll notifications. Keep its header/input visible and let only its surah list scroll. Prefer an overlay outside the clipped paper container if measured placement requires it; preserve keyboard entry, Escape, outside dismissal and focus return. Do not resize Quran artwork on every keyboard animation frame. Verify a 16px input locally on the actual affected device before attributing the issue to input zoom.

### 4. Criterion values and divider — equal widths retained

At normal type, all four criterion columns are equal: 94.5px each at width 390 and 104.5px at width 430. Value line boxes end 6.8125px above the footer/divider, including an actual recorded −2 deduction. The owner's request for more breathing room is a visual refinement, not an uneven-width bug.

At width 320, wrapped labels and the fixed 44px row push values 3.97–7.58px into the footer. Forced 200% label/value text reproduces substantially larger overlap at all three sizes, with computed 28px values verified. This confirms the prior safety finding; it is not native Dynamic Type certification.

Propose a small upward rebalance of label/value content inside the same normal-size strip, preserving equal widths and overall dock height. Separately reserve actual content height when labels wrap or text grows; the stage's dock allowance must track that height in both Ready and Live. Do not hide overflow to make a measurement pass. Check realistic half-mark strings such as 9.5/10 and 17.5/20 without independently widening Adu / Raagu. Upper spacing and artwork proportions stay unchanged.

### 5. Compact navigation — preserve the visual scope, resolve touch tradeoff

Current calibration is already 84×28 visually, occupying a 37px row; the independent targets are about 28.9×37, 26.2×37 and 28.9×37. The footer is 42px high. These remain documented exceptions to the 44px interaction rule.

Propose adjusting only selector presentation and its reserved navigation space after page-loading/menu stabilization. Compare a compact visible face inside three non-overlapping 44×44 targets (minimum combined hit width 132px). If retaining the 84px hit footprint is desired, item 29 still requires an explicit exception; invisible overlapping targets cannot solve it. Do not shrink footer targets further or introduce hold-and-drag navigation. Do not reclaim the deliberately retained upper gap.

### 6. Temporary mistake countdown — small optional addition

`MobileJudgeDeck.tsx:27,63-88` already defines a five-second expiry based on the latest action timestamp. A real sample mistake appeared and expired in the browser; the polling observation was about 5.4 seconds, not a precise timer measurement.

Propose a thin neutral depletion line using that same deadline. It represents dismissal only. It must not change deduction, Undo, the evidence timestamp, strip height or saved state. Reset for a new action, use remaining time after rerenders/backgrounding, and honor reduced motion without live-announcing each tick. The criterion strip returns exactly as now.

## Confidence and gates

Engineering judgments about the proposed direction, not release certification:

| Slice | Practicality | Architecture/data safety | Visual certainty | Next evidence |
| --- | ---: | ---: | ---: | --- |
| Bounded ready-page swaps | 91 | 86 | 82 | Isolated prototype; latest-request wins, memory/release, hit-target and offline failure checks |
| Keypad-aware popup | 88 | 94 | 74 | Native keyboard reproduction and popup containment/focus tests |
| Portrait scrolling cause | 60 | 90 | 60 | Affected device and mode; defer a scroll fix until reproduced |
| Criterion spacing/fallback | 94 | 96 | 82 | Normal/200% text, half marks, Ready/Live and visual review |
| Compact selector | 87 | 98 | 78 | Compact versus touch-safe comparison; item 29 |
| Optional countdown | 95 | 98 | 83 | Timing/reduced-motion and visual review |

Retained: Quran image bytes, word associations, scoring, evidence, recordings, saved data, equal criterion widths, upper spacing, desktop/landscape layout and navigation semantics. Recomposed only if implementation proceeds: loading lifecycle, portrait popup placement, internal criterion spacing and constrained-screen height. Removed only: unnecessary ready-page placeholders/repeated preparation; no product function is removed.

Implement one slice at a time, starting with loading. Before any commit, show the visible result for explicit review. Before release, test representative pages including 1, 2, 255, 601 and 604; cached/cold/offline/error/rapid navigation; cancellation and word targets; normal/enlarged text; desktop/landscape comparison. Native keyboard, PWA, rotation and real-device acceptance remain separate gates. No publication is authorized.

## Evidence

- `outputs/mobile-diagnosis-20260911/diagnose.mjs` and `report.json`: local/published transitions, cache/hash/decode instrumentation, portrait/desktop/landscape geometry and popup resize proxy.
- `followup.mjs` and `followup.json`: real sample marking, touch pans, forced text enlargement, countdown observation and full-package offline follow-up.
- Preliminary follow-up attempts exposed two runner mistakes: checking the download prompt before it appeared, and treating an asynchronous cache-count predicate as a completed wait. The final runner waits for the prompt, explicitly awaits repeated cache counts, requires exactly 1813 files and the app's complete status before disconnecting. Those preliminary failures were not classified as product defects.
- Screenshots: `hosted-390-844.png`, `hosted-320-568.png`, `hosted-popup.png`, desktop/landscape counterparts and `text-200-*.png` in that directory.
- `focused-tests.log`: 34 existing calibration, mobile presentation, geometry, ledger and device-preference tests passed. No production build/full suite was needed for this research-only turn.
- All browser contexts were disposable. No personal browser storage was cleared or altered. The local Vite server uses port 5296. Scripts are diagnostic evidence collectors, not release certifications; inspect their recorded errors and findings rather than treating exit zero as success.
