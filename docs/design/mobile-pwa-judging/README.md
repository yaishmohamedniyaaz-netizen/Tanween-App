# Mobile PWA judging — design canvas

Iteration 2. Three directions for the active judging screen on iPhone 15 Pro
portrait (393×852) as an installed PWA, the two screens they all continue
into, and the parts they share at 1:1.

**A is the chosen direction.** See `HANDOFF.md`.

| Artboard | Page | What it is |
| --- | --- | --- |
| `Main.dc.html` | Live | A · Mushaf-first status dock |
| `DirectionB.dc.html` | Live | B · Collapsible ledger |
| `DirectionC.dc.html` | Live | C · Live mode / Review mode |
| `Review.dc.html` | Continuation | Review and save (`FinishDialog`) at phone width |
| `NextReciter.dc.html` | Continuation | Where saving hands over (`App.tsx:327`) |
| `Parts.dc.html` | Parts | Header, page selector, chips, ledger, ruler, audit |

Every value is lifted from source — `Header.tsx` and the phone block at
`global.css:9878` for the header, `PageNav.tsx` and `.mushaf-shared-nav` for
the page selector, `.sc-row` / `.log-row` / `.mark-ruler` for the ledger,
mistake rows and Adu control, and `Icon.tsx` for every icon path.

The status bar (59) and home indicator (34) are reserved and the background
paints through them. Nothing draws fake system chrome.

## Rebuilding

```
node build.mjs        # the six .dc.html artboards
node preview.mjs      # /tmp/pv.html — plain HTML, no canvas runtime, for screenshots
node measure-words.mjs   # only if the Mushaf page or its font changes
```

Then re-seed and republish with the `design` skill's `seed-canvas.mjs`, passing
all six artboards and `canvas.json`. The seeded `tahqeeq-mobile-judging.html`
is a ~3 MB build artifact and is gitignored.

## Mushaf text

Surah al-Mulk, page 562, verbatim from `public/pages/p562.json`. The app sets
it in a per-page KFGQPC V1 font from the CDN in `mushafAssets.ts`; that host is
unreachable from the design session, so the words are re-packed to fit the
app's `hafs.18.woff2` instead. Words, order and marks are real — only the line
breaks differ from the print. `words.json` holds the measured em-widths used
for packing.
