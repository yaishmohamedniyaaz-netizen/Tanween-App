# Tanween brand files: update options

Status: options for the owner (6 November 2026). Nothing in the brand files
has changed. Rendered comparison: made from the real files below with the
app's own fonts (sent in chat as `brand-s.png`).

## What exists today

| File | What it is |
| --- | --- |
| `src/assets/brand/tanween-mark-currentcolor.svg` | The mark: two slanted bars (the two strokes of tanween) over a base bar |
| `src/assets/brand/tanween-lockup-currentcolor.svg` | Mark + "Tanween" wordmark in Platypi (serif), as outlines |
| `public/icons/tanween-*.png`, `tanween-favicon.svg` | App and browser icons: light mark on a dark tile (#1a1a1c / #f2f1ee) |
| `public/icons/tahqeeq-*.png` | Old-name icons, kept for older installed copies |
| `public/manifest.webmanifest` | Name, colours, icon list |

Fonts in the app: Manrope (interface), Nunito Sans (numbers), Platypi
(wordmark only), Hafs (Quran text).

## Options

1. **Wordmark**
   - A. Keep Platypi serif outlines (today).
   - B. Manrope 700, the interface font: one type family across the product.
   - C. Manrope 600 with a little extra spacing: lighter, calmer.
   - D. Platypi as live text instead of outlines: same look, easier to
     edit, but depends on the font loading (outlines are safer for a logo).
2. **Mark**
   - Keep sharp bars (today); softer corners; or a two-colour accent (Jali red
     and Fasaha blue bars) for special places only, such as a splash screen.
3. **App icon**
   - Keep the dark tile; add a light tile for dark home screens; accent bars;
     or rounder tile corners.
4. **File housekeeping (no visual change)**
   - One master SVG for the mark, and a small script that exports every icon
     size from it, so the icons can never drift from the mark.
   - Decide when the old `tahqeeq-*` icons can be removed (after installed
     copies have updated).
   - A short brand sheet (colours, fonts, clear space, minimum size) in
     `docs/DESIGN_GRAMMAR.md` or a Design System artifact.

## Questions for the owner

- Which wordmark (A-D)? How should the name be written in running text?
- Any change to the mark, or keep it as is?
- Should the icon change at all? Installed copies update their icon slowly.
