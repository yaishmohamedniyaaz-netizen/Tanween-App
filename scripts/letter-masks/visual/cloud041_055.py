"""Manual-only review helper; invoke record/accept only after actual image views."""
import sys,json,math,hashlib,shutil
from pathlib import Path
from datetime import datetime,timezone
import annotation_grouping as ag
OBSERVER='cloud041_055'
def audit(rank,image,words,phase,event='visually-reviewed'):
 ag.append(ag.HERE/f'audit/rank{rank:03}.jsonl',dict(event=event,observer=OBSERVER,image=image,words=words,phase=phase,time=datetime.now(timezone.utc).isoformat(),sha256=hashlib.sha256((ag.ROOT/image).read_bytes()).hexdigest()))
def backup(rank,label):
 out=ag.HERE/f'reviews/rank{rank:03}'; dest=out/label;dest.mkdir()
 for name in ['manual-cuts.json','draft-decisions.json','review-sheets.json']:
  if (out/name).exists():shutil.copy2(out/name,dest/name)
 if (out/'review-sheets.json').exists():
  for s in ag.read(out/'review-sheets.json'):
   src=ag.ROOT/s['image'];shutil.copy2(src,dest/src.name)
def prepare(rank,sheets,values,label):
 assert 41<=rank<=55
 out=ag.HERE/f'reviews/rank{rank:03}';manifest=ag.read(out/'representatives.json');ids=[]
 for s in sheets:
  item=manifest[s-1];audit(rank,item['image'],item['words'],'representative-inspection');ids.extend(item['words'])
 assert len(ids)==len(values)
 backup(rank,label)
 manual=ag.read(out/'manual-cuts.json') if (out/'manual-cuts.json').exists() else {}
 batch={wid:dict(inner=v[0],confidence=v[1],note=v[2]) for wid,v in zip(ids,values) if v is not None}
 manual.update(batch);ag.write(out/'manual-cuts.json',batch);ag.propose(rank);ag.write(out/'manual-cuts.json',manual)
 print(ag.read(out/'review-sheets.json'))
def accept(rank,label,names=None,flags=None):
 g,e,cs,out=ag.setup(rank);archive=out/label;archive.mkdir()
 sheets=ag.read(out/'review-sheets.json');drafts=ag.read(out/'draft-decisions.json');target=ag.HERE/f'annotations/rank{rank:03}.jsonl'
 existing={d['wid']:d for d in ag.rows(target)}
 selected=[s for s in sheets if names is None or Path(s['image']).name in names]
 for sheet in selected:
  src=ag.ROOT/sheet['image'];dest=archive/src.name;shutil.copy2(src,dest)
  prior={v.get('sha256') for v in ag.rows(ag.HERE/f'audit/rank{rank:03}.jsonl') if v.get('event')=='visually-reviewed'}
  event='visual-evidence-reused' if hashlib.sha256(dest.read_bytes()).hexdigest() in prior else 'visually-reviewed'
  audit(rank,dest.relative_to(ag.ROOT).as_posix(),sheet['words'],sheet['kind'],event)
  for wid in sheet['words']:
   d=drafts[wid];x0,_,x1,_=g['words'][wid]['body'];assert all(math.ceil(x0)<=v<=math.floor(x1) for v in d['x']),wid
   c=next(c for c in cs if wid in c['memberIds']);assert len(d['x'])==len(e['unitVariants'][c['unitVariant']])+1
   assert all(a-b>=2 for a,b in zip(d['x'],d['x'][1:])),wid
   if flags and wid in flags:
    d['confidence']='low';d['reviewFlags']=['clipped-ink'];d['note']+=' Partial ink (body or associated mark) clipped by immutable box; retained inside and flagged for review.'
   if wid in existing and existing[wid]!=d:ag.append(out/'superseded-decisions.jsonl',existing[wid])
   existing[wid]=d
 target.parent.mkdir(exist_ok=True);target.write_text(''.join(json.dumps(d,ensure_ascii=False)+'\n' for d in existing.values()),encoding='utf-8')
 for name in ['manual-cuts.json','draft-decisions.json','review-sheets.json']:
  if (out/name).exists():shutil.copy2(out/name,archive/name)
 print('Accepted',len(existing),'cumulative')
if __name__=='__main__':
 action=sys.argv[1];rank=int(sys.argv[2])
 if action=='accept':accept(rank,sys.argv[3],json.loads(sys.argv[4]) if len(sys.argv)>4 else None,json.loads(sys.argv[5]) if len(sys.argv)>5 else None)
 elif action=='prepare':prepare(rank,json.loads(sys.argv[3]),json.loads(Path(sys.argv[4]).read_text()),sys.argv[5])
