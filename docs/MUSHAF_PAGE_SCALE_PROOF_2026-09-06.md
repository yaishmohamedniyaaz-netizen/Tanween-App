# Mushaf whole-page scaling proof — 6 September 2026

Status: isolated, locally served comparison. No live judging or Results source changes, commit, push, or publication. The segmented-letter experiment remains parked; highlight ink fitting comes after page proportions.

## What this phase does

The proof renders the existing page at one internal width, then scales its words, gaps, margins, surah bands and line positions together. The “Current” button shows the existing sizing rules at the same chosen page width. Fit and a width slider allow comparison; selecting a word displays its text and ayah without recording a mistake.

- Retained: the shared `MushafPageSurface` and `MushafWord`, QCF V1 page fonts, source glyphs/tashkeel, semantic word IDs, source row membership and centered/opening-page rules.
- Recomposed: only the experimental page wrapper, using a 532 × 782.35 internal canvas and uniform CSS transform. Phone media rules for internal padding, marginalia and typography are frozen in this mode.
- Removed from the experimental fixed mode: independently changing font limits and internal page dimensions. Nothing is removed from the application.

The 532px composition is the inspected current middle-size baseline. **It is not the final calibrated 1405 composition.** Preserving an existing proportion and proving that it matches print are different checks.

Local preview: `http://127.0.0.1:5195/outputs/mushaf-scale-proof/index.html`. This needs the Vite server; it is not a standalone offline HTML or a remote deployment.

## Browser evidence

Seven source pages: 1, 2, 3, 255, 589, 590 and 604. All page fonts and the basmala font were awaited before measurement.

| Check | Result |
| --- | --- |
| Fixed geometry at widths 300, 360, 532 and 760px, plus 1.25/1.5 scale cases | 42 cases per viewport; 84 total across desktop and compact |
| Source identity | All 698 rendered tokens, including verse endings, match source ID, glyph/text and role |
| Word geometry comparisons | 8,376; maximum drift equivalent to 0.0052px at the 532px baseline |
| Canonical desktop vs compact word and line coordinates | No measured difference |
| Compact word targeting | All 604 selectable word centers resolve to the correct DOM word |
| Actual interactions | First-word click and last-word Enter selection passed on all seven pages |
| Selection and Fit | Page dimensions unchanged by selection; no horizontal overflow |
| Compact layouts | 360×800, 390×844 and 430×932 inspected; Fit has no horizontal overflow |
| Enlarged page on compact screen | Horizontal scroll moved successfully; inherited vertical-only touch restriction removed |
| Desktop comparison | Inspected at 1400×900, including a manually enlarged 760px page |

At page589 width760px, the first line’s summed word advances occupy **91.30%** of line width in the fixed composition, versus **70.47%** under current rules. The fixed composition keeps the baseline ratio as the page enlarges; current rules cap the glyph size and expand the spaces. These percentages measure layout advances, not painted ink coverage.

The transformed inner canvas did **not** produce unscaled horizontal overflow in the inspected Fit cases, so no additional clipping was introduced. A fixed-height selection footer prevents selecting a word from shrinking the Fit page.

The source was type-checked with `node node_modules/typescript/bin/tsc --project outputs/mushaf-scale-proof/tsconfig.json`. A fresh final load produced no new browser console errors; a development hot-reload root warning was corrected in the isolated entry point. Browser captures are in `outputs/mushaf-scale-proof/evidence/`; `node outputs/mushaf-scale-proof/verify-evidence.mjs` verifies captured geometry and source identity independently against the page JSON.

## Better reference evidence

The previous report's measured QUL preview width is **not a global calibration constant**. Its source uses a 30px page font inside a content/container-dependent auto-width page; justification and responsive outer padding influence measured gaps. Sources: [page font template](https://github.com/TarteelAI/quranic-universal-library/blob/2049f3cee9cfb3a6dde2bfaf883aac4ee37e5ffc/app/views/shared/_page_font.html.erb), [page styles](https://github.com/TarteelAI/quranic-universal-library/blob/2049f3cee9cfb3a6dde2bfaf883aac4ee37e5ffc/app/assets/stylesheets/shared/mushaf_page.scss).

QUL's V1 Mushaf definition links the [Tafsir.app old Madinah scan](https://github.com/TarteelAI/quranic-universal-library/blob/2049f3cee9cfb3a6dde2bfaf883aac4ee37e5ffc/app/models/mushaf.rb#L78). That provides a stronger visual reference than the responsive preview. The scan image index is printed page +2. All seven selected images were opened and visually checked: opening compositions on pages1/2; printed numbers and verse/row structure on pages3/255/589/590/604. Page590 includes the following surah title at its foot, consistent with the source layout.

The proof's “Printed scan” link opens the matching image, for example [page589](https://tafsir.app/scans/m-madinah-old/591.png). This is a scan linked by the source library; it is not an independent authentication of the edition or an endorsement of every scan feature. Decorative frames, verse ornaments and basmala styling visibly differ from the application and must not be silently substituted.

## Remaining gates

1. Calibrate text region, glyph-to-line ratio, vertical rhythm and opening-page exceptions against these scans. Align the text region rather than the external decorated paper. Do not stretch glyphs or move words to different rows.
2. Review the selected proportions with the user. The proof already exposes the necessary same-page comparison; approval of the scaling mechanism does not imply approval of an exact printed match.
3. Integrate the accepted scale in the shared live/Results page surface and reconcile production overlay coordinate conversions. This proof selects DOM words; it does **not** validate the existing judge hover, criteria picker, undo, recording replay or marker layers under a new transform.
4. Verify actual native browser zoom at75/100/125/150/200%, application zoom separately, two-page/one-page transitions, and touch/pinch on physical devices. Current cases are CSS scale/viewport checks, not native zoom or physical-phone acceptance.
5. Then return to ink-aware highlight fitting, keeping glyph overhangs and neighboring words in view.

## Confidence for this proof

- **Practicality 97/100:** uniform scaling passed the fixture geometry and interaction checks.
- **Architecture/data safety 99/100 for this isolated proof:** no judging, score, evidence or device-store imports/writes. Production integration retains its separate coordinate-conversion gate.
- **Visual certainty 80/100:** real desktop and compact screens were inspected and matching scan references are available. Final print calibration and user visual approval remain open.

The repository's AGENTS.md requires visible changes to be reviewed before commit or publication. This phase is ready for local review, not a production-release claim. Existing unrelated replay work was preserved.
