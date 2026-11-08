"""Audit Checkpoint A completeness without reading held-out border answers.

Images must be logged as actually viewed; generating a sheet is not a review.
This script validates audit references, not the truth of a model's visual claim.
"""
from collections import Counter
import json
from pathlib import Path
from build_guess_files import HERE, ROOT, read, load_decisions, write


def audit():
    groups=read(HERE/'groups.json')
    pilot={wid for spelling in groups['spellings'].values() if spelling['pilot']
           for c in spelling['clusters'] for wid in c['memberIds']}
    decisions=load_decisions(HERE/'decisions.jsonl') if (HERE/'decisions.jsonl').exists() else {}
    events=[]
    for p in sorted((HERE/'audit').glob('*.jsonl')):
        events += [json.loads(line) for line in p.read_text(encoding='utf-8').splitlines() if line.strip()]
    reviewed=set()
    for event in events:
        if event.get('event')!='visually-reviewed': continue
        image=ROOT/event['image']
        if not image.is_file(): raise ValueError(f'Missing reviewed image: {image}')
        for wid in event['words']: reviewed.add(wid)
    completed=pilot & set(decisions) & reviewed
    # The owner explicitly required immutable boxes. Where a whole app target
    # is absent from that box, retain an audited exception instead of inventing
    # an empty letter span. Such words are reviewed, but never called decided.
    withheld={}
    for path in sorted((HERE/'reviews').glob('rank*/pending-owner.json')):
        for item in read(path):
            if item.get('status')!='withheld-missing-target': continue
            wid=item['wid']
            if wid not in pilot: raise ValueError(f'Non-pilot exception: {wid}')
            if wid in decisions: raise ValueError(f'Withheld word has a decision: {wid}')
            if wid in withheld: raise ValueError(f'Duplicate exception: {wid}')
            if not (item.get('reason') or item.get('note')):
                raise ValueError(f'Exception has no explanation: {wid}')
            withheld[wid]={**item,'record':path.relative_to(ROOT).as_posix()}
    audited_withheld=set(withheld) & reviewed
    missing_decisions=sorted(pilot-set(decisions))
    missing_reviews=sorted(pilot-reviewed)
    unresolved=sorted(pilot-completed-audited_withheld)
    report=dict(checkpoint='A',complete=not unresolved,pilotWords=len(pilot),
                allWordsDecided=len(completed)==len(pilot),
                pilotDecisions=len(pilot & set(decisions)),pilotVisuallyReviewed=len(pilot&reviewed),
                completedWords=len(completed),missingDecisionCount=len(missing_decisions),
                reviewedWithheldCount=len(audited_withheld),
                reviewedWithheld=[withheld[w] for w in sorted(audited_withheld)],
                unresolvedCount=len(unresolved),unresolved=unresolved,
                missingReviewCount=len(missing_reviews),missingDecisions=missing_decisions,
                missingReviews=missing_reviews,confidence=dict(Counter(d['confidence'] for wid,d in decisions.items() if wid in pilot)))
    write(HERE/'checkpoint-a-audit.json',report)
    return report


if __name__=='__main__':
    result=audit()
    print(json.dumps({k:v for k,v in result.items() if not isinstance(v,list)},indent=2))
    raise SystemExit(0 if result['complete'] else 2)
