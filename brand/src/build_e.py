# -*- coding: utf-8 -*-
import io
from spec2 import *
P=[]
FIELD='background:#fbfaf7;border:1px solid rgba(26,26,28,.09);border-radius:4px'
def cap(t,s=''): return f'<div class="cap" style="{s}">{t}</div>'
def mic(t,s=''): return f'<div class="mic" style="{s}">{t}</div>'
def dot(c,sz=8): return f'<span style="width:{sz}px;height:{sz}px;border-radius:50%;background:{c};display:inline-block;flex:none"></span>'
AR=lambda t,sz=19,c='#1c1b16': f'<span style="font-family:HafsUthmanic,serif;direction:rtl;font-size:{sz}px;color:{c}">{t}</span>'

# ------------------------------------------------- the score panel, drawn to the app
def score_panel():
    cats=[('Laḥn Jalī',J,'−4','46','50'),('Laḥn Khafī',K,'−1','29','30'),
          ('Faṣāḥa',F,'−1','9','10')]
    rows=''.join(f"""<div style="display:flex;align-items:center;gap:9px;padding:9px 16px;
      border-bottom:1px solid rgba(26,26,28,.08)">{dot(c)}
      <span style="font-size:14px;flex:1">{n}</span>
      <span class="num" style="font-size:13px;color:#9a9aa0;width:24px;text-align:right">{d}</span>
      <span class="num" style="font-size:15px;font-weight:600;width:56px;text-align:right">{s}<span
        style="font-size:11.5px;color:#9a9aa0;font-weight:400"> / {t}</span></span></div>"""
      for n,c,d,s,t in cats)
    mistakes=''.join(f"""<div style="display:flex;align-items:center;gap:11px;padding:9px 16px;
      border-bottom:1px solid rgba(26,26,28,.07)">{dot(c,7)}{AR(g,18)}
      <span class="num" style="font-size:12.5px;color:#6a6a73;margin-left:auto">{d}</span>
      <span style="color:#c3c1c6;font-size:13px">›</span></div>"""
      for g,c,d in [('ش',J,'−2'),('و',F,'−1'),('ل',K,'−1'),('و',J,'−2')])
    return f"""<div style="width:330px;background:#fff;border:1px solid rgba(26,26,28,.10);
      border-radius:8px;overflow:hidden">
      <div style="display:flex;align-items:center;padding:11px 16px;border-bottom:1px solid rgba(26,26,28,.08)">
        <span style="font-size:12.5px;font-weight:600">Hassan Yoonus</span>
        <span style="margin-left:auto;display:flex;gap:4px">{dot(J,7)}{dot(K,7)}{dot(F,7)}{dot(A,7)}</span></div>
      <div style="display:flex;align-items:baseline;padding:13px 16px;border-bottom:1px solid rgba(26,26,28,.08)">
        <span class="mic">Score</span>
        <span class="num" style="margin-left:auto;font-size:29px;font-weight:600;letter-spacing:-.02em">84</span>
        <span class="num" style="font-size:12px;color:#9a9aa0;margin-left:3px">/ 100</span></div>
      {rows}
      <div style="display:flex;align-items:center;gap:9px;padding:9px 16px">{dot(A)}
        <span style="font-size:14px;flex:1">Adu / Raagu</span>
        <span class="num" style="font-size:13px;color:#9a9aa0">—</span>
        <span class="num" style="font-size:14px;font-weight:600;border:1px solid rgba(26,26,28,.14);
          border-radius:8px;padding:5px 10px;margin-left:8px">8<span style="font-size:11px;color:#9a9aa0;font-weight:400"> / 10</span></span></div>
      <div style="padding:0 16px 12px"><div style="border:1px solid rgba(26,26,28,.12);border-radius:8px;
        padding:7px 10px;font-size:12.5px;color:#9a9aa0">Reason (optional)</div></div>
      <div style="display:flex;align-items:center;padding:10px 16px;border-top:1px solid rgba(26,26,28,.08);
        border-bottom:1px solid rgba(26,26,28,.08)"><span class="mic">Mistakes · 4</span>
        <span style="margin-left:auto;font-size:11.5px;color:#6a6a73">View all</span></div>
      {mistakes}
      <div style="padding:12px 16px 14px"><div class="mic">Notes</div>
        <div style="border:1px solid rgba(26,26,28,.12);border-radius:8px;padding:9px 10px;margin-top:8px;
          font-size:12.5px;color:#3a3a40;line-height:1.45">Breath control on the long ayahs.</div>
        <div style="background:#1a1a1c;color:#f2f1ee;border-radius:8px;text-align:center;padding:11px;
          font-size:13.5px;font-weight:600;margin-top:12px">Finish recitation</div></div>
    </div>"""

