# -*- coding: utf-8 -*-
"""Manual page template. Landscape 1600x1000. Everything on the app's 4px module."""
import io, base64
from mark import mark, counter_inner, view_box
FONTS=io.open('fonts.css',encoding='utf-8').read()
INTER=base64.b64encode(open('InterVariable.woff2','rb').read()).decode()

HEAD = """<meta charset="utf-8"><style>
%s
@font-face{font-family:"InterVar";src:url(data:font/woff2;base64,%s) format("woff2");font-weight:100 900}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:InterVar,system-ui;color:#1a1a1c;-webkit-font-smoothing:antialiased;background:#8c8a86}
.pg{width:1600px;height:820px;background:#fff;position:relative;display:grid;
    grid-template-columns:64px 336px 64px 1fr 64px;   /* 4px module x16 */
    grid-template-rows:64px auto 1fr 56px;margin-bottom:24px}
.no{grid-column:2;grid-row:2;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#9a9aa0}
.ttl{grid-column:2;grid-row:2;margin-top:22px;font-size:22px;font-weight:600;letter-spacing:-.018em}
.txt{grid-column:2;grid-row:3;padding-top:20px}
.txt p{font-size:14px;line-height:1.62;color:#3a3a40;margin-bottom:13px;max-width:320px}
.txt p.k{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#9a9aa0;margin:22px 0 9px}
.art{grid-column:4;grid-row:2 / span 2;position:relative;display:flex;
     flex-direction:column;justify-content:center;padding:8px 0 40px}
.ft{grid-column:2 / span 3;grid-row:4;display:flex;justify-content:space-between;align-items:flex-end;
    padding-bottom:22px;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#b0aeb2}
.rule{position:absolute;left:64px;right:64px;top:126px;height:1px;background:rgba(26,26,28,.13)}
</style>""" % (FONTS, INTER)

def page(no,title,body_html,art_html,section="1  The mark"):
    return """<div class="pg"><div class="rule"></div>
  <div class="no">%s</div><div class="ttl">%s</div>
  <div class="txt">%s</div><div class="art">%s</div>
  <div class="ft"><span>Tanween — Brand Standards</span><span>%s</span></div>
</div>"""%(no,title,body_html,art_html,section)

def write(name,pages):
    io.open(name,'w',encoding='utf-8').write(HEAD+''.join(pages))
