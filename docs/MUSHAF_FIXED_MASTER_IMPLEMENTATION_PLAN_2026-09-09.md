# Fixed-master Mushaf implementation plan

> Superseded as an execution plan by the
> [Practical completion plan](./MUSHAF_PRACTICAL_COMPLETION_PLAN_2026-09-09.md).
> Preserve the technical evidence below as history. The owner has since accepted
> the public layout for this stage; earlier rejection notes are historical.
> Pixel-perfect fragment attribution is no longer required for completion.

Latest bounded implementation: [four-target interaction proof](./MUSHAF_BOUNDARY_INTERACTION_PROOF_2026-09-09.md), with exact asset/data binding and independent sample findings. Broader source-body registration, real judging integration and the rejected revision-6 viewport remain unfinished.

Follow-up: [word-boundary findings](./MUSHAF_WORD_BOUNDARY_FINDINGS_2026-09-09.md) now establish exact p254 shape correspondence, the p293 remote-pixel cause and broader corpus flags. A revised isolated interaction proof is the next step. Owner rejected revision 6's scrolling/spacing result; the separate-selector direction remains, but that preview is not visually accepted.

2026-09-09. Owner accepts the separate bottom-selector direction conditional on tighter spacing. Revision 6 implements that final isolated spacing refinement. This plan authorizes no production migration or release by itself.

## Settled layout

Retain the original page artwork, paper token `#fbfaf7`, modest top inset, rounded page corners and existing judging controls. Place one compact page/range selector separately below the page surfaces. Remove page-footer numerals, surah/juz metadata, bridge decoration and the former top selector row. Do not reserve a blank metadata band. No further A/B/C exploration is needed.

Revision 6 has a 2px gap from page surfaces to the selector's hit area and 2px from that hit area to the browser viewport bottom. The visual control remains smaller than its 44px-high hit area. The prototype caption is removed. On a width-limited portrait viewport, unused height appears above the bottom-aligned page; it cannot enlarge further without exceeding available width or changing the fixed page proportions. Production spacing must respect actual device safe areas and existing mobile app controls; literal 2px from a physical screen edge is not promised.

The refinement remains isolated at `http://127.0.0.1:5294/?layout=compact&revision=6`. Four Chromium viewports (1400x900, 1024x768, 390x844, 844x390) passed spacing, aspect-ratio, overflow and page-jump checks. Build and strict scoped TypeScript passed. Desktop and portrait screenshots were reviewed. This is not physical-device verification.

## What the implementation should fundamentally change

One versioned master package owns page artwork, its dimensions, line bands and the mapping from printed regions to existing Tahqeeq word IDs. Runtime code loads that package and applies one uniform scale to the image and interaction overlays. It does not recalculate letter spacing or independently fit individual lines.

Keep three concepts distinct within this one coordinate system: visible Quran ink; the visible highlight wash; the region used to choose a word. Equal-height washes come from shared line bands, not each word's extreme ink bounds. Horizontal endpoints come from reviewed word ownership, not expanding every highlight to the page edge. Genuine calligraphic overhang can exist without assigning the neighboring word's ink to the wrong target.

Adjacent same-style highlights may visually join as a proposed simple default, but saved findings remain independent. Different categories or states must remain distinguishable. Final continuous-versus-fine-separator styling is a small visual decision; it must not change text, IDs, score totals or evidence records. Ayah ornaments remain visible but are not independent marking targets.

## Implementation sequence and completion gates

### 1. Finish source and correspondence verification

This is the next work slice. Pin the image and coordinate source versions, dimensions, hashes, page numbering, provenance and applicable redistribution terms. Confirm what the required 1405 reference includes. A digital package name is not proof of literal physical-edition identity.

Reproduce two known failures against the source and importer:

- Page 254: source region 40903 combines `بَعْدَمَا`, while existing Tahqeeq IDs `13.37.7` and `13.37.8` are separate. Find a defensible source-backed boundary or reviewed geometry for the two existing targets. Do not merge the IDs or invent an equal-width split.
- Page 293: `17.111.17` and `17.111.18` overlap in the supplied rectangles. Establish what belongs to each word and whether the defect is upstream geometry, mapping or the proof's partitioning. Do not repair it with a spacing tweak or a narrower guessed strip.

Extend the existing full-corpus structural audit to classify outstanding semantic differences and suspicious geometry. Check missing/duplicate associations, page/line/ayah/role consistency, out-of-range coordinates and unusually small or overlapping ownership regions. Overlap is a review flag, not automatically a defect. Preserve source text and record justified mapping exceptions as versioned data with evidence and regression cases.

Deliverable: import report, source-backed corrections and explicit unresolved exceptions. Gate: all marking targets for enabled pages have validated ownership; no silent index shifts or unresolved ambiguous target assignments. A partial preview may remain restricted, but disabling legitimate words is not an acceptable all-page production solution. If exceptions proliferate, reassess the coordinate source instead of growing runtime page-specific patches.

### 2. Build one reusable fixed-page surface

Generate per-page data at build time; runtime SQLite or a replacement Quran text database is unnecessary. Bind artwork and overlays by package version and page identity. Reject mismatched or incomplete pairs visibly and prevent marking until the correct pair is ready. Ignore stale asynchronous loads after navigation.

