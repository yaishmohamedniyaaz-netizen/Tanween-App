# The Adu & Raagu mark bar: research and plan

> **Reconciled with the current implementation on 16 August 2026.** The live
> control is no longer the continuous track described in the historical audit
> below. It is the retained whole-number chip strip: every whole mark is a
> direct 38px target, the left half of a chip exposes the configured half mark,
> and pointer release creates one ledger event. Claude's later cell-grid
> experiment was deliberately resolved away; it is not part of the final
> branch and should not be reintroduced by reading the prototype as approval.
>
> The final implemented portion of this study is narrower: Adu / Raagu now uses
> the darker `#377b60` committed fill, an explicit white on-accent token in both
> themes, split-color ink for a half-filled chip, and a neutral monochrome open
> row without the former green wash. The full ten-step green consolidation,
> unrelated card proportions, and superellipse work remain proposals rather
> than shipped requirements. Phone and desktop use the same stylesheet and are
> verified as part of this integration.

The historical control under review was `MarkPicker.tsx` and the
`.mark-picker` / `.mark-bar` block in `global.css`. It awards the whole-recitation
criteria: press the number on the score row, a bar drops carrying every awardable
mark, drag along it and release.

The owner's report, in their words: the bar should be **filled to the point**;
the **contrast of the numbers** has to work on white and on green; the green
reads **electric and AI**, not Apple/Linear/Vercel; the selected state **lights
up in electric green with an outline**; the cards should be **slightly
rectangular, not square**; and it **works, but is not as intuitive as it should
be**.

Every one of those is reproducible in the source, and four of them turn out to
be the same defect wearing different clothes.

The measurements below remain the research record that led to the palette
correction. Sections describing a continuous fill track or detached tick-label
gutter are historical evidence, not a description of the retained chip strip.

---

## 1. What is measurably wrong

### 1.1 The fill is a ghost — 1.15:1 against its own track

`global.css`:

```css
.mark-bar-fill { background: var(--c-wash, rgba(0, 0, 0, 0.05)); }
```

For Adu & Raagu, `--c-wash` is `rgba(46, 158, 131, 0.14)`. Composited over
`--bg` `#f2f1ee`, that is `#d7e5df` — a contrast ratio of **1.15:1** against the
unfilled track beside it.

1.15:1 is below every published threshold for a visible boundary; WCAG's floor
for a non-text graphical element is 3:1. So the fill is not a design choice the
owner dislikes — it is present in the DOM and effectively absent on screen. That
is the whole of *"it should be filled up to that point."*

### 1.2 The green sits at the one lightness where no text works

Converting `#2e9e83` to OKLCH gives **L 63.0, C 0.107, H 173°**. Measured
against it:

| Text on `#2e9e83` | Ratio | AA (4.5:1) |
| --- | --- | --- |
| White | **3.32:1** | fails |
| Ink `#1a1a1c` | 5.24:1 | passes |

So white numerals — the treatment that makes a filled bar read as premium rather
than as a progress widget — are **not available** at this green. Ink on green
passes, and ink-on-mid-green is precisely the combination that reads as a
generic analytics dashboard.

Scanning the hue for where white becomes legal:

| OKLCH L | Sample | White | Ink | Verdict |
| --- | --- | --- | --- | --- |
| 63 | `#2e9e83` *(today)* | 3.32 | 5.24 | ink only |
| 60 | `#4c9074` | 3.78 | 4.59 | ink only |
| 58 | `#468a6e` | 4.10 | 4.24 | **neither** |
| 56 | `#408468` | 4.45 | 3.90 | **neither** |
| 54 | `#3a7e63` | 4.83 | 3.60 | white OK |
| 52 | `#33785d` | 5.27 | 3.30 | white OK |

There is a genuine dead band around **L 56–58** where neither colour reaches
4.5:1, and white only becomes usable at **L ≤ 54**.

This is the finding the whole plan turns on: *"the numbers have to look okay on
white as well as on green"* and *"the green feels electric"* have *the same
fix*. Perceived neon is a product of lightness and chroma together; dropping the
fill to L 53 both buys white text at 5.04:1 and removes the glow. One move,
two complaints.

### 1.3 There are twelve greens, and five of them are the same green

Every green literal in `global.css`, in OKLCH:

