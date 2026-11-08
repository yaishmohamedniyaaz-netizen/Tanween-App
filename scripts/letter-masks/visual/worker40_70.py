"""Manual review continuation. All coordinates originate from actual image views."""
import sys,json,ast,math,hashlib,shutil
from datetime import datetime,timezone
import annotation_grouping as ag

def audit(rank,image,words,phase):
    ag.append(ag.HERE/f'audit/rank{rank:03}.jsonl',dict(event='visually-reviewed',observer='continue40_70',image=image,words=words,phase=phase,time=datetime.now(timezone.utc).isoformat(),sha256=hashlib.sha256((ag.ROOT/image).read_bytes()).hexdigest()))

def prepare(rank,sheets,values,confidence,note):
    assert 40<=rank<=70
    out=ag.HERE/f'reviews/rank{rank:03}';manifest=ag.read(out/'representatives.json')
    ids=[]
    for s in sheets:
        item=manifest[s-1];audit(rank,item['image'],item['words'],'representative-inspection');ids.extend(item['words'])
    assert len(ids)==len(values)
    manual=ag.read(out/'manual-cuts.json') if (out/'manual-cuts.json').exists() else {}
    batch={wid:dict(inner=v,confidence=confidence,note=note) for wid,v in zip(ids,values) if v is not None}
    manual.update(batch);ag.write(out/'manual-cuts.json',batch);ag.propose(rank);ag.write(out/'manual-cuts.json',manual)
    print('Review next:',ag.read(out/'review-sheets.json'))

def accept(rank,batch):
    assert 40<=rank<=70
    g,e,cs,out=ag.setup(rank);archive=out/f'batch-{batch:03}';archive.mkdir(exist_ok=True)
    sheets=ag.read(out/'review-sheets.json');drafts=ag.read(out/'draft-decisions.json');target=ag.HERE/f'annotations/rank{rank:03}.jsonl'
    existing={d['wid']:d for d in ag.rows(target)}
    for wid,d in drafts.items():
        x0,_,x1,_=g['words'][wid]['body'];assert all(math.ceil(x0)<=v<=math.floor(x1) for v in d['x']),wid
        assert all(a-b>=2 for a,b in zip(d['x'],d['x'][1:])),wid
    for sheet in sheets:
        src=ag.ROOT/sheet['image'];dest=archive/src.name;assert not dest.exists(),dest;shutil.copy2(src,dest)
        audit(rank,dest.relative_to(ag.ROOT).as_posix(),sheet['words'],sheet['kind'])
        for wid in sheet['words']:
            if wid in existing and existing[wid]!=drafts[wid]:ag.append(out/'superseded-decisions.jsonl',existing[wid])
            existing[wid]=drafts[wid]
    target.write_text(''.join(json.dumps(d,ensure_ascii=False)+'\n' for d in existing.values()),encoding='utf-8')
    for name in ('review-sheets.json','draft-decisions.json','manual-cuts.json'):shutil.copy2(out/name,archive/name)
    print('Saved viewed batch',batch,'cumulative',len(existing))

if __name__=='__main__':
    if sys.argv[1]=='prepare':prepare(int(sys.argv[2]),ast.literal_eval(sys.argv[3]),ast.literal_eval(sys.argv[4]),sys.argv[5],sys.argv[6])
    elif sys.argv[1]=='accept':accept(int(sys.argv[2]),int(sys.argv[3]))
