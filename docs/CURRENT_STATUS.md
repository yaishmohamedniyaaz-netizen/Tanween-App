# Tanween current status

Source review: **16 September 2026**. This describes inspected source, not a new
deployment or a claim that every device has passed acceptance testing.

## Branches and source checkpoints

| Source | Checked commit | Contents |
| --- | --- | --- |
| GitHub default `main` | `db95f8fbae9b1ffaf8bd2a11e7aab7666a365f33` | Fixed artwork, mobile judging, Results overview, recording recovery, floating Adu / Raagu pickers, fade boundaries, and adjacent desktop-spread preloading. Runtime branding still says Tahqeeq at this checkpoint. |
| `codex/tanween-header-release` | `260bf979c4ba09a697787f8079b2501ae0e5a3ae` | Approved Tanween header, browser title, and installation icons. |
| `codex/tanween-results-release` | `ca19494071c03eacab364067eb88e9a567cea83a` | Identity changes plus refined participant workbooks/Results, spread-marking and letter-rail fixes, replay context matching, and Mushaf kalima presentation. |

The release source contains five commits beyond the inspected main checkpoint.
This documentation refresh does not merge those runtime changes. Check ancestry
again before releasing and package the exact validated commit. The default
GitHub branch is not necessarily identical to a hosted build.

## Implemented in the inspected main source

| Area | Current behavior |
| --- | --- |
| Mushaf | Fixed artwork across 604 pages; semantic text and geometry support word selection. `fixedMushaf=0` retains the legacy QCF renderer. |
| Judging | Exact targets in the connected rail, category assignments, event-based score history, undo, Adu / Raagu input, and reasoned reopening. |
| Preparation | Recoverable participant drafts, manual/paste/file intake, Template V7, question preparation, and saved question evidence. |
| Results | Participant overview includes participants awaiting results. Review resolves source choices and missing criteria before finalization; legacy review remains behind `resultsOverview=0`. |
| Recording | Local manifests/chunks, interruption recovery, saved-session playback, and experimental word/ayah replay tools. |
| Device/offline | Compact judging layout enabled by default; PWA shell and versioned Mushaf cache support offline preparation. |

See the [README source map](../README.md#project-structure) for entry points.

## Later release-source changes

These records exist on the checked Tanween release commit. Validation statements
describe those runs; they were not repeated for this documentation edit.

- [Tanween identity](https://github.com/yaishmohamedniyaaz-netizen/Tanween-App/blob/ca19494071c03eacab364067eb88e9a567cea83a/docs/TANWEEN_SITE_IDENTITY_RELEASE_2026-09-13.md).
- [Results and workbook refinements](https://github.com/yaishmohamedniyaaz-netizen/Tanween-App/blob/ca19494071c03eacab364067eb88e9a567cea83a/docs/TANWEEN_RESULTS_RELEASE_2026-09-13.md).
- [Replay context matching](https://github.com/yaishmohamedniyaaz-netizen/Tanween-App/blob/ca19494071c03eacab364067eb88e9a567cea83a/docs/REPLAY_IMPLEMENTATION_2026-09-15.md)
  and [kalima display](https://github.com/yaishmohamedniyaaz-netizen/Tanween-App/blob/ca19494071c03eacab364067eb88e9a567cea83a/docs/REPLAY_KALIMA_DISPLAY_2026-09-15.md).

Some notes say “local” or “not committed”: that describes when they were written.
Git history establishes their later inclusion in this source commit; neither a
commit nor an old note proves current hosting.

## Name and compatibility

**Tanween** is the product name; **Tahqeeq** is its former name. The canonical
repository is [Tanween-App](https://github.com/yaishmohamedniyaaz-netizen/Tanween-App).

Keep these legacy identifiers until a deliberate, tested migration exists:

- `tahqeeq` browser state/preference keys and migration backups;
- `tahqeeq-recitation-audio` and associated IndexedDB records;
- versioned Mushaf/PWA cache namespaces;
- `app: "tahqeeq"`, backup/result schemas, and `_Tahqeeq` workbook metadata;
- existing PWA identity, start URL, scope, and hosting origin.

The private npm package name remains `tahqeeq`; it is build metadata, not the
product's display name. Historical filenames, commits, and dated research retain
their original names for traceability.

## Remaining acceptance boundaries

- Recognition and generated timings do not award or deduct marks. Exact audible
  onset, repeated occurrences, missing audio, and corrections need real-recording
  checks; code coverage is not listening proof.
- Browser viewport checks do not establish physical iOS/Android installation,
  microphone behavior, playback, or complete offline operation.
- State backups and judge-result JSON files do not carry IndexedDB audio blobs.
  File transfer is not automatic recording synchronization.
- Opening/closing phrase marking and new deduction policies need explicit product
  and rule decisions; proposals do not establish approval.
- Local work outside checked remote branches is not listed as available. Consult
  [unresolved decisions](UNDECIDED_DECISIONS.md) before changing rules.
