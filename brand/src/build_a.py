# -*- coding: utf-8 -*-
import io, math
from spec2 import *
from mark import SLANT,NIB,LN,TH,DX,DY,BX,BY,BW,BH

P=[]
FIELD='background:#fbfaf7;border:1px solid rgba(26,26,28,.09);border-radius:4px'
DARKF='background:#1a1a1c;border-radius:4px'
def box(inner, style=''):
    return f'<div style="{FIELD};{style};display:flex;align-items:center;justify-content:center">{inner}</div>'
def darkbox(inner, style=''):
    return f'<div style="{DARKF};{style};display:flex;align-items:center;justify-content:center">{inner}</div>'
def cap(t, style=''):
    return f'<div class="cap" style="{style}">{t}</div>'
def mic(t, style=''):
    return f'<div class="mic" style="{style}">{t}</div>'

# ---------------------------------------------------------------- 01 cover
P.append(f"""<div class="pg" style="background:#1a1a1c">
 <div style="position:absolute;left:60px;top:56px">{M(40, PAPER)}</div>
 <div style="position:absolute;right:60px;top:60px;font-family:HafsUthmanic,serif;direction:rtl;
      font-size:34px;color:rgba(242,241,238,.55)">تَنْوِين</div>
 <div style="position:absolute;left:58px;top:300px">{WORD(96, PAPER)}</div>
 <div style="position:absolute;left:62px;top:448px;color:rgba(242,241,238,.52);font-size:21px;
      letter-spacing:-.01em">Brand standards</div>
 <div style="position:absolute;left:60px;right:60px;bottom:126px;height:1px;background:rgba(242,241,238,.15)"></div>
 <div style="position:absolute;left:60px;bottom:60px;color:rgba(242,241,238,.5);font-size:14.5px;
      max-width:430px;line-height:1.6">A judging tool for Qur'an competitions, and the short set of
      rules that keep it looking like one thing.</div>
 <div style="position:absolute;right:60px;bottom:60px;text-align:right;color:rgba(242,241,238,.38);
      font-size:11px;letter-spacing:.16em;text-transform:uppercase;line-height:2.1">
      Edition one<br>September 2026<br>tanween.app</div>
</div>""")

# ---------------------------------------------------------------- 02 the name
P.append(f"""<div class="pg">
 <div style="position:absolute;left:60px;top:110px;width:545px">
  <div class="eyebrow">The name</div>
  <div style="font-size:30px;font-weight:600;letter-spacing:-.024em;line-height:1.3;margin-top:18px">
   One stroke over a letter is a vowel. Two strokes is a tanwīn, and the word ends differently.</div>
  <div style="font-size:16px;line-height:1.66;color:#4a4a52;margin-top:26px">
   <p style="margin-bottom:16px">That difference is the product. A judge noticing something is one
   mark. A mark written against a letter, signed, timed and open to appeal is a result somebody can
   argue with.</p>
   <p style="margin-bottom:16px">So the logo is the fatḥatān: two strokes and the line they sit on,
   drawn at the angle the 1405 mushaf uses, close enough together to hold as one shape at the size
   of a browser tab.</p>
   <p>The word is short, it is the same in Dhivehi and in Arabic, and a judge in Malé and a sponsor
   reading English say it the same way.</p>
  </div>
 </div>
 <div style="position:absolute;right:60px;top:110px;width:555px;height:580px;{FIELD};
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:60px">
   <div style="font-family:HafsUthmanic,serif;direction:rtl;font-size:86px;color:#1c1b16">تَنْوِين</div>
   <div style="width:96px;height:1px;background:rgba(26,26,28,.14)"></div>
   {M(128)}
 </div>
 <div class="ft"><span>Tanween &nbsp;·&nbsp; Brand standards</span>
   <span class="pn"><span class="num">02</span></span></div>
</div>""")

# ---------------------------------------------------------------- 03 contents
rows=[('1','The mark','How it is drawn, how much room it needs, and the ways it gets broken.','04'),
      ('2','The system','Ink, paper, the four criteria colours, the dark theme, the type.','11'),
      ('3','In the product','The same rules on the screens judges actually use.','17')]
items=''.join(f"""<div style="display:flex;align-items:baseline;gap:30px;padding:28px 0;
   border-bottom:1px solid rgba(26,26,28,.09)">
   <div class="num" style="font-size:15px;font-weight:600;width:20px;color:#9a9aa0">{a}</div>
   <div style="flex:1"><div style="font-size:24px;font-weight:600;letter-spacing:-.02em">{b}</div>
     <div class="cap" style="margin-top:8px">{c}</div></div>
   <div class="num" style="font-size:14px;color:#9a9aa0">{d}</div></div>""" for a,b,c,d in rows)
P.append(page('Contents','Three sections',
  'Read the first one before putting the logo anywhere. The rest is reference.',
  f'<div style="max-width:800px">{items}</div>','Contents','03'))

# ---------------------------------------------------------------- 04 divider
P.append(divider('1','The mark',
  'Two strokes cut at one angle, and the line they sit on. Everything in this section is fixed.'))

