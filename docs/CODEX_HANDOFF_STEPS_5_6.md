# Handoff to Codex: Step 5 and Step 6

Written by Claude for Codex. Owner: Yaish. Read all of this once before you start.

## 0. What this is

Tanween is a Quran recitation judging app. Steps 1–4 of a design pass are done
and pushed on branch `claude/judging-final-polish`. You are doing two more
steps:

- **Step 5:** the reciter queue and the moment after a recitation is saved.
- **Step 6:** the decided fonts, colours and sizes across the whole screen,
  plus 44px tap areas, focus ring and reduced motion.

Step 7 (Dhivehi and Arabic UI text) is **not** part of this. Do not touch
translations or Arabic UI fonts.

Every decision below is already made by Yaish. Your job is to build it
exactly, not to redesign. If something here is impossible or conflicts with
the code, **stop and write it in your report**. Do not invent a new design to
get around it.

## 1. Before you start

1. Read `AGENTS.md`, `docs/DESIGN_GRAMMAR.md` and `docs/UNDECIDED_DECISIONS.md`.
   They are the house rules. This file does not replace them.
2. Branch from `claude/judging-final-polish` (not from `main`):
   - Step 5 → branch `codex/step-5-queue`
   - Step 6 → branch `codex/step-6-tokens`, started **after** Step 5 is merged
     or at least committed, from the Step 5 branch.
3. Run `npm install`, then `npm test` and `npx tsc -b`. Both must pass
   **before** you change anything (444 tests passed at commit `b7075f7`). If
   they do not pass at the start, stop and report.
4. One commit per numbered task below (5.1, 5.2 …). Small commits are easier
   to review and to undo.

## 2. Things you must NOT change

These are the real risks. Breaking any of them loses or corrupts a judge's
marks.

- **Scoring and store logic.** Do not change `src/state/store*`, reducer
  actions or their payloads, or any file under `src/lib/` that computes
  marks, decks or draws (`questionDeck.ts`, `reciterQuestions.ts`,
  `rosterQueue.ts` ordering rules, `judgeAssignments.ts`, scoring). You may
  only **call** existing actions.
- **The draw.** `StartDialog.tsx` functions `chooseParticipant`,
  `markParticipantAbsent`, `prepareWithQuestion` and `drawPosition`, and the
  `FREEZE_DECK` effect, must behave exactly as now. You change the screen,
  not what these do.
- **Saved data and storage keys.** Do not rename or remove any
  `localStorage` / `sessionStorage` / IndexedDB key, including
  `tahqeeq:devicePreferences.v5` and the `tahqeeq.*` hint keys. Old saved
  sessions must still open.
- **The Quran page.** Do not change the Mushaf font (`HafsUthmanic`), the
  Quran text size, word positions or page layout. Step 6 is about the
  interface around the page, not the page.
- **Exports.** Do not change export files (`exportSession.ts`,
  `judgeRecordsWorkbook.ts`).
- **Category labels in data.** `src/config.ts` `label` values
  (`"Laḥn Jalī"` etc.) are used in records. Do not edit them. Short names are
  a display change only (see 6.4).

If a test fails because it checks one of these, your change is wrong. Fix
the change, not the test.

Tests that check **CSS or TSX text** (regex "source-contract" tests in
`scripts/*.test.mjs`) are different: they pin the old design. When the design
here changes what they check, update the test to the new value, and say which
tests you updated in your report.

## 3. How to check your work in a real browser

- Start the app: `npx vite --host 127.0.0.1 --port 5346 --strictPort`.
  The QA sample button only works on ports **5296, 5320 or 5346**.
- Open:
  `http://127.0.0.1:5346/scripts/qa/mobile-paper.html?sessionStorage=3&qaSurah=1&qaAyah=1&qaLines=7`
- Click **Load prepared mobile sample**, then **Begin judging**.
- Wait until `window.providerQA.state.sessionActive` is `true`.
- Add test mistakes in the console: `window.providerQA.addFindings(3)`.
- Check these sizes: **1440×900, 1280×800, 1024×768** (desktop), and a
  phone in portrait (**390×844**). Check **light and dark** theme.
