"""Persist manually entered cloud-root cuts and explicitly viewed sheets only.

prepare is called AFTER original image viewing; accept AFTER named shaded views.
This helper performs no visual inference. It refuses to replace saved decisions.
"""
import sys,json,hashlib,datetime,shutil,math
from pathlib import Path
import annotation_grouping as ag
OBSERVER='cloud-root-20261108'
def log(rank,p,words,phase):
 ag.append(ag.HERE/f'audit/rank{rank:03}.jsonl',dict(event='visually-reviewed',observer=OBSERVER,image=p.relative_to(ag.ROOT).as_posix(),words=words,phase=phase,at=datetime.datetime.now(datetime.timezone.utc).isoformat(),sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
def prepare(rank,sheetnums,cuts,clipped):
 assert 28<=rank<=35
 p=ag.HERE/f'reviews/rank{rank:03}';manifest=ag.read(p/'representatives.json');ids=[]
 for n in sheetnums:
  s=manifest[n-1];ids+=s['words'];log(rank,ag.ROOT/s['image'],s['words'],'original')
 assert len(ids)==len(cuts)
 manual={w:dict(inner=v,confidence='low' if w in clipped else 'high',note=('Visible immutable-edge clipping; keep inside box and flag for owner review. ' if w in clipped else '')+'Direct visual cut at letter body transition, retaining leftward join and final bowl with following target.') for w,v in zip(ids,cuts)}
 ag.write(p/'manual-cuts.json',manual);ag.propose(rank)
 d=ag.read(p/'draft-decisions.json')
 for w in clipped:
  if w in d:d[w]['reviewFlags']=['clipped-ink']
 ag.write(p/'draft-decisions.json',d)
def accept(rank,batch,names,clipped):
 assert 28<=rank<=35
 g,e,cs,p=ag.setup(rank);d=ag.read(p/'draft-decisions.json');manifest=ag.read(p/'review-sheets.json');out=p/f'cloud-batch-{batch}';out.mkdir(exist_ok=False)
 existing={x['wid'] for x in ag.rows(ag.HERE/f'annotations/rank{rank:03}.jsonl')}
 for w in clipped:
  d[w]['confidence']='low';d[w]['reviewFlags']=['clipped-ink'];d[w]['note']+=' Destination edge ink visibly clipped; keep inside immutable box.'
 for s in manifest:
  if Path(s['image']).name not in names:continue
  dest=out/Path(s['image']).name;shutil.copy2(ag.ROOT/s['image'],dest);log(rank,dest,s['words'],s['kind'])
  for w in s['words']:
   assert w not in existing,w
   rec=d[w];bounds=g['words'][w]['body'];assert all(math.ceil(bounds[0])<=v<=math.floor(bounds[2]) for v in rec['x']),w
   assert all(a-b>=2 for a,b in zip(rec['x'],rec['x'][1:])),w
   ag.append(ag.HERE/f'annotations/rank{rank:03}.jsonl',rec);existing.add(w)
 ag.write(out/'draft-decisions.json',d);ag.write(out/'review-sheets.json',[s for s in manifest if Path(s['image']).name in names]);shutil.copy2(p/'manual-cuts.json',out/'manual-cuts.json')
 print('Saved',len(existing),'cumulative decisions')
if __name__=='__main__':
 action=sys.argv[1];args=[json.loads(x) for x in sys.argv[2:]]
 if action=='prepare':prepare(*args)
 elif action=='accept':accept(*args)