| Hex | L | C | H | Uses |
| --- | --- | --- | --- | --- |
| `#7fd3bd` | 80.7 | 0.088 | 175.3 | 1 |
| `#6ea68a` | 67.8 | 0.072 | 161.9 | 3 |
| `#33a06f` | 63.1 | 0.123 | 159.8 | 1 |
| `#2e9e83` | 63.0 | 0.107 | 173.0 | 1 |
| `#4b8268` | 56.1 | 0.072 | 162.4 | 2 |
| `#2f8a62` | 56.9 | 0.106 | 160.8 | 1 |
| `#2f7a59` | 52.3 | 0.091 | 161.6 | 2 |
| `#35775a` | 51.8 | 0.083 | 162.5 | 2 |
| `#34765b` | 51.5 | 0.081 | 164.2 | 4 |
| `#2f7557` | 50.9 | 0.086 | 162.5 | 1 |
| `#33734e` | 50.3 | 0.089 | 155.8 | 2 |
| `#17614f` | 44.3 | 0.077 | 172.6 | 1 |

Hue scatters across **19.5°** (155.8 → 175.3). Five of them — `#2f7a59`,
`#35775a`, `#34765b`, `#2f7557`, `#33734e` — sit inside **two points of
lightness** of each other. They are not different colours doing different jobs;
they are one colour that was re-picked by eye six times.

None is a token. All twelve are hardcoded literals, so nothing can be changed in
one place.