- Playwright is installed. Chromium is at `/opt/pw-browsers/chromium`. Do
  not run `playwright install`.

---

## Step 5 — Reciter queue and "after save"

### 5.1 No pop-up after saving (desktop)

**Now:** in `src/App.tsx`, `finishRecitation()` ends with
`setStartMode("start"); setStartOpen(hasNextReciter);` (around line 241).
So after **Save**, the queue dialog pops up over the page.

**New:** after Save, do **not** open the dialog. The rail already shows
`CompetitionIdlePanel` when no session is active and nothing is prepared.
That panel has "Next reciter", "Choose question" and the queue. That is the
new "after save" screen.

- Change only that line: open the dialog only on layouts where the rail is
  **not visible**. **Risk:** on phone portrait the rail may be hidden. If
  removing the pop-up leaves the phone with no way to the next reciter, keep
  the pop-up on phone. Check this in the browser at 390×844 before deciding,
  and write in the report what you found.
- After save, move keyboard focus to the "Choose question" button of the
  idle panel (so a keyboard judge can press Enter).

**Done when:** at 1440×900, Save → no dialog, rail shows the next reciter,
focus is on its "Choose question" button. Phone still reaches the next
reciter.

### 5.2 One list: pick a row, then one action

**Now:** `src/components/ParticipantSelectionScreen.tsx` shows a separate
"Next" card (`.next-reciter-row`) with "Choose question" and "Not here",
then groups by category (`queue-group`). Each row is a button that
**immediately** goes to the draw ("Select" / "Not here" / "Finished").

**New:**

- Remove the separate "Next" card. The recommended reciter is the
  **selected row** at the start.
- Each row shows a small tag on the right: **Next** (the recommended one),
  **Ready** (the prepared reciter, `state.preparedRecitation.participant`),
  **Not here** (absent), **Finished** (judged). Waiting rows without a
  special state show no tag.
- Clicking a row **selects** it (it does not go to the draw). Selected row
  has `aria-selected="true"` and the same tint style as the current-surah row
  in the page finder (`.page-finder` rows with `[aria-current]`, tint + left
  bar).
- Below the list, one fixed action row:
  - primary button **"Choose question for {name}"** → calls the existing
    `onChoose(entry)`;
  - ghost button **"Not here"** → calls the existing `onMarkAbsent(entry)`.
    For an absent reciter this button reads **"Back in queue"** and calls
    `onChoose(entry)` (which already clears absent, see
    `chooseParticipant`).
  - Finished reciters: both buttons disabled; text
    "{name} is finished."
- Keyboard: the list is a `role="listbox"`, rows `role="option"`. Up/Down
  move the selection, Enter = "Choose question for {name}". Copy the
  key-handling pattern from `src/components/PageNav.tsx` (page finder), which
  already does this.
- **Finished rows go to the end** of each group. Do this in the component
  (sort a copy for display). Do **not** change `rosterQueue.ts`.
- Keep: search field, groups, expand/collapse, empty texts, the
  `quiet-scroll` class on `.queue-scroll`.
- Use the same list in `CompetitionIdlePanel` if it is simple to reuse. If
  it is not simple, leave the idle panel as it is and say so in the report.
  Do not build two different list designs.

**Done when:** keyboard alone can pick any waiting reciter and reach the
draw; marking "Not here" moves selection to the next waiting reciter (this
already happens through `markParticipantAbsent`); nothing else in the draw
changed.

### 5.3 Dialogs take focus and close on Esc

**Now:** `StartDialog` handles Esc only when focus is already inside, and
focus is not moved into it when it opens.

**New** (for `StartDialog` and `FinishDialog`):

- On open, move focus into the dialog: to the selected row (queue), the
  first draw number (draw stage), or the primary button (finish).
- Esc closes from anywhere while open (listen on `window`, like
  `MoreActionsPopover.tsx` lines 127–138).
