"""Cloud observer wrapper. All view/accept calls require prior actual image review."""
import sys,json,importlib.util,hashlib
from pathlib import Path
from datetime import datetime,timezone
V=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('pw',V/'blind/pilot_workflow.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
rank=int(sys.argv[1]); assert 79<=rank<=100
cmd=sys.argv[2]
if cmd=='set':
 vals=json.loads(sys.argv[3]); default=sys.argv[4] if len(sys.argv)>4 else 'Visual division at the principal letter bodies; marks do not move cuts.'
 p.set_cuts({k:[v[0],v[1],v[2] if len(v)>2 else default] for k,v in vals.items()})
 reps=p.read(p.HERE/'representative-cuts.json')
 for c in p.read(p.HERE/'manifest.json')['clusters']:
  n=str(int(c['id'].split('-c')[-1]));wid=c['representative']['wid']
  if n in vals and len(vals[n])>3:reps[wid]['reviewFlags']=vals[n][3]
 p.write(p.HERE/'representative-cuts.json',reps)
elif cmd=='view':
 names=sys.argv[3:];a=V/f'audit/rank{rank:03d}.jsonl';old=a.read_bytes() if a.exists() else b''
 p.record_view(names)
 raw=a.read_bytes();assert raw.startswith(old)
 new=[json.loads(s) for s in raw[len(old):].decode().splitlines()]
 for e in new:e['observer']='cloud-ranks079_100';e['phase']=e['stage']
 a.write_bytes(old+''.join(json.dumps(e,ensure_ascii=False)+'\n' for e in new).encode())
elif cmd=='withhold':
 vals=json.loads(sys.argv[3]);f=p.HERE/'pending-owner.json';old=p.read(f) if f.exists() else [];m=p.read(p.HERE/'manifest.json')
 for n,reason in vals.items():
  c=next(c for c in m['clusters'] if int(c['id'].split('-c')[-1])==int(n));wid=c['representative']['wid']
  assert wid not in {d['wid'] for d in old}
  old.append(dict(wid=wid,page=m['words'][wid]['page'],cluster=c['id'],status='withheld-missing-target',reason=reason))
 p.write(f,old)
else:raise SystemExit('unknown command')
