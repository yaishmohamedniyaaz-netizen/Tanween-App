# Starting & ending: implementation progress

23 September 2026. Isolated branch `codex/starting-ending-header`, based on
the verified Sites version 135 source `ca19494071c03eacab364067eb88e9a567cea83a`.
The original dirty working directory is preserved. No commit, push or publication.

## Implemented locally

- One labelled header entry before Results on desktop. Compact active judging
  reserves the row for reciter/Return, phrases, recording when relevant and More.
  Results (including unresolved count) and theme move into More only in this state.
- The Arabic card overlays the workspace and avoids the page selector and phone
  judge deck. It does not participate in the page-fit calculation.
- Retained exact Arabic strings, shared letter/category tray, full-word colour
  wash, multiple-finding count, correction and hold-to-undo. No romanisation is
  rendered. One-time help is reopened with `?`.
- Removed access variants, sample review, persistent instructions and the extra
  navigation strip from this integration. Reused shared tray code rather than
  introducing another marking mechanism.
- More/page entry/phrase editing coordinate dismissal. Keyboard handoff does
  not steal focus. The first press on the Quran dismisses phrases without marking.
- Short landscape retains the selected source word and undo; category choices
  scroll within the tray. Help and Close remain reachable. The tray can occupy
  part of the title area in this constrained state; this needs visual acceptance.
- Recording remains directly accessible. Compact labels distinguish Live,
  Paused, Error, Low and transitional Wait; the full status remains in the
  accessible name. Narrow Return retains its page number.
- Ported the experiment's bounded Fit correction: tablet/short landscape now
  measures an externally sized container instead of recursively measuring the
  rendered page. The failure was reproduced as a 3px-wide page before the fix.

## Deliberate development boundary

`?phraseHeader=1` works only in a development build, during an active sample
recitation with assigned pinpoint categories. The normal production build cannot
enable it through that URL. `PhraseHeaderControl` holds temporary UI findings;
`StartingEndingPanel` receives findings and callbacks separately from storage.
Temporary findings are not official deductions and reset when their adapter
unmounts, the recitation changes or the page reloads. Do not release this adapter
as production scoring. The first chunk changed no official storage, evidence
schema or competition rule; the reader foundation below now adds types and file
formats while retaining the write barrier. This boundary is disclosed here and in the delivery message, not as
permanent explanatory clutter inside the proposed judging UI.

## Verification

- TypeScript and production build pass (existing large-bundle warning remains).
- Built-client browser check confirms the query flag is disabled in production
  and enabled for the equivalent active sample only on the development server.
- Existing suite: 387 passed, one existing skip; 6,236 ayahs checked against
  8,820 indexed recitation lines. The guide-suppression assertion now accounts
  for the phrase panel as well as More.
- Real Chromium runs at 320, 390, 430, 740, 900, 1024 and 1400px widths: panel
  position, page/header/navigation geometry, mark/correct/hold-undo, repeated
  reopening, tray settling and reachable Close, More/page-picker exclusion.
- Header-only fixtures cover long names in idle, recording, paused, interrupted
  and error states at those seven widths. These are simulated status renders.
- Separate full-app runs use Chromium fake audio through the actual recorder
  to check start/pause/resume, Return, two marked letters and count, and no new
  microphone request or official session write when using phrase controls.
- Pointer drag, touch tap, keyboard cancellation/handoff, one-time/help reopening,
  protected first Quran press, full/spread and both rail positions checked.
- Screenshots inspected at phone, desktop and short landscape sizes. Dark-theme
  captures wait for the existing theme transition to finish.
- QA scripts live under `scripts/qa/phrase-header-*`; outputs under
  `outputs/phrase-header`. All fixtures are local-only and use sample data.

Browser emulation is not physical iOS/Android/PWA acceptance. Enlarged-text and
screen-reader acceptance, all-word short-landscape traversal, and the final
production evidence/compatibility round trips remain release gates.

## Next chunk and decisions

Resolve entry 31 of `UNDECIDED_DECISIONS.md` before enabling writers. Typed phrase
evidence and compatible readers are implemented in the second chunk below. Validate reload/recovery, correcting and
undoing saved findings, participant changes, optional ending, judge packages,
final totals, reports and older-client behaviour. The existing proof must not
be used to claim those contracts already work.

Present this visible slice for owner review before commit/publication under
AGENTS.md. No automatic detection or production deployment is bundled into it.

Confidence for this chunk: practicality **92/100**; architecture/data safety
**94/100 for the isolated UI proof**, not an endorsement of unimplemented saved
scoring; visual certainty **84/100**, pending physical-device and owner review.

## Second chunk: saved-evidence readers (23 September 2026)

Implemented locally; no commit, push or publication. This is a reader foundation,
not an enabled feature for saving phrase deductions in the app.

- Added distinct Quran/phrase evidence types. Phrase targets retain the exact
  catalogue version, Arabic word, semantic letter offsets, judge and explicit
  occurrence identity. No repeat, eligibility or omission rule was selected.
