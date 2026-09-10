# Mobile calibration safety check

Audit only; approved normal-size composition retained. No product fixes,
commit, push or publication during this check. The layout remains opt-in.

## Result: core interactions pass; not a universal-device release clearance

Tested in isolated Chromium contexts at 390x844, 430x932 and 320x568 with
fixture-simulated safe areas. No user browser storage was cleared or modified.

### Passed this turn

- 34 focused unit tests: calibration, mobile presentation, geometry, judging
  ledger and device preferences.
- Ready-to-Live geometry stability, page jump/menu containment, light/dark
  stability, word marking, Undo and Finish opening at all three sizes.
- Simulated microphone permission denial gives retry and begin-without-recording
  choices; the latter starts judging successfully. The two visible recovery
  buttons stay inside the viewport.
- Attempting Save without Adu / Raagu leaves judging active and displays the
  required-mark instruction; the session is not finalized accidentally.
- A held/moved/cancelled touch leaves saved judging state unchanged; document
  scroll remains zero. This is touch cancellation, not rotation coverage.
- A real recorded mistake survives reload and layout-flag switches. After the
  initial fixture normalization, full parsed session state is identical across
  another same-flag reload, flag off, and flag on.
- Interaction runner reported no browser page errors. `git diff --check` passed.

### Findings to resolve before broad release

1. **High: criterion values can be covered by the footer.** At ordinary type,
   390/430 values stay above the footer. At 320 width, labels wrap and value
   bottoms extend roughly 4-8px past the footer's top. With forced 200% label
   and mark fonts (computed mark size verified as 28px), values overlap the
   footer at all three sizes. The fixed 44px strip does not accommodate the
   taller content. Recommendation: a constrained-screen/enlarged-text fallback
   that reserves actual content height, retaining the approved 390/430 default.
   This is a text-only stress test, not native iOS Dynamic Type verification.
2. **Touch-target exception remains unresolved.** Selector targets measure
   about 29x37, 26x37 and 29x37; footer buttons are 42px high. These are smaller
   than this repository's 44px interaction rule. The 84px joined control cannot
   contain three separate 44px-wide targets without changing its width or
   interaction structure. Do not silently overlap hit boxes or claim compliance.
3. **Desktop Ready screenshot gate is not fully cleared.** At 1280x800,
   1400x900 and 844x390, stabilized flag-off/on screenshots match exactly. At
   1024x768, the remaining diff is confined to the top-right header rectangle
   (845,4)-(1008,27), not the Mushaf/dock. Repeating flag-off also produces a
   header diff, so this does not establish a calibration regression; the exact
   dynamic header cause still needs isolation. Earlier Live desktop matches
   remain prior-turn evidence, not a new full release approval.

### Initial storage alarm explained

The first fresh fixture reload adds `participant.judged=false` and replaces its
blank sample judge name in the active assignment/session-start event. Existing
sample normalization in `src/state/store.tsx` performs this even when the flag
does not change. Subsequent full-state comparisons are identical. The evidence
does not show loss of mistakes or a calibration-induced state migration.

### Test limitations

The initial safety runner's parent scroll-size metric missed descendant/footer
overlap. Its immediate font measurement also preceded style settling. Use
`followup.json` and `*-verified-enlarged.png` for text findings; computed fonts
are checked after settling. The initial raw-storage equality result is not a
data-loss diagnosis. These scripts collect audit observations; exit zero alone
does not certify that the layout passed every condition.

Still open: physical Safari/installed-PWA testing, actual microphone/playback,
native keyboard and text sizing, rotation during a gesture, long-name/17.5-mark
extremes, and fresh offline reload/download failure recovery. Existing landscape
fixture sizing is poor independently of this flag; no landscape fix is included.
Full suite/build passed in the preceding implementation turn, not rerun here.

## Evidence / repeat

    node scripts/qa/mobile-calibration-interactions.mjs
    node scripts/qa/mobile-calibration-safety.mjs
    node scripts/qa/mobile-calibration-safety-followup.mjs

Vite must run on 5296. Reports and screenshots:
`outputs/mobile-calibration-safety/` and `outputs/mobile-calibration/`.

Confidence (engineering judgment, not proof): practicality 88/100;
architecture/data safety 93/100 for the tested layout slice; visual certainty
78/100 across devices until the clipping/touch gates and real-phone check pass.