- On close, return focus to the element that opened it.
- Tab stays inside the dialog (wrap from last to first and back).
- **Risk:** FinishDialog's Esc must **not** save. Esc = close without saving.

### 5.4 "Change question" / "Change reciter" one per row

**Now:** `PreparedSidebar` puts both in `.prepared-sidebar-secondary`, a
2-column grid, so "Change question" wraps to 2 lines.

**New:** one button per row (single column), full width, ghost style,
min-height 44px. Only change the CSS grid; do not change the handlers.

### 5.5 Header small labels at 12px

In `src/styles/global.css`:

- `.reciter-prepared-state` ("Ready" badge, about line 9790): 8px → `var(--t-micro)` (12px).
- `.reciter-question-ref` ("Q · …", about line 7898): 9.5px → `var(--t-micro)`.
- Header label for a prepared question: show **"Question 2:1–2:5"** instead
  of "Q · 2:1–2:5"; manual questions show **"External question"**. Use the
  same rule as `questionLabel` in `src/components/FinishDialog.tsx`.
- **Risk:** the header chip is 268px wide. At 1024×768 the longer label must
  not push other header buttons off-screen. If it does, truncate the label
  with ellipsis and keep the full text in `title`.

### 5.6 Start screen content stays centred

The queue/draw dialog content is centred on the screen (vertical and
horizontal), not stuck to the top. Check it at all three desktop sizes and
make sure nothing is cut off (DESIGN_GRAMMAR rule 7).

---

## Step 6 — Fonts, colours, sizes, tap areas

Do these as separate commits, in this order. Check the browser after each.

### 6.1 Fonts

Decided fonts:

| Use | Font | Weights |
|---|---|---|
| Interface text (`--ui`) | **Manrope** | 500 body, 600 labels |
| Numbers (marks, totals, counts) | **Nunito Sans** | 520, `font-variant-numeric: tabular-nums`, `letter-spacing: 0.045em` |
| "Tanween" brand word only | **Platypi** | 600 |

- Self-host them like `InterVariable.woff2` (`public/fonts/`, `@font-face`
  at the top of `global.css`). All three are SIL Open Font License; put the
  license text in `public/fonts/` next to them.
- Get the files from npm: `@fontsource-variable/manrope`,
  `@fontsource-variable/nunito-sans`, `@fontsource-variable/platypi`
  (copy the latin `.woff2` into `public/fonts/`; do not import their CSS).
  If one of these packages does not exist, try `@fontsource/<name>`. If npm
  cannot reach them, **stop and report**; do not use a Google Fonts link
  (the app must work offline at competitions).
- Change `--ui` to `"Manrope", "InterVar", system-ui, …` (keep InterVar as
  fallback; do not delete the file).
- Add `--num: "Nunito Sans", var(--ui);`. Apply it only to number elements:
  score totals, pill amounts (`.pill-amt`), mark boxes, step values
  (`.step-val`), mistake counts, page numbers. Search `tabular-nums` in
  `global.css` to find most of them.
- Body weight 500, label weight 600 (where labels are now 600/650/700,
  use 600; do not touch headings that are bigger than `--t-title`).
- Labels in capitals keep `letter-spacing: 0.12em`.
- **Risk:** Manrope has **no ṣ or ḥ** glyphs that match (they fall back to
  another font and look different). That is why 6.4 exists. Do 6.4 in the
  same pull request.

### 6.2 Colours

Change the values in `:root` and `[data-theme="dark"]`. Keep the variable
names.

| Variable | Light now → new | Dark now → new |
|---|---|---|
| `--bg` | `#f2f1ee` → `#f3f2ee` | `#131316` → `#151413` |
| `--surface` | `#ffffff` → `#fdfcf9` | `#1c1c20` → `#1e1e1d` |
| `--ink` | `#1a1a1c` → `#1e1a14` | `#ebebed` → `#f0eae3` |
| `--ink-2` | `#62626a` → `#67625c` | `#a4a4ac` → `#a9a49d` |
| `--ink-3` | `#6a6a73` → `#6f6a64` | `#8b8b95` → `#918b84` |
| `--ring` | `rgba(85,102,230,.35)` → `#3358d4` | `rgba(120,135,255,.45)` → `#7f95f0` |
| `--gold` | `#b3892f` (same) | `#c9a052` (same) |

