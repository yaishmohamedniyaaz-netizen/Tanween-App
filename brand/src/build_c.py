# -*- coding: utf-8 -*-
import io, base64
from spec2 import *
P=[]
FIELD='background:#fbfaf7;border:1px solid rgba(26,26,28,.09);border-radius:4px'
def cap(t,s=''): return f'<div class="cap" style="{s}">{t}</div>'
def mic(t,s=''): return f'<div class="mic" style="{s}">{t}</div>'

# ---------------------------------------------------------------- 2.1 ink and paper
def sw(hexv,name,tok,note,ink=INK,bd=''):
    return f"""<div><div style="height:104px;background:{hexv};border-radius:4px;{bd}"></div>
    <div style="margin-top:12px;font-size:14px;font-weight:600;letter-spacing:-.01em">{name}</div>
    <div class="num" style="font-size:12.5px;color:#6a6a73;margin-top:3px">{hexv}</div>
    <div class="mic" style="margin-top:7px">{tok}</div>
    <div class="cap" style="margin-top:6px;font-size:11.5px">{note}</div></div>"""
B='border:1px solid rgba(26,26,28,.10)'
row=(sw('#f2f1ee','Paper','--bg','Everything the app sits on.',bd=B)
   + sw('#ffffff','Surface','--surface','Cards, dialogs, the score panel.',bd=B)
   + sw('#fbfaf7','Page paper','--page-paper','The mushaf sheet only.',bd=B)
   + sw('#1a1a1c','Ink','--ink','Text, the mark, and covers.')
   + sw('#62626a','Ink 2','--ink-2','Secondary text. 6.04:1 on surface.')
   + sw('#6a6a73','Ink 3','--ink-3','Labels. 5.35:1 on surface, 4.74:1 on paper.'))
art=f"""<div><div style="display:grid;grid-template-columns:repeat(6,1fr);gap:20px">{row}</div>
 <div style="display:flex;gap:22px;margin-top:34px">
  <div style="flex:1;{FIELD};padding:20px 24px">{mic('Why so little colour')}
   {cap('The app is near monochrome so the only saturated things on a screen are the four criteria. A judge glancing at a page should be able to tell a marked letter from an unmarked one without reading anything.','margin-top:9px')}</div>
  <div style="flex:1;{FIELD};padding:20px 24px">{mic('There is no brand gold')}
   {cap('#b3892f exists in the app, in three places, and it draws the sajdah mark on the mushaf page. It belongs to the page, not to the logo, and it is close enough to Laḥn Khafī that using it as a brand colour would read as a judging colour.','margin-top:9px')}</div>
  <div style="flex:1;{FIELD};padding:20px 24px">{mic('Hairlines')}
   {cap('rgba(26,26,28,.08) for a divider inside a card, .16 for the edge of one. Boxes are separated by a line, not by a shadow.','margin-top:9px')}</div>
 </div></div>"""
P.append(page('2.1','Ink and paper','Six values carry the whole interface.',art,'The system','12'))

# ---------------------------------------------------------------- 2.2 the four criteria
CATS=[('Laḥn Jalī','jali','#d8453d','#9e2820','#fcecea','rgba(216,69,61,.14)','rgba(216,69,61,.30)','50 marks','a clear mistake: a wrong letter, a wrong vowel, a skipped word'),
      ('Laḥn Khafī','khafi','#c0892a','#7c540e','#faf2dc','rgba(192,137,42,.16)','rgba(192,137,42,.34)','30 marks','a hidden mistake: a shortened madd, a missed ghunnah'),
      ('Faṣāḥa','fasaha','#5566e6','#2f3aa3','#eceefb','rgba(85,102,230,.13)','rgba(85,102,230,.28)','10 marks','delivery: pace, breath, where the reciter stops'),
      ('Adu / Raagu','adu-raagu','#377b60','#26624b','#eef8f3','rgba(55,123,96,.14)','rgba(55,123,96,.30)','10 marks','voice and melody, judged over the whole recitation')]
cols=''
for name,slug,c,cs,tint,wash,washs,marks,what in CATS:
    chips=''.join(f'''<div style="margin-bottom:9px">
      <div style="height:30px;background:{v};border-radius:3px;border:1px solid rgba(26,26,28,.07)"></div>
      <div class="mic" style="font-size:9.5px;letter-spacing:.08em;margin-top:5px">{t}</div></div>'''
      for v,t in zip((c,cs,tint,wash,washs),('--c','--c-strong','--c-tint','--c-wash','--c-wash-strong')))
    labs=''
    cols+=f"""<div>
      <div style="display:flex;align-items:center;gap:9px">
        <span style="width:9px;height:9px;border-radius:50%;background:{c};display:inline-block"></span>
        <span style="font-size:16px;font-weight:600;letter-spacing:-.015em;color:{cs}">{name}</span></div>
      <div class="num" style="font-size:12px;color:#6a6a73;margin-top:6px">{c} &nbsp;·&nbsp; {marks}</div>
      <div class="cap" style="margin-top:9px;font-size:12px;min-height:52px">{what}</div>
      <div style="margin-top:6px">{chips}</div>
    </div>"""
