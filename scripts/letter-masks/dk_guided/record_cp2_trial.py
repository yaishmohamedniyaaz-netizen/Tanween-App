"""Record explicit observations, enforce sheet budget and zero-regression gate."""
import json,argparse
from datetime import datetime,timezone
import checkpoint2_trial as T

def record(pattern, verdicts, reason):
 folder=T.OUT/f'pattern-{pattern}';man=T.read(folder/'manifest.json');comp=T.read(folder/'comparison.json')
 seen=[]
 for m in man:seen += m['rows']
 assert set(verdicts)=={r['wid'] for r in seen}
 audit=T.read(T.OUT/'audit.json') if (T.OUT/'audit.json').exists() else []
 assert len(audit)+len(man)<=50
 assert not any(a.get('pattern')==pattern for a in audit)
 for m in man:
  assert T.R.sha(T.R.ROOT/m['image'])==m['sha256']
  audit.append(dict(pattern=pattern,observer='cp2-engineering-review',at=datetime.now(timezone.utc).isoformat(),image=m['image'],sha256=m['sha256'],words=[r['wid'] for r in m['rows']],actuallyViewed=True))
 fixed=sum(r['role']=='dev' and verdicts[r['wid']]=='ok' and not r['beforeValid'] for r in seen)
 # For valid baseline dev failures only count actual previous wrong/unsure, not
 # historical v1 failures that v2 already repaired.
 latest={r['wid']:r for r in T.REVIEW.decisions()}
 fixed+=sum(r['role']=='dev' and verdicts[r['wid']]=='ok' and r['beforeValid'] and latest.get(r['wid'],{}).get('verdict') in ('wrong','unsure') for r in seen)
 broken=sum(r['role']=='regression' and verdicts[r['wid']]!='ok' for r in seen)
 changed_reg={r['wid'] for r in comp['rows'] if r['role']=='regression' and r['changed']}
 assert changed_reg <= set(verdicts)
 keep=fixed>0 and broken==0
 log=T.read(T.OUT/'fix-log.json') if (T.OUT/'fix-log.json').exists() else []
 log.append(dict(pattern=pattern,candidate=comp['candidate'],kept=keep,fixed=fixed,stillWrong=sum(r['role']=='dev' and verdicts[r['wid']]!='ok' for r in seen),newlyBroken=broken,reviewedDev=sum(r['role']=='dev' for r in seen),regressionWords=120,changedRegression=len(changed_reg),computerRun=len(comp['rows']),changedWords=sum(r['changed'] for r in comp['rows']),reason=reason,verdicts=verdicts,unreviewedDevAreNotScored=True))
 T.atomic(T.OUT/'audit.json',audit);T.atomic(T.OUT/'fix-log.json',log)
 kept=comp['keptBefore']+([comp['candidate']] if keep else [])
 T.atomic(T.OUT/'kept.json',kept)
 T.atomic(T.OUT/'progress.json',dict(phase='pattern-trials',completedPatterns=[x['pattern'] for x in log],kept=kept,sheetsViewed=len(audit),sheetLimit=50,tokensUsed=None,fullRuns=0,testDrawn=False))
 print(json.dumps(log[-1]))

if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('pattern',type=int);a.add_argument('verdicts');a.add_argument('reason');x=a.parse_args();record(x.pattern,json.loads(x.verdicts),x.reason)