- Added validation of source text, target identity, category ownership, correction
  history, undo/restore snapshots and agreement between the ledger and current
  findings. Unknown versions and disguised Quran coordinates are rejected.
- Ledger projection clones nested phrase targets. Saved-record normalization and
  result totals retain phrase evidence; Quran target migration skips it.
- Retained existing review, findings and print layouts. Recomposed location
  labels and print groups around typed references; removed Quran page jumps and
  unverified-Quran-location copy for phrase findings. Arabic evidence uses the
  phrase panel's font and size. The report/workbook retains exact Arabic.
- Phrase-bearing judge packages/backups use new v2 envelopes and reader version
  3; the session JSON summary uses schema 4. The old reader was executed against
  these fixtures and rejects both new envelope formats. Existing Quran-only v1
  files remain compatible, including legacy records inside a mixed backup.
- Official ADD_MISTAKE, LOAD and IMPORT_SESSION paths reject phrase input. File
  import/restore wrappers also reject phrase evidence after validation. The UI
  proof continues to hold temporary findings only.

### Verification and boundaries

- Full configured suite: **398 passed, 1 existing skip** (399 total), including
  11 new focused reader tests. TypeScript, production build, question index and
  diff whitespace checks pass. Existing large-bundle build warning remains.
- Focused tests cover every letter of all 12 catalogue words, malformed Unicode,
  unknown source versions, correction/undo/restore, exact file round trips,
  normalization stability, combined result totals, JSON/workbook output, old-reader
  rejection and disabled file-import entry points.
- Real Chromium at 390×844 and 1400×900: all three phrase findings, Arabic
  inspection, light/dark screenshots, print content/total, no horizontal overflow
  in the review and no fixture localStorage writes. Also checked against a loaded
  112:1 passage: selecting any phrase neither changes its page nor marks a Quran
  word. Screenshots were inspected; physical-device approval remains open.
- Production build browser check confirms the query flag cannot enable the
  temporary header adapter. Local-only fixture: `scripts/qa/phrase-evidence.html`.
  Evidence and test log: `outputs/phrase-header/readers/`.

This does **not** prove app reload/recovery or multi-tab storage compatibility.
The existing `tahqeeq.session.v1` storage key and initializer are unchanged. New
file envelopes protect file imports, not old open tabs sharing that storage key.
Before writers can be enabled, choose and test a storage/rollback strategy and
resolve entry 31's repeat and eligibility decisions. No automated detection,
new microphone use, physical-device acceptance or hosted release is claimed.

Confidence: practicality **93/100**; architecture/data safety **90/100 for this
reader foundation**, with writers still gated; visual certainty **85/100 for
the inspected reader views**, pending owner/device acceptance.

## Third chunk: isolated storage and recovery (23 September 2026)

Built `src/state/sessionStorageV3.ts` and validated it in real Chromium. The
normal app's provider/save path remains unchanged, and phrase writers remain
disabled. No commit, push, publication or production migration.

The new store retains original legacy bytes, current and previous snapshots;
rejects stale saves transactionally; detects legacy-tab divergence; validates
snapshot integrity; and requires explicit recovery while retaining damaged
bytes. Recovery cannot overwrite healthy/newer unsupported data. A completed
save remains reported as committed even if the subsequent legacy check fails.

All **19 storage scenarios** pass, including separate tabs racing the same
checkpoint, corrected/undone/restored findings across reloads, injected quota
failure/transaction abort, exact legacy migration through the existing
normalizer, and a fresh browser process reading the saved evidence. The full
suite remains **398 passed, 1 existing skip**; TypeScript, index and production
build pass. Production JS/CSS hashes are unchanged from the reader chunk.

See [storage contract](PHRASE_STORAGE_CONTRACT.md) for architecture, sources,
test commands and precise limitations. This proves the storage API in isolated
browser fixtures, not the full app's save/recovery UX. Next: connect loading,
serialized saves, pending/failed status and recovery/conflict screens before
switching the provider; then enable phrase writers only after the pending
repeat and eligibility decisions. Physical-device/rollback acceptance remains.

Confidence: practicality **92/100**; architecture/data safety **90/100 for this
storage layer**; visual certainty **unchanged at 85/100 for the reader views**.
There is no new product surface to visually approve in this chunk.

## Fourth chunk: app saving and recovery UI (23 September 2026)

The real app now uses the new storage when opened locally with
`?sessionStorage=3`. Production ignores this development review flag. Normal
Quran deductions save through the real reducer and survive reload; the Starting
& ending adapter still holds temporary practice marks until its scoring rules
and writer are connected. No commit, push or publication.

- Retained the judging controls, page geometry and recorder lifecycle. Added a
  quiet Saving/Saved status inside More. Failure notices overlay the workspace
  without moving the Mushaf or page selector; recording controls remain usable.
- Saves are serialized and rapid renders coalesce into a complete latest ledger.
  Failures retain this tab's work. Retry uses the last committed checkpoint;
  stale tabs cannot adopt a newer checkpoint and overwrite its data.