Use a small explicit surface contract: page identity, intrinsic dimensions, line bands, semantic targets, reviewed selection geometry and asset version. Keep existing interaction/evidence ownership in `Mushaf.tsx`; adapt its geometry access and page-surface boundary rather than copying the proof's disposable marking store. Preserve keyboard focus, letter selection and question-range semantics.

Keep the existing renderer available as an explicit temporary rollback choice during development. Do not silently combine old rendering geometry and new overlays, or switch typography per failed page. Retire superseded spacing/measurement paths only after the replacement is accepted.

Gate: representative pages reproduce the accepted master; one transform moves image, washes and targets together; adjacent targets remain distinct through scale changes and navigation. Missing/version-mismatched assets cannot receive marks.

### 3. Integrate one complete judging flow and the settled shell

Use the real `PageNav`, existing page-change handler and Return to question behavior. The isolated selector only knows ten sample pages and must not be copied as the production navigator.

Expected seams, confirmed in current source:

| Area | Scoped change |
| --- | --- |
| `MushafPageSurface.tsx` / its new fixed-source counterpart | Render approved image and matching page geometry; preserve caller-owned interaction hooks |
| `Mushaf.tsx` | Consume fixed geometry, preserve target IDs, letter tray, selection cancellation and question highlighting; host one bottom navigation row |
| `App.tsx` | Reuse PageNav and existing return action through the repositioned controls slot |
| `MushafViewport.tsx`, `mushafFit.ts` | Calculate fit from the new intrinsic aspect ratio and actual shell/navigation dimensions; keep controls outside the scaled/scrolling artwork |
| Scoped styles | Apply approved spacing and paper token; remove superseded top-row/footer decoration for the new surface |

The current fit code assumes an aspect ratio of 0.68 and reserves 40px for a top spread-navigation row. The source image ratio is 1920/3106. Account for image dimensions, shell padding and bottom control allocation explicitly; do not stretch the image into the old ratio or reserve navigation twice. Keep Return to question reachable without moving the selector or covering text. Existing single-page/mobile control duplication must be reviewed in the actual app, not inferred from this layout-only proof.

Preserve production zoom preferences and limits. The isolated proof's 100-250% slider is not authorization to widen the live 100-150% preference range. No new pinch, landscape, exact-line arrow or Unicode mode in this slice.

Gate: mark, select a letter, recategorize, undo, navigate away/back and reload using the real ledger. Verify unchanged target identity, totals and exported evidence against representative existing sessions. Test question focus/return, score-panel widths and both rail sides. Pointer cancellation and scrolling must create no accidental findings.

### 4. Expand coverage and package offline assets

Run corpus validation and render every page for automated comparisons/contact sheets. Inspect all flagged exceptions closely, plus representative openings, dense pages, short endings and multi-surah pages. Qualified review against the agreed reference determines the scope of the physical-fidelity claim; automated tests alone do not certify it.

The roughly 124 MB download is an accepted planning trade-off, not a reason to reopen engine selection. Final package size must still be measured. Cache compressed assets, bound the decoded working set, and profile sustained page turning on target hardware. Install/version the package coherently, report incomplete installation and recover from missing assets without losing marks. Do not predecode all pages.

Gate: cold loading, rapid navigation/load races, interrupted install/update, fresh offline launch, cache loss and recovery all behave correctly. Measure memory and readability on actual target devices. Confirm browser zoom, current supported app zoom, touch cancellation and safe-area clearance without expanding their feature scope. Agree concrete supported-device and performance budgets before release.

### 5. Release the accepted replacement

Review the scoped diff and preserved data contracts. Run proportionate full validation after the integrated slice passes its focused checks. Present the actual judging screen for owner visual review. Commit, push and publish only when authorized, then verify the hosted assets/version and retain a rollback to the prior coherent release. Update the design grammar's top-selector description with the accepted bottom-control arrangement at integration.

## Status and next decision

The visual shell is sufficiently settled to stop redesigning it. Stable artwork scaling, paper color and shared-height line washes are demonstrated in bounded proofs. Full word correspondence, the real judging integration, full-package offline behavior and physical-reference acceptance remain unfinished. No overall completion percentage is meaningful yet.

Proceed next with stage 1: close the two known mapping failures and classify the remaining corpus exceptions. Return with reproducible evidence and a go/no-go for stage 2, rather than another general UI research round. Implementation effort is concentrated in correspondence and integration; the bottom-selector CSS is a small part. A credible total time/token estimate depends on how many exceptions survive this audit.

Confidence in this staged plan: practicality **93/100**, architecture/data safety **91/100**, visual certainty **85/100** for the settled shell direction. The exact revision-6 spacing still needs owner review in their viewport. Production replacement readiness remains below the implementation-ready threshold until source, mapping and real-interaction gates pass.

Basis: current repository integration points, [bounded proof results](./MUSHAF_BOUNDED_PROOF_RESULTS_2026-09-09.md), [known boundary diagnosis](./MUSHAF_PROOF_REFINEMENT_2026-09-09.md), and [compact alternatives](./MUSHAF_COMPACT_ALTERNATIVES_2026-09-09.md). Historical prototype results are not represented as freshly rerun integration tests.
