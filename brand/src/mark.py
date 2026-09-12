# -*- coding: utf-8 -*-
"""TANWEEN — final mark.
Two nib-cut pen-strokes over a letter-line. Short and thick, as the first drawing was;
strokes brought almost to touching, line squared off and flush left with the mark.
Free-standing. No container, no seal, no colour."""
import math

SLANT, NIB = 40, 0.80
LN, TH     = 26, 13.5
DX, DY     = 14, 8            # stroke 2 offset — near-touching
BX, BY, BW, BH = 12, 56, 58, 14   # G6 — wider seat; kills the flag reading

def _P(p): return '<polygon points="%s"/>'%' '.join('%.2f,%.2f'%q for q in p)

def _stroke(x,y,ln=LN,th=TH,slant=SLANT,skew=NIB):
    r=math.radians(slant); dx=math.cos(r)*ln; dy=-math.sin(r)*ln
    nx=math.sin(r)*th; ny=math.cos(r)*th; sx=skew*th
    return _P([(x,y),(x+dx,y+dy),(x+dx+nx-sx,y+dy+ny),(x+nx-sx,y+ny)])

def counter_inner():
    return (_stroke(16,42) + _stroke(16+DX,42+DY)
            + '<rect x="%g" y="%g" width="%g" height="%g"/>'%(BX,BY,BW,BH))

def view_box(): return '12 25.29 58 44.71'   # tight bounds of the artwork, no slack
def svg_inner(): return counter_inner()

def mark(w=None,h=None,fill='#1a1a1c',bg=None,rad=0,style='',cls=''):
    a=[]
    if cls:   a.append('class="%s"'%cls)
    if w is not None: a.append('width="%s"'%w)
    if h is not None: a.append('height="%s"'%h)
    if style: a.append('style="%s"'%style)
    a.append('viewBox="%s" fill="%s"'%(view_box(),fill))
    return '<svg %s>%s</svg>'%(' '.join(a), counter_inner())

def tile(px, rad, bg='#1a1a1c', fg='#f2f1ee'):
    """The icon: the mark centred in a rounded field."""
    return ('<div style="width:%dpx;height:%dpx;border-radius:%gpx;background:%s;display:flex;'
            'align-items:center;justify-content:center;flex-shrink:0">%s</div>'
            )%(px,px,rad,bg, mark(h=int(px*0.42), fill=fg))

def seal(h=None,w=None,fill='#1a1a1c',bg=None):
    """Retired — the rosette is gone. Kept so old call sites degrade to the plain mark."""
    return mark(w=w,h=h,fill=fill)
