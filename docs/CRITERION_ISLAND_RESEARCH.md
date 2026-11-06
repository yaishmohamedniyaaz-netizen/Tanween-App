# Criterion island: Round 1 research (6 November 2026)

Branch `claude/criterion-bar`. Principle agreed with the owner: **quiet at rest; strong colour only on the chosen criterion.**
Visual summary: `docs/research/criterion-island-round1.jpg`.

## 1. Rules from official sources

| Rule | Meaning for the island | Source (strength) |
| --- | --- | --- |
| Keep prominent buttons to one or two per view. | Only the chosen criterion is filled. The other buttons stay neutral. | [Apple HIG, Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) (official guideline) |
| Always include a press state for a custom button. | Every press shows at once. | Apple HIG, Buttons (official guideline) |
| Show a toggle's state by changing its background; do not rely on colour alone. | "Chosen" means a change of fill plus a second cue. | [Apple HIG, Toggles](https://developer.apple.com/design/human-interface-guidelines/toggles) (official guideline) |
| State cues need 3:1 contrast against what is next to them, or another indicator. | A soft fill (about 1.25:1 against the card) needs a 2px edge. | [WCAG 2.1, 1.4.11 Non-text Contrast](https://w3c.github.io/wcag21/understanding/non-text-contrast) (W3C standard) |
| Avoid using the same colour to mean different things. | See the two conflicts in section 5. | [Apple HIG, Color](https://developer.apple.com/design/human-interface-guidelines/color) (official guideline) |
| About 12pt of padding around controls with a bezel; 44×44pt targets. | Leave a 12px gap between squares. Squares are 72px (88px in the large size). | [Apple HIG, Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) (official guideline) |
| In a Material 3 segmented button, the selected segment uses the secondary container colour plus a check. State overlays: hover 8%, pressed 10%, focus 10%. Disabled content: 38%. | These are the values in the state table (section 4). | [Flutter `segmented_button.dart`](https://github.com/flutter/flutter/blob/master/packages/flutter/lib/src/material/segmented_button.dart), generated from Material 3 tokens (official code, not prose guidance) |
| Apple's increased-contrast yellow is #a16a00. | Khafi needs the same darker step for fills, edges and the frame. | Apple HIG, Color, system colours table (official) |

## 2. Why the lab colours looked dirty (measured)

**Tints against the background**

| Tint | Against background `#f3f2ee` | Against card `#fdfcf9` |
| --- | --- | --- |
| `#fcecea` | 1.02 | 1.12 |
| `#faf2dc` | 1.00 | 1.09 |
| `#eceefb` | 1.03 | 1.13 |

At these values the tint has no visible edge.

**Base colours in OKLCH lightness**

- Jali: L 55
- Fasaha: L 51
- Khafi: L 70, at 2.64:1 against the card. This is below the 3:1 that an edge or frame needs.

Because the lightness differs, giving all three the same opacity cannot balance them.

## 3. New colour steps

All steps are at the same OKLCH lightness for every criterion:

- container: L 92
- strong: L 51–55
- on-container text: L 40
- dark mode: container L 32, strong L 71, text L 88

| Criterion | Container | Strong | On-container text | Dark container | Dark strong | Dark text |
| --- | --- | --- | --- | --- | --- | --- |
| Jali | `#fedadc` | `#ca244d` (unchanged) | `#7b2434` | `#49282b` | `#f07685` | `#f7cbcd` |
| Khafi | `#f7e0c9` | **`#a16300`** (was `#d58e3a`) | `#663d00` | `#442e15` | `#de8d18` | `#eed2b5` |
| Fasaha | `#d9e5ff` | `#3358d4` (unchanged) | `#2b4288` | `#27324d` | `#779cff` | `#c9d7fa` |

**Contrast in light mode**

- Strong against the page: 4.68–5.77
- Strong against the container: 3.83–4.76
- On-container text against the container: 7.37–7.59
- White on the strong fill: 4.88–6.02

**Contrast in dark mode**

- Strong against the page: 5.98–6.25
- Strong against the container: 4.71–4.84
- Text against the container: 8.81–8.87
- Dark ink on the strong fill: 6.29–6.58

**Container against the card:** 1.23–1.31. This is too low to show the chosen state by itself, so the soft style needs the 2px edge.

The colours of marks on letters are not changed.

## 4. State table

| State | Value |
| --- | --- |
| Rest | Card colour, light shadow. Colour appears only in the small scorecard square (12×12, radius 3). |
| Hover (pointer only) | Ink overlay at 8% |
| Pressed | Ink overlay at 10% |
| Chosen, A (solid) | Strong fill. Name in white (light mode) or dark ink (dark mode), weight 650. |
| Chosen, B (soft) | Container fill, 2px inset edge in the strong colour, on-container name |
| Chosen + pressed / held | Overlay at 10–12% of the name colour, for as long as the finger stays down |
| Keyboard focus | 2px ink ring with a 2px gap. Neutral, never blue. |
| Unavailable | Everything at 38% |
| Shake (criterion-first, nothing chosen) | Moves 4px side to side, 3 times, in 300ms. With Reduce Motion on, a short dim instead. |

## 5. Layout, and two conflicts

**Layout**

- Column: 12 + 72 + 12 = 96px. Large size: 88px squares in a 112px column. The current 118px is off the 4px grid.
- Corner radius: 20px. This is the app token closest to the scorecard square's proportion (25%).
- The first square starts on the Mushaf frame's top line.
- The 44px settings button ends on the frame's bottom line, on the same centre line as the squares.
- There is no panel behind the squares; each square is a separate card.

**Conflict 1: focus ring.** `--ring` is `#3358d4`, the exact Fasaha colour. A focused Jali button shows a blue ring, which reads as "Fasaha".
- The island will use a neutral ink ring.
- Changing the ring for the whole app is a separate decision.

**Conflict 2: frame and marks.** Design grammar rule 3 says colour on the page is a verdict. The frame uses the same colours as the marks. It stays readable if its shape is different from a mark:
- a 3px line outside the text block;
- never a fill;
- never touching a word.

**Not done in this round:** a comparison with the pickers in GoodNotes, Notability, Procreate, Turnitin and Gradescope. Their official pages do not describe how a selected state looks, so this needs screenshots.
