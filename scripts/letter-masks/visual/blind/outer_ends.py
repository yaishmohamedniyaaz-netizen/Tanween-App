"""Retained owned-ink contract for outer endpoints only; never chooses inner cuts."""
import sys,json,math
from pathlib import Path
import numpy as np
from PIL import Image
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parents[1]))
from pieces2 import page_pieces
from pieces import D
ids=json.loads((HERE/'test-ids.json').read_text())
selected={q['wid'] for q in ids}; out={}
for page in sorted({q['page'] for q in ids}):
    parts,lab=page_pieces(page)
    ink=np.array(Image.open(Path(D)/f'p{page}.png').convert('L'))<128
    for item in parts:
        w=item['word']; wid=w['wid']
        if wid not in selected: continue
        x0,y0,x1,y1=[int(round(v)) for v in w['body']]
        ya,yb=max(0,y0-8),min(lab.shape[0],y1+8)
        own=np.isin(lab[ya:yb,x0:x1],[q['id'] for q in item['pieces']])&ink[ya:yb,x0:x1]
        fallback=not own.any()
        if fallback: own=ink[ya:yb,x0:x1]
        cols=np.flatnonzero(own.any(0))
        raw=[int(cols[-1])+1+x0,int(cols[0])+x0]
        ends=[min(raw[0],math.floor(w['body'][2])),max(raw[1],math.ceil(w['body'][0]))]
        out[wid]={'ends':ends,'fallback':fallback,'clamped':raw!=ends}
(HERE/'outer-ends.json').write_text(json.dumps(out,indent=2))
print(json.dumps(out,indent=2))