- Failed work downloads as the existing backup format, with retained copies
  attached. Unfinished saves trigger the browser's leave-page protection.
- Loading blocks judging until a stored session is ready. Damaged, conflicting
  or newer-version data never silently opens a blank/default competition.
- Recovery shows the saved time, current reciter/findings, result count and last
  completed reciter. Restoring requires acknowledgment of potentially missing
  later work and preserves damaged bytes. Conflict screens preserve/export both
  copies; they do not automatically merge or choose a winner.

Verification: **405 tests passed, 1 existing skip**, including seven save-queue
tests. Real-app Chromium checks at 390 and 1400px cover 12 findings, reload,
pending/saved status, injected quota failure, downloaded backup content, retry,
two-tab conflict, finalization, reciter change and recovery. Checked 320px dark
recovery and boot errors. Fake audio through the actual recorder confirms pause
remains usable during a failed save and no extra microphone request occurs.
Production gate confirms both query flags are disabled in the built client and
no new session database is created. Build/index/diff checks pass; existing
large-bundle warning remains. Evidence: `outputs/phrase-header/provider/`.

Review URL: `http://127.0.0.1:5320/scripts/qa/mobile-paper.html?phraseHeader=1&sessionStorage=3`.
Use Load prepared mobile sample, then Begin judging. This is the real app with
a prepared practice reciter; it does not publish or use the user's browser profile
for automated tests. Explicit visible approval remains required before release.

Next: resolve how repeated phrase letters count, connect phrase findings to
the saved ledger, and complete the remaining rule/device/release gates.
Confidence: practicality **93/100**; data safety **91/100**; visual certainty
**86/100** for the inspected local screens, pending owner/device acceptance.

## Fifth chunk: saved practice phrase marking (23 September 2026)

Owner decision: marking the same phrase letter again updates the existing
mistake, like Quran controls. This supersedes the repeat-rule question above.

- Retained the top-bar entry, Arabic catalogue, highlighting and shared letter
  tray. Replaced temporary findings with saved session evidence in the local
  sample review (`phraseHeader=1&sessionStorage=3`). No new visual surface.
- Phrase marks now affect the practice score, survive reload, and remain with
  completed/reopened results. The next reciter starts without these active marks.
- Re-marking the same category is a no-op, including after manual amount
  adjustment. Changing category corrects the same finding with the configured
  step. Hold undo uses the existing event history. Restoring an old mark cannot
  stack another deduction onto a letter already marked afresh; package validation
  enforces that same invariant.
- Exact versioned phrase targets carry the active recitation and judge identity.
  Malformed targets, another judge/recitation, and non-sample sessions are blocked.
  Completed phrase records identify themselves as ledger version 3. Closing stays
  optional; merely opening the panel never deducts marks.

Verification: saved practice browser flow passed at 390×900 and 1400×900,
including actual pointer marking/hold undo, same-category re-mark, adjusted
amount, category correction, reload, restore, duplicate-restore prevention,
finalization/reopening and package/backup roundtrips. Screenshots inspected.
Existing recording/Return/isolation flows passed at 320, 390, 740 and 1400px;
provider failure/recovery checks passed again. Full suite: 406 passed, one
existing skip. TypeScript, question index and production build passed. Evidence:
`outputs/phrase-header/practice/`; run `node scripts/qa/phrase-practice-browser.mjs`.
The built-client check also confirmed that neither review flag enables the
header control or creates the new session database in production.

Local implementation only: no commit, push or publication. Production cutover,
phrase-file import UI, printed/panel Bismillah coordination, eligibility and
physical-device/owner acceptance remain release gates. Confidence for this local
slice: practicality **94/100**, architecture/data safety **92/100**, visual
certainty **86/100**. Browser checks do not substitute for device acceptance.

## Main-app activation and left placement — 23 September 2026

Owner approved the remote review, requested the control immediately left of the
participant card, waived another preview checkpoint, and explicitly selected
"Enable and publish to main Tanween". This supersedes the development-only
activation and release gates above for the manual feature.

Retained the popup, Arabic text, category gestures and help. Reordered the header
DOM and compact grid together. Panel positioning considers every visible page
control, keeping navigation accessible after the desktop anchor moves left.
Enabled production storage migration, saved marks, typed result import and
backup restore together. Imported conflict copies retain their original
recitation identity through review, correction, resaving and reload.

Checks: 407 automated tests passed, one existing optional Tilawa asset skip;
TypeScript, index validation and production build passed. Real Chromium checks
covered old-session migration with unchanged legacy bytes, ordinary competition
marking, category correction, reload and left-side placement at 390px and 1400px.
The practice flow also covered backup restore and conflicting result imports
through the real file readers/reducer. Existing failure/recovery and recording
checks passed. Screenshots inspected; physical-device testing remains broader
than this automated evidence. Evidence: `outputs/phrase-header/production/`.

Publication uses the existing main Sites project, keeping its public audience.
Confidence: practicality **95/100**, architecture/data safety **92/100**, visual
certainty **90/100** for the verified desktop and compact layouts.
