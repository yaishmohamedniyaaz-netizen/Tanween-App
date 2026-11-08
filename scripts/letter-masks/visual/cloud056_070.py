"""Cloud continuation helper; manual coordinates and actual views only."""
import sys,json,math,hashlib,shutil
from datetime import datetime,timezone
import annotation_grouping as ag
OBSERVER='cloud-ranks056_070'
def audit(rank,sheet,phase=None):
 p=ag.ROOT/sheet['image']
 ag.append(ag.HERE/f'audit/rank{rank:03}.jsonl',dict(event='visually-reviewed',observer=OBSERVER,image=sheet['image'],words=sheet['words'],phase=phase or sheet['kind'],time=datetime.now(timezone.utc).isoformat(),sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
def prepare(rank,sheets,values,note,confidence='medium'):
 out=ag.HERE/f'reviews/rank{rank:03}'; manifest=ag.read(out/'representatives.json');ids=[]
 for sn in sheets:
  s=manifest[sn-1];audit(rank,s,'original');ids.extend(s['words'])
 assert len(ids)==len(values)
 manual={wid:dict(inner=v,confidence=confidence,note=note) for wid,v in zip(ids,values) if v is not None}
 ag.write(out/'manual-cuts.json',manual);ag.propose(rank)
def accept(rank,batch,clipped=()):
 g,e,cs,out=ag.setup(rank); sheets=ag.read(out/'review-sheets.json');draft=ag.read(out/'draft-decisions.json'); archive=out/f'cloud-batch-{batch:03}';archive.mkdir()
 for wid in clipped:
  draft[wid]['confidence']='low';draft[wid]['reviewFlags']=['clipped-ink'];draft[wid]['note']+=' Partial ink clipped by immutable box; retained inward boundary for owner review.'
 byid={wid:c for c in cs for wid in c['memberIds']}
 for wid,d in draft.items():
  x0,_,x1,_=g['words'][wid]['body']; assert all(math.ceil(x0)<=v<=math.floor(x1) for v in d['x']),wid
  assert len(d['x'])==len(e['unitVariants'][byid[wid]['unitVariant']])+1,wid
  assert all(a-b>=2 for a,b in zip(d['x'],d['x'][1:])),wid
 target=ag.HERE/f'annotations/rank{rank:03}.jsonl'; existing={d['wid']:d for d in ag.rows(target)}
 for s in sheets:
  src=ag.ROOT/s['image'];dest=archive/src.name;shutil.copy2(src,dest);audit(rank,{**s,'image':dest.relative_to(ag.ROOT).as_posix()})
  for wid in s['words']:
   assert wid not in existing,wid
   existing[wid]=draft[wid]
 target.write_text(''.join(json.dumps(d,ensure_ascii=False)+'\n' for d in existing.values()),encoding='utf-8')
 ag.write(archive/'draft-decisions.json',draft)
 for name in ('review-sheets.json','manual-cuts.json'):shutil.copy2(out/name,archive/name)
 print('Saved',len(draft),'total',len(existing))
if __name__=='__main__':
 a=sys.argv
 if a[1]=='prepare':prepare(int(a[2]),json.loads(a[3]),json.loads(a[4]),a[5],a[6] if len(a)>6 else 'medium')
 elif a[1]=='accept':accept(int(a[2]),int(a[3]),json.loads(a[4]) if len(a)>4 else [])
