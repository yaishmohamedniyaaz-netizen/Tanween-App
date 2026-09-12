TANWEEN — BRAND ASSET PACK
تَنْوِين · tanween.app
==========================================================================

Tanween-Brand-Standards.pdf is the document. This file is the index and the
numbers you need when you open a layout without it.

Everything in /assets is generated from one source of truth — the geometry
in the standards, section 1.2. No file here was drawn by hand, and no file
here should be redrawn by hand.


1 · FILES
--------------------------------------------------------------------------
assets/tanween-mark-ink.svg            The mark. #1a1a1c. The default.
assets/tanween-mark-paper.svg          The mark. #f2f1ee. For ink grounds.
assets/tanween-mark-currentcolor.svg   Inherits colour from CSS. Use this
                                       one inside the app.
assets/tanween-icon-dark.svg           App icon, ink ground. 512, r=114.
assets/tanween-icon-light.svg          App icon, paper ground.
assets/tanween-icon-square.svg         Square, unmasked. For stores that
                                       apply their own corner.
assets/tanween-favicon.svg             64, r=8 (the app's --r-sm).
assets/tanween-icon-1024/512/192.png   Raster icons, ink ground.
assets/tanween-icon-apple-180.png      apple-touch-icon.
assets/tanween-favicon-32/16.png       Legacy favicon sizes.
assets/tanween-lockup-ink.png          Mark + name, 4x, transparent.
assets/tanween-lockup-paper.png        Same, reversed.
assetproof.png                         Every file above, rendered.

The SVGs are trimmed to the artwork: viewBox 12 25.29 58 44.71, zero slack
on all four sides. Clear space is added in layout, never inside the file.


2 · THE MARK
--------------------------------------------------------------------------
The fatḥatān set on its letter-line. Two nib-cut pen-strokes at 40°, the
second offset 14 right and 8 down; the letter-line squared off, flush left
with the lower stroke, 14 units tall against the strokes' 13.5.

Clear space   One a on all four sides, where a = the height of the
              letter-line = 14 units = 31.3% of the mark's height.
Minimum       16 px for the mark alone. 120 px wide for the lockup.
Lockup        Mark and name at a 30 : 29 ratio (mark height : type size),
              13 px apart at that size. Name in InterVar 600, -0.032em.

Never: recolour it to a category colour, put it in a container, add a
rosette or a seal, outline it, rotate it, or redraw the strokes by eye.


3 · COLOUR
--------------------------------------------------------------------------
The brand is ink on paper. There is no brand gold — #b3892f in the app is
the sajdah mark, and it belongs to the mushaf page, not to the logo.

  ink            #1a1a1c     --ink
  paper          #f2f1ee     --bg
  surface        #ffffff     --surface
  page paper     #fbfaf7     --page-paper
  secondary ink  #62626a     --ink-2   (5.35:1 on surface)
  tertiary ink   #6a6a73     --ink-3
  hairline       rgba(26,26,28,.08) / .16

Dark theme (the app ships a real one, 44 rules):
  bg #131316 · surface #1c1c20 · ink #ebebed · ink-2 #a4a4ac · ink-3 #8b8b95

The four judging colours are the app's criteria, not a brand palette:
  Jalī        #d8453d       Khafī       #c0892a
  Faṣāḥa      #5566e6       Adu raagu   #377b60
Each ships five values (--c, --c-strong, --c-tint, --c-wash,
--c-wash-strong). Faṣāḥa blue is also the focus ring, --ring, in 13 places.


4 · TYPE
--------------------------------------------------------------------------
InterVar for everything in Latin — the app's own UI face, shipped at
public/fonts/InterVariable.woff2. The standards document is set in it too.
There is no second brand face and no display face; adding one would put a
typeface on screen that the product does not have.

Qur'anic text is KFGQPC HafsUthmanic (public/fonts/hafs.18.woff2) and is
never substituted, never restyled, never set in a UI face.

Scale, whole pixels only: 12 · 14 · 15 · 17 · 21 · 27.
Spacing on a 4px module: 4 · 8 · 12 · 16 · 24 · 32 · 48. Tap target 44.
Radii: 8 · 12 · 20.


5 · THE TALLY
--------------------------------------------------------------------------
The one place the four colours may appear together.

  52 px of width per mark, 30 px tall, 5 px gap, radius 4.
  Fixed order: Jalī · Khafī · Faṣāḥa · Adu raagu.
  Bars are drawn from a real sheet's counts, at real proportion.

Four equal squares with no score behind them is decoration, and decoration
with these colours is a lie about a recitation. If there is no sheet, there
is no tally.


6 · IF YOU ARE RENAMING THE APP
--------------------------------------------------------------------------
The codebase still says Tahqeeq everywhere — the header brand-mark
(تَحْقِيق), the brand-name string, the manifest, the page titles, the CSS
comment at the top of global.css.

One thing will break quietly: device preferences are stored under the
localStorage key "tahqeeq.theme" (src/lib/devicePreferences.ts, exported as
LEGACY_THEME_KEY). Rename the key without a migration and every judge's
theme choice silently resets on the first load after the deploy. Read the
old key, write the new one, then stop reading the old one a release later.

tanween.app was unregistered when this pack was built. Register it before
anything here is printed.
