# Developing Tanween

## Setup and validation

Use Node.js 22.18+ in the Node 22 line and npm. Run `npm ci`, then `npm run dev`.
In Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm`.
Vite defaults to port 5173 and accepts `PORT`.

| Command | Purpose |
| --- | --- |
| `npm test` | Question-index consistency and standard scoring, state, roster, Results, replay, UI-contract, and PWA tests. |
| `npm run test:fixed-mushaf` | Fixed-artwork geometry and package checks. |
| `npm run test:mobile-calibration` | Ready-page, compact presentation, calibration, and package checks. |
| `npm run build` | Question-index check, TypeScript build, Vite bundle, and Sites output packaging. |
| `npm run preview -- --outDir dist/client` | Static client preview; does not emulate Worker routes. |
| `npm run preview:artifact` | Standalone preview artifact, not a hosted release. |

Run focused suites for the changed contract and broader validation where
proportionate. Markdown-only edits need source-claim, link, and diff review;
they do not establish new app or device validation. Optional tests may depend
on local replay assets that are not checked in.

The [README source map](../README.md#project-structure) lists core components.
`src/App.tsx` composes the workspaces; `src/lib/competitionResults.ts` assembles
results, and `src/lib/resultPackages.ts` handles portable result/state formats.
`worker/index.js` and `scripts/prepare-sites.mjs` define hosting output.

## Quran data generation

Normal development uses checked-in assets. Regenerate only as a deliberate Quran
data change with provenance, consistency checks, and visual review.

- `npm run data` rebuilds semantic pages and paired QUL V1 glyph/layout data
  from upstream resources; it needs network access.
- `npm run question-index` rewrites the question index; normal builds only check
  it. Review this diff whenever page data changes.
- `npm run data:fixed-mushaf` builds a versioned package from pinned artwork and
  the reviewed corpus. It expects research inputs under
  `outputs/mushaf-word-boundary-2026-09-09/` and `outputs/fixed-mushaf-source/`.
  A fresh clone may lack those inputs; the runtime package is already checked in.
  Read `scripts/build-fixed-mushaf.mjs` and `scripts/fetch-fixed-mushaf.py` first.

Printed Quran identity, semantic text, hit geometry, and audio timing are separate
contracts. Do not change one to hide a defect in another.

## Release and data safety

Read [AGENTS.md](../AGENTS.md), [design grammar](DESIGN_GRAMMAR.md), and
[current status](CURRENT_STATUS.md). Preserve unrelated dirty work; use a separate
worktree for a bounded release. Keep unresolved rules in
[UNDECIDED_DECISIONS.md](UNDECIDED_DECISIONS.md).

Validate the scoped change, run proportionate full checks, review the diff, and
obtain explicit visual approval for visible UI changes before committing or
publishing. Then commit, push, publish the exact tested source, and verify the
hosted result. A build or GitHub push is not deployment proof.

The existing GitHub workflow can build and deploy on `main` pushes. A documentation
refresh must not deploy a different runtime branch by accident. Documentation-only
commits can use `[skip ci]` to avoid that workflow; do not disable it globally.

Preserve the [legacy storage and format identifiers](CURRENT_STATUS.md#name-and-compatibility).
Do not clear site data as a troubleshooting shortcut: it holds judging state and
local recording evidence. Test offline launch and playback on the intended device
separately from static/browser layout checks.
