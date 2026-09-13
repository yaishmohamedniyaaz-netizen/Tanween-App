# -*- coding: utf-8 -*-
import io
from spec2 import *
P=[]
FIELD='background:#fbfaf7;border:1px solid rgba(26,26,28,.09);border-radius:4px'
def cap(t,s=''): return f'<div class="cap" style="{s}">{t}</div>'
def mic(t,s=''): return f'<div class="mic" style="{s}">{t}</div>'
def dot(c,sz=8): return f'<span style="width:{sz}px;height:{sz}px;border-radius:50%;background:{c};display:inline-block;flex:none"></span>'
AR=lambda t,sz=19,c='#1c1b16': f'<span style="font-family:HafsUthmanic,serif;direction:rtl;font-size:{sz}px;color:{c}">{t}</span>'

# ---------------------------------------------------------------- 3.2 the record
log=[('إِنَّ','Laḥn Jalī',J,JS,'92:4 · letter 1','−2',''),
     ('وَٱتَّقَىٰ','Laḥn Khafī',K,KS,'92:5 · letter 2','−1',''),
     ('فَأَمَّا','Laḥn Khafī',K,KS,'92:5 · letter 3','−1',''),
     ('فَسَ…','Laḥn Jalī',J,JS,'92:7 · letter 1','−2',''),
     ('مَنۡ','Faṣāḥa',F,FS,'92:8 · letter 2','−1',''),
     ('وَكَ…','Laḥn Khafī',K,KS,'92:9 · letter 1','−1',''),
     ('لِلۡعُ…','Laḥn Jalī',J,JS,'92:10 · letter 2','−2',' · Outside recorded question')]
rows=''.join(f"""<div style="display:flex;gap:13px;padding:10px 14px;border-bottom:1px solid rgba(26,26,28,.07)">
  <div style="width:52px;flex:none;text-align:right;padding-top:1px">{AR(g,17)}</div>
  <div style="flex:1">
    <div style="display:flex;align-items:center;gap:7px">{dot(c,6)}
      <span style="font-size:12.5px;font-weight:600;color:{cs}">{n}</span></div>
    <div style="font-size:11.5px;color:#6a6a73;margin-top:3px">{loc}{extra}</div>
    <div style="font-size:11.5px;color:#8b8b95;margin-top:2px">Hassan Yoonus · revision 1</div></div>
  <div class="num" style="font-size:13px;font-weight:600;padding-top:2px">{d}</div></div>"""
  for g,n,c,cs,loc,d,extra in log)
checks=''.join(f"""<div style="display:flex;align-items:center;gap:9px;padding:11px 0;
  border-bottom:1px solid rgba(26,26,28,.08)">{dot(c,7)}
  <span style="font-size:13px;font-weight:600;color:{cs};width:104px">{n}</span>
  <span style="font-size:12px;color:#6a6a73;flex:1">Hassan Yoonus · revision 1</span>
  <span class="num" style="font-size:13.5px;font-weight:600">{s}</span></div>"""
  for n,c,cs,s in [('Laḥn Jalī',J,JS,'44/50'),('Laḥn Khafī',K,KS,'27/30'),
                   ('Faṣāḥa',F,FS,'9/10'),('Adu / Raagu',A,AS_,'3.5/10')])
