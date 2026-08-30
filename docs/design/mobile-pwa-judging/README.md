# Mobile PWA judging — design canvas

Four interactive directions for the active judging screen on iPhone 15 Pro
portrait (393×852), installed as a standalone PWA, plus a 1:1 sheet of the
parts they share.

| Artboard | Direction | Page size | Score chrome |
| --- | --- | --- | --- |
| `Main.dc.html` | A · Mushaf-first status dock | 361 × 531 | 92 fixed |
| `DirectionB.dc.html` | B · Collapsible ledger | 377 × 554 | 76 peek, expands over the page |
| `DirectionC.dc.html` | C · Live mode / Review mode | 377 × 554 | 60 bar, no score while listening |
| `DirectionD.dc.html` | D · Bento deck (current prototype) | 263 × 387 | 252 fixed |
| `Parts.dc.html` | Shared parts at 1:1 | — | — |

Every value is lifted from `src/styles/global.css` — tokens, the `.sc-row`
grid, `.log-row` anatomy, `.mark-ruler` geometry, the four category colours —
and the Quran text is Surah al-Mulk page 562, verbatim from
`public/pages/p562.json`, set in the app's own `hafs.18.woff2`.

The status bar (59) and home indicator (34) are reserved and left empty in
every frame; a dashed guide marks them and can be switched off.

## Rebuilding

```
node build.mjs          # writes the five .dc.html artboards
node preview.mjs        # writes /tmp/pv.html — plain HTML, no canvas runtime
```

Then re-seed and republish the canvas with the `design` skill's
`seed-canvas.mjs`, passing all five artboards and `canvas.json`. The seeded
`tahqeeq-mobile-judging.html` is a ~3 MB build artifact and is gitignored.
