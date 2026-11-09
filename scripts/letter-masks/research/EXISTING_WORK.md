# W5: Existing work on Quran letter positions

## Provenance and scope

**Reconstructed on 9 November 2026 from the researcher's retained conversation and actual primary-source tool results of 8 November 2026. This is a newly written report, not a recovered old file.** Exact original report bytes, downloaded source snapshots and asset hashes were not recovered. Unless explicitly marked as rechecked below, source observations are from 8 November. No fonts, weights, datasets or external code were imported or executed by this W5 stream. This report changes no application code, religious text, artwork, letter units or approved borders.

On 9 November, the oldmadinafont licence and kraken current API page were successfully reopened and confirmed. Direct reopening of both QUL V1 licence tabs returned tool accessibility errors; their earlier successful text observations are retained as dated evidence, not presented as new successful checks. This does not resolve their missing licences.

## Verdict

No verified reusable set of **1405-artwork per-letter ink masks** was found in the sources inspected. This is a bounded research result, not proof that no such resource exists.

The best research direction remains a licensed font's 2-D registration (W1), cross-checked against known-text forced alignment (W2), with mask learning (W3) after supervision is credible. Word glyphs, font contours, Unicode characters, shaping clusters, OCR time steps and Tanween letter units are different objects. None should be silently substituted for another.

Confidence in this research recommendation: **practicality 80/100; architecture/data safety 90/100 conditional on the licence gates below; visual certainty 45/100**. No rendering, mask measurement or font/artwork visual comparison was conducted in W5. These scores do not approve scaling or production release.

## 1. QUL / Tarteel: edition, fonts and layout

Primary sources examined on 8 November:

