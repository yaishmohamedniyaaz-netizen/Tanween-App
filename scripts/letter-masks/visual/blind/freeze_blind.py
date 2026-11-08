"""Freeze visually reviewed decisions before any scoring/truth is received."""
import collections,datetime,hashlib,json
from pathlib import Path
HERE=Path(__file__).resolve().parent
PREFIX='scripts/letter-masks/visual/blind/'
rows=[json.loads(s) for s in (HERE/'decisions.jsonl').read_text().splitlines()]
revised={'16.91.12','16.92.29','20.78.0'}
audit=[json.loads(s) for s in (HERE/'audit.jsonl').read_text().splitlines()]
for i,r in enumerate(rows,1):
    wid=r['wid']; original=f'{i:02d}_{wid}_crop.png'; reviewed=f'{i:02d}_{wid}_review1.png'
    r['reviewed']=True
    r['reviewedImages']=[PREFIX+original,PREFIX+reviewed]
    audit.append({'eventId':f'blind-shaded-01-{i:02d}','event':'visually-reviewed','image':PREFIX+reviewed,
                  'words':[wid],'observer':'blind_test','pass':1,'result':'revise' if wid in revised else 'accepted visually'})
    if wid in revised:
        image=f'{i:02d}_{wid}_review2.png'; r['reviewedImages'].append(PREFIX+image)
        audit.append({'eventId':f'blind-shaded-02-{i:02d}','event':'visually-reviewed','image':PREFIX+image,
                      'words':[wid],'observer':'blind_test','pass':2,'result':'accepted visually'})
payload=''.join(json.dumps(r)+'\n' for r in rows).encode()
(HERE/'decisions.jsonl').write_bytes(payload)
(HERE/'audit.jsonl').write_text(''.join(json.dumps(r)+'\n' for r in audit))
training=['p001-1.1.0','p001-1.1.1','p001-1.5.1','p001-1.2.2','p001-1.4.1','p002-2.3.1',
          'p002-2.4.7','p002-2.5.3','p002-2.4.1','p030-2.194.1','p002-2.4.2','p134-6.59.15']
frozen={'frozenAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'decisionsSha256':hashlib.sha256(payload).hexdigest(),
        'decisionFile':PREFIX+'decisions.jsonl','count':len(rows),'confidence':dict(collections.Counter(r['confidence'] for r in rows)),
        'outerFallbacks':0,'outerClamps':0,'manualInteriorDecisions':30,'originalImagesViewed':30,
        'shadedImagesViewed':33,'trainingImagesViewed':12,'totalImagesViewedByThisAnnotator':75,
        'trainingExamples':[f'scripts/letter-masks/visual/training/{s}.png' for s in training],
        'answersSeen':False,'scored':False,'oldGuessInteriorsSeen':False,'maxReviewPasses':2,
        'blindness':'Only page and wid were extracted from all-approvals metadata. Sorted unique regular pages [1::2] selected the held-out 30. No hidden cut fields, held-out public approvals, prior handbacks, test scores or worst-word images were read.'}
(HERE/'freeze.json').write_text(json.dumps(frozen,indent=2)+'\n')
print(json.dumps(frozen,indent=2))
