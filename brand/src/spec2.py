# -*- coding: utf-8 -*-
"""Manual page template, second edition.
1280x800. Bigger type, one idea per page, the drawing does the work."""
import io, base64
from mark import counter_inner, view_box

FONTS = io.open('fonts.css', encoding='utf-8').read()      # HafsUthmanic, base64
INTER = base64.b64encode(open('InterVariable.woff2','rb').read()).decode()
VB    = view_box()
ART   = counter_inner()
VBH   = float(VB.split()[3])          # 44.71 — mark height in units
A_OF_H= 14.0/VBH                      # one a as a fraction of the mark's height

INK, PAPER, PAGE = '#1a1a1c', '#f2f1ee', '#fbfaf7'
J, K, F, A = '#d8453d', '#c0892a', '#5566e6', '#377b60'
JS, KS, FS, AS_ = '#9e2820', '#7c540e', '#2f3aa3', '#26624b'

def M(h, f=INK, style=''):
    return '<svg height="%s" viewBox="%s" fill="%s" style="%s">%s</svg>' % (h, VB, f, style, ART)

def LK(h=40, f=INK):
    """The lockup at the published ratio: name set to the mark's height, 1.25a between."""
    gap = h * A_OF_H * 1.25
    return ('<span style="display:inline-flex;align-items:center;gap:%.2fpx">%s'
            '<span style="font-size:%.1fpx;font-weight:600;letter-spacing:-.032em;'
            'color:%s;line-height:1">Tanween</span></span>') % (gap, M(h, f), h, f)

HEAD = """<meta charset="utf-8"><style>
%s
@font-face{font-family:"InterVar";src:url(data:font/woff2;base64,%s) format("woff2");font-weight:100 900}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:InterVar,system-ui;color:#1a1a1c;background:#8a8886;
     -webkit-font-smoothing:antialiased}
.pg{width:1280px;height:800px;background:#fff;position:relative;margin-bottom:20px;overflow:hidden}
.hd{position:absolute;left:60px;top:48px;right:60px}
.eyebrow{font-size:11px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:#9a9aa0}
.ttl{font-size:42px;font-weight:600;letter-spacing:-.026em;line-height:1.04;margin-top:14px}
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
/* section divider */
.dv{width:1280px;height:800px;background:#1a1a1c;color:#f2f1ee;position:relative;margin-bottom:20px}
.dv .n{position:absolute;left:60px;bottom:150px;font-size:150px;font-weight:600;letter-spacing:-.05em;
       line-height:.8;color:rgba(242,241,238,.16)}
.dv .t{position:absolute;left:60px;bottom:60px;font-size:44px;font-weight:600;letter-spacing:-.026em}
.dv .l{position:absolute;left:60px;top:60px}
.dv .d{position:absolute;right:60px;bottom:66px;max-width:380px;text-align:right;
       font-size:15px;line-height:1.55;color:rgba(242,241,238,.62)}
</style>""" % (FONTS, INTER)

def page(no, title, deck, art, section, pageno):
    eyebrow = no if no == section else no + ' &nbsp;·&nbsp; ' + section
    return """<div class="pg">
  <div class="hd"><div class="eyebrow">%s</div><div class="ttl">%s</div><div class="deck">%s</div></div>
  <div class="rule"></div><div class="art">%s</div>
  <div class="ft"><span>Tanween &nbsp;·&nbsp; Brand standards</span>
    <span class="pn"><span class="num">%s</span></span></div>
</div>""" % (eyebrow, title, deck, art, pageno)

def divider(n, title, deck):
    return """<div class="dv"><div class="l">%s</div><div class="n num">%s</div>
      <div class="t">%s</div><div class="d">%s</div></div>""" % (M(34, PAPER), n, title, deck)

def write(name, pages):
    io.open(name, 'w', encoding='utf-8').write(HEAD + ''.join(pages))
