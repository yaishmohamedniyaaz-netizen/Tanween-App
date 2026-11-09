"""Validate rebuilt artifacts without accepting them as approved labels."""
import hashlib,json,pickle
from pathlib import Path
from common import load_development,validate_prediction,read,ART,load_units
from w1_registration import HERE,CACHE

def main():
    words,truth,units,splits=load_development();summary={'reconstructed':True,'originalFileEquality':'not established; original digests unavailable','development':{}}
    for name in ['oldmadina','amiri']:
        p=HERE/f'w1_{name}_predictions.json';preds=read(p)['predictions'];assert len(preds)==95 and {r['wid'] for r in preds}==set(splits['development95'])
        for r in preds:
            assert r['confidence']=='low'
            if 'bars' in r:assert not validate_prediction(r,words[r['wid']]),r['wid']
            else:assert r.get('reason')
        summary['development'][name]={'words':len(preds),'emitted':sum('bars'in r for r in preds),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
    p=HERE/'w1_top100_predictions.json';preds=read(p)['predictions'];ref=read(HERE/'reference_visual_pilot.json');approved={w['wid'] for w in read(HERE.parent/'approved/all-approvals-2026-11-06.json')['words']}
    assert len(preds)==100 and {r['spellingRank'] for r in preds}==set(range(1,101))
    assert not {r['wid'] for r in preds}&(set(ref['withheldIds'])|approved)
    for r in preds:
        # Fresh immutable geometry plus exact current app target IDs, no pickle required.
        g=next(w for w in read(ART/f"p{r['page']}.json")['words'] if w['wid']==r['wid'])
        word={'wid':r['wid'],'page':r['page'],'tids':[u['tid'] for u in units[r['wid']]['units']],'body':g['body']}
        assert r['confidence']=='low'
        if 'bars'in r:assert not validate_prediction(r,word),r['wid']
        else:assert r.get('reason')
    summary['top100']={'words':len(preds),'emitted':sum('bars'in r for r in preds),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'approvedOverlap':0,'withheldOverlap':0,'structureErrors':0}
    (HERE/'w1_validation.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))
if __name__=='__main__':main()