Update the contrast comments above `--ink-3` with the new numbers:
light `#6f6a64` = 5.22:1 on surface, 4.78:1 on bg; dark `#918b84` = 4.95:1 on
surface, 5.46:1 on bg.

`--line`, `--line-2`, `--hold-wash` and others use the old light ink as
`rgba(26, 26, 28, …)` — 10 places in `global.css`. Change that RGB to the new
ink `30, 26, 20` in all 10. Keep each alpha.

Category colours (`.cat-*` blocks, about line 135):

| Class | `--c` now → new |
|---|---|
| `.cat-jali` | `#d8453d` → `#ca244d` |
| `.cat-khafi` | `#c0892a` → `#d58e3a` |
| `.cat-fasaha` | `#5566e6` → `#3358d4` (dark theme: `#385edb`) |
| `.cat-adu-raagu` | `#377b60` (no change) |

- Change the RGB inside `--c-wash` and `--c-wash-strong` to match the new
  `--c`. Keep the alpha.
- Re-pick `--c-strong` (text colour on tint) and `--c-tint` only if the new
  pair fails 4.5:1. Measure, do not guess.
- **Risk — Khafi chip text.** A chosen chip has text in `var(--c-on,
  #ffffff)` (about line 10869). White on `#d58e3a` is only about 2.7:1 —
  fails. Add `--c-on: #1e1a14;` to `.cat-khafi` (about 6.3:1). Jali
  (white 5.4:1) and Fasaha (white 6.0:1) are fine with white.
- Status colours: needs review `#b56839`, ready `#47769c`, finalized
  `#4b8061`. Find the current status variables or classes (search
  `needs-review`, `finalized`) and change only their colour values.

Write a small script (or a test) that prints the contrast of every text/
background pair above, in both themes, and put the output in your report.

### 6.3 Text sizes

DESIGN_GRAMMAR requires **whole pixels** and the existing size variables.
The decided design is slightly larger than now. Use these values:

| Variable | Now | New |
|---|---|---|
| `--t-micro` | 12px | 12px (no change; still the minimum) |
| `--t-small` | 14px | 15px |
| `--t-body` | 15px | 16px |
| `--t-lead` | 17px | 17px |
| `--t-title` | 21px | 21px |
| `--t-display` | 27px | 27px |

- Score total in the score panel: 34px (`--num` font).
- Base line-height: 1.4.
- Do **not** add fractional sizes (14.9, 16.5 …) even though the design
  file has them.
- **Biggest risk of Step 6:** bigger text can push content out of view.
  After this change, check DESIGN_GRAMMAR rule 7 at 1400×900, 1280×800 and
  1024×768: the full score panel, the mistake list with "View all", the
  Finish dialog and the queue must all be reachable (scroll is OK; cut-off
  is not). Also check the phone. Fix by letting a list scroll, not by
  shrinking text back.

### 6.4 Short category names in the marking tray

`src/components/DragMenu.tsx` shows `c.label.replace("Laḥn ", "")`
(line ~356 and ~391), so the tray shows "Jalī", "Khafī", "Faṣāḥa".

**New:** show **Jali, Khafi, Fasaha** (plain letters). Add a `short` field to
each entry in `CATEGORIES` in `src/config.ts` (`"Jali"`, `"Khafi"`,
`"Fasaha"`, `"Adu / Raagu"`) and use `c.short` in DragMenu. Keep `label`
as it is. Keep the full label in `aria-label`.

Search the other components for `.replace("Laḥn ", "")` and change them
the same way only where the text is a **visible tray/pill label**.

### 6.5 Focus ring 3:1

