"""Manual visual-review persistence; no cut generation or implicit image review."""
import sys, json, hashlib, importlib.util, math
from pathlib import Path
from datetime import datetime, timezone
rank=int(sys.argv[1]);assert rank==54
base=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('workbench',base/'blind/pilot_workflow.py')
w=importlib.util.module_from_spec(spec);spec.loader.exec_module(w)
observer='cloud-root-20261108'
def audit(names):
    all_sheets={s['image']:s for p in w.HERE.glob('*-sheets.json') for s in w.read(p)}
    with (base/f'audit/rank{rank:03}.jsonl').open('a',encoding='utf-8') as out:
        for name in names:
            s=all_sheets[name];path=w.HERE/name
            out.write(json.dumps(dict(event='visually-reviewed',observer=observer,image=path.relative_to(w.ROOT).as_posix(),words=s['words'],phase=s['stage'],at=datetime.now(timezone.utc).isoformat(),sha256=hashlib.sha256(path.read_bytes()).hexdigest()),ensure_ascii=False)+'\n')
    return all_sheets

def accept(names):
    sheets=audit(names);records=w.final_records();m=w.read(w.HERE/'manifest.json');deferred=w.deferred_ids()
    reps=w.read(w.HERE/'representative-cuts.json') if (w.HERE/'representative-cuts.json').exists() else {}
    copies=w.read(w.HERE/'member-cuts.json') if (w.HERE/'member-cuts.json').exists() else {}
    for name in names:
        s=sheets[name]
        if s['stage']=='original':continue
        for wid in s['words']:
            if wid in deferred:continue
            d=dict((reps if s['stage']=='check' else copies)[wid]);word=m['words'][wid];xs=d['x']
            assert len(xs)==len(word['units'])+1 and all(a-b>=2 for a,b in zip(xs,xs[1:]))
            assert math.ceil(word['body'][0])<=min(xs)<=max(xs)<=math.floor(word['body'][2])
            if d['source']=='visual-copy':d['note']=d['note'].replace('destination requires sheet review.',f'destination visually checked on {name}.')
            if wid in records:assert records[wid]==d, 'Archive before replacement'
            records[wid]=d
    (base/f'annotations/rank{rank:03}.jsonl').write_text(''.join(json.dumps(records[k],ensure_ascii=False)+'\n' for k in sorted(records)),encoding='utf-8')
    print('Accepted total',len(records))

if __name__=='__main__':
    cmd=sys.argv[2]
    if cmd=='view':audit(sys.argv[3:])
    elif cmd=='accept':accept(sys.argv[3:])
    elif cmd=='set':
        data=w.read(sys.argv[3]);w.set_cuts(data)
        reps=w.read(w.HERE/'representative-cuts.json')
        for c in w.read(w.HERE/'manifest.json')['clusters']:
            key=str(int(c['id'].split('-c')[-1]));wid=c['representative']['wid']
            if key in data and 'clipped' in data[key][2].lower():reps[wid]['reviewFlags']=['clipped-ink']
        w.write(w.HERE/'representative-cuts.json',reps)
