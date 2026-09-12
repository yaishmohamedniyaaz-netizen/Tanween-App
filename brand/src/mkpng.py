# -*- coding: utf-8 -*-
"""HTML sources for the raster assets + the proof sheet. Rendered by raster.mjs."""
import io, base64
from mark import counter_inner, view_box
INTER=base64.b64encode(open('InterVariable.woff2','rb').read()).decode()
FONT='@font-face{font-family:"InterVar";src:url(data:font/woff2;base64,%s) format("woff2");font-weight:100 900}'%INTER
ART=counter_inner(); VB=view_box()
def MK(h,f): return '<svg height="%s" viewBox="%s" fill="%s">%s</svg>'%(h,VB,f,ART)

def lockup(fg,bg,h=30,fs=29,gap=13):
    return ('<!doctype html><meta charset="utf-8"><style>%s *{margin:0;padding:0}'
      'body{background:%s}#t{display:inline-flex;align-items:center;gap:%dpx;padding:%dpx;'
      'font-family:InterVar}</style><div id="t">%s<span style="font-size:%dpx;font-weight:600;'
      'letter-spacing:-.032em;color:%s;line-height:1">Tanween</span></div>'
      )%(FONT,bg,gap,14,MK(h,fg),fs,fg)

io.open('r_lockup_ink.html','w',encoding='utf-8').write(lockup('#1a1a1c','#00000000'))
io.open('r_lockup_paper.html','w',encoding='utf-8').write(lockup('#f2f1ee','#00000000'))

# proof sheet — every file in the pack, shown at real size and small
tiles=''.join(
 '<div class="c"><div class="f" style="background:%s">%s</div><div class="n">%s</div></div>'%(b,v,n)
 for n,b,v in [
  ('tanween-mark-ink','#fbfaf7','<img src="assets/tanween-mark-ink.svg" style="height:54px">'),
  ('tanween-mark-paper','#1a1a1c','<img src="assets/tanween-mark-paper.svg" style="height:54px">'),
  ('tanween-mark-currentcolor','#fbfaf7','<span style="color:#5566e6">%s</span>'%MK(54,'currentColor')),
  ('tanween-icon-dark','#e7e6e2','<img src="assets/tanween-icon-dark.svg" style="width:120px">'),
  ('tanween-icon-light','#e7e6e2','<img src="assets/tanween-icon-light.svg" style="width:120px">'),
  ('tanween-icon-square','#e7e6e2','<img src="assets/tanween-icon-square.svg" style="width:120px">'),
  ('tanween-favicon','#e7e6e2','<img src="assets/tanween-favicon.svg" style="width:16px;image-rendering:auto"><img src="assets/tanween-favicon.svg" style="width:32px;margin-left:14px"><img src="assets/tanween-favicon.svg" style="width:64px;margin-left:14px">'),
 ])
io.open('r_proof.html','w',encoding='utf-8').write(
 '<!doctype html><meta charset="utf-8"><style>%s body{font-family:InterVar;background:#fff;padding:40px}'
 'h1{font-size:19px;font-weight:600;letter-spacing:-.02em;margin-bottom:4px}'
 'p{font-size:13px;color:#62626a;margin-bottom:28px}'
 '.g{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;width:1060px}'
 '.f{height:150px;display:flex;align-items:center;justify-content:center;border-radius:4px;'
 'border:1px solid rgba(26,26,28,.10)}'
 '.n{font-size:11px;color:#8b8b95;margin-top:8px;font-variant-numeric:tabular-nums}'
 '</style><h1>Tanween — asset proof</h1><p>Generated from mark.py. Trimmed artwork, no baked padding.</p>'
 '<div class="g">%s</div>'%(FONT,tiles))
print('html written')
