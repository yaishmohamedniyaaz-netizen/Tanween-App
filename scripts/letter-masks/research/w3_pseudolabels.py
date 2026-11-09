"""Agreement availability, not an assertion of exact 2-D pseudo-label truth."""
from pathlib import Path
import json,numpy as np
HERE=Path(__file__).resolve().parent
paths=[HERE/'w1_oldmadina_predictions.json',HERE/'w2_predictions.json']
if not all(p.exists() for p in paths):
    result={'status':'pending upstream feasibility predictions','missing':[p.name for p in paths if not p.exists()],'trainedPseudoWords':0}
else:
    maps=[{w['wid']:w for w in json.loads(p.read_text())['predictions']} for p in paths];eligible=[];matches=[]
    for wid in sorted(set(maps[0])&set(maps[1])):
        a,b=maps[0][wid],maps[1][wid]
        if a.get('tids')!=b.get('tids') or not a.get('bars') or not b.get('bars'):continue
        x,y=np.asarray(a['bars']),np.asarray(b['bars'])
        if x.shape!=y.shape:continue
        err=float(np.max(np.abs(x-y)));eligible.append(wid)
        if err<=2*1920/473.6:matches.append({'wid':wid,'maxSupportEndpointDifferenceArtworkPx':err})
    result={'status':'agreement audit complete','eligibleWords':len(eligible),'thresholdArtworkPx':2*1920/473.6,'agreementWords':len(matches),'agreements':matches,'trainedPseudoWords':0,'reason':'Endpoint agreement is not independently verified 2-D ownership; low-confidence errors may correlate.'}
(HERE/'w3_pseudolabel_audit.json').write_text(json.dumps(result,indent=2)+'\n');print(result)