art=f"""<div style="display:flex;gap:28px;height:100%">
 <div style="flex:1;display:grid;grid-template-columns:repeat(4,1fr);gap:26px">{cols}</div>
 <div style="width:300px;border-left:1px solid rgba(26,26,28,.09);padding-left:26px">
  {mic('Where they appear')}
  {cap('The dot and the name in the score panel. The dot and the name in the mistake log. The wash on a letter that has been marked. The three chips in the mark picker. Nowhere else.','margin-top:9px')}
  {mic('Where they never appear','margin-top:22px')}
  {cap('The results table, the participant list, the logo, and any chart that is not counting marks.','margin-top:9px')}
  {mic('Colour is never the only signal','margin-top:22px')}
  {cap('Every marked state is carried by the word as well as the colour, so it survives a colour-blind reader and a washed-out projector.','margin-top:9px')}
  {mic('Why this green','margin-top:22px')}
  {cap('A filled chip is lettered in white, so the colour has to carry it. #2e9e83 measured 3.32:1 and failed. #377b60 is 5.04:1.','margin-top:9px')}
 </div></div>"""
P.append(page('2.2','The four criteria','The only saturated colours in the product, and the only ones that mean anything.',art,'The system','13'))

# ---------------------------------------------------------------- 2.3 dark
dk=[('#131316','Ground','--bg'),('#1c1c20','Surface','--surface'),('#211f1c','Page paper','--page-paper'),
    ('#ebebed','Ink','--ink'),('#a4a4ac','Ink 2','--ink-2'),('#8b8b95','Ink 3','--ink-3')]
sws=''.join(f"""<div><div style="height:86px;background:{h};border-radius:4px;border:1px solid rgba(242,241,238,.10)"></div>
  <div style="margin-top:11px;font-size:13.5px;font-weight:600;color:#ebebed">{n}</div>
  <div class="num" style="font-size:12px;color:#8b8b95;margin-top:3px">{h}</div>
  <div class="mic" style="margin-top:6px;color:#7a7a84">{t}</div></div>""" for h,n,t in dk)
darkcats=''.join(f"""<div style="display:flex;align-items:center;gap:10px">
  <span style="width:9px;height:9px;border-radius:50%;background:{c};display:inline-block"></span>
  <span style="font-size:13.5px;font-weight:600;color:{ds}">{n}</span>
  <span class="num" style="font-size:11.5px;color:#7a7a84;margin-left:auto">{ds}</span></div>"""
  for n,c,ds in [('Laḥn Jalī','#d8453d','#f0a8a2'),('Laḥn Khafī','#c0892a','#e6c07a'),
                 ('Faṣāḥa','#5566e6','#aeb8f6'),('Adu / Raagu','#377b60','#a5cfbc')])
art=f"""<div style="background:#131316;border-radius:4px;height:100%;padding:34px 36px;display:flex;gap:34px">
 <div style="flex:1">
  <div class="mic" style="color:#7a7a84">Surfaces</div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:16px">{sws}</div>
  <div class="cap" style="color:#8b8b95;margin-top:26px;max-width:520px">The dark theme is 44 rules in the
  stylesheet, not a filter. Halls are dim and phones are held low, so the ground drops to #131316 and the
  paper of the mushaf page stays warm at #211f1c.</div>
 </div>
 <div style="width:300px;border-left:1px solid rgba(242,241,238,.12);padding-left:30px">
  <div class="mic" style="color:#7a7a84">Criteria in the dark</div>
  <div style="display:flex;flex-direction:column;gap:15px;margin-top:16px">{darkcats}</div>
  <div class="cap" style="color:#8b8b95;margin-top:22px">The dot keeps its light value. Only the text tint
  changes, because #9e2820 on #1c1c20 is unreadable and a lighter dot would stop matching the wash on the page.</div>
  <div class="mic" style="color:#7a7a84;margin-top:26px">The mark</div>
  <div style="margin-top:14px">{M(38,PAPER)}</div>
  <div class="cap" style="color:#8b8b95;margin-top:12px">Paper on ink. Never grey, never half opacity.</div>
 </div></div>"""
P.append(page('2.3','Dark','The same system at night. Nothing is inverted by accident.',art,'The system','14'))
write('m_c.html',P)
print('pages',len(P))
