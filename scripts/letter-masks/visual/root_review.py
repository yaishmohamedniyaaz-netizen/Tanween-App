"""Record an explicitly viewed root review batch with immutable image copies.

Use only AFTER opening the specified review-sheet images. This does not run a
visual check. It preserves what was viewed before the next batch is rendered.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import shutil
from build_guess_files import HERE, ROOT, read, write


def accept(rank, batch, names):
    out=HERE/f'reviews/rank{rank:03}'
    archive=out/f'batch-{batch:03}'
    archive.mkdir(exist_ok=True)
    manifest=read(out/'review-sheets.json')
    selected=[s for s in manifest if (ROOT/s['image']).name in names]
    if len(selected)!=len(names): raise ValueError('Unknown review image')
    drafts=read(out/'draft-decisions.json')
    audit=HERE/f'audit/rank{rank:03}.jsonl'
    prior_events=[json.loads(s) for s in audit.read_text(encoding='utf-8').splitlines() if s.strip()] if audit.exists() else []
    viewed_hashes={e['sha256'] for e in prior_events if e.get('sha256') and e.get('event')=='visually-reviewed'}
    target=HERE/f'annotations/rank{rank:03}.jsonl'
    existing={json.loads(s)['wid'] for s in target.read_text(encoding='utf-8').splitlines() if s.strip()} if target.exists() else set()
    for sheet in selected:
        source=ROOT/sheet['image']; dest=archive/source.name
        if dest.exists(): raise ValueError('Archived review already exists')
        shutil.copy2(source,dest)
        digest=hashlib.sha256(dest.read_bytes()).hexdigest()
        # Re-rendering unchanged tiles during a correction does not count as a
        # fresh view. Preserve the prior actual view as the evidence instead.
        event=dict(event='visual-evidence-reused' if digest in viewed_hashes else 'visually-reviewed',observer='root',image=dest.relative_to(ROOT).as_posix(),
                   words=sheet['words'],phase=sheet['kind'],time=datetime.now(timezone.utc).isoformat(),
                   sha256=digest)
        viewed_hashes.add(digest)
        with audit.open('a',encoding='utf-8') as f:f.write(json.dumps(event)+'\n')
        with target.open('a',encoding='utf-8') as f:
            for wid in sheet['words']:
                if wid in existing: continue
                f.write(json.dumps(drafts[wid],ensure_ascii=False)+'\n');existing.add(wid)
    write(archive/'review-sheets.json',selected)
    write(archive/'manual-cuts.json',read(out/'manual-cuts.json'))
    print('Saved viewed batch',batch,';',len(existing),'cumulative decisions')


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('rank',type=int);p.add_argument('batch',type=int);p.add_argument('names',nargs='+');a=p.parse_args()
    accept(a.rank,a.batch,a.names)
