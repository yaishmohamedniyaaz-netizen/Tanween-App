# -*- coding: utf-8 -*-
import io, math
from spec2 import *
P=[]
FIELD='background:#fbfaf7;border:1px solid rgba(26,26,28,.09);border-radius:4px'
def cap(t,s=''): return f'<div class="cap" style="{s}">{t}</div>'
def mic(t,s=''): return f'<div class="mic" style="{s}">{t}</div>'

# ---------------------------------------------------------------- 1.3 clear space
H=170; a=H*A_OF_H
AL='font-size:12px;font-weight:600;color:#8b8b95;position:absolute'
cs=f"""<div style="position:relative;display:inline-block;padding:{a:.1f}px">
  <div style="position:absolute;inset:0;border:1px dashed #c3c1c6;border-radius:2px"></div>
  <div style="{AL};top:-26px;left:50%;transform:translateX(-50%)">a</div>
  <div style="{AL};bottom:-26px;left:50%;transform:translateX(-50%)">a</div>
  <div style="{AL};left:-20px;top:50%;transform:translateY(-50%)">a</div>
  <div style="{AL};right:-20px;top:50%;transform:translateY(-50%)">a</div>
  <div style="position:absolute;left:50%;top:0;height:{a:.1f}px;border-left:1px solid #d6d4d8"></div>
  <div style="position:absolute;left:50%;bottom:0;height:{a:.1f}px;border-left:1px solid #d6d4d8"></div>
  <div style="position:absolute;top:50%;left:0;width:{a:.1f}px;border-top:1px solid #d6d4d8"></div>
  <div style="position:absolute;top:50%;right:0;width:{a:.1f}px;border-top:1px solid #d6d4d8"></div>
  {M(H)}</div>"""
sizes=''.join(f"""<div style="text-align:center"><div style="height:42px;display:flex;align-items:flex-end;
   justify-content:center">{M(s)}</div><div class="cap num" style="margin-top:10px;font-size:11px">{s} px</div></div>"""
   for s in (12,16,24,40))
art=f"""<div style="display:flex;gap:20px;height:100%">
 <div style="flex:1;{FIELD};display:flex;align-items:center;justify-content:center">{cs}</div>
 <div style="width:330px;display:flex;flex-direction:column;gap:20px">
  <div style="{FIELD};flex:1;padding:24px 26px">
    {mic('One a')}
    <div style="font-size:14px;line-height:1.55;color:#3a3a40;margin-top:10px">a is the height of the
    letter line: 14 units, or 31.3&#37; of the mark's height. Leave one a clear on all four sides. No rule,
    no caption, no second mark and no photograph edge comes inside it.</div>
  </div>
  <div style="{FIELD};flex:1;padding:22px 26px">
    {mic('Smallest sizes','margin-bottom:16px')}
    <div style="display:flex;justify-content:space-between;align-items:flex-end">{sizes}</div>
    {cap('At 12 px the two strokes close up. 16 px is the floor for the mark on its own, 120 px wide for the lockup.','margin-top:16px')}
  </div>
 </div></div>"""
P.append(page('1.3','Clear space','Measured from the letter line, so it scales with the mark and needs no table.',art,'The mark','07'))

# ---------------------------------------------------------------- 1.4 lockup
LH=64
rows=[('Face','Platypi 600. It is drawn once and supplied as outlines, so nothing that uses the logo needs the font.'),
      ('Size','the name&#39;s cap height is 72.8&#37; of the mark&#39;s height, which is where it sat when the name was set in Inter.'),
      ('Gap','1&#188;&#8202;a, from the right end of the letter line to the T.'),
      ('Baseline','the name sits on the letter line.'),
      ('Minimum','120 px wide. Below that use the mark on its own.')]
tbl=''.join(f"""<div style="display:flex;gap:18px;padding:12px 0;border-bottom:1px solid rgba(26,26,28,.08)">
  <div class="mic" style="width:70px;flex:none;padding-top:3px">{k}</div>
  <div style="font-size:13.5px;line-height:1.5;color:#3a3a40">{v}</div></div>""" for k,v in rows)
