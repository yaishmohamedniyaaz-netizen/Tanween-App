# Phrase-aware session storage: implementation contract

23 September 2026. Implemented in `src/state/sessionStorageV3.ts`. The owner
approved normal-app activation and main-site publication after remote review.
Production now selects this store automatically. Development review uses
`?sessionStorage=3`; the isolated legacy UI proof remains available for testing.

## Why a separate store

Older builds write `tahqeeq.session.v1` without understanding phrase evidence or
checking a migration marker. A marker in that key cannot protect a new format
from an already-open old tab. The new `tanween-session-v3` IndexedDB database
therefore owns its own current snapshot, previous snapshot and original legacy
bytes. It does not write or delete the legacy key, audio database, Mushaf caches,
preferences or backup keys.

IndexedDB read/write transactions with overlapping object-store scopes are
serialized. The implementation compares the current bytes and replaces them
inside the same transaction, retaining the previous snapshot atomically.
[MDN: Using IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB)
and [IndexedDB specification](https://www.w3.org/TR/IndexedDB/) support this choice.
Save success is reported on transaction completion, with strict durability
requested. This is not proof against device power loss or browser eviction.

## Implemented behavior

- `inspect()` returns empty, ready, legacy-conflict, recovery-required or blocked.
  It never replaces data or silently recovers an earlier session.
- `migrateLegacy(normalize, emptyState)` takes one legacy read, checks its shape,
  runs the existing normalizer, then initializes only if both the database and
  captured legacy bytes still match. Invalid input remains untouched. Older
  snapshots without roster/history arrays need explicit handling, not a reset.
- Snapshots carry a reader version, revision, unique commit ID and SHA-256 digest
  over the payload and metadata. This detects accidental damage; it is not an
  authentication signature. The existing phrase/package validators also run.
- `save(state, checkpoint)` detaches its input immediately. A stale checkpoint,
  failed transaction or quota failure cannot replace the committed snapshots.
  It returns the committed checkpoint and whether legacy storage changed. If
  legacy storage becomes unreadable after commit, the receipt retains the saved
  checkpoint and exposes the check error; it does not claim the save failed.
- Old-tab edits are detected by comparing the exact legacy bytes. Both copies
  remain available, and further new-store saves stop. Formatting-only changes
  can conservatively trigger a conflict. No automatic merge or preference for
  either copy is implemented.
- `recover(status)` requires the reviewed candidates to remain unchanged and
  the current snapshot to be damaged/missing. It cannot replace a readable or
  newer unsupported snapshot. Damaged bytes are quarantined in the same atomic
  transaction before replacement. A unique commit ID prevents old checkpoints
  from becoming usable again even if recovery repeats a revision number.
- `recoveryCopies()` returns current, previous, baseline, current legacy copy and
  quarantined bytes. Caller mutations to inspected states do not alter storage.

LocalStorage and IndexedDB have no shared transaction. An old tab can write
after a new-store commit; the receipt and subsequent inspection report that
conflict. The older app remains independently editable. This design prevents
its writes from destroying the new evidence; it does not prevent divergent work.

## App integration and remaining release work

The first four items below are now implemented for local review through
`SessionStorageBoundary` and `SessionSaveController`. The app waits for loading,
serializes saves, retains failed work, exposes retry/download, and shows recovery
or conflict screens. It does not automatically reconcile divergent copies.
The built production app ignores the review query and creates no new session
database. Item 5 and explicit approval remain release gates.

1. Await storage inspection before mounting an editable judging session. Never
   render a default empty competition while an existing snapshot is loading.
2. Show recovery, unsupported-version and legacy-conflict states explicitly.
   Preserve/export both copies before a user chooses a recovery or reconciliation.
   Do not automatically retry migration after an uncertain completion.
3. Serialize this tab's saves, using each successful checkpoint for the next
   save. Keep pending in-memory work on failure; expose pending/saved/failed status.
   Never autosave a recovered/default state before the user reviews it.
4. Reinspect on relevant storage events and return to the tab. Do not silently
   overwrite the current judge's unsaved work with another tab's state. Test rapid
   marking, participant changes, finalization and tab closure through the provider.
5. Resolve repeat/eligibility decisions in undecided entry 31, then connect the
   phrase writer and file-import paths. Test full app reload/recovery, multi-tab
   status UX and rollback on representative devices before production cutover.

## Executed checks

`node scripts/qa/phrase-storage-browser.mjs` (also `test:phrase-storage`) runs
against the local Vite server at 127.0.0.1:5320; override `QA_BASE_URL` if needed.
The test runner uses isolated Chromium contexts and a disposable profile for
the process-restart check. It does not open the user's browsing profile.

19 scenarios passed: byte-preserving migration, reload, concurrent tabs,
correction/undo/restore, detached input, injected quota/transaction failures,
post-commit legacy conflicts, checksum damage, healthy-snapshot protection,
legacy divergence, explicit recovery/quarantine/export, unsupported formats,
initialization races, migration-time legacy edits, actual normalizer integration,
malformed legacy input, denied legacy storage, future database versions and a
fresh browser process. These are browser/injected-failure checks, not physical
disk-full, power-loss, Safari or installed-PWA acceptance.

Results: `outputs/phrase-header/storage/results.json`. Full app regression suite:
407 passed, one existing skip after production activation. TypeScript, index validation, production build and
diff whitespace check passed. Existing large-bundle warning remains.

Provider checks at 390×900 and 1400×900 use the real app under React StrictMode:
12 Quran findings, pending/saved feedback, reload, injected quota failure,
standard-backup download of unsaved work, retry, competing tabs, finalization,
reciter change and explicit recovery. Recovery also fits 320px dark mode. Boot
checks cover invalid legacy data, a newer format and legacy divergence. The
actual recorder with fake audio remains mounted and can pause during a save
failure without a second microphone request. Screenshots were inspected.
See `outputs/phrase-header/provider/` and `test:session-provider`.

The phrase panel now writes saved deductions in ordinary production sessions.
Development review uses both `phraseHeader=1` and `sessionStorage=3`. The owner confirmed
that re-marking corrects the existing finding. The same category preserves its
amount, changing category uses the configured step, and restore cannot duplicate
a newly marked copy of the same letter. The standalone header proof retains its
temporary adapter; production file imports and backups accept validated phrase evidence.
`test:phrase-practice` checks real pointer marking, hold undo, reload, correction,
finalization/reopening, result and backup roundtrips at 390px and 1400px.
Recovery bundles include raw retained copies; they do not implement automatic
merging. Physical mobile/PWA acceptance and owner approval remain pending.

Confidence for the local provider integration: practicality **93/100**,
architecture/data safety **91/100**, visual certainty **86/100** for the inspected
views. These scores do not approve production cutover or unresolved eligibility.
