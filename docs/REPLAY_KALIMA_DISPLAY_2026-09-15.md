# Selected kalima display slice

Implemented locally: the replay feedback heading now uses the original QCF page
glyph and corresponding page font, supplied by the existing evidence-page text
data. `ReplayWord.presentation` is optional display metadata only. Timing targets
continue to save ordinary text and IDs, not glyph/page presentation fields.

## Refined choice

The fixed artwork renderer's geometry explicitly uses practical reading partitions,
not detached-ink ownership. Cropping those regions cannot guarantee an intact word.
Therefore this slice uses whole page-font glyphs instead of image crops. It matches
the source QCF calligraphy; exact pixel identity with the fixed page image is NOT
claimed. This refines the earlier crop proposal and needs user visual approval.

The component waits for the appropriate page font before displaying its glyph;
switching pages cannot display the old page font against the new glyph. A cancelled
load cannot update the component. Failed/missing fonts retain readable Arabic.
Accessible text is retained as the image-role label. No artificial bold is applied.

## Verification

- Project TypeScript passed; 29 replay/navigation tests passed.
- Real Chrome browser: Qaf page 519 and An-Naba page 582 labels loaded their correct
  fonts; four glyphs reached ready state and the deliberate missing-glyph example
  stayed readable in fallback state.
- Visually inspected a 700px-wide light preview. The 366px-wide dark screenshot
  shows intact glyphs but has cropped surrounding preview content, so it does not
  establish full compact-layout approval. DOM checks found no main-container
  horizontal overflow. Browser viewport was desktop sized; this is NOT a physical
  mobile viewport/device test.
- Preview: `/scripts/qa/replay-kalima.html`. This is a component preview, not the
  complete Results interaction. No full production build rerun for this slice.

Remaining: user approval, full Results compact/desktop placement, rapid switching
interaction checks, and offline font availability. Existing fixed-Mushaf image
downloads do not prove QCF fonts are offline; readable fallback remains essential.
No source-font dataset licensing conclusions are added by this rendering change.
No commit, publication or recording changes.

Confidence: practicality 90/100, architecture/data safety 94/100, visual certainty
80/100 for the component; full Results/device approval remains outstanding.

## Follow-up integration check

- Found and corrected two remaining ordinary-text labels in
  `ParticipantReviewWorkspace`: mobile playback dock and word inspector. Both now
  use the same `ReplayKalima`, without changing layout, scoring or persisted data.
- Ran the existing isolated Results fixture on port 5207 in Brave, with synthetic
  tone audio only. Tapping 109:1's first word sought to 0.50s and continued to the
  recording end. Selecting the second repeated occurrence sought to 1.50s for the
  saved 2.00s occurrence. This tests navigation, not recitation recognition.
- Inspected full Results in desktop light/dark and requested a 393x852 compact
  viewport. Compact dock and occurrence label both show the whole glyph. The
  compact screenshot capture had duplicated/tiled surrounding content, so do not
  treat that screenshot as pixel-exact viewport acceptance. Physical iOS remains
  untested. The desktop dark check requested 1280x800.
- Initial background-tab page decode stayed loading; bringing the browser tab
  into view allowed the pages to appear. Cause not proven; no speculative loader
  patch was applied. The in-app port-5207 fixture correctly refused to overwrite
  its existing non-fixture data; that data was left alone.
- Added an opt-in, dev-only `?checks=1` component fixture: deliberately delayed
  page-519 font completion, switched to page 582, verified selected text/glyph/font,
  forced a font-load rejection, verified readable fallback, then cleared selection.
  Real in-app-browser run reports PASS. This simulates a failed font request; it
  does not establish a fully offline application or font-package installation.
- 29 replay/navigation tests passed again. Full production build passed through
  the existing npm.cmd build script after the Sites wrapper's Windows npm-path
  failure. Existing large-chunk warnings remain. Git diff whitespace check passed.

Remaining gates: user review of complete layout, clean compact capture/device
verification, real offline reload/playback, and separate reference-package rights
resolution. No commit, push or publication.

Current confidence: practicality 92/100; architecture/data safety 94/100;
visual certainty 82/100 pending compact/device acceptance.
