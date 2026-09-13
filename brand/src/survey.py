# -*- coding: utf-8 -*-
"""Which Google Fonts families can actually set Laḥn Jalī and Faṣāḥa?"""
import re, subprocess, os, sys
from fontTools.ttLib import TTFont
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
NEED='ḥṣḍṭẓ'          # the dot-below letters the app's criteria names use
SOFT='āīū'            # macrons, usually present
os.makedirs('survey',exist_ok=True)

def css(fam, axis='wght@300..800'):
    q=fam.replace(' ','+')
    url=f"https://fonts.googleapis.com/css2?family={q}:{axis}&display=swap"
    r=subprocess.run(['curl','-sS','--max-time','30','-A',UA,url],capture_output=True)
    out=r.stdout.decode()
    if '@font-face' not in out:   # family may be static only
        url=f"https://fonts.googleapis.com/css2?family={q}&display=swap"
        out=subprocess.run(['curl','-sS','--max-time','30','-A',UA,url],capture_output=True).stdout.decode()
    return out

def cmap_for(fam):
    c=css(fam); chars=set()
    for m in re.finditer(r'@font-face\s*\{(.*?)\}',c,re.S):
        b=m.group(1)
        if 'italic' in b: continue
        u=re.search(r'url\((https://[^)]+)\)',b)
        rng=re.search(r'unicode-range:\s*([^;]+);',b)
        if not u: continue
        if rng and not ('U+0000' in rng.group(1) or 'U+1E00' in rng.group(1)): continue
        p=f"survey/{fam.replace(' ','_')}_{len(chars)}_{abs(hash(u.group(1)))%9999}.woff2"
        subprocess.run(['curl','-sS','--max-time','45','-A',UA,'-o',p,u.group(1)],check=False)
        try: chars|=set(TTFont(p).getBestCmap())
        except Exception: pass
        os.remove(p) if os.path.exists(p) else None
    return chars

FAMS=["Inter","Platypi","Fraunces","Literata","Source Serif 4","Spectral","EB Garamond",
      "Newsreader","Lora","Crimson Pro","Instrument Serif","Bricolage Grotesque",
      "Schibsted Grotesk","Figtree","Public Sans","IBM Plex Sans","Noto Serif","Gentium Book Plus",
      "Charis SIL","Petrona","Young Serif","Roboto Serif"]
print(f"{'family':24} {'ḥṣḍṭẓ':>7}  {'āīū':>5}  glyphs")
for f in FAMS:
    cm=cmap_for(f)
    if not cm: print(f"{f:24} {'?':>7}  {'?':>5}  (no css)"); continue
    miss=''.join(c for c in NEED if ord(c) not in cm)
    soft=''.join(c for c in SOFT if ord(c) not in cm)
    print(f"{f:24} {('ALL' if not miss else 'no '+miss):>7}  {('ALL' if not soft else 'no '+soft):>5}  {len(cm)}")