def picker(sel=None):
    pills=''.join(f"""<div style="display:flex;align-items:center;gap:8px;padding:8px 13px;
      border-bottom:1px solid rgba(26,26,28,.07);background:{'#eceefb' if n=='Faṣāḥa' and sel=='pill' else 'transparent'}">
      {dot(c,7)}<span style="font-size:13px;color:{cs}">{n}</span>
      <span class="num" style="margin-left:auto;font-size:12px;color:#6a6a73">{d}</span></div>"""
      for n,c,cs,d in [('Faṣāḥa',F,FS,'−1'),('Khafī',K,KS,'−1'),('Jalī',J,JS,'−2')])
    letters=''.join(f"""<div style="flex:1;text-align:center;padding:9px 0;border-radius:6px;
      background:{'#f1f0ed' if (t=='ت' and sel in ('letter','pill')) else 'transparent'}">{AR(t,21)}</div>"""
      for t in ('ل','ت','ق'))
    return f"""<div style="width:196px;background:#fff;border:1px solid rgba(26,26,28,.10);
      border-radius:10px;box-shadow:0 8px 22px rgba(0,0,0,.07);overflow:hidden">
      {pills}<div style="display:flex;padding:5px">{letters}</div></div>"""

def word(mark=None):
    return f"""<div style="background:#fbfaf7;border:1px solid rgba(26,26,28,.09);border-radius:6px;
      padding:16px 22px;display:inline-block;{'box-shadow:0 0 0 2px rgba(85,102,230,.35)' if mark=='held' else ''}">
      <span style="font-family:HafsUthmanic,serif;direction:rtl;font-size:30px;color:#1c1b16;
        {'background:rgba(85,102,230,.13);border-radius:3px;padding:0 2px' if mark=='done' else ''}">فَتَقُولُ</span></div>"""

steps=[('Press the word','A press under half a second opens the tray under the word it came from.',word('held')),
       ('Choose the letter','The tray offers only the letters in that word. The mistake is against one of them, not the word.',picker('letter')),
       ('Choose the criterion','The amount comes from the competition’s own scoring, so the judge picks a name, not a number.',picker('pill'))]
cols=''.join(f"""<div style="flex:1">
  <div style="{FIELD};height:210px;display:flex;align-items:center;justify-content:center;padding:14px">{art}</div>
  <div style="font-size:14px;font-weight:600;margin-top:14px">{t}</div>{cap(d,'margin-top:6px;font-size:12px')}</div>"""
  for t,d,art in steps)
art=f"""<div style="display:flex;gap:26px;height:100%">
 <div style="width:238px;flex:none">
   <div style="transform:scale(.72);transform-origin:top left;width:330px">{score_panel()}</div>
 </div>
 <div style="flex:1;display:flex;flex-direction:column">
   <div style="display:flex;gap:20px">{cols}</div>
   <div style="display:flex;gap:22px;margin-top:26px">
     <div style="flex:1">{mic('One criterion, one gesture')}{cap('When a judge owns only one criterion, dragging from the word to a letter and letting go records it without opening anything.','margin-top:8px;font-size:12px')}</div>
     <div style="flex:1">{mic('Undo is part of the record')}{cap('Every mark opens into one line: the word, the reference, the amount, and Undo. A removed mark leaves the log; it does not disappear from it.','margin-top:8px;font-size:12px')}</div>
     <div style="flex:1">{mic('Nothing is coloured until it is judged')}{cap('Holding a word is not yet a verdict, so it stays neutral. Colour on the page belongs to the criteria alone.','margin-top:8px;font-size:12px')}</div>
   </div>
 </div></div>"""
P.append(page('3.1','Judging','Press a word, choose the letter, choose the criterion. That is the whole interaction.',art,'In the product','18'))
write('m_e.html',P)
print('pages',len(P))
