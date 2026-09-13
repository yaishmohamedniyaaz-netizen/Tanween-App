# -*- coding: utf-8 -*-
import io, base64
from spec2 import *
P=[]
FIELD='background:#fbfaf7;border:1px solid rgba(26,26,28,.09);border-radius:4px'
ATK=base64.b64encode(open('atknext-200_800.woff2','rb').read()).decode()
ATKE=base64.b64encode(open('atknext-ext.woff2','rb').read()).decode()
def cap(t,s=''): return f'<div class="cap" style="{s}">{t}</div>'
def mic(t,s=''): return f'<div class="mic" style="{s}">{t}</div>'

# ---------------------------------------------------------------- 2.4 type
scale=[('27','Display','--t-display','one number on a screen turned toward a reciter'),
       ('21','Title','--t-title','a participant name, a page title'),
       ('17','Lead','--t-lead','the first line of a card'),
       ('15','Body','--t-body','everything a judge reads while judging'),
       ('14','Small','--t-small','table rows, meta lines'),
       ('12','Micro','--t-micro','the smallest size allowed anywhere')]
rows=''.join(f"""<div style="display:flex;align-items:baseline;gap:22px;padding:13px 0;
   border-bottom:1px solid rgba(26,26,28,.08)">
   <div class="num" style="width:34px;font-size:13px;color:#9a9aa0">{a}</div>
   <div style="font-size:{a}px;font-weight:600;letter-spacing:-.02em;width:124px">{b}</div>
   <div class="mic" style="width:104px">{c}</div>
   <div class="cap" style="flex:1;font-size:12px">{d}</div></div>""" for a,b,c,d in scale)
atkface=f"""<style>
@font-face{{font-family:"ATKX";src:url(data:font/woff2;base64,{ATK}) format("woff2");font-weight:200 800}}
@font-face{{font-family:"ATKX";src:url(data:font/woff2;base64,{ATKE}) format("woff2");font-weight:200 800;
  unicode-range:U+0100-02BA,U+1E00-1E9F,U+2C60-2C7F}}
</style>"""
art=f"""{atkface}<div style="display:flex;gap:28px;height:100%">
 <div style="flex:1">
  <div style="{FIELD};padding:22px 26px 18px">
    <div style="display:flex;align-items:baseline;gap:16px">
      <div style="font-size:44px;font-weight:600;letter-spacing:-.03em">InterVar</div>
      <div class="cap">shipped at public/fonts/InterVariable.woff2</div></div>
    <div style="font-size:20px;color:#3a3a40;margin-top:12px;line-height:1.4">
      Laḥn Jalī &nbsp;Laḥn Khafī &nbsp;Faṣāḥa &nbsp;Adu / Raagu &nbsp;
      <span class="num">0123456789</span></div>
  </div>
  <div style="margin-top:22px">{rows}</div>
  {cap('Whole pixels only. The half pixel sizes this replaced came from nudging one screen at a time, which is why no two of them agreed.','margin-top:16px')}
 </div>
 <div style="width:342px">
  <div style="{FIELD};padding:20px 24px">
   {mic('The Qur’an face')}
   <div style="font-family:HafsUthmanic,serif;direction:rtl;font-size:34px;color:#1c1b16;margin-top:12px">
     بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ</div>
   {cap('KFGQPC HafsUthmanic, 1405 layout. Qur’anic text is never set in a UI face, never restyled, never retyped by hand. On the mushaf page the app loads the King Fahd page fonts, one file per page, so the line breaks match the printed copy.','margin-top:12px')}
  </div>
  <div style="{FIELD};padding:20px 24px;margin-top:20px">
   {mic('We tested Atkinson Hyperlegible')}
   <div style="font-family:ATKX,serif;font-size:25px;font-weight:600;margin-top:12px;letter-spacing:-.01em">Laḥn Jalī · Faṣāḥa</div>
   {cap('It has no ḥ and no ṣ. Both families, every subset. The browser quietly borrows those two letters from another typeface, and three of the four criteria names end up set in two faces at once. Inter&#39;s ss02, which it calls Disambiguation, gives the slashed zero and the tailed l that Atkinson is wanted for, in a font that has the letters.','margin-top:12px')}
  </div>
 </div></div>"""
P.append(page('2.4','Type','One sans, one Qur’anic face, six sizes.',art,'The system','15'))

# ---------------------------------------------------------------- 2.5 the tally
UNIT=17
def bars(data,h=None,gap=None):
    h = h or UNIT*3.5; gap = gap or UNIT*0.5
    out=''.join(f'<div style="width:{n*UNIT:.0f}px;height:{h:.0f}px;background:{c};border-radius:4px"></div>'
                for c,n in data)
    return f'<div style="display:flex;gap:{gap:.0f}px;align-items:center">{out}</div>'
sheet=[(J,6),(K,3),(F,1),(A,6.5)]
nums=''.join(f'<div class="num" style="width:{n*UNIT:.0f}px;font-size:12px;color:#6a6a73">{n:g}</div>'
             for c,n in sheet)
art=f"""<div style="display:flex;gap:26px;height:100%">
 <div style="flex:1;{FIELD};padding:38px 40px;display:flex;flex-direction:column;justify-content:center">
  {mic('Mariyam Aisha · 02 · Under 14 · Nubalaa')}
  <div style="margin-top:18px">{bars(sheet)}</div>
  <div style="display:flex;gap:{UNIT*0.5:.0f}px;margin-top:11px">{nums}</div>
  <div style="height:1px;background:rgba(26,26,28,.10);margin:30px 0"></div>
  <div style="display:flex;gap:40px">
    <div><div class="mic">Deducted</div><div class="num" style="font-size:32px;font-weight:600;margin-top:6px">16.5</div></div>
    <div><div class="mic">Total</div><div class="num" style="font-size:32px;font-weight:600;margin-top:6px">83.5<span style="font-size:16px;color:#9a9aa0">/100</span></div></div>
    <div><div class="mic">Question</div><div class="num" style="font-size:32px;font-weight:600;margin-top:6px">91:6–92:9</div></div>
  </div>
 </div>
 <div style="width:330px">
  {mic('What the bars are')}
  {cap('Marks deducted, one bar per criterion. Six off Laḥn Jalī, three off Khafī, one off Faṣāḥa, six and a half off Adu / Raagu. The four add up to 16.5, which is exactly what came off the hundred.','margin-top:9px')}
  {mic('How it is drawn','margin-top:20px')}
  {cap('One mark is one unit of width. The bar is three and a half units tall and the gap is half a unit, so the whole thing scales from one number. The order is fixed: Jalī, Khafī, Faṣāḥa, Adu / Raagu, left to right, whether or not a criterion took anything.','margin-top:9px')}
  {mic('The rule','margin-top:20px')}
  {cap('Draw it only from a real sheet. Four equal blocks with no recitation behind them is decoration, and decoration in these four colours is a claim about somebody’s recitation that nobody made.','margin-top:9px')}
  {mic('Where it belongs','margin-top:20px')}
  {cap('Covers, certificates, a results poster, the head of a summary page. This is the one piece of the identity that is not in the app yet, and it is built from numbers the app already holds.','margin-top:9px')}
 </div></div>"""
P.append(page('2.5','The tally','The four colours together, once, and only against real marks.',art,'The system','16'))

P.append(divider('3','In the product','The screens judges use. Everything here is a drawing of what the app does today.'))
write('m_d.html',P)
print('pages',len(P))
