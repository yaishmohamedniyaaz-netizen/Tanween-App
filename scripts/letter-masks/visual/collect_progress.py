"""Merge only saved visual decisions and reconcile the running audit.

This never accepts a draft or turns a generated image into a review.
Run after each completed batch, then build_guess_files.py to refresh guesses.
"""
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
from build_guess_files import HERE, ROOT, read, write, load_decisions


def lines(path):
    return [json.loads(s) for s in path.read_text(encoding='utf-8').splitlines() if s.strip()]


def collect():
    decisions = {}
    sources = sorted((HERE/'annotations').glob('rank*.jsonl'))
    frozen = HERE/'blind/decisions.jsonl'
    if frozen.exists():
        freeze = read(HERE/'blind/freeze.json')
        digest = hashlib.sha256(frozen.read_bytes()).hexdigest()
        if digest != freeze['decisionsSha256']:
            raise ValueError('Frozen blind predictions changed')
        sources.append(frozen)
    for source in sources:
        for wid, d in load_decisions(source).items():
            if wid in decisions:
                raise ValueError(f'Duplicate independently saved word: {wid}')
            decisions[wid] = d
    ordered = sorted(decisions.values(), key=lambda d:(d['page'], tuple(map(int, d['wid'].split('.')))))
    (HERE/'decisions.jsonl').write_text(''.join(json.dumps(d, ensure_ascii=False, separators=(',', ':'))+'\n' for d in ordered), encoding='utf-8')

    # The blind annotator used individual image events. Normalize their existing
    # actual-view records; this reads no held-out approval coordinates.
    events = []
    for e in lines(HERE/'blind/audit.jsonl'):
        if not e.get('viewed'): continue
        path = HERE/'blind'/e['image']
        if not path.is_file(): raise ValueError(f'Missing blind review image {path}')
        events.append(dict(event='visually-reviewed', observer='blind_test',
                           image=path.relative_to(ROOT).as_posix(), words=[e['wid']],
                           phase=e['stage'], time=e.get('time')))
    (HERE/'audit/blind.jsonl').write_text(''.join(json.dumps(e)+'\n' for e in events), encoding='utf-8')
    events = [e for p in sorted((HERE/'audit').glob('*.jsonl')) for e in lines(p)]
    actual_events = [e for e in events if e.get('event')=='visually-reviewed']
    reviewed = {wid for e in actual_events for wid in e['words']}
    images = {e['image'] for e in events if e.get('image')}
    for image in images:
        if not (ROOT/image).is_file(): raise ValueError(f'Missing audit image {image}')
    groups = read(HERE/'groups.json')
    clusters = [c for s in groups['spellings'].values() if s['pilot'] for c in s['clusters']]
    pilot = {wid for c in clusters for wid in c['memberIds']}
    done = set(decisions) & reviewed
    progress = read(HERE/'progress.json')
    progress.update(updatedAtUtc=datetime.now(timezone.utc).isoformat(),
                    decisions=len(decisions), pilotDecisions=len(pilot & set(decisions)),
                    pilotWordsVisuallyReviewed=len(pilot & reviewed),
                    pilotWordsCompleted=len(pilot & done),
                    clustersDone=[c['id'] for c in clusters if set(c['memberIds']) <= done],
                    confidence=dict(Counter(d['confidence'] for d in decisions.values())),
                    status='in_progress', testScored=(HERE/'checkpoint-a-test.json').exists())
    progress['cost'].update(auditedImagePaths=len(images), actualViewEvents=len(actual_events),
                            reusedEvidenceEvents=sum(e.get('event')=='visual-evidence-reused' for e in events),
                            rootImagesViewed=len({e['image'] for e in actual_events if e.get('observer')=='root'}),
                            trainingImagesReviewed=read(HERE/'training/review-log.json')['imageCount'],
                            decisionsMade=len(decisions), exactTokenUsageAvailable=False)
    progress['note']='Only saved decisions and actual image-view audit events count. Generated drafts are excluded. Checkpoint A is incomplete until every pilot word is decided and reviewed, or explicitly withheld with actual visual evidence because its immutable box lacks an app target. Withheld words are never counted as decisions.'
    write(HERE/'progress.json', progress)
    print(json.dumps({k:v for k,v in progress.items() if k!='clustersDone'}, indent=2))


if __name__=='__main__': collect()
