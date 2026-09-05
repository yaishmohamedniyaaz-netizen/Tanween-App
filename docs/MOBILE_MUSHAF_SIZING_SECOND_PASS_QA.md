# Mobile Mushaf sizing — local implementation evidence

Date: 2026-09-05. Baseline: cb07ca6.
Branch: claude/interactive-design-iterations-10qwpf.
Status: local changes only; explicit visual approval and physical iPhone QA pending.

## Change boundary

Retained: fixed Quran page/line/word data, QCF fonts, renderer and hit-target code,
shared judging state, scoring, ledger, notes, validation, exports, preferences,
desktop/landscape composition, page navigation, 94px dock, and five-second feedback.

Recomposed: portrait Ready/active use one CSS grid frame after the actual header;
the contained shell fits the complete page using available width and height.
Browser mode uses stable small viewport height; standalone uses dynamic height.
The return target still reserves 44px plus 4px gap. Four pixels of clearance are
retained above/below the complete page group. Ready number now precedes the name.
The optional raised comparison is bounded by available clearance.

Removed: the arbitrary 377px page ceiling, duplicate Ready/active frame estimates,
the redundant prepared-header outer border, and undersized Ready/deck labels.
The existing inner participant surface and focus styling remain.

Browser testing also exposed two necessary fixes:

- At 320x568 the existing 18px Arabic minimum overflowed a roughly 233px page.
  Portrait judging now uses the existing fluid QCF sizes without desktop minimums.
  No font file, text, line assignment, letter selection, or desktop typography changed.
- The compact return button's absolutely positioned background was anchored to its
  whole navigation row. A relative positioning context now confines the visible
  background to the button. Its touch target remains 44px high.

12px criterion labels wrap when necessary; grid rows align all four numeric values
without increasing the 44px criterion strip or 48px actions row.

## Browser measurements

Real Chromium browser UI, isolated localhost practice data; existing 127.0.0.1
session marks were not modified. Measurements followed QCF font loading.
Native browser window/device scaling rounds some requested widths by <1 CSS px.
No physical Safari or installed-PWA claim is made.

| Requested viewport | Actual measured page width | Page height | Constraint |
| --- | ---: | ---: | --- |
| 320x568 | 233.24 | 342.99 | Height |
| 360x800 | 344.00 | 505.88 | Width |
| 390x844 | 374.39 | 550.56 | Width |
| 393x852 | 377.59 | 555.28 | Width |
| 430x932 | 414.39 | 609.39 | Width |

No horizontal document overflow in these Ready measurements. At 430px the old
377px ceiling is removed: approximately 10% greater linear page size. The primary
393px composition is intentionally almost unchanged in size/position. A short
phone does not gain artificial size at the expense of clipping.

Simulated 393x852 with 59px top and 34px bottom safe areas: header ends at114;
return target spans118–162; paper spans166–699.99; dock starts704.4. Paper is
363.11x533.99. This is deliberate height-limited fitting, not an iPhone validation.
The extreme 320x568 with the same simulated insets fits a170x250 page; that
combination is mechanically bounded but is not a readability endorsement.

Optional raised mode: 320x568 stays at y107 (no unsafe rise); 393x852 permits the
12px comparison. It remains opt-in, not the new default.

## Interaction and visual checks performed

- Ready → Begin, page591 at393x852: identical x8/y142.8625/w377.5875/h555.2750.
- Last-line word selection, exact letter, Khafi marking and immediate Undo at320x568:
  unchanged page rectangle x43.375/y107/w233.2375/h342.9875.
- First-line word/last-letter selection at393, marking and feedback disappearance:
  unchanged paper. Later check at32 seconds found the temporary strip gone;
  this confirms disappearance, not a measured five-second timing assertion.
- Return navigation to the selected question works; hidden/visible return states
  retain the page frame. Button background visually checked after positioning fix.
- Pages1,2,300,585,601,602,604 at393: fonts loaded, identical paper rectangles,
  zero rendered word boxes outside the paper. Opening and multi-surah layouts
  were visually inspected. This is not a full printed-facsimile fidelity audit.
- Light/dark visual spot checks, including dense page591 and Ready page597.
- Score sheet opens, Adu/Raagu horizontal ruler is visible; keyboard increment
  entered0.5, reflected in the shared deck. Escape returned to the deck.
- Notes text entry, mistake sheet opening/explicit closing, and ledger Undo work.
- Invalid Finish shows the required Adu/Raagu message and ruler; Keep judging works.
- Valid practice save opens the next-reciter queue, marks the sample participant
  Finished, and permits another question/Ready state. Queue close target is44x44
  at y16.8 and the list scrolls inside the bounded dialog.
- Ready number-before-name and full question/page label visually verified.

## Desktop/landscape screenshot regression

Before/after full-window captures were taken initially. Fractional window scaling
produced small raster differences across repeated resize operations, so an isolated
same-origin iframe fixture was used for a stricter comparison: same React session,
page/font/window, swapping HEAD CSS and current CSS only. The baseline stylesheet
was obtained with `git show HEAD:src/styles/global.css`.

Captured iframe regions were decoded and compared pixel-for-pixel. A320px mobile
positive control produced149,943 changed pixels, confirming that CSS switching
was effective; protected layouts produced zero:

| Viewport | Changed pixels |
| --- | ---: |
| 1024x768 | 0 |
| 1280x800 | 0 |
| 1400x900 | 0 |
| 852x393 landscape | 0 |

Artifacts and local fixture: `outputs/mobile-sizing-qa-20260905/` (untracked,
not production assets and not part of the release dependency set). Includes
baseline/current comparison PNGs, dark Ready/active/feedback views, and safe-area
capture. Screenshot conversion/cropping was only for QA comparison.

## Automated checks and remaining gates

- All357 source/unit tests passed; production build passed with existing large
  bundle warnings. Static geometry assertions were updated for the shared frame;
  they are not treated as visual evidence.
- No scoring/data/preference implementation files changed.
- Still pending: physical iPhone15Pro installed PWA; actual Safari toolbar motion;
  software-keyboard behavior; recording permission/error flow; touch drag marking;
  every page/viewport/theme cross-product; explicit user visual acceptance.
- No commit, push, Sites publication, or production deployment in this pass.

Confidence: practicality94/100; architecture/data safety98/100; visual certainty
85/100 for the browser-tested slice. Real-device and user acceptance remain gates,
not assumptions. Do not call the entire original test matrix complete.
