# DigitalKhatt letter-colour prototype (reference only)

Made by Claude on 9 November 2026 for the "Letter Colour Test" page shown to the owner.
**Reference code, not production.** Codex replaces it (see `docs/CODEX_TASK_DIGITALKHATT_LETTER_COLOUR.md`).

## Run

```sh
git clone https://github.com/DigitalKhatt/oldmadinafont   # tested at adc60f3 (2 Nov 2026)
DK_PDF=oldmadinafont/old_Madinah_mushaf.pdf OUT=./out/ python3 build.py 3 582
OUT=./out/ python3 gen.py      # writes out/letter-colour-test.html
```

Needs PyMuPDF, Pillow and `pdftocairo` (poppler-utils).

## What `build.py` does

1. Reads each glyph's name from the PDF's Type3 fonts (`/Encoding /Differences`) with PyMuPDF `get_texttrace()`.
2. Runs `pdftocairo -svg` on the same page. The `<use>` order equals the texttrace order (asserted).
3. Groups glyphs:
   - a **base** glyph (`behshape`, `alef`, `lam`, ...) starts a new letter;
   - a **mark** glyph (dots, harakat, `wasla`, `hamzaabove`, ...) joins the previous base;
   - a **word** ends at `space`, `endofaya`, or a line change (x jumps right by more than 25 and y changes by more than 6).
4. Gives each letter a label from its base shape plus dots (`behshape` + `onedotdown` = ب).
5. Adds `data-l` (letter index) and `data-w` (word index) to every `<use>`, and sets text glyph runs to `fill="currentColor"`.

Known gaps: page 1 has 355 `<use>` vs 356 trace entries (assert fails); labels are approximate; letters are not yet mapped to the app's letter units.
