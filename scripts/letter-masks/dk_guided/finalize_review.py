"""Finish Checkpoint 1 only after actual reviewed-word evidence is complete."""
import json,gzip,hashlib,subprocess
from datetime import datetime,timezone
from collections import Counter
from run_all import HERE,ROOT,BARS,INK,atomic
import validate_review,validate_batch

def main():
 validate_review.main(require_complete=True)
 rows={r['wid']:r for r in [json.loads(line) for line in (HERE/'review/decisions.jsonl').read_text().splitlines()]}
 sample=json.loads((HERE/'review/sample.json').read_text());frozen=json.loads((HERE/'review/frozen-status-ok-sample.json').read_text())
 counts=Counter();failures=Counter()
 # Only withhold observed wrong/unsure words. Never promote a review word or edit bars.
 for page in range(1,605):
  path=BARS/f'p{page}.json';data=json.loads(path.read_text())
  for wid,w in data['words'].items():
   if wid in frozen:assert w['bars']==frozen[wid]['bars'] and w['tids']==frozen[wid]['tids']
   verdict=rows.get(wid,{}).get('verdict')
   if verdict in ('wrong','unsure'):
    flag='visual-'+verdict
    if flag not in w['checks']:w['checks'].append(flag)
    w['status']='review'
   counts[w['status']]+=1;failures.update(w.get('checks',[]))
  atomic(path,data)
 index=json.loads((BARS/'index.json').read_text());index['counts']=dict(counts);index['failedChecks']=dict(failures);atomic(BARS/'index.json',index)
 validate_batch.main()
 protected=subprocess.check_output(['git','diff','--name-only','a957b63061d935166ee5eb061cdb8639c8e31bd0','--','src','public/mushaf','public/pages','public/mushaf-dk','public/letter-borders'],cwd=ROOT,text=True)
 assert not protected,protected
 assert not INK.exists(),'Colour exports must remain absent'
 random_counts=Counter(rows[wid]['verdict'] for _,wid in sample['random-ok'])
 flagged_counts=Counter(rows[wid]['verdict'] for _,wid in sample['review-p001-050'])
 paths=sorted(BARS.glob('*.json'));events=[json.loads(line) for line in (HERE/'review/audit.jsonl').read_text().splitlines()]
 result=dict(checkpoint=1,complete=True,createdAt=datetime.now(timezone.utc).isoformat(),pages=604,words=sum(counts.values()),currentStatusCounts=dict(counts),failedChecks=dict(failures),fitThreshold=index['thresholds']['fit'],thresholds=index['thresholds'],randomSample=dict(seed=20261110,words=300,counts=dict(random_counts),fullyRightPercent=100*random_counts['ok']/300,targetPercent=97,targetMet=random_counts['ok']>=291),flaggedPages1to50=dict(words=len(sample['review-p001-050']),counts=dict(flagged_counts)),uniqueReviewedWords=len(rows),actualViewAuditEvents=len(events),distinctAuditedImages=len({e['image'] for e in events}),recordedReviewWindow=[min(e['at'] for e in events),max(e['at'] for e in events)],underlinesBytes=sum(p.stat().st_size for p in paths),underlinesGzipBytes=sum(len(gzip.compress(p.read_bytes(),mtime=0)) for p in paths),colourBytes=0,colourFolderExists=False,tokensUsed=None,tokensPer100ReviewedWords=None,tokenMeasurement='Exact token telemetry unavailable; recorded audit timestamps are not active work time.',acceptanceComparison=json.loads((HERE/'calibration/acceptance-full-fit.json').read_text()),geometryAndTargetsValidated=True,protectedPathsUnchanged=True)
 atomic(HERE/'checkpoint1-results.json',result)
 progress=json.loads((HERE/'review/progress.json').read_text());progress.update(phase='checkpoint1-owner-review',checkpoint1Complete=True,wordsChecked=len(rows),updatedAt=result['createdAt']);atomic(HERE/'review/progress.json',progress)
 print(json.dumps(result,indent=2))
if __name__=='__main__':main()
