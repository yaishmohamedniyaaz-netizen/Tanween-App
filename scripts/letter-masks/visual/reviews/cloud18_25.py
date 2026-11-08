"""Manual cloud observer helpers. Review actions require prior actual image views."""
import sys, importlib.util, json, hashlib, math
from pathlib import Path
V=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('pilot18_25',V/'blind/pilot_workflow.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
H=p.HERE; R=int(sys.argv[1]); assert 18<=R<=25
OBS='cloud-ranks018_025'
def log(names,accept=False):
 m=p.read(H/'manifest.json');by={s['image']:s for q in H.glob('*-sheets.json') for s in p.read(q)}
 final=p.final_records(); reps=p.read(H/'representative-cuts.json') if (H/'representative-cuts.json').exists() else {};members=p.read(H/'member-cuts.json') if (H/'member-cuts.json').exists() else {}
 for name in names:
  s=by[name];path=H/name
  with (V/f'audit/rank{R:03}.jsonl').open('a',encoding='utf8') as f:f.write(json.dumps(dict(event='visually-reviewed',observer=OBS,image=path.relative_to(p.ROOT).as_posix(),words=s['words'],phase=s['stage'],at=p.now(),sha256=hashlib.sha256(path.read_bytes()).hexdigest()))+'\n')
  if not accept:continue
  assert s['stage']!='original'
  for wid in s['words']:
   if wid in p.deferred_ids():continue
   d=dict((reps if s['stage']=='check' else members)[wid]);w=m['words'][wid];xs=d['x']
   assert len(xs)==len(w['units'])+1 and all(a-b>=2 for a,b in zip(xs,xs[1:])) and xs[0]<=math.floor(w['body'][2]) and xs[-1]>=math.ceil(w['body'][0]),wid
   if wid in final and final[wid]!=d:
    with (H/'superseded-annotations.jsonl').open('a') as f:f.write(json.dumps(final[wid])+'\n')
   if d['source']=='visual-copy':d['note']=d['note'].replace('destination requires sheet review.',f'destination visually checked on {name}.')
   final[wid]=d
 if accept:(V/f'annotations/rank{R:03}.jsonl').write_text(''.join(json.dumps(final[w],ensure_ascii=False)+'\n' for w in sorted(final)),encoding='utf8')
 print('saved',len(final))
def cuts(path):
 vals=p.read(path);p.set_cuts(vals);d=p.read(H/'representative-cuts.json');m=p.read(H/'manifest.json')
 for c in m['clusters']:
  n=str(int(c['id'].split('-c')[-1]));wid=c['representative']['wid']
  if n in vals and 'clipped' in vals[n][2].lower():d[wid]['reviewFlags']=['clipped-ink']
 p.write(H/'representative-cuts.json',d)
def render(first,count,prefix):
 from PIL import Image
 m=p.read(H/'manifest.json');d=p.read(H/'representative-cuts.json');sheets=[]
 for start in range(first,min(first+count,len(m['clusters'])),6):
  batch=m['clusters'][start:min(start+6,first+count)];im=Image.new('RGB',(2000,1770),'#eee');ids=[]
  for i,c in enumerate(batch):
   wid=c['representative']['wid'];ids.append(wid);im.paste(p.tile(m['words'][wid],d[wid]['x'] if wid in d else None,True),((i%2)*1000,(i//2)*590))
  name=f'{prefix}-{start//6+1:03}.png';assert not (H/name).exists();im.save(H/name);sheets.append(dict(image=name,words=ids,stage='check'))
 p.write(H/f'{prefix}-sheets.json',sheets)
if __name__=='__main__':
 action=sys.argv[2]
 if action=='view':log(sys.argv[3:])
 elif action=='accept':log(sys.argv[3:],True)
 elif action=='set':cuts(sys.argv[3])
 elif action=='render':render(int(sys.argv[3]),int(sys.argv[4]),sys.argv[5])
