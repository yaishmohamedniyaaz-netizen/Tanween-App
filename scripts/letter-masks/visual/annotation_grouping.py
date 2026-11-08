"""Manual grouping-agent review helpers. No inner border is inferred from pixels.

Only `accept` appends final decisions, after an explicit image-view event.
Copy proposals linearly align a manually entered representative cut using the
cluster comparison box. Every proposal remains a draft until its sheet is seen.
"""
import argparse,datetime as dt,json,math,sys
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
from collections import defaultdict
HERE=Path(__file__).resolve().parent; ROOT=HERE.parents[2]
sys.path.insert(0,str(HERE)); sys.path.insert(0,str(HERE.parent))
import pilot_render as pr
import style_render
from pieces2 import page_pieces
ART=ROOT/'public/mushaf/1405-artwork-5a5f9f3846158475'
def read(p):return json.loads(Path(p).read_text(encoding='utf-8'))
def write(p,v):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
def rows(p):return [json.loads(s) for s in p.read_text(encoding='utf-8').splitlines() if s.strip()] if p.exists() else []
def append(p,v):p.parent.mkdir(parents=True,exist_ok=True);f=p.open('a',encoding='utf-8');f.write(json.dumps(v,ensure_ascii=False,separators=(',',':'))+'\n');f.close()
def setup(rank):
    g=read(HERE/'groups.json'); text,e=next((t,e) for t,e in g['spellings'].items() if e['rank']==rank); excluded={w['wid'] for w in read(HERE/'blind/test-ids.json')}
    out=HERE/f'reviews/rank{rank:03}'; out.mkdir(parents=True,exist_ok=True); cs=[]
    for c in e['clusters']:
        c=dict(c); c['memberIds']=[w for w in c['memberIds'] if w not in excluded]
        if not c['memberIds']:continue
        if c['representative']['wid'] in excluded:
            wid=c['memberIds'][0]; c['representative']={'wid':wid,**g['words'][wid],'units':e['unitVariants'][c['unitVariant']]}
        cs.append(c)
    pr.HERE=out; style_render.OUT=out/'pilot'; style_render.OUT.mkdir(exist_ok=True)
    return g,e,cs,out

def metadata(c,wid,g,e):return {'wid':wid,**g['words'][wid],'units':e['unitVariants'][c['unitVariant']]}