record=f"""<div style="background:#fff;border:1px solid rgba(26,26,28,.10);border-radius:8px;overflow:hidden">
  <div style="padding:18px 22px 16px;border-bottom:1px solid rgba(26,26,28,.08);display:flex;align-items:flex-start">
    <div><div class="mic">Participant 02</div>
      <div style="font-size:26px;font-weight:600;letter-spacing:-.022em;margin-top:6px">Mariyam Aisha</div>
      <div style="font-size:12.5px;color:#6a6a73;margin-top:5px">Under 14 · Nubalaa · Nimeykolhu · Independent</div></div>
    <div style="margin-left:auto;text-align:right">
      <div style="font-size:12px;color:#6a6a73">Ready to finalize</div>
      <div class="num" style="font-size:28px;font-weight:600;letter-spacing:-.02em;margin-top:4px">83.5<span
        style="font-size:12px;color:#9a9aa0;font-weight:400"> /100</span></div></div></div>
  <div style="display:flex;padding:12px 22px;border-bottom:1px solid rgba(26,26,28,.08);gap:40px">
    <div><div class="mic">Recorded question</div><div class="num" style="font-size:15px;font-weight:600;margin-top:4px">91:6–92:9</div></div>
    <div style="margin-left:auto"><div class="mic">Page</div><div class="num" style="font-size:13px;margin-top:4px">595</div></div>
    <div><div class="mic">Length</div><div style="font-size:13px;margin-top:4px">10 recitation lines</div></div></div>
  <div style="display:flex">
    <div style="flex:1;border-right:1px solid rgba(26,26,28,.08);padding:14px 18px">
      <div class="mic">Recitation evidence</div>
      <div style="font-size:14px;font-weight:600;margin-top:5px">Recorded Qur’an span</div>
      <div style="background:#fbfaf7;border:1px solid rgba(26,26,28,.08);border-radius:4px;margin-top:11px;
        padding:16px 14px;text-align:center;line-height:2.1;direction:rtl">
        <span style="font-family:HafsUthmanic,serif;font-size:17px;color:#1c1b16">وَٱلَّيۡلِ إِذَا يَغۡشَىٰ</span><br>
        <span style="font-family:HafsUthmanic,serif;font-size:17px;color:#1c1b16">وَٱلنَّهَارِ إِذَا تَجَلَّىٰ</span><br>
        <span style="font-family:HafsUthmanic,serif;font-size:17px;color:#1c1b16">وَمَا خَلَقَ ٱلذَّكَرَ وَٱلۡأُنثَىٰٓ</span>
      </div>
      <div style="margin-top:14px">{checks}</div>
      <div style="display:flex;align-items:center;margin-top:12px">
        <span style="font-size:11.5px;color:#6a6a73">All scoring sources are present.</span>
        <span style="margin-left:auto;background:#1a1a1c;color:#f2f1ee;border-radius:8px;padding:8px 14px;
          font-size:12.5px;font-weight:600">Finalize result</span></div>
    </div>
    <div style="width:400px;flex:none">
      <div style="display:flex;align-items:baseline;padding:13px 14px 9px">
        <div><div class="mic">Mistake log</div>
          <div style="font-size:14px;font-weight:600;margin-top:4px">7 recorded</div></div></div>
      {rows}</div>
  </div></div>"""
art=f"""<div style="display:flex;gap:26px;height:100%">
 <div style="flex:1;overflow:hidden"><div style="transform:scale(.618);transform-origin:top left;width:1430px">{record}</div></div>
 <div style="width:250px;flex:none">
  {mic('One line per mistake')}
  {cap('The word as it is printed, the criterion, the exact letter, who marked it and which revision it belongs to. A mark outside the recorded question says so on its own row rather than being dropped.','margin-top:9px')}
  {mic('Nothing here is a summary','margin-top:20px')}
  {cap('The score is not stored. It is added up from these rows, so changing a source changes the total and the recorded question with it.','margin-top:9px')}
  {mic('Colour is the criterion','margin-top:20px')}
  {cap('The dot and the name carry it. The amount, the reference and the judge stay in ink, because they are facts rather than judgements.','margin-top:9px')}
  {mic('Print','margin-top:20px')}
  {cap('This screen is what a printed result sheet copies, in the same order, with the mark added at the head.','margin-top:9px')}
 </div></div>"""
P.append(page('3.2','The record','What a result actually is: a list of letters, each with a name against it.',art,'In the product','19'))

# ---------------------------------------------------------------- 3.3 results
chips=''.join(f"""<span style="padding:7px 13px;border-radius:8px;font-size:12.5px;
  background:{'#fff' if i==0 else 'transparent'};border:{'1px solid rgba(26,26,28,.10)' if i==0 else '1px solid transparent'};
  font-weight:{600 if i==0 else 400};color:{'#1a1a1c' if i==0 else '#6a6a73'}">{t} <span class="num"
  style="color:#9a9aa0;font-weight:400">{n}</span></span>"""
  for i,(t,n) in enumerate([('All candidates','2'),('Needs review','0'),('Ready','2'),('Finalized','0')]))
trows=''.join(f"""<div style="display:flex;align-items:center;padding:14px 20px;border-top:1px solid rgba(26,26,28,.07)">
  <div style="flex:1"><div style="font-size:15px;font-weight:600">{n}</div>
    <div style="font-size:12px;color:#6a6a73;margin-top:3px"><span class="num">{no}</span> · {meta}</div></div>
  <div class="num" style="font-size:17px;font-weight:600;width:96px;text-align:right">{s}<span
    style="font-size:11px;color:#9a9aa0;font-weight:400">/100</span></div>
  <div style="font-size:12.5px;color:#3a3a40;width:78px;text-align:right">{st}</div></div>"""
  for n,no,meta,s,st in [('Ahmed Rasheed','01','Under 14 · Nubalaa · Fesheykolhu','88','Ready'),
                         ('Mariyam Aisha','02','Under 14 · Nubalaa · Nimeykolhu','83.5','Ready')])
