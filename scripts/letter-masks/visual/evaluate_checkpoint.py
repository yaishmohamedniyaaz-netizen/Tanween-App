"""Unlock the single held-out evaluation only at a complete visual checkpoint.

No test answer is read until coverage and actual-image-review records pass.
"""
from collections import defaultdict
import hashlib
import json
import statistics
from build_guess_files import HERE, ROOT, read, write, load_decisions
from check_checkpoint import audit

S=473.6/1920


def metrics(rows):
    borders=[]; good_words=exact=bars=letters=0
    for row in rows:
        g,t=row['x'],row['approved']
        borders += [abs(a-b)*S for a,b in zip(g[1:-1],t[1:-1])]
        good_words += all(abs(a-b)*S<=2 for a,b in zip(g,t))
        exact += g==t
        for i,(r,l) in enumerate(zip(g,g[1:])):
            mid=(r+l)/2; half=.2*(r-l)
            bars += mid-half>=t[i+1] and mid+half<=t[i]
            letters += 1
    return dict(words=len(rows),innerBorders=len(borders),letters=letters,
                medianPx=statistics.median(borders) if borders else None,
                bordersWithin2=sum(e<=2 for e in borders)/len(borders) if borders else None,
                bordersOver5=sum(e>5 for e in borders)/len(borders) if borders else None,
                wordsWithin2=good_words/len(rows) if rows else None,
                exactWords=exact/len(rows) if rows else None,shortBar=bars/letters if letters else None)


def main():
    target=HERE/'checkpoint-a-test.json'
    if target.exists(): raise SystemExit('Checkpoint A already scored; do not rescore or tune against it.')
    report=audit()
    if not report['complete']: raise SystemExit('Checkpoint A incomplete: test answers remain closed.')
    # Only IDs, pages, and status are used to select the original split.
    metadata=read(HERE.parent/'approved/all-approvals-2026-11-06.json')['words']
    pages=sorted({int(d['page']) for d in metadata if int(d['page'])>2})
    test_pages=set(pages[1::2])
    test_ids=[d['wid'] for d in metadata if int(d['page']) in test_pages]
    blind_path=HERE/'blind/decisions.jsonl'
    blind=load_decisions(blind_path)
    if set(blind)!=set(test_ids): raise ValueError('Require all 30 blind decisions, and no extras')
    freeze=read(HERE/'blind/freeze.json')
    digest=hashlib.sha256(blind_path.read_bytes()).hexdigest()
    if freeze['decisionsSha256']!=digest: raise ValueError('Blind decisions changed after freeze')
    # Open answers only after all preceding gates pass.
    truth={}
    for p in test_pages: truth.update(read(ROOT/f'public/letter-borders/p{p}.json')['words'])
    rows=[]
    for wid in test_ids:
        d=blind[wid]; t=truth[wid]['x']
        if len(d['x'])!=len(t): raise ValueError(f'Wrong target count: {wid}')
        e=[abs(a-b)*S for a,b in zip(d['x'],t)]
        rows.append(dict(**d,approved=t,errorsPx=e,maxErrorPx=max(e)))
    result=dict(method='visual-v1',checkpoint='A',blindSha256=digest,overall=metrics(rows),
                confidence={level:metrics([r for r in rows if r['confidence']==level]) for level in ['high','medium','low']},
                worst=sorted(rows,key=lambda r:-r['maxErrorPx'])[:10],predictions=rows)
    with target.open('x',encoding='utf-8') as f: json.dump(result,f,ensure_ascii=False,separators=(',',':')); f.write('\n')
    print(json.dumps(result['overall'],indent=2))


if __name__=='__main__': main()
