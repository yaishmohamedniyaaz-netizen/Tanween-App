TANWEEN — BRAND ASSET PACK
تَنْوِين · tanween.app · edition one, September 2026
==========================================================================

Tanween-Brand-Standards.pdf is the document. This file is the index, plus
the numbers you need when you are laying something out without it open.

Everything in assets/ is generated from one file of geometry. No artwork
here was drawn by hand and none of it should be redrawn by hand.


1 · FILES
--------------------------------------------------------------------------
assets/tanween-mark-ink.svg            The mark. #1a1a1c. The default.
assets/tanween-mark-paper.svg          The mark. #f2f1ee. For ink grounds.
assets/tanween-mark-currentcolor.svg   Takes its colour from CSS. Use this
                                       one inside the app.
assets/tanween-icon-dark.svg           App icon, ink ground. 512, r=114.
assets/tanween-icon-light.svg          App icon, paper ground.
assets/tanween-icon-square.svg         Square, unmasked, for stores that
                                       apply their own corner.
assets/tanween-favicon.svg             64, r=8 (the app's --r-sm).
assets/tanween-icon-1024/512/192.png   Raster icons, ink ground.
assets/tanween-icon-apple-180.png      apple-touch-icon.
assets/tanween-favicon-32/16.png       Legacy favicon sizes.
assets/tanween-lockup-ink.svg          Mark and name. Outlined artwork.
assets/tanween-lockup-paper.svg        The same, reversed.
assets/tanween-lockup-currentcolor.svg The same, taking colour from CSS.
assets/tanween-lockup-ink/paper.png    Raster, 240 px mark height.
assets/tanween-wordmark-*.svg/.png     The name on its own, outlined. Set
                                       height and you get that cap height.
assetproof.png                         Every file above, rendered.

The SVGs are trimmed to the artwork: viewBox 12 25.29 58 44.71, no slack on
any side. Clear space is added in layout, never baked into the file.


2 · THE MARK
--------------------------------------------------------------------------
The fatḥatān and the letter line it sits on.

  Strokes      26 long, 13.5 thick, both cut at 40°, both ends sheared 0.80
               of the stroke thickness so every edge belongs to one pen.
  Offset       the second stroke sits 14 across and 8 down from the first.
  Line         58 by 14, squared off, the same weight as the strokes.
  Fusion       the lower stroke runs 4.3 into the line. It is one shape.
  Position     the line reaches 1.9 past the strokes on the left and 20.1
               on the right.
  Whole mark   58 by 44.71.

  Clear space  one a on all four sides, where a is the height of the letter
               line: 14 units, 31.3% of the mark's height.
  Minimum      16 px for the mark alone, 120 px wide for the lockup. At
               12 px the two strokes close up.
  Lockup       the name is Platypi 600 tracked -0.030 em, drawn once and
               supplied as outlines. Its cap height is 72.8% of the mark's
               height, it sits on the letter line, and the gap is one and a
               quarter a measured ink to ink, from the end of the line to
               the edge of the T rather than to its origin.
               The logo is artwork. Do not set it as text.

Never recolour it to a criteria colour, put it in a container, outline it,
rotate it, stretch it, or set the name in another face.


3 · COLOUR
--------------------------------------------------------------------------
Ink on paper. There is no brand gold; #b3892f draws the sajdah mark on the
mushaf page and belongs to the page.

  paper          #f2f1ee     --bg
  surface        #ffffff     --surface
  page paper     #fbfaf7     --page-paper
  ink            #1a1a1c     --ink       17.4:1 on surface
  ink 2          #62626a     --ink-2      6.0:1 on surface, 5.4:1 on paper
  ink 3          #6a6a73     --ink-3      5.4:1 on surface, 4.7:1 on paper
  hairline       rgba(26,26,28,.08) inside a card, .16 for its edge

Dark theme (44 real rules, not a filter):
  bg #131316 · surface #1c1c20 · page paper #211f1c
  ink #ebebed · ink 2 #a4a4ac · ink 3 #8b8b95

The four judging criteria. These are the app's meaning, not a palette:
  Laḥn Jalī    #d8453d   strong #9e2820   dark text #f0a8a2
  Laḥn Khafī   #c0892a   strong #7c540e   dark text #e6c07a
  Faṣāḥa       #5566e6   strong #2f3aa3   dark text #aeb8f6
  Adu / Raagu  #377b60   strong #26624b   dark text #a5cfbc
Each also ships --c-tint, --c-wash and --c-wash-strong. Faṣāḥa blue is the
focus ring, --ring, in thirteen places.

They appear on the dot and the name in the score panel, the dot and the
name in the mistake log, the wash on a marked letter, and the three chips
in the mark picker. Not in the results table, not in the logo.


4 · TYPE
--------------------------------------------------------------------------
InterVar for everything in Latin. It is the app's own face, shipped at
public/fonts/InterVariable.woff2. There is no second brand text face.

The logo is the exception. The wordmark is Platypi 600, outlined, and that
is the only place Platypi appears. Nothing needs the font installed: the
letters are paths. Platypi has no ḥ or ṣ, which is fine for a word that
contains neither, and is the reason it is not used for anything else.

Qur'anic text is KFGQPC HafsUthmanic (public/fonts/hafs.18.woff2) in the
1405 layout. On the mushaf page the app loads the King Fahd page fonts, one
file per page, so the line breaks match the printed copy.

Scale, whole pixels: 12 · 14 · 15 · 17 · 21 · 27.
Spacing on a 4 px module: 4 · 8 · 12 · 16 · 24 · 32 · 48. Tap target 44.
Radii: 8 · 12 · 20.

Atkinson Hyperlegible was tested and not adopted. It has no ḥ and no ṣ, in
either family and in every subset, so "Laḥn Jalī", "Laḥn Khafī" and
"Faṣāḥa" would each be set in two typefaces at once. Inter's ss02, which
the font itself names Disambiguation, gives the slashed zero and the tailed
l that Atkinson is usually wanted for.


5 · THE TALLY
--------------------------------------------------------------------------
The one place the four colours appear together, and the one part of the
identity that is not in the app yet.

  One bar per criterion, showing marks deducted.
  One mark is one unit of width. The bar is 3.5 units tall. The gap is
  half a unit. Fixed order: Jalī, Khafī, Faṣāḥa, Adu / Raagu.
  The four bars add up to the deduction, so the total is checkable.

Draw it only from a real sheet. Four equal blocks with no recitation behind
them is decoration, and decoration in these colours is a claim about
somebody's recitation that nobody made.


6 · IF YOU ARE RENAMING THE APP
--------------------------------------------------------------------------
The code still says Tahqeeq: the header mark (تَحْقِيق), the brand name
string, the manifest, the page titles, the comment at the top of
global.css.

One thing breaks quietly. Device preferences live under the localStorage
key "tahqeeq.theme" (src/lib/devicePreferences.ts, exported as
LEGACY_THEME_KEY). Rename it without a migration and every judge's theme
resets on the first load after the deploy. Read the old key, write the new
one, and stop reading the old one a release later.

tanween.app was unregistered when this pack was built.


7 · APP ICONS
--------------------------------------------------------------------------
appicons/ holds drop-in replacements for public/icons/, at the sizes the
manifest already declares.

  tanween-512.png / .svg              purpose "any", corners baked in
  tanween-192.png / .svg              purpose "any"
  tanween-maskable-512.png / .svg     purpose "maskable", full bleed
  tanween-apple-touch-180.png / .svg  apple-touch-icon

The maskable one is the one that needs care. Android may crop the icon to a
circle of 80% of its width, so the artwork has to sit inside that circle.
The mark is 58 by 44.71, so its diagonal at width w is w x 1.2635, which
caps the mark at 63% of the canvas; it is set to 52% and tested against a
circle, a squircle and a full circle mask.

The apple-touch icon is supplied square on purpose. iOS applies its own
corner, and today's file has a corner baked in as well, so it is rounded
twice.

Renaming these in the app touches three places: the icons block in
public/manifest.webmanifest, the PRECACHE list in public/sw.js, and the
apple-touch-icon link in index.html. Nothing else reads them.
