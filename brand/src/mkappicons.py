# -*- coding: utf-8 -*-
"""Drop-in replacements for public/icons/, including the maskable variant.

Maskable safe zone: the platform may crop to a circle of 80% of the canvas,
so the artwork has to fit inside a circle of radius 0.4 x width. The mark is
58 x 44.71, so its diagonal at width w is w * 1.2635; keeping that under the
safe circle caps w at 63% of the canvas. It is set to 52% for margin."""
import io, os
from mark import counter_inner, view_box
X,Y,W,H=[float(v) for v in view_box().split()]
INK,PAPER='#1a1a1c','#f2f1ee'
ART=counter_inner()
os.makedirs('appicons',exist_ok=True)

def icon(px, rad, frac, name, bg=INK, fg=PAPER):
    s=(px*frac)/W
    tx=(px-W*s)/2 - X*s
    ty=(px-H*s)/2 - Y*s
    svg=(f'<svg xmlns="http://www.w3.org/2000/svg" width="{px}" height="{px}" viewBox="0 0 {px} {px}">'
         f'<rect width="{px}" height="{px}" rx="{rad:g}" fill="{bg}"/>'
         f'<g transform="translate({tx:.3f},{ty:.3f}) scale({s:.5f})" fill="{fg}">{ART}</g></svg>')
    io.open(f'appicons/{name}.svg','w',encoding='utf-8').write(svg)
    return name

icon(512, 114, 0.62, 'tanween-512')            # purpose any, corners baked in like today's
icon(192,  43, 0.62, 'tanween-192')
icon(512,   0, 0.52, 'tanween-maskable-512')   # full bleed, inside the safe circle
icon(180,   0, 0.62, 'tanween-apple-touch-180')# iOS applies its own mask; do not pre-round
print('svgs written')
