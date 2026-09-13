# -*- coding: utf-8 -*-
"""The lockup as outlines. Platypi is used to draw the wordmark once, here;
the published logo is paths, so nothing downstream needs the font."""
import io, json
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Identity
from mark import counter_inner, view_box

WORD   = "Tanween"
WEIGHT = 600
TRACK  = -0.006          # em
KERN   = {"Ta": -14}     # optical, in font units at upm 1000

f    = TTFont('f_platypi-latin.woff2')
inst = instancer.instantiateVariableFont(f, {'wght': WEIGHT}, inplace=False)
upm  = inst['head'].unitsPerEm
cmap, hmtx, gs = inst.getBestCmap(), inst['hmtx'], inst.getGlyphSet()
CAP  = inst['OS/2'].sCapHeight          # 690 at upm 1000

def word_paths():
    """Returns (list of path 'd' strings, total advance width) in font units,
    y already flipped so the baseline is at y=0 and caps go up as negative y."""
    x, out = 0.0, []
    for i, ch in enumerate(WORD):
        g = cmap[ord(ch)]
        pen = SVGPathPen(gs, ntos=lambda v: f'{v:.1f}')
        gs[g].draw(TransformPen(pen, Identity.translate(x, 0).scale(1, -1)))
        d = pen.getCommands()
        if d: out.append(d)
        x += hmtx[g][0] + TRACK*upm
        if i+1 < len(WORD):
            x += KERN.get(WORD[i:i+2], 0)
    return out, x - TRACK*upm

paths, adv = word_paths()

def lockup(fill='#1a1a1c', gap_a=1.25, name='tanween-lockup'):
    """Mark at its natural size, name scaled so its caps equal the old Inter setting:
    name cap height = mark height x (Inter cap 0.7275), i.e. the name reads the same size."""
    vb = [float(v) for v in view_box().split()]
    MW, MH = vb[2], vb[3]
    a   = MH * 14.0/MH * (14.0/44.71) if False else MH * (14.0/MH)   # a = 14 units
    a   = 14.0
    gap = a*gap_a
    # scale the word so its cap height equals 0.7275 x MH  (the Inter rule, kept)
    target_cap = 0.7275 * MH
    s   = target_cap / CAP
    wordw = adv * s
    W   = MW + gap + wordw
    # baseline: sit the caps so the word is optically centred on the mark
    ytop   = (MH - target_cap)/2 + vb[1]
    basey  = ytop + target_cap
    g = ''.join(f'<path d="{d}"/>' for d in paths)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb[0]:g} {vb[1]:g} {W:.2f} {MH:g}" '
           f'fill="{fill}" role="img" aria-label="Tanween">'
           f'{counter_inner()}'
           f'<g transform="translate({vb[0]+MW+gap:.2f},{basey:.2f}) scale({s:.5f})">{g}</g></svg>')
    io.open(f'assets/{name}.svg','w',encoding='utf-8').write(svg)
    return W, MH, wordw

def wordmark(fill='#1a1a1c', name='tanween-wordmark'):
    """The name alone, outlined. Cap height is the viewBox height, so setting
    height=N gives caps N tall."""
    g = ''.join(f'<path d="{d}"/>' for d in paths)
    # bounds: x from 0 to adv, y from -CAP (cap line) to descender of 'e'/'n' = 0
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 {-CAP:.0f} {adv:.2f} {CAP:.0f}" '
           f'fill="{fill}" role="img" aria-label="Tanween">{g}</svg>')
    io.open(f'assets/{name}.svg','w',encoding='utf-8').write(svg)
    return adv/CAP

for fill,name in [('#1a1a1c','tanween-lockup-ink'),('#f2f1ee','tanween-lockup-paper'),
                  ('currentColor','tanween-lockup-currentcolor')]:
    W,H,ww = lockup(fill=fill, name=name)
for fill,name in [('#1a1a1c','tanween-wordmark-ink'),('#f2f1ee','tanween-wordmark-paper'),
                  ('currentColor','tanween-wordmark-currentcolor')]:
    r = wordmark(fill=fill, name=name)
print(f'wordmark aspect (width/cap) {r:.4f}')
print(f'lockup {W:.1f} x {H:.1f} units, word {ww:.1f}, ratio {W/H:.3f}')
print(f'cap height target {0.7275*H:.2f}, scale {0.7275*H/CAP:.4f}')
