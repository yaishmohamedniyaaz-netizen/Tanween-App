# DigitalKhatt pages for the app

Builds `public/mushaf-dk/dk-web-4213fab-v1/` (all 604 pages): DigitalKhatt's own
web layout, every glyph tagged with Tanween's word id and letter unit (tid).
No sample PDF, no AGPL tool, no native build.

## Inputs (outside this repository)

| Input | Pin | Licence |
| --- | --- | --- |
| `github.com/DigitalKhatt/digitalkhatt.org` | `4213fab9892774f74f7164c70a70dd84a14f0215` | MIT; font OFL 1.1; `hb.wasm` HarfBuzz Old MIT |
| npm `harfbuzzjs@0.4.5` (JS loader for `hb.wasm`), `esbuild@0.24.0`, `lz-string@1.5.0` | | MIT / Old MIT |

The website's `ClientApp/src/assets/hb.wasm` is HarfBuzz with DigitalKhatt's
justification. `ClientApp/src/assets/fonts/hb/oldmadina.otf` is the font it shapes with.

## Steps

```sh
WORK=/somewhere/outside/repo
git clone https://github.com/DigitalKhatt/digitalkhatt.org $WORK/website && git -C $WORK/website checkout 4213fab
mkdir $WORK/hbrun && cp -r scripts/digitalkhatt/app_pages/web_layout/* $WORK/hbrun/ && cd $WORK/hbrun
npm init -y && npm install harfbuzzjs@0.4.5 esbuild@0.24.0 lz-string@1.5.0
# Bundle DigitalKhatt's TypeScript (just.service.ts, harfbuzz.ts, qurantext.service.ts) for Node.
npx esbuild entry.ts --bundle --platform=node --format=esm --outfile=bundle.mjs --tsconfig=tsconfig.json \
  --alias:@angular/core=./shim/angular.ts --alias:harfbuzzjs=$PWD/node_modules/harfbuzzjs --alias:lz-string=$PWD/node_modules/lz-string \
  "--banner:js=import {createRequire as __cr} from 'module'; import {fileURLToPath as __fu} from 'url'; import {dirname as __dn} from 'path'; const require = __cr(import.meta.url); const __filename = __fu(import.meta.url); const __dirname = __dn(__filename);"
node layout.mjs $WORK/website $WORK/layout          # 604 pages, ~10 s
cd -  # back to the Tanween checkout
node --experimental-strip-types scripts/digitalkhatt/app_pages/export_targets.mts > $WORK/targets.json
pip install fonttools pypdf pymupdf   # glyph names; Codex's mapping module imports the PDF libraries
python3 scripts/digitalkhatt/app_pages/map_hb.py $WORK/layout $WORK/website/ClientApp/src/assets/fonts/hb/oldmadina.otf $WORK/targets.json $WORK/owners
node scripts/digitalkhatt/app_pages/build_app_pages.mjs $WORK/layout $WORK/owners $WORK/targets.json public/mushaf-dk/dk-web-4213fab-v1
```

`entry.ts` imports from `../website/...`: keep `hbrun` and `website` side by side in `$WORK`.

## What each step does

1. **layout.mjs** mirrors `hbmedina/page_view.ts` (draw + renderLine) without a browser:
   `analyzeLineForJust` + `justifyLine` (JustStyle.XScale), shaping with
   cluster level 1, so every glyph's cluster is the index of its own source character.
   Headers are left for the app (it shows the strip from the printed artwork).
2. **export_targets.mts** runs the app's own `judgingTargetsOf` with the Mushaf's
   `nextRecitedWords` context, for recited words and printed Basmala words.
3. **map_hb.py** pairs words by line and reading order and gives every glyph its
   letter unit with Codex's `glyph_mapping.map_word` (source-text alignment, no shape guessing).
   Waqf signs get no unit. Result (9 Nov 2026): 77,881 words, 300,447 units,
   **0 unmapped**; 4,358 waqf signs; 278 glyphs shared by two units (long hamza:
   the letter joined to the hamza seat stroke), coloured for either unit.
4. **build_app_pages.mjs** writes the outlines once (`glyphs.json`, 890 glyphs) and one
   file per page in the 1920 x 3106 artwork frame, with word boxes and the artwork
   y-range of each surah header line.

Sizes: `glyphs.json` 1.0 MB (162 KB gzip, loaded once); a page about 46 KB (14 KB gzip);
all pages 8.7 MB gzip, against 118 MB for the artwork PNGs.
