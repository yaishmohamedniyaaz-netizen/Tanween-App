# -*- coding: utf-8 -*-
import io
from spec2 import *
P=[]
FIELD='background:#fbfaf7;border:1px solid rgba(26,26,28,.09);border-radius:4px'
def cap(t,s=''): return f'<div class="cap" style="{s}">{t}</div>'
def mic(t,s=''): return f'<div class="mic" style="{s}">{t}</div>'
def dot(c,sz=7): return f'<span style="width:{sz}px;height:{sz}px;border-radius:50%;background:{c};display:inline-block;flex:none"></span>'
AR=lambda t,sz=19,c='#1c1b16': f'<span style="font-family:HafsUthmanic,serif;direction:rtl;font-size:{sz}px;color:{c}">{t}</span>'

# ---------------------------------------------------------------- 3.4 on paper
cert=f"""<div style="background:#fff;border:1px solid rgba(26,26,28,.10);border-radius:3px;
  padding:34px 34px 28px;height:100%;display:flex;flex-direction:column">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:26px">
    <span style="flex:none">{LK(26)}</span><span class="mic" style="text-align:right">Falaah Quran<br>Mubaaraai · 1448</span></div>
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;text-align:center;padding:22px 0">
    <div class="mic">Certificate of participation</div>
    <div style="font-size:32px;font-weight:600;letter-spacing:-.024em;margin-top:14px">Mariyam Aisha</div>
    <div style="font-size:13px;color:#6a6a73;margin-top:8px">Under 14 · Nubalaa · Nimeykolhu</div>
    <div style="margin:20px auto 0;width:52px;height:1px;background:rgba(26,26,28,.14)"></div>
    <div class="num" style="font-size:15px;margin-top:18px">83.5 <span style="color:#9a9aa0">/ 100</span></div>
    <div style="font-size:12.5px;color:#6a6a73;margin-top:6px">Recorded question 91:6–92:9 · 7 marks</div>
  </div>
  <div style="display:flex;align-items:flex-end;justify-content:space-between;
    border-top:1px solid rgba(26,26,28,.08);padding-top:14px">
    <div><div class="mic">Judge</div><div style="font-size:12.5px;margin-top:4px">Hassan Yoonus</div></div>
    <div style="text-align:right"><div class="mic">Verify</div>
      <div class="num" style="font-size:12.5px;margin-top:4px">tanween.app/r/8FQ2-M02</div></div>
  </div></div>"""
sheetrows=''.join(f"""<div style="display:flex;align-items:center;gap:9px;padding:7px 0;
  border-bottom:1px solid rgba(26,26,28,.07)">{dot(c,6)}
  <span style="font-size:11.5px;width:76px;color:{cs}">{n}</span>
  <span style="width:44px;text-align:right">{AR(g,14)}</span>
  <span class="num" style="font-size:11px;color:#6a6a73;flex:1;text-align:right">{loc}</span>
  <span class="num" style="font-size:11.5px;font-weight:600;width:24px;text-align:right">{d}</span></div>"""
  for n,c,cs,g,loc,d in [('Laḥn Jalī',J,JS,'إِنَّ','92:4 · letter 1','−2'),
                         ('Laḥn Khafī',K,KS,'وَٱتَّقَىٰ','92:5 · letter 2','−1'),
                         ('Laḥn Khafī',K,KS,'فَأَمَّا','92:5 · letter 3','−1'),
                         ('Laḥn Jalī',J,JS,'فَسَ…','92:7 · letter 1','−2'),
                         ('Faṣāḥa',F,FS,'مَنۡ','92:8 · letter 2','−1')])
sheet=f"""<div style="background:#fff;border:1px solid rgba(26,26,28,.10);border-radius:3px;
  padding:24px 26px;height:100%;display:flex;flex-direction:column">
  <div style="display:flex;align-items:center;justify-content:space-between">
    {LK(20)}<span class="mic">Result sheet</span></div>
  <div style="display:flex;align-items:baseline;margin-top:18px;padding-bottom:12px;
    border-bottom:1px solid rgba(26,26,28,.10)">
    <div><div style="font-size:17px;font-weight:600">Mariyam Aisha</div>
      <div class="num" style="font-size:11.5px;color:#6a6a73;margin-top:3px">02 · Under 14 · Nubalaa</div></div>
    <div class="num" style="margin-left:auto;font-size:21px;font-weight:600">83.5</div></div>
  <div style="margin-top:10px">{sheetrows}</div>
  <div class="cap" style="font-size:10.5px;margin-top:auto;padding-top:12px">Printed 13 September 2026 ·
    revision 1 · every row on this sheet is in the app.</div></div>"""