sels=''.join(f"""<div style="flex:1"><div class="mic">{l}</div>
  <div style="border:1px solid rgba(26,26,28,.12);border-radius:8px;padding:8px 11px;margin-top:7px;
    font-size:12.5px;display:flex">{v}<span style="margin-left:auto;color:#9a9aa0">⌄</span></div></div>"""
  for l,v in [('Data scope','Current competition'),('Judge','All judges'),
              ('Age group','All age groups'),('Participant category','All categories')])
results=f"""<div style="background:#f2f1ee;border-radius:8px;padding:20px;">
 <div style="display:flex;align-items:baseline">
   <div style="font-size:26px;font-weight:600;letter-spacing:-.022em">Results</div>
   <div style="margin-left:auto;text-align:right"><div style="font-size:13px;font-weight:600">Falaah Quran Mubaaraai</div>
     <div class="num" style="font-size:11.5px;color:#6a6a73">1448 · Live</div></div></div>
 <div style="height:1px;background:rgba(26,26,28,.10);margin:14px 0 16px"></div>
 <div style="background:#fbfaf7;border-radius:8px;padding:6px;display:flex;gap:6px">
   <span style="background:#fff;border:1px solid rgba(26,26,28,.08);border-radius:6px;padding:8px 16px;
     font-size:13px;font-weight:600">Review <span style="background:#1a1a1c;color:#fff;border-radius:8px;
     padding:1px 7px;font-size:11px" class="num">2</span></span>
   <span style="padding:8px 16px;font-size:13px;color:#6a6a73">Analysis</span></div>
 <div style="background:#fff;border-radius:8px;margin-top:14px;overflow:hidden">
  <div style="padding:18px 20px 14px;display:flex;align-items:baseline">
   <div><div style="font-size:17px;font-weight:600">Participant review</div>
     <div style="font-size:12px;color:#6a6a73;margin-top:4px">Unresolved participants appear first.</div></div>
   <div class="num" style="margin-left:auto;font-size:12px;color:#6a6a73">2 of 2 result candidates</div></div>
  <div style="display:flex;align-items:center;gap:10px;padding:0 20px 14px">
    <div style="background:#fbfaf7;border-radius:9px;padding:4px;display:flex;gap:2px">{chips}</div>
    <div style="flex:1;border:1px solid rgba(26,26,28,.12);border-radius:8px;padding:8px 11px;
      font-size:12.5px;color:#9a9aa0">Name or number</div>
    <div style="border:1px solid rgba(26,26,28,.12);border-radius:8px;padding:8px 12px;font-size:12.5px">More filters</div></div>
  <div style="display:flex;padding:9px 20px;background:#fbfaf7" class="mic">
    <span style="flex:1">Participant</span><span style="width:96px;text-align:right">Total</span>
    <span style="width:78px;text-align:right">State</span></div>
  {trows}</div>
 <div style="background:#fff;border-radius:8px;margin-top:14px;padding:18px 20px">
   <div style="display:flex;align-items:baseline">
     <div style="font-size:17px;font-weight:600">Judge results <span class="num" style="color:#9a9aa0">2</span></div>
     <div style="margin-left:auto;font-size:12px;color:#6a6a73">Source records and corrections</div></div>
   <div style="display:flex;gap:14px;margin-top:14px">{sels}</div></div>
</div>"""
art=f"""<div style="display:flex;gap:26px;height:100%">
 <div style="width:884px;flex:none;overflow:hidden"><div style="transform:scale(.762);transform-origin:top left;width:1160px">{results}</div></div>
 <div style="width:250px;flex:none">
  {mic('No colour on this screen')}
  {cap('A results list is a list of people, not of mistakes. The criteria colours stay inside a record, where a colour still means something; here everything is ink.','margin-top:9px')}
  {mic('Filters are chips, search is a field','margin-top:20px')}
  {cap('The counts live in the chips so an organiser can see what is left without opening a filter.','margin-top:9px')}
  {mic('Numbers are tabular','margin-top:20px')}
  {cap('Every score, total and reference is set with tabular figures so a column of them lines up. 83.5 and 88 sit on the same decimal.','margin-top:9px')}
  {mic('Practice data is labelled','margin-top:20px')}
  {cap('Sample competitions carry a Practice badge and their exports say so in the filename. Nothing in the identity is ever used to make demo data look official.','margin-top:9px')}
 </div></div>"""
P.append(page('3.3','Results','Two tabs, four filters and a table. It is deliberately dull.',art,'In the product','20'))
write('m_f.html',P)
print('pages',len(P))