def init(rank):
    g,e,cs,out=setup(rank); ids={wid for c in cs for wid in c['memberIds']}; ends={}
    for page in sorted({g['words'][wid]['page'] for wid in ids}):
        parts,lab=page_pieces(page)
        for item in parts:
            w=item['word']; wid=w['wid']
            if wid not in ids:continue
            x0,y0,x1,y1=[round(v) for v in w['body']]; ya,yb=max(0,y0-8),min(lab.shape[0],y1+8)
            own=np.isin(lab[ya:yb,x0:x1],[q['id'] for q in item['pieces']]);cols=np.flatnonzero(own.any(0))
            if not len(cols):raise ValueError('No owned ink: '+wid)
            ends[wid]=[min(int(cols[-1])+1+x0,math.floor(w['body'][2])),max(int(cols[0])+x0,math.ceil(w['body'][0]))]
    write(out/'outer-ends.json',ends)
    style_render.render_gdi_labels([{'key':f'{wid}-{i}','text':u['show']} for c in cs for wid in c['memberIds'] for i,u in enumerate(e['unitVariants'][c['unitVariant']])])
    sheets=[]
    for offset in range(0,len(cs),6):
        batch=cs[offset:offset+6]; canvas=Image.new('RGB',(2160,1770),'#eeeeee')
        for i,c in enumerate(batch):canvas.paste(pr.tile(c),((i%2)*1080,(i//2)*590))
        path=out/f'representatives-{offset//6+1:02}.png';canvas.save(path);sheets.append({'image':path.relative_to(ROOT).as_posix(),'clusters':[c['id'] for c in batch],'words':[c['representative']['wid'] for c in batch]})
    write(out/'representatives.json',sheets);write(out/'clusters.json',cs);print(len(cs),'representatives',len(ids),'members',len(sheets),'sheets',flush=True)

def propose(rank):
    g,e,cs,out=setup(rank);manual=read(out/'manual-cuts.json');ends=read(out/'outer-ends.json');draft={}
    unknown=set(manual)-{c['representative']['wid'] for c in cs}
    if unknown: raise ValueError(f'Unknown representative IDs in manual cuts: {sorted(unknown)}')
    for c in cs:
        rep=c['representative'];rid=rep['wid']
        if rid not in manual:continue
        m=manual[rid]; cuts=[ends[rid][0],*m['inner'],ends[rid][1]]
        assert len(cuts)==len(rep['units'])+1 and all(a-b>=2 for a,b in zip(cuts,cuts[1:])),rid
        draft[rid]={'wid':rid,'page':rep['page'],'x':cuts,'confidence':m['confidence'],'source':'visual','cluster':c['id'],'note':m['note']}
        rx0,_,rx1,_=rep['shapeComparisonBox']
        for wid in c['memberIds']:
            if wid==rid:continue
            w=g['words'][wid];x0,_,x1,_=w['shapeComparisonBox'];inner=[round(x0+(v-rx0)*(x1-x0)/(rx1-rx0)) for v in m['inner']]
            proposed=[ends[wid][0],*inner,ends[wid][1]]
            if not all(a-b>=2 for a,b in zip(proposed,proposed[1:])):raise ValueError('Invalid copy width '+wid)
            draft[wid]={'wid':wid,'page':w['page'],'x':proposed,'confidence':m['confidence'],'source':'visual-copy','cluster':c['id'],'note':f"Visually checked copy of {rid}; body alignment. "+m['note']}
    write(out/'draft-decisions.json',draft)
    repids=[c['representative']['wid'] for c in cs if c['representative']['wid'] in draft];byid={wid:c for c in cs for wid in c['memberIds']}
    sheets=[]
    for offset in range(0,len(repids),6):
        batch=repids[offset:offset+6];canvas=Image.new('RGB',(2160,1770),'#eeeeee')
        for i,wid in enumerate(batch):canvas.paste(pr.tile(byid[wid],draft[wid]),((i%2)*1080,(i//2)*590))
        path=out/f'representative-check-{offset//6+1:02}.png';canvas.save(path);sheets.append({'image':path.relative_to(ROOT).as_posix(),'words':batch,'kind':'representative-check'})
    members=[wid for c in cs for wid in c['memberIds'] if wid in draft and wid!=c['representative']['wid']]
    for offset in range(0,len(members),24):
        batch=members[offset:offset+24];canvas=Image.new('RGB',(1728,1416),'#eeeeee')
        for i,wid in enumerate(batch):
            c=dict(byid[wid]);c['representative']=metadata(c,wid,g,e);tile=pr.tile(c,draft[wid]).resize((432,236),Image.Resampling.LANCZOS);canvas.paste(tile,((i%4)*432,(i//4)*236))
        path=out/f'member-check-{offset//24+1:02}.png';canvas.save(path);sheets.append({'image':path.relative_to(ROOT).as_posix(),'words':batch,'kind':'member-check'})
    write(out/'review-sheets.json',sheets);print('Draft only:',len(draft),'decisions;',len(sheets),'review sheets')

def record(rank,image,accept=False):
    g,e,cs,out=setup(rank);manifest=read(out/'review-sheets.json') if accept else read(out/'representatives.json');sheet=next(s for s in manifest if Path(s['image']).name==image)
    audit=HERE/f'audit/rank{rank:03}.jsonl';append(audit,{'event':'visually-reviewed','image':sheet['image'],'words':sheet['words'],'observer':'grouping','time':dt.datetime.now(dt.timezone.utc).isoformat(),'phase':sheet.get('kind','representative-inspection')})
    if accept:
        drafts=read(out/'draft-decisions.json');path=HERE/f'annotations/rank{rank:03}.jsonl';existing={d['wid'] for d in rows(path)}
        for wid in sheet['words']:
            if wid not in existing:append(path,drafts[wid])
        print('Accepted after visual review:',len(sheet['words']))
    else: print('Recorded actual image view:',len(sheet['words']))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('action',choices=['init','propose','viewed','accept']);p.add_argument('rank',type=int);p.add_argument('image',nargs='?');a=p.parse_args()
    if a.action=='init':init(a.rank)
    elif a.action=='propose':propose(a.rank)
    else:record(a.rank,a.image,a.action=='accept')