art=f"""<div style="display:flex;gap:22px;height:100%">
 <div style="flex:1.25;{FIELD};padding:20px">{cert}</div>
 <div style="flex:1;{FIELD};padding:20px">{sheet}</div>
 <div style="width:236px">
  {mic('The lockup goes top left')}
  {cap('On anything printed, at the same size as the running head, with one a of space under it.','margin-top:9px')}
  {mic('A certificate carries the record','margin-top:18px')}
  {cap('The score, the question, the number of marks and the judge. A certificate that only shows a number is not something a parent can ask a question about.','margin-top:9px')}
  {mic('Paper is warm','margin-top:18px')}
  {cap('Print on uncoated stock. #f2f1ee was picked against paper, not against a white screen.','margin-top:9px')}
  {mic('Colour survives a photocopier','margin-top:18px')}
  {cap('The criterion is named as well as coloured, so a black and white copy still says which mistake it was.','margin-top:9px')}
 </div></div>"""
P.append(page('3.4','On paper','Certificates and result sheets carry the same record the screen does.',art,'In the product','21'))

# ---------------------------------------------------------------- 3.5 in the hall
sign=f"""<div style="background:#1a1a1c;border-radius:4px;height:100%;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:26px">{M(78,PAPER)}
  <div style="color:#f2f1ee;font-size:30px;font-weight:600;letter-spacing:-.03em">Tanween</div></div>"""
dirrows=''.join(f"""<div style="display:flex;align-items:center;justify-content:space-between;padding:11px 0;
  border-bottom:1px solid rgba(26,26,28,.08);font-size:13px">{t}{AR(a,18)}</div>"""
  for t,a in [('Hall A · Category 1–2','أ'),('Hall B · Category 3','ب'),
              ("Judges' room",'ج'),('Results','د')])
board=f"""<div style="background:#fbfaf7;border:1px solid rgba(26,26,28,.10);border-radius:4px;
  padding:22px 24px 18px;height:100%;display:flex;flex-direction:column">
  {LK(22)}
  <div style="height:1px;background:rgba(26,26,28,.14);margin:16px 0 4px"></div>
  {dirrows}
  <div class="mic" style="margin-top:auto;padding-top:16px">tanween.app</div></div>"""
badge=f"""<div style="background:#fff;border:1px solid rgba(26,26,28,.12);border-radius:6px;
  padding:20px;height:100%;display:flex;flex-direction:column">
  {LK(18)}
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center">
    <div class="mic">Judge</div>
    <div style="font-size:23px;font-weight:600;letter-spacing:-.02em;margin-top:7px">Hassan Yoonus</div>
    <div style="display:flex;gap:5px;margin-top:12px">{dot(J,9)}{dot(K,9)}{dot(F,9)}{dot(A,9)}</div>
    <div class="cap" style="margin-top:9px;font-size:11px">All four criteria</div></div>
  <div class="mic">Seat 01 · Hall A</div></div>"""
art=f"""<div style="display:flex;gap:22px;height:100%">
 <div style="width:260px">{sign}</div>
 <div style="flex:1">{board}</div>
 <div style="width:230px">{badge}</div>
 <div style="width:236px">
  {mic('Read at three metres')}
  {cap('Set the letter line no thinner than 20 mm. Below that the strokes close up and the mark reads as a slab.','margin-top:9px')}
  {mic('Hall letters are Arabic','margin-top:18px')}
  {cap('أ ب ج د, matching the signage a Maldivian competition already uses. The mark appears once per sign, at the top.','margin-top:9px')}
  {mic('The dots on a badge','margin-top:18px')}
  {cap('Four dots means the judge owns all four criteria. Two dots means two. It is the same strip the app puts above the score panel.','margin-top:9px')}
 </div></div>"""
P.append(page('3.5','In the hall','One mark per sign, and nothing else on it.',art,'In the product','22'))

# ---------------------------------------------------------------- back
P.append(f"""<div class="pg" style="background:#1a1a1c">
 <div style="position:absolute;left:60px;top:56px">{M(34,PAPER)}</div>
 <div style="position:absolute;left:60px;top:290px;width:640px;color:#f2f1ee">
  <div style="font-size:34px;font-weight:600;letter-spacing:-.026em;line-height:1.26">
    Where this document and the code disagree, the code is right.</div>
  <div style="font-size:16px;line-height:1.66;color:rgba(242,241,238,.6);margin-top:24px">
    Every value in here was read out of src/styles/global.css, and every screen was drawn from the app
    running with its practice competition loaded. When a token changes, this document is out of date
    the same day. Fix it here rather than repeating the old number.</div>
 </div>
 <div style="position:absolute;left:60px;right:60px;bottom:126px;height:1px;background:rgba(242,241,238,.15)"></div>
 <div style="position:absolute;left:60px;bottom:60px;color:rgba(242,241,238,.5);font-size:13px;line-height:1.9">
   Artwork and this document: brand/ in the repository<br>
   Questions: tanween.app</div>
 <div style="position:absolute;right:60px;bottom:60px;text-align:right;color:rgba(242,241,238,.38);
   font-size:11px;letter-spacing:.16em;text-transform:uppercase;line-height:2.1">
   Edition one<br>September 2026</div>
</div>""")
write('m_g.html',P)
print('pages',len(P))