art=f"""<div style="display:flex;gap:26px;height:100%%">
 <div style="flex:1;{FIELD};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:38px">
   {LK(LH)}
   <div style="display:flex;align-items:flex-end;gap:34px">{LK(30)}{LK(20)}</div>
 </div>
 <div style="width:320px">{tbl}
  {cap('One arrangement. The name never sits under the mark, and it is never reset in another face &mdash; the outlines are the logo, not a typographic style.','margin-top:18px')}</div>
</div>"""
P.append(page('1.4','The lockup','The mark and the name in Platypi, supplied as one piece of artwork.',art,'The mark','08'))

# ---------------------------------------------------------------- 1.5 backgrounds
def tile(bg,fg,label,border='none',note=''):
    return f"""<div><div style="height:150px;background:{bg};border:{border};border-radius:4px;
      display:flex;align-items:center;justify-content:center">{M(54,fg)}</div>
      <div class="mic" style="margin-top:11px">{label}</div>
      <div class="cap" style="margin-top:5px;font-size:11.5px">{note}</div></div>"""
tiles=(tile('#f2f1ee',INK,'Paper','1px solid rgba(26,26,28,.09)','--bg, the app ground')
     + tile('#ffffff',INK,'Surface','1px solid rgba(26,26,28,.09)','--surface, cards and dialogs')
     + tile('#1a1a1c',PAPER,'Ink','none','--ink, covers and signs')
     + tile('#fbfaf7',INK,'Page paper','1px solid rgba(26,26,28,.09)','--page-paper, the mushaf sheet'))
art=f"""<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:22px">{tiles}
 <div style="grid-column:1 / span 4;display:flex;gap:22px;margin-top:6px">
  <div style="flex:1;{FIELD};padding:20px 24px">{mic('On a photograph')}
   {cap('Only where the area behind the mark is flat and the contrast against it is 3:1 or better. If the picture is busy, put the mark in a plain band at the edge instead of over the image.','margin-top:9px')}</div>
  <div style="flex:1;{FIELD};padding:20px 24px">{mic('Never a third colour')}
   {cap('The mark is ink or paper. It does not take a criteria colour, a tint, a gradient or a shadow, and it is never knocked back to grey to sit quietly next to something else.','margin-top:9px')}</div>
 </div></div>"""
P.append(page('1.5','Backgrounds','Ink on paper, or paper on ink.',art,'The mark','09'))

# ---------------------------------------------------------------- 1.6 misuse
def bad(inner,label):
    return f"""<div><div style="height:132px;background:#fbfaf7;border:1px solid rgba(26,26,28,.09);
      border-radius:4px;display:flex;align-items:center;justify-content:center;position:relative">{inner}
      <div style="position:absolute;top:9px;right:11px;width:15px;height:15px;border-radius:50%;
        background:#d8453d;color:#fff;font-size:10px;line-height:15px;text-align:center">&#215;</div></div>
      <div class="cap" style="margin-top:10px;font-size:12px">{label}</div></div>"""
items=(bad(M(46,'#d8453d'),'Recoloured. The four colours belong to the criteria and say something about a recitation.')
 + bad(f'<div style="width:78px;height:78px;border-radius:50%;background:#1a1a1c;display:flex;align-items:center;justify-content:center">{M(30,PAPER)}</div>','Put in a container. The mark has no roundel, badge or seal.')
 + bad(f'<div style="transform:rotate(-12deg)">{M(46)}</div>','Rotated. It sits level, always.')
 + bad(f'<div style="transform:scaleX(1.35)">{M(46)}</div>','Stretched. Scale both directions together.')
 + bad(f'<svg height="46" viewBox="{VB}" fill="none" stroke="#1a1a1c" stroke-width="2.4">{ART}</svg>','Outlined. It is a solid shape cut by a pen, not a line drawing.')
 + bad(f'<div style="display:flex;align-items:center;gap:9px">{M(38)}<span style="font-size:19px;font-weight:400;font-family:Georgia,serif">Tanween</span></div>','Reset in another face. The name is InterVar 600 at the mark&#39;s height.'))
art=f'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px 26px">{items}</div>'
P.append(page('1.6','What breaks it','Six things that turn up in every project. None of them is a preference.',art,'The mark','10'))

P.append(divider('2','The system','Near monochrome, so that the only saturated things on a screen are the four judging criteria.'))
write('m_b.html',P)
print('pages',len(P))