- Change the focus style (`button:focus-visible` etc., about line 325) from
  `box-shadow: 0 0 0 3px var(--ring)` to
  `outline: 2px solid var(--ring); outline-offset: 2px;` (remove the
  `outline: none`).
- `--ring` is now solid (6.2), which gives at least 3:1 on surface and bg in
  both themes (light 5.9:1, dark 5.9:1).
- **Risk:** some components set their own `box-shadow` focus or
  `outline: none`. Search `:focus-visible` and `outline: none` in
  `global.css` and make them use the same outline. Keep the special focus
  styles of the Quran word hits (`.hit`) if they exist; just make sure they
  still reach 3:1.
- **Risk:** in Windows High Contrast (`forced-colors: active`) outline must
  still show. Outline does this by default; do not add `outline: none`
  inside `@media (forced-colors: active)`.

### 6.6 44px tap areas

Measured on this branch at 1440×900 (width × height in px):

| Element | Size now |
|---|---|
| `.reciter-chip` (header reciter) | 268 × 34 |
| `.view-toggle` ("Results") | 97 × 34 |
| `.btn-icon` in header (theme, more actions) | 34 × 34 |
| `.page-nav-btn` (page arrows) | 30 × 30 |
| `.page-nav-page` (page number) | 54 × 30 |
| `.log-view-all` ("View all") | 52 × 16 |

**New:** each one has a **hit area** of at least 44×44. Keep the **visible**
size the same where the design is tight (header 46px high, page arrows are
32px circle ghost buttons): enlarge the hit area with a transparent
`::before` (`position:absolute; inset: -6px` or similar) on a
`position: relative` element, or with padding plus negative margin.

- Page arrows: visible circle 32px, hit area 44px.
- **Risk:** expanded hit areas must not **overlap** each other (two
  buttons side by side, or arrow over the page number). Check by clicking
  the edges in the browser. If they would overlap, split the space between
  them.
- Do not change the Quran word hit areas (`.hit`). They follow the text.
- Phone media queries (around lines 10225–10370 and 14885) set their own
  sizes. Check those too.

### 6.7 Reduce Motion = fades only

Under `@media (prefers-reduced-motion: reduce)`:

- no movement: no `transform` animation or transition (slide, scale,
  wipe);
- fades (`opacity`) are allowed, up to 150ms;
- the brand wipe (`.brand-lockup` mask) and the mistake-card slide already
  have reduce rules; keep them.

There are 4 `prefers-reduced-motion` blocks now. Prefer adding to one
block near the end of `global.css` instead of many new ones.

**Risk:** `.selector-undo.holding` (hold to undo) uses
`transition: transform 700ms steps(3,end)` under reduce motion on purpose —
it is a progress indicator, not decoration. **Keep it.**

### 6.8 Layout sizes (check only)

The design says: header 46px, rail 300px, row 36px, panel padding 14px,
gap rail-to-pages 12px, gap between mistake cards 4px, corners 12px
(`--r-md`). Most already match. Only check them and list any that differ.
Do **not** change these in this step unless they differ; if they differ,
write it in the report and leave them.

---

## 7. Report (one per step)

Write it at the end of the pull request description. Use the format in
`AGENTS.md`:

- **Retained / recomposed / removed:** what stayed, what moved, what was
  deleted.
- **Files changed** and **tests updated** (name each test and why).
- **Browser checks:** sizes and themes you checked, with screenshots of
  1440×900 light and dark, 1024×768, and phone.
- **Contrast output** (Step 6).
- **Open questions:** anything you could not do as written.
- **Confidence** (0–100, three numbers): practicality, architecture/data
  safety, visual certainty. 85+ = ready; 70–84 = needs more evidence.

Commit message ending (use exactly):

```
Co-Authored-By: Codex <noreply@openai.com>
```

Do **not** merge to `main`. Push the branch and open a pull request into
`claude/judging-final-polish`.

## 8. Not yet checked by anyone

- Safari (macOS and iPad) and real touch devices.
- Dhivehi text (Step 7, later).

If you can test Safari, say so; if not, list it as not checked.