- [Glyph-based font documentation](https://qul.tarteel.ai/docs/glyph-based).
- [V1 1405H layout](https://qul.tarteel.ai/resources/mushaf-layout/15) and [layout schema](https://qul.tarteel.ai/resources/mushaf-layout/15/docs).
- [QPC V1 font](https://qul.tarteel.ai/resources/font/238), [font catalogue](https://qul.tarteel.ai/resources/font), and [layout catalogue](https://qul.tarteel.ai/resources/mushaf-layout).

**Verified offer:** QUL associates QPC V1 with the 1405H Uthman Taha edition. Its glyph documentation says an entire Quranic word is mapped to one glyph, with separate font files for pages. The V1 layout schema contains page and line numbers, line type, centring, first/last word IDs and surah number. The related word table contains identifiers and text. These are ordering/line-membership fields, not letter-mask coordinates.

**Granularity verdict:** The inspected V1 resources do not document letter regions. More precisely, the layout provides line/word membership, while rendered word bounds require an additional step. This supports the prior word-level ceiling without claiming every QUL resource was exhaustively audited. The catalogue's [ligature-based SVG Mushaf](https://qul.tarteel.ai/resources/mushaf-layout/569) is a follow-up lead; its name alone establishes neither per-letter semantics nor 1405 compatibility. Unicode and Digital Khatt fonts offer alternative renderings, not target-artwork labels.

**Licence:** The [FAQ](https://qul.tarteel.ai/faq) says rights vary by resource. On 8 November both the [V1 font licence tab](https://qul.tarteel.ai/resources/font/238/licence) and [1405 layout licence tab](https://qul.tarteel.ai/resources/mushaf-layout/15/licence) explicitly reported that copyright information was unavailable. These observations were obtained by following the site links and reading the resulting page references after some direct requests failed. On 9 November direct reopening failed again. Status remains **unresolved**, not MIT or public domain merely because QUL distributes it. Do not newly import or redistribute these assets, or derive training labels from them, on this report's authority. Existing project permissions require their own provenance review; this report does not revoke or invent them.

**1405 usefulness:** Strong edition and layout reference; no direct letter-mask solution. The font page also recorded October 2026 corrections, so matching a resource name is insufficient to establish binary identity. Pin versions and hashes before a licensed comparison.

## 2. quran.com-images and QCF V1 contours

[Official repository](https://github.com/quran/quran.com-images) describes a generator using old Madani fonts from the King Fahd Complex. Its README says generated images are accompanied by glyph bounds supporting word/verse highlighting. This is word-level geometry, not a documented letter ownership map.

**Do outlines split into letters?** Not established by the inspected primary sources. A word glyph can have multiple contours representing holes, detached dots and marks, disconnected letter bodies, or a connected body shared by several letters. Contour count/order does not supply semantic ownership. A connected multi-letter body or stacked ligature cannot generally be decomposed into its letters simply by enumerating outlines. This is a geometric inference, **not a binary inspection of all QCF V1 fonts**.

A future licensed audit should inspect simple versus composite glyphs, component names and text mappings, and colour individual contours beside known letters for بسم, على, لكم and lam-alif examples. It must report how many samples were inspected rather than generalising from a few convenient disconnected letters.

**Licence:** No project-wide licence file was visible in the inspected repository root/README on 8 November; upstream V1 font rights also remained unresolved. Public accessibility does not grant reuse rights. Do not copy code or extract new training assets without clarification.

**1405 usefulness:** Potentially valuable word-outline reference if licensed, not a substitute for semantic segmentation. Two methods using the same contours are not independent evidence.

## 3. DigitalKhatt oldmadinafont and justification-aware HarfBuzz

[oldmadinafont](https://github.com/DigitalKhatt/oldmadinafont) describes its source style as old Madina **1995**, not explicitly this repository's 1405 artwork. The [licence](https://raw.githubusercontent.com/DigitalKhatt/oldmadinafont/main/LICENSE) is **SIL OFL 1.1**, verified on 8 November and rechecked on 9 November. It covers Font Software; preserve notices and applicable font-derivative naming/distribution conditions. Do not assume the grant automatically covers every separately sourced reference PDF or image.

[DigitalKhatt HarfBuzz](https://github.com/DigitalKhatt/harfbuzz) locates Arabic-justification modifications in the `justification` branch. The [branch COPYING file](https://raw.githubusercontent.com/DigitalKhatt/harfbuzz/justification/COPYING), checked on 8 November, specifies **Old MIT** and warns of separate notices in some subdirectories.

**Offer:** Relevant calligraphic synthesis and justification-aware shaping. **Limitation:** “Old Madina” naming does not prove exact drawing equivalence. Compare actual word shapes before assuming the 1995 description matches 1405. HarfBuzz positions and text clusters are not necessarily individual-letter masks: ligatures can combine characters and marks can share clusters. Assigning a whole cluster to one letter creates false supervision.

**1405 usefulness:** Highest-priority external W1 candidate with verified font rights. Require the task's 50-word visual/overlap comparison, stacked examples, explicit cluster ownership and a pinned font/shaper configuration. This report claims no measured overlap or matching score.

## 4. DigitalKhatt medinamushafanalyzer

[Repository](https://github.com/DigitalKhatt/medinamushafanalyzer) and [author README](https://raw.githubusercontent.com/DigitalKhatt/medinamushafanalyzer/main/README.md), inspected on 8 November.

**Offer:** Work-in-progress analysis of font characteristics and justification. The README specifies input `1441-AI-hafs/*.ai` from the King Fahd Complex Hafs download and parsing into **lines and words**. It lists Qt5, image libraries and Poppler, with testing on Windows MSVC.

**Licence:** No explicit repository reuse licence found in the inspected root/README; rights to the separately obtained 1441 source artwork were not established either. **Unresolved: do not import code, artwork or derived training labels.**

**1405 usefulness:** A methodological lead for vector/path and justification analysis. Its documented edition and segmentation granularity do not solve this task. An “analyzer” name is not evidence of letter annotations.

## 5. OCR engines

### kraken

[Version 4 advanced usage](https://kraken.re/4.0/advanced.html) documents hOCR character boxes (`x_bboxes`) and confidence. [Current Python API](https://kraken.re/main/user_guide/api.html) explicitly documents `ForcedAlignmentTaskModel` and describes approximate character locations from supplied text. The API was rechecked on 9 November. [Code licence](https://raw.githubusercontent.com/mittagessen/kraken/main/LICENSE), checked on 8 November: **Apache-2.0**. Pretrained models require separate rights review.

**Use:** W2 training on authorised artwork and forced alignment of its known text; short-bar centre evidence independent of font registration. **Limitations:** Bounding boxes/time positions do not define stacked-letter ink ownership. Verify RTL, repeated letters, marks, output stride and `judgingTargetsOf` mapping. Pin the actual installed version: current API documentation is not a guarantee about kraken 4.0. Do not substitute recognised text for canonical text. Holdout approval labels must not influence training/tuning or pseudo-label generation.

### Calamari

[Official repository](https://github.com/Calamari-OCR/calamari); [licence](https://raw.githubusercontent.com/Calamari-OCR/calamari/master/LICENSE), checked on 8 November: **GPL-3.0**.

**Offer/use:** Line recognition and an alternative CTC training route. No verified 1405 per-letter masks. Model rights are separate from engine rights. Review obligations before distributing modified software or integrating it into the app; a standalone research process is not the same as copying code into the product. Another CTC engine may share alignment failure modes, so agreement is not automatically independent validation.

### PaddleOCR Arabic

[Official model list](https://paddlepaddle.github.io/PaddleOCR/v2.10.0/en/ppocr/model_list.html), [official Arabic PP-OCRv3 model](https://huggingface.co/PaddlePaddle/arabic_PP-OCRv3_mobile_rec), and [repository licence](https://raw.githubusercontent.com/PaddlePaddle/PaddleOCR/main/LICENSE), checked on 8 November. Both code and this named model card declare **Apache-2.0**.

**Offer:** Arabic-alphabet text-line recognition. The card reports 73.55% whole-line accuracy on its own evaluation, not Quran mask/bar accuracy. **Use:** Low-cost recognition baseline or possible fine-tuning start. **Limitations:** Audit the dictionary against every Uthmani character/mark; fully vocalised 1405 support is unverified. Normal detection/text output is not semantic letter masking; alignment logits require explicit work. No licence/performance claim is extended to uninspected versions.

### TrOCR-Arabic

The name is not one uniquely specified model. [Microsoft TrOCR source](https://github.com/microsoft/unilm/blob/master/trocr/README.md) points to its [MIT code licence](https://raw.githubusercontent.com/microsoft/unilm/master/LICENSE), checked on 8 November. This does not license every Arabic fine-tune.

The concrete candidate [lehrasibali/trocr-finetuned-arabic](https://huggingface.co/lehrasibali/trocr-finetuned-arabic) had an automatically generated card with licence, training data and evaluation unspecified. **Weights unresolved; excluded from use.**

**Usefulness:** Lower priority for known-text alignment. Sequence-generating OCR does not automatically expose valid coordinates; decoder attention is not proven letter ownership. A good transcription is not a successful mask or underline result.

## 6. Research papers

All following paper observations are from 8 November. They are methodological references, not imported datasets, figures, code or weights.

### OCR-Free Transcript Alignment, Hassner, Wolf and Dershowitz

[Author-hosted paper](https://www.cs.tau.ac.il/~wolf/papers/ofta-online-version.pdf) directly matches synthetic transcript renderings to manuscript images with dense flow and local descriptors. This is the closest conceptual precedent for W1: carry text locations through non-linear image correspondence instead of first recognising text.

**Limitations:** Not verified on this 1405 artwork; a sufficiently similar font and correct text remain important. Ambiguous topology/occlusion can break correspondence. **Licence:** no reusable code/data grant established by the inspected paper. Cite the method; do not import its materials without a separate licence.

### Qaroush et al., font-independent Arabic segmentation

[Publisher article / DOI 10.1016/j.jksuci.2019.08.013](https://link.springer.com/article/10.1016/j.jksuci.2019.08.013) combines projection and statistical/topological features. Output is explicitly a **character or ligature**. Reported 97.51% character segmentation on its APTI experiment does not establish 95% fully-under-letter bars on Tanween artwork.

**Use:** Baseline structural ideas, not solved stacked-letter ownership. **Licence:** publisher explicitly states **CC BY-NC-ND 4.0** for the article; code/data reuse licences were not established. No restricted figures/data/code imported. An accessible paper is not a permissive training dataset.

### Mousa, Sayed and Abdalla: projection/amplitude filtering

[arXiv:1707.00800](https://arxiv.org/abs/1707.00800) proposes projection and edge-based segmentation for printed Arabic. Useful for simple connected text; not grounds to repeat a vertical-cut model on stacks. Its linked [arXiv non-exclusive distribution licence](https://arxiv.org/licenses/nonexclusive-distrib/1.0/license.html) is not a general code/data reuse grant. No reusable implementation or dataset selected.

### Osman et al.: multi-font Naskh OCR

[arXiv:2009.09115](https://arxiv.org/abs/2009.09115) reports 98.06% character segmentation on tested corpora and describes Naskh feature extraction/recognition. This motivates experiments, not transferring its headline score to Quran artwork. The paper links the same arXiv non-exclusive distribution licence; implementation/data rights were not verified. No assets imported.

### Arabic Manuscripts Alignment, Segmentation, Recognition, and Classification

[Publisher DOI 10.1145/3732939](https://doi.org/10.1145/3732939) describes manuscript image alignment and regional OCR. The accessible primary abstract does not establish 1405 letter masks or a releasable labelled corpus. **Licence:** code/model/data rights unresolved. Retain as a secondary lead pending full method and rights review.

## 7. Decision gates and accounting

1. Use only explicitly licensed font/code candidates; track model/data rights separately. Record exact revision, hash, licence and notices when acquiring assets.
2. Measure oldmadinafont against 50 development words, separating rendering mismatch, text-cluster ambiguity and registration error.
3. Test kraken or a small licensed CTC baseline on authorised inputs; map characters to app units explicitly.
4. Treat contours as geometry evidence, not semantic labels. Connected-body ownership requires a validated method or human annotation.
5. Score the task's bar, centre, applicable-border, confidence and stacked-word metrics. Published OCR accuracy is not an equivalent measure.
6. Reserve the fresh 15% approval holdout before training on each new batch. Do not use its labels for training, parameter tuning, agreement calibration or pseudo-label selection; score only at checkpoints.
7. Agreement alone does not earn `high`: shared fonts, shared pseudo-labels and common CTC errors undermine independence. Calibrated `high` must meet at least 95% correctness.

W5 accounting: **zero training runs, zero inference runs, zero external asset imports, zero new geometry measurements**. This report contains no fresh held-out score or coverage claim. Its rebuild adds one newly written report and four current web-open attempts (two successful, two tool-access failures), in addition to the retained earlier research. Unresolved rights, font/artwork equivalence and semantic ownership remain real gates. No commit or push performed by this stream.
