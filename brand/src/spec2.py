# -*- coding: utf-8 -*-
"""Manual page template, second edition.
1280x800. Bigger type, one idea per page, the drawing does the work."""
import io, base64, os, unicodedata
from mark import counter_inner, view_box

FONTS = io.open('fonts.css', encoding='utf-8').read()      # HafsUthmanic, base64
INTER = base64.b64encode(open('InterVariable.woff2','rb').read()).decode()
PLAT_L = base64.b64encode(open('f_platypi-latin.woff2','rb').read()).decode()
PLAT_E = base64.b64encode(open('f_platypi-ext.woff2','rb').read()).decode()
DISPLAY = os.environ.get('TW_DISPLAY', 'InterVar')   # "Platypi" to set the display layer in Platypi

def nfd(t):
    """Platypi has no precomposed ḥ ṣ ḍ ṭ ẓ but does have U+0323, so anything set
    in it is written decomposed and the font draws its own letter and its own dot."""
    return unicodedata.normalize('NFD', t) if DISPLAY != 'InterVar' else t
VB    = view_box()
ART   = counter_inner()
VBH   = float(VB.split()[3])          # 44.71 — mark height in units
A_OF_H= 14.0/VBH                      # one a as a fraction of the mark's height

INK, PAPER, PAGE = '#1a1a1c', '#f2f1ee', '#fbfaf7'
J, K, F, A = '#d8453d', '#c0892a', '#5566e6', '#377b60'
JS, KS, FS, AS_ = '#9e2820', '#7c540e', '#2f3aa3', '#26624b'

def M(h, f=INK, style=''):
    return '<svg height="%s" viewBox="%s" fill="%s" style="%s">%s</svg>' % (h, VB, f, style, ART)

LOCK_INK   = io.open('assets/tanween-lockup-ink.svg',encoding='utf-8').read()
LOCK_PAPER = io.open('assets/tanween-lockup-paper.svg',encoding='utf-8').read()
WORD_INK   = io.open('assets/tanween-wordmark-ink.svg',encoding='utf-8').read()
WORD_PAPER = io.open('assets/tanween-wordmark-paper.svg',encoding='utf-8').read()

def LK(h=40, f=INK):
    """The lockup, outlined. h is the mark's height, as everywhere else."""
    src = LOCK_PAPER if f == PAPER else LOCK_INK
    return src.replace('<svg ', '<svg height="%g" style="display:block" ' % h, 1)

def WORD(cap=40, f=INK):
    """The wordmark alone. cap is the cap height in px."""
    src = WORD_PAPER if f == PAPER else WORD_INK
    return src.replace('<svg ', '<svg height="%g" style="display:block" ' % cap, 1)

HEAD = """<meta charset="utf-8"><style>
%s
@font-face{font-family:"InterVar";src:url(data:font/woff2;base64,%s) format("woff2");font-weight:100 900}
@font-face{font-family:"Platypi";src:url(data:font/woff2;base64,%s) format("woff2");font-weight:300 800}
@font-face{font-family:"Platypi";src:url(data:font/woff2;base64,%s) format("woff2");font-weight:300 800;
 unicode-range:U+0100-02BA,U+0300-036F,U+1E00-1E9F,U+2C60-2C7F}
*{margin:0;padding:0;box-sizing:border-box}
body{--display:DISPLAYFAM;font-family:InterVar,system-ui;color:#1a1a1c;background:#8a8886;
     -webkit-font-smoothing:antialiased}
.pg{width:1280px;height:800px;background:#fff;position:relative;margin-bottom:20px;overflow:hidden}
.hd{position:absolute;left:60px;top:48px;right:60px}
.eyebrow{font-size:11px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:#9a9aa0}
.ttl{font-family:var(--display),InterVar;font-size:42px;font-weight:600;letter-spacing:-.026em;line-height:1.04;margin-top:14px}
.deck{font-size:17px;line-height:1.52;color:#4a4a52;max-width:660px;margin-top:16px}
.rule{position:absolute;left:60px;right:60px;top:200px;height:1px;background:rgba(26,26,28,.14)}
.art{position:absolute;left:60px;right:60px;top:232px;bottom:80px}
.ft{position:absolute;left:60px;right:60px;bottom:38px;display:flex;justify-content:space-between;
    align-items:center;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#b4b2b6}
.ft .pn{display:flex;align-items:center;gap:12px}
.ft .pn i{display:block;width:1px;height:11px;background:#d6d4d8}
.cap{font-size:12.5px;line-height:1.5;color:#6a6a73}
.mic{font-size:10.5px;font-weight:500;letter-spacing:.13em;text-transform:uppercase;color:#9a9aa0}
.num{font-variant-numeric:tabular-nums}
.ss{font-feature-settings:"ss02"}
b{font-weight:600}
.disp{font-family:var(--display),InterVar}
/* section divider */
.dv{width:1280px;height:800px;background:#1a1a1c;color:#f2f1ee;position:relative;margin-bottom:20px}
.dv .n{position:absolute;left:60px;bottom:150px;font-size:150px;font-weight:600;letter-spacing:-.05em;
       line-height:.8;color:rgba(242,241,238,.16)}
.dv .t{font-family:var(--display),InterVar;position:absolute;left:60px;bottom:60px;font-size:44px;font-weight:600;letter-spacing:-.026em}
.dv .l{position:absolute;left:60px;top:60px}
.dv .d{position:absolute;right:60px;bottom:66px;max-width:380px;text-align:right;
       font-size:15px;line-height:1.55;color:rgba(242,241,238,.62)}
</style>""" % (FONTS, INTER, PLAT_L, PLAT_E)

def page(no, title, deck, art, section, pageno):
    title = nfd(title)
    eyebrow = no if no == section else no + ' &nbsp;·&nbsp; ' + section
    return """<div class="pg">
  <div class="hd"><div class="eyebrow">%s</div><div class="ttl">%s</div><div class="deck">%s</div></div>
  <div class="rule"></div><div class="art">%s</div>
  <div class="ft"><span>Tanween &nbsp;·&nbsp; Brand standards</span>
    <span class="pn"><span class="num">%s</span></span></div>
</div>""" % (eyebrow, title, deck, art, pageno)

def divider(n, title, deck):
    title = nfd(title)
    return """<div class="dv"><div class="l">%s</div><div class="n num">%s</div>
      <div class="t">%s</div><div class="d">%s</div></div>""" % (M(34, PAPER), n, title, deck)

def write(name, pages):
    io.open(name, 'w', encoding='utf-8').write(HEAD + ''.join(pages))

HEAD = HEAD.replace('DISPLAYFAM', DISPLAY)
