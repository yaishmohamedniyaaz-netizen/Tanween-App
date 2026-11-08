"""Prepare single-target ma review sheets. No interior cuts exist for this target.

Candidates become decisions only after the named sheets are actually viewed.
"""
import sys
from pathlib import Path
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from build_guess_files import HERE, ROOT, ART, read, write
from font_support import load_font
sys.path.insert(0,str(HERE.parent))
from pieces2 import page_pieces

groups=read(HERE/'groups.json')
spelling=next(s for s in groups['spellings'].values() if s['rank']==4)
ids={wid:c['id'] for c in spelling['clusters'] for wid in c['memberIds']}
assert all(len(c['representative']['units'])==1 for c in spelling['clusters'])
metadata=read(HERE.parent/'approved/all-approvals-2026-11-06.json')['words']
test_pages=set(sorted({int(d['page']) for d in metadata if int(d['page'])>2})[1::2])
test_ids={d['wid'] for d in metadata if int(d['page']) in test_pages}
ids={wid:c for wid,c in ids.items() if wid not in test_ids}
out=HERE/'reviews/rank004'; out.mkdir(parents=True,exist_ok=True)
candidates=[]; crops={}
for p in sorted({groups['words'][wid]['page'] for wid in ids}):
    items,lab=page_pieces(p)
    img=Image.open(ART/f'p{p}.png').convert('RGB'); ink=np.asarray(img.convert('L'))<128
    for item in items:
        g=item['word']; wid=g['wid']
        if wid not in ids: continue
        x0,y0,x1,y1=[round(v) for v in g['body']]
        ya,yb=max(0,y0-8),min(img.height,y1+8)
        owned=np.isin(lab[ya:yb,x0:x1],[q['id'] for q in item['pieces']]) & ink[ya:yb,x0:x1]
        cols=np.flatnonzero(owned.any(0))
        if not len(cols): raise ValueError(f'No owned ink for {wid}')
        x=[min(x0+int(cols[-1])+1,math.floor(g['body'][2])),max(x0+int(cols[0]),math.ceil(g['body'][0]))]
        d=dict(wid=wid,page=p,x=x,confidence='high',source='visual',cluster=ids[wid],
               note='Single app target mim+madd-alif: full word span, no interior boundary; extent visually checked.')
        candidates.append(d); crops[wid]=(img.crop((x0,ya,x1,yb)),x0)
font=load_font(16)
man=[]
for start in range(0,len(candidates),20):
    ds=candidates[start:start+20]; sheet=Image.new('RGB',(1600,1200),'#f5f5f5'); draw=ImageDraw.Draw(sheet)
    for i,d in enumerate(ds):
        xx=(i%4)*400; yy=(i//4)*240
        draw.text((xx+10,yy+7),f'p{d["page"]} {d["wid"]} | 1 target ma',font=font,fill='black')
        crop,x0=crops[d['wid']]; scale=min(185/crop.height,370/crop.width)
        crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
        a=np.asarray(crop).astype(float); bg=np.full(a.shape,255.0)
        l,r=[round((x-x0)*scale) for x in d['x'][::-1]]
        bg[:,max(0,l):min(crop.width,r)]=[228,240,253]
        colored=Image.fromarray((a*bg/255).astype('uint8'))
        ox=xx+(400-crop.width)//2; oy=yy+33; sheet.paste(colored,(ox,oy))
        for v in d['x']:
            vx=ox+round((v-x0)*scale); draw.line((vx,oy,vx,oy+crop.height),fill='#527c94',width=1)
        draw.text((xx+10,yy+220),f'{d["x"][0]} -> {d["x"][1]}',font=font,fill='#4b4b4b')
    path=out/f'sheet-{start//20+1:03}.png'; sheet.save(path)
    man.append(dict(image=path.relative_to(ROOT).as_posix(),words=[d['wid'] for d in ds]))
write(out/'candidates.json',candidates); write(out/'manifest.json',man)
print(len(candidates),'candidates;',len(man),'sheets; NOT marked reviewed')