# ---------------------------------------------------------------- 05 the mark
art=f"""<div style="display:flex;gap:20px;height:100%">
 {box(M(210),'flex:1')}
 <div style="width:286px;display:flex;flex-direction:column;gap:20px">
  {darkbox(M(92,PAPER),'flex:1')}
  {box(M(46)+M(24)+M(16),'flex:1;gap:30px')}
 </div></div>"""
P.append(page('1.1','The mark',
 "The fatḥatān on its letter line. It is used as supplied, in one colour, with nothing around it.",
 art,'The mark','05'))

# ---------------------------------------------------------------- 06 construction
S=6.3; OX,OY=120,58
def U(x,y): return (OX+(x-12)*S, OY+(y-25.29)*S)
def strokepts(x,y):
    r=math.radians(SLANT); dx=math.cos(r)*LN; dy=-math.sin(r)*LN
    nx=math.sin(r)*TH; ny=math.cos(r)*TH; sx=NIB*TH
    return [(x,y),(x+dx,y+dy),(x+dx+nx-sx,y+dy+ny),(x+nx-sx,y+ny)]
def poly(pt,fill=INK):
    return '<polygon points="%s" fill="%s"/>'%(' '.join('%.2f,%.2f'%U(*p) for p in pt),fill)
def dline(x1,y1,x2,y2,c='#dedce1',dash='3 4',w=1):
    a=U(x1,y1); b=U(x2,y2)
    return f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="{c}" stroke-width="{w}" stroke-dasharray="{dash}"/>'
def txt(px,py,t,sz=11,c='#8b8b95',w='400',anchor='start'):
    return (f'<text x="{px:.1f}" y="{py:.1f}" font-size="{sz}" fill="{c}" font-family="InterVar" '
            f'font-weight="{w}" text-anchor="{anchor}">{t}</text>')
g=[]
for gx in (12,13.88,49.92,70): g.append(dline(gx,19,gx,80))
for gy in (25.29,56,70):       g.append(dline(6,gy,80,gy))
g.append(poly(strokepts(16,42))); g.append(poly(strokepts(16+DX,42+DY)))
bx,by=U(BX,BY); g.append(f'<rect x="{bx:.1f}" y="{by:.1f}" width="{BW*S:.1f}" height="{BH*S:.1f}" fill="{INK}"/>')
a0=U(16,42); b0=U(30,50); R=52
g.append(f'<path d="M {a0[0]:.1f} {a0[1]:.1f} l {R} 0" stroke="#9a9aa0" stroke-width="1" fill="none"/>')
g.append(f'<path d="M {a0[0]+R:.1f} {a0[1]:.1f} A {R} {R} 0 0 0 {a0[0]+R*math.cos(math.radians(40)):.1f} {a0[1]-R*math.sin(math.radians(40)):.1f}" stroke="#9a9aa0" stroke-width="1" fill="none"/>')
g.append(txt(a0[0]+R+10, a0[1]-14, '40°', 13, '#3a3a40', '600'))
g.append(dline(16,42,30,42,'#9a9aa0','3 4'))
g.append(dline(30,42,30,50,'#9a9aa0','3 4'))
g.append(txt((a0[0]+b0[0])/2, a0[1]+15, '14', 11, '#8b8b95','400','middle'))
g.append(txt(b0[0]+8, (a0[1]+b0[1])/2+4, '8'))
lx=U(70,56)[0]+18
g.append(f'<line x1="{lx}" y1="{U(70,56)[1]:.1f}" x2="{lx}" y2="{U(70,70)[1]:.1f}" stroke="#1a1a1c" stroke-width="1.4"/>')
g.append(txt(lx+10, (U(70,56)[1]+U(70,70)[1])/2+5, 'a', 13, '#1a1a1c','600'))
g.append(txt(lx+24, (U(70,56)[1]+U(70,70)[1])/2+5, '14 units'))
svg=f'<svg width="100%" height="100%" viewBox="0 0 640 430" preserveAspectRatio="xMidYMid meet">{"".join(g)}</svg>'
spec_rows=[('Stroke','26 long, 13.5 thick, cut at 40°'),
           ('Nib','both ends sheared 0.80 of the stroke thickness, so every edge belongs to one pen'),
           ('Offset','the second stroke sits 14 across and 8 down from the first'),
           ('Line','58 by 14, squared off, the same weight as the strokes'),
           ('Fusion','the lower stroke runs 4.3 into the line; they are one shape, not two'),
           ('Position','the line reaches 1.9 past the strokes on the left and 20.1 on the right')]
tbl=''.join(f"""<div style="display:flex;gap:18px;padding:12px 0;border-bottom:1px solid rgba(26,26,28,.08)">
  <div class="mic" style="width:76px;flex:none;padding-top:3px">{a}</div>
  <div style="font-size:13.5px;line-height:1.5;color:#3a3a40">{b}</div></div>""" for a,b in spec_rows)
art=f"""<div style="display:flex;gap:26px;height:100%">
 <div style="flex:1;{FIELD};padding:10px">{svg}</div>
 <div style="width:320px">{tbl}{cap("Units are the artwork's own. Scale the file; do not set the shapes again by hand.",'margin-top:18px')}</div>
</div>"""
P.append(page('1.2','Construction','One pen, one angle, used twice.',art,'The mark','06'))
write('m_a.html',P)
print('pages',len(P))
