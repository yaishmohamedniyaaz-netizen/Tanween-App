"""Resumable visual decisions; only explicit image reviews append annotations."""
import json,sys,hashlib,math
from pathlib import Path
from datetime import datetime,timezone
from PIL import Image
import workflow as w

H=Path(__file__).resolve().parent
V=H.parents[1]
M=w.read(H/'manifest.json')
def read(p):return w.read(p)
def append(p,d):
    with p.open('a',encoding='utf8') as f:f.write(json.dumps(d,ensure_ascii=False)+'\n')
def render(records,name,large=True):
    ids=list(records);n=6 if large else 25;tw,th=(1000,590) if large else (520,300);cols=2 if large else 5
    sheets=[]
    for start in range(0,len(ids),n):
        batch=ids[start:start+n];im=Image.new('RGB',(cols*tw,math.ceil(n/cols)*th),'#eee')
        for i,wid in enumerate(batch):im.paste(w.tile(M['words'][wid],records[wid].get('x'),large),((i%cols)*tw,(i//cols)*th))
        path=H/f'{name}-{start//n+1:03}.png';assert not path.exists();im.save(path)
        sheets.append({'image':path.name,'words':batch,'stage':name})
    w.write(H/f'{name}-sheets.json',sheets)
    return sheets
def accept(name,indexes,skip=()):
    sheets=read(H/f'{name}-sheets.json');draft=read(H/f'{name}-draft.json');existing=w.final_records()
    for i in indexes:
        s=sheets[i-1];im=H/s['image'];append(V/'audit/rank006.jsonl',{'event':'visually-reviewed','image':im.relative_to(w.ROOT).as_posix(),'words':s['words'],'stage':name,'observer':'visual_6_35','at':w.now(),'sha256':hashlib.sha256(im.read_bytes()).hexdigest()})
        for wid in s['words']:
            if wid in skip:continue
            d=draft[wid]
            if d['source']=='visual-copy':d['note']=d['note'].replace('destination requires sheet review.','destination visually checked in '+s['image']+'.')
            if existing.get(wid)!=d:append(V/'annotations/rank006.jsonl',d);existing[wid]=d
    print('Accepted unique',len(existing))
if __name__=='__main__':
    if sys.argv[1]=='resume':
        a=w.final_records();r=read(H/'representative-cuts.json');pending={x['wid'] for x in read(H/'pending-owner.json')};missing={'4.5.6','4.95.27','40.33.11'}
        records={wid:d for wid,d in r.items() if wid not in a and wid not in missing}
        for wid,d in records.items():
            if wid in pending or wid in {'42.44.2','39.36.1','39.36.10'}:
                d.update(confidence='low',reviewFlags=['clipped-ink'],note='Owner decision: keep inside immutable body. Visible alif or attached mark clipped at right; borders retain remaining stem. Alif gap and ha upright manually identified; review clipped ink.')
        w.write(H/'resume-check-v1-draft.json',records);render(records,'resume-check-v1')
    elif sys.argv[1]=='accept':accept(sys.argv[2],[int(i) for i in sys.argv[3:]])