This is the mechanical answer to *"it doesn't feel Apple / Linear / Vercel."*
Those systems do not have better taste in green — they have **one** green and a
published ramp. Vercel's Geist runs every non-background scale as ten steps
where [the step number encodes intent rather than just lightness](https://vercel.com/geist/introduction),
shipping `oklch()` values for wide-gamut screens. Twelve near-identical literals
is the visual signature of a system that grew rather than one that was designed.

### 1.4 The glow is a real box-shadow, and it is on both the thumb and the card

```css
.mark-bar-thumb { box-shadow: 0 0 0 3px var(--c-wash, transparent); }

.mark-picker:hover,
.mark-picker.is-open {
  border-color: var(--c, var(--ink-3));
  background: var(--c-wash, transparent);
}
```

The thumb is a 3px bar wearing a 3px green halo. The score-row card takes a
green border *and* a green background wash the moment it is touched. Coloured
halo plus coloured border plus coloured fill, all at once, on a saturated
mid-green — that is the "electric / AI" read, and it is four declarations.

### 1.5 The bar is 55px tall to show a 34px track

`.mark-bar-track` is `height: 34px`; `.mark-tick-label` is positioned at
`top: 21px`, i.e. **below** the track. So the numbers never touch the fill —
they sit in a separate 21px gutter underneath it. The control is 55px of
vertical space where 34px carries the value, and the labels are visually
detached from the thing they label.

That detachment is part of *"intuitiveness is not really there."* The numbers
are not on the scale; they are captions beneath it.

### 1.6 Drag is the only precise path

Marks are awarded by dragging (`onPointerMove` → `markAt`), or by keyboard
(arrows, digits) on the desktop button. On a phone there is no typed path.

Nielsen Norman's guidance is blunt on this: [selecting a precise value with a
slider requires good motor skills even when the slider is well
designed](https://www.nngroup.com/articles/sliders-knobs/), and where an exact
value matters, a different control belongs alongside it — most simply a field
that takes the number. Their mobile note is the one that bites here: users
routinely knock the knob off the intended value as the finger lifts.

For a mark that goes on an official record, "the finger lifted a pixel late" is
not an acceptable failure mode.

---

## 2. What premium actually consists of here

Three techniques, each with a source, each answering one of the owner's points.

### 2.1 The number crosses the boundary — two layers, one clip

The way a filled bar carries a legible number over both halves is not to pick a
compromise grey. It is to draw the label **twice**: once coloured for the track
and once coloured for the fill, with each copy clipped to its own side.

```css
.layer-track { color: var(--ink);   clip-path: inset(0 0 0 var(--pct)); }
.layer-fill  { color: #fff;         clip-path: inset(0 calc(100% - var(--pct)) 0 0); }
```

The [documented accessible form of this](https://dev.to/mikekennedydev/progress-bar-text-colour-1gg6)
puts the accessible name on the container and `aria-hidden` on both visual
copies, so the value is announced once. As the fill sweeps past a numeral the
numeral changes colour mid-glyph, which is the detail that reads as considered
rather than templated — and it is exactly *"has to look okay in white as well as
green."*

### 2.2 Continuous curvature, and radii that nest

The owner asked for "more rounded" and "slightly rectangle." Two separate
things.

**Curvature.** Apple's shapes avoid the point where a straight edge meets a
circular arc — at that pixel the curvature jumps from zero to a fixed value, a
G1 discontinuity [the eye reads as a hard break](https://www.appscreenstudio.com/en/blog/understanding-ios-squircle-continuous-curvature).
A superellipse tightens and releases through the corner instead. CSS now has
`corner-shape: superellipse()` and it degrades to a normal radius where
unsupported, so it costs nothing to adopt:

```css
border-radius: 14px;
corner-shape: superellipse(2.4);   /* ignored by older engines */
```

**Nesting.** The rule that stops a rounded card looking amateur when it contains
another rounded thing: *inner radius = outer radius − padding*.
[Apple's ecosystem holds this at every scale](https://blog.minimal.app/rounded-corners-in-the-apple-ecosystem/).
A 16px card with 4px of padding wants a 12px well inside it, not another 16.

**Proportion.** "Slightly rectangular, flatter, better when scrolling" is a real
effect and worth stating plainly: a square card forces the eye to scan in two
dimensions per item, while a wide card fixes the horizontal and lets the scroll
axis carry all the movement. The study lets this be felt rather than argued —
1:1, 4:3 and 3:2 over a real scrolling list.

### 2.3 Restraint is the mechanism, not the mood

The single most reliable difference between the current control and the
reference set is **how much area the accent covers.** In Geist and its peers the
accent appears as a fill on one small committed element, or as a 1px border, or
as text — never as fill *and* border *and* halo on the same element at once.

So the rule for this control: **the criterion colour may appear in exactly one
role at a time.** Either the fill is green and everything around it is
monochrome, or the fill is monochrome and a small green marker says which
criterion it is. Never both, and never with a halo.

This also happens to be the app's own rule 3 — colour is a verdict — applied to
a gesture that has not produced a verdict yet. While the finger is down nothing
has been awarded, so nothing should be wearing the criterion's colour.

---

## 3. The four candidates

Built live and draggable in `docs/mark-bar-study.html`, at phone width, because
a slider cannot be judged from a picture.

| | Candidate | The bet |
| --- | --- | --- |
| **A** | **Filled properly** | The literal fix, done to spec: solid `#377b60` fill, numerals crossing the boundary via the two-layer clip, thumb as a seam rather than a haloed bar, card with no green wash. |
| **B** | **Segmented** | Adu & Raagu is ten whole marks in half steps, not a continuum. Twenty capsules that fill left to right removes the precision problem entirely — every value is its own target, and the finger cannot land between two of them. |
| **C** | **Value-first** | The number is the control and the rail is 6px of chrome under it. Drag adjusts, tapping the number opens a keypad — the alternate path NN/g asks for, and the answer to "there should also be an option to just…". |
| **D** | **Monochrome until committed** | The bar is ink while the finger is down; the criterion's green appears only on the committed row, as a 3px rule. The strictest reading of the app's own colour rule, and the most Linear-like of the four. |

All four drop the halo, use one green from one ramp, and put the numerals on the
scale instead of in a gutter beneath it. Those are defects, not variables.

The study also carries two things that are not candidates:

- **The ramp**, twelve current greens against ten proposed steps, with white and
  ink contrast computed live for every swatch.
- **A card playground** — ratio and radius and curvature over a real scrolling
  list, so "slightly rectangular" can be settled by scrolling rather than by
  adjectives.

---

## 4. Token changes this implies

Nothing below changes scoring, storage, or the gesture's semantics.

```css
/* One ramp, one hue (OKLCH H 165), replacing twelve literals. */
--g-100: #eef8f3;   --g-600: #54967a;
--g-200: #def0e7;   --g-700: #377b60;   /* fill: white text at 5.04:1 */
--g-300: #c6e3d5;   --g-800: #26624b;   /* text on light: 7.16:1 */
--g-400: #a5cfbc;   --g-900: #1b4a38;
--g-500: #7cb39a;   --g-1000: #113326;
```

- `--c-adu-raagu` becomes `--g-700` for fills and `--g-800` for text on light.
- The twelve literals in §1.3 map onto the ramp; the five clustered ones all
  collapse to `--g-700`.
- `.mark-bar-fill` takes a solid `--g-700`, not `--c-wash`.
- The `box-shadow` halo on `.mark-bar-thumb` is deleted.
- `.mark-picker:hover/.is-open` loses `background: var(--c-wash)`; the open
  state is carried by border weight and a small marker.
- `--r-md` gains a `corner-shape: superellipse(2.4)` companion.

**Out of scope, named so it is not read as free:** the mobile build's own
stylesheet, which this session could not reach; the impression-mark data model;
and whether Adu & Raagu should be half-step at all, which is a rules decision
(`UNDECIDED_DECISIONS.md`) rather than a design one — candidate B is the one
that would force it.
