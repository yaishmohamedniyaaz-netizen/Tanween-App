"""Check every generated outer border against independently extracted owned ink.

Uses page_pieces directly, not the generator or its proposal/cut implementation.
Pixel threshold and component ownership remain the existing pipeline's contract.
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from pieces2 import page_pieces
from pieces import D

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/letter-borders-guess'
counts=dict(checked=0,boxInkFallbacks=0,fractionalEdgeClamps=0,approvedOuterDifferences=0)
approved_differences=[]
for page in range(1,605):
    data=json.loads((OUT/f'p{page}.json').read_text(encoding='utf-8'))['words']
    ap=ROOT/f'public/letter-borders/p{page}.json'
    approved=json.loads(ap.read_text(encoding='utf-8'))['words'] if ap.exists() else {}
    parts,lab=page_pieces(page)
    ink=np.array(Image.open(Path(D)/f'p{page}.png').convert('L'))<128
    for item in parts:
        w=item['word']; wid=w['wid']
        x0,y0,x1,y1=[int(round(v)) for v in w['body']]
        ya,yb=max(0,y0-8),min(lab.shape[0],y1+8)
        ids=[q['id'] for q in item['pieces']]
        owned=np.isin(lab[ya:yb,x0:x1],ids)&ink[ya:yb,x0:x1]
        if not owned.any():
            owned=ink[ya:yb,x0:x1]
            if wid in data: counts['boxInkFallbacks']+=1
        cols=np.flatnonzero(owned.any(0))
        assert len(cols), f'No ink: {wid}'
        raw=[int(cols[-1])+1+x0,int(cols[0])+x0]
        ends=[min(raw[0],int(np.floor(w['body'][2]))),max(raw[1],int(np.ceil(w['body'][0])))]
        if wid in data:
            assert [data[wid]['x'][0],data[wid]['x'][-1]]==ends, f'Wrong ink ends: {wid}'
            counts['checked']+=1
            counts['fractionalEdgeClamps']+=raw!=ends
        elif wid in approved and [approved[wid]['x'][0],approved[wid]['x'][-1]]!=ends:
            counts['approvedOuterDifferences']+=1
            approved_differences.append(dict(wid=wid,page=page,approved=[approved[wid]['x'][0],approved[wid]['x'][-1]],detected=ends))
    if page%100==0: print(f'Ink checked through page {page}',flush=True)
report=dict(passed=True,counts=counts,approvedOuterDifferences=approved_differences)
(Path(__file__).parent/'ink-validation-report.json').write_text(json.dumps(report,separators=(',',':'))+'\n',encoding='utf-8')
print(json.dumps(report,indent=2))
