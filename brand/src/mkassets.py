# -*- coding: utf-8 -*-
"""Asset pack, generated from mark.py. Nothing here is drawn by hand."""
import io, os, math
from mark import counter_inner, view_box, BH

X,Y,W,H = [float(v) for v in view_box().split()]
INK, PAPER = '#1a1a1c', '#f2f1ee'
ART = counter_inner()
os.makedirs('assets', exist_ok=True)

def flat(fill, name, label):
    """The mark alone, trimmed to the artwork. No padding baked in."""
    s = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s" fill="%s" '
         'role="img" aria-label="Tanween">%s</svg>') % (view_box(), fill, ART)
    io.open('assets/%s.svg'%name,'w',encoding='utf-8').write(s)
    return name, label

def tile(px, rad, bg, fg, name, label):
    """Icon: mark set to 62%% of the field width, centred. Margin 17.8 units = 1.27a."""
    s_ = (px*0.62)/W                     # scale
    tx = (px - W*s_)/2 - X*s_
    ty = (px - H*s_)/2 - Y*s_
    bgrect = '' if bg is None else '<rect width="%d" height="%d" rx="%g" fill="%s"/>'%(px,px,rad,bg)
    s = ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d" '
         'role="img" aria-label="Tanween">%s<g transform="translate(%.3f,%.3f) scale(%.5f)" '
         'fill="%s">%s</g></svg>') % (px,px,px,px,bgrect,tx,ty,s_,fg,ART)
    io.open('assets/%s.svg'%name,'w',encoding='utf-8').write(s)
    return name, label

made = [
    flat(INK,   'tanween-mark-ink',          'The mark, ink (#1a1a1c). Default.'),
    flat(PAPER, 'tanween-mark-paper',        'The mark, paper (#f2f1ee). For ink grounds.'),
    flat('currentColor','tanween-mark-currentcolor','Inherits colour from CSS. For inline use in the app.'),
    tile(512, 114, INK,   PAPER, 'tanween-icon-dark',   'App icon, ink ground. iOS/Android, 512, r=114 (22.3%).'),
    tile(512, 114, PAPER, INK,   'tanween-icon-light',  'App icon, paper ground. Light-only contexts.'),
    tile(512, 0,   INK,   PAPER, 'tanween-icon-square', 'Square icon, no radius. Stores that mask their own.'),
    tile(64,  8,   INK,   PAPER, 'tanween-favicon',     'Favicon, 64, r=8 (the app’s --r-sm).'),
]
for n,l in made: print(n.ljust(32), l)
