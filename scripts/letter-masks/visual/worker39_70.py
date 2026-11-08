"""Resume helper: coordinates and actual image reviews are supplied manually."""
import sys,json,ast,hashlib,shutil
from datetime import datetime,timezone
import annotation_grouping as ag

def prepare(rank,sheet,values,confidence='low',note='Separate wasl stem; split lam-alif crossing by principal stems; ra head and dad bowl retain bodies. Vertical ligature split is uncertain.'):
    out=ag.HERE/f'reviews/rank{rank:03}'
    manifest=ag.read(out/'representatives.json'); item=manifest[sheet-1]
    assert len(values)==len(item['words'])
    manual=ag.read(out/'manual-cuts.json') if (out/'manual-cuts.json').exists() else {}
    batch={wid:dict(inner=v,confidence=confidence,note=note) for wid,v in zip(item['words'],values) if v is not None}
    manual.update(batch)
    ag.append(ag.HERE/f'audit/rank{rank:03}.jsonl',dict(event='visually-reviewed',observer='resume39_70',image=item['image'],words=item['words'],phase='representative-inspection',time=datetime.now(timezone.utc).isoformat()))
    ag.write(out/'manual-cuts.json',batch)
    ag.propose(rank)
    ag.write(out/'manual-cuts.json',manual)

def accept(rank,batch):
    out=ag.HERE/f'reviews/rank{rank:03}'; archive=out/f'batch-{batch:03}';archive.mkdir(exist_ok=True)
    sheets=ag.read(out/'review-sheets.json');drafts=ag.read(out/'draft-decisions.json')
    target=ag.HERE/f'annotations/rank{rank:03}.jsonl';existing={d['wid'] for d in ag.rows(target)}
    for sheet in sheets:
        source=ag.ROOT/sheet['image'];dest=archive/source.name
        assert not dest.exists(),dest
        shutil.copy2(source,dest)
        ag.append(ag.HERE/f'audit/rank{rank:03}.jsonl',dict(event='visually-reviewed',observer='resume39_70',image=dest.relative_to(ag.ROOT).as_posix(),words=sheet['words'],phase=sheet['kind'],time=datetime.now(timezone.utc).isoformat(),sha256=hashlib.sha256(dest.read_bytes()).hexdigest()))
        for wid in sheet['words']:
            if wid not in existing: ag.append(target,drafts[wid]);existing.add(wid)
    ag.write(archive/'review-sheets.json',sheets);ag.write(archive/'draft-decisions.json',drafts)
    ag.write(archive/'manual-cuts.json',ag.read(out/'manual-cuts.json'))
    print('Saved actual viewed batch',batch,'cumulative decisions',len(existing))

if __name__=='__main__':
    action=sys.argv[1];rank=int(sys.argv[2]);batch=int(sys.argv[3])
    if action=='prepare':prepare(rank,batch,ast.literal_eval(sys.argv[4]),*sys.argv[5:])
    elif action=='accept':accept(rank,batch)
