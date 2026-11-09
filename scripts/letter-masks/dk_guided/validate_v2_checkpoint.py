"""Validate v2 outputs and actual review; finish only the authorized 1b gate."""
import json,hashlib,subprocess,tempfile,gzip,argparse
from pathlib import Path
from collections import Counter
from datetime import datetime,timezone
import run_v2 as R
import review_v2_checkpoint as C

def main(complete=False,finish=False):
 OUT=R.OUT;ROOT=R.ROOT;read=C.read;index=read(R.BARS/'index.json');assert index['method']==R.METHOD
 assert R.sha(R.HERE/'bars_v2.py')==index['barsRuleSha256']
 preserved=read(OUT/'v1-evidence-sha256.json')
 for p,sha in preserved['sha256'].items():assert R.sha(ROOT/p)==sha,('v1 evidence changed',p)
 counts=Counter();failures=Counter();total=0;label_changed=[]
 with tempfile.TemporaryDirectory() as tmp:
  for first in range(1,605,25):
   pages=list(range(first,min(605,first+25)));dump=Path(tmp)/'units.json'
   subprocess.run(['node','--experimental-strip-types','scripts/letter-masks/dump_units.mts',*map(str,pages),'--out',str(dump)],cwd=ROOT,check=True,capture_output=True)
   units=read(dump)
   for p in pages:
    b=read(R.BARS/f'p{p}.json');raw=read(R.RAW/f'p{p}.json');old=read(R.V1.RAW/f'p{p}.json')['words']
    art=R.G.art_page(p);expected={w['wid'] for w in art['words'] if w.get('role')=='letter'}
    assert b['page']==p and b['method']==R.METHOD and b['ruleVersion']==R.V1.RULE
    assert set(b['words'])==set(raw['words'])==expected
    assert raw['barsRuleSha256']==index['barsRuleSha256']
    for wid,w in b['words'].items():
     m=raw['words'][wid];assert w['tids']==[u['tid'] for u in units[wid]['units']]
     assert not set(w['checks'])&{'fit-pending','order','size','empty-letter'}
     error=any(c.startswith('error:') for c in w['checks'])
     if not error:
      assert len(w['bars'])==len(w['tids'])
      for key in ('fit','coverage','bodyAreas','areaRatios','centres','box'):assert m[key]==old[wid][key],(p,wid,key)
      assert len(m['labelSha256'])==64
     elif any('alignment changed' in c for c in w['checks']):label_changed.append([p,wid])
     box=m.get('box');defined=[bar for bar in w['bars'] if bar]
     assert all(len(bar)==2 and all(type(x)==int for x in bar) and box[0]<=bar[0]<bar[1]<=box[2] for bar in defined)
     assert all(left[1]<=right[0] for right,left in zip(defined,defined[1:]))
     if w['status']=='ok':assert not w['checks'] and all(bar and bar[1]-bar[0]>=3 for bar in w['bars'])
     counts[w['status']]+=1;failures.update(w['checks']);total+=1
    R.G.art_page.cache_clear()
 assert total==77433 and dict(counts)==index['counts'];assert not label_changed,label_changed
 assert not R.V1.INK.exists()
 protected=['src','public/mushaf','public/pages','public/mushaf-dk','public/letter-borders']
 assert not subprocess.check_output(['git','diff','--name-only',R.BASE,'--',*protected],cwd=ROOT)
 result=dict(pages=604,words=total,counts=dict(counts),failedChecks=dict(failures),exactAppTargets=True,savedCropBounds=True,noOverlappingBars=True,v1EvidenceUnchanged=True,alignmentMetricsUnchanged=True,colourFolderAbsent=True,protectedPathsUnchanged=True)
 if (OUT/'sample.json').exists():
  sample=read(OUT/'sample.json');eligible=read(OUT/'eligible.json');excluded=set(read(OUT/'excluded.json'));frozen=read(OUT/'frozen-predictions.json')
  assert __import__('random').Random(20261112).sample(eligible,300)==sample['fresh300'];assert all(w not in excluded for _,w in sample['fresh300'])
  assert len(sample['recheck89'])==89 and len(sample['fresh300'])==300
  for wid,w in frozen.items():
   actual=read(R.BARS/f'p{w["page"]}.json')['words'][wid];assert w['bars']==actual['bars'] and w['tids']==actual['tids']
  rows=C.decisions();ds={r['wid']:r for r in rows};assert len(ds)==len(rows);coverage=set()
  events=[json.loads(l) for l in (OUT/'audit.jsonl').read_text().splitlines()] if (OUT/'audit.jsonl').exists() else []
  for e in events:
   assert e['event']=='actually-viewed' and e['observer'] and e['at'] and R.sha(ROOT/e['image'])==e['sha256']
   for p,wid in e['words']:
    w=read(R.BARS/f'p{p}.json')['words'][wid];assert e['predictionDigests'][wid]==C.digest(w)
    assert e['labelDigests'][wid]==read(R.RAW/f'p{p}.json')['words'][wid].get('labelSha256');coverage.add(wid)
    assert ds[wid]['verdict'] in ('ok','wrong','unsure') and ds[wid]['page']==p
    assert ds[wid]['verdict']=='ok' or ds[wid].get('note')
  assert coverage==set(ds)
  result.update(reviewedWords=len(ds),actualViewEvents=len(events),frozenSeedVerified=True)
  if complete or finish:
   assert all(w in ds for _,w in sample['recheck89']+sample['fresh300'][:100]),'Required review not complete'
   first=Counter(ds[w]['verdict'] for _,w in sample['fresh300'][:100]);early=first['ok']<90
   target=sample['fresh300'][:100] if early else sample['fresh300']
   assert all(w in ds for _,w in target),'Complete the remaining fresh 300'
   assert early or len(target)==300
   if early:assert all(w not in ds for _,w in sample['fresh300'][100:]),'Early-stop gate was crossed'
   result.update(checkpoint='1b',complete=True,earlyStopped=early,recheck89=dict(Counter(ds[w]['verdict'] for _,w in sample['recheck89'])),fresh=dict(words=len(target),counts=dict(Counter(ds[w]['verdict'] for _,w in target)),fullyRightPercent=100*sum(ds[w]['verdict']=='ok' for _,w in target)/len(target),seed=20261112),labelWrongWords=sum('label-wrong' in r.get('note','') for r in rows))
   if finish:
    for p in range(1,605):
     path=R.BARS/f'p{p}.json';b=read(path)
     for wid,w in b['words'].items():
      if ds.get(wid,{}).get('verdict') in ('wrong','unsure'):
       flag='visual-v2-'+ds[wid]['verdict']
       if flag not in w['checks']:w['checks'].append(flag)
       w['status']='review'
     R.atomic(path,b)
    after=Counter();ff=Counter()
    for p in range(1,605):
     for w in read(R.BARS/f'p{p}.json')['words'].values():after[w['status']]+=1;ff.update(w['checks'])
    index['counts']=dict(after);index['failedChecks']=dict(ff);R.atomic(R.BARS/'index.json',index)
    paths=list(R.BARS.glob('*.json'));result.update(finalCounts=dict(after),automaticCounts=read(OUT/'automatic-index.json')['counts'],underlinesBytes=sum(p.stat().st_size for p in paths),underlinesGzipBytes=sum(len(gzip.compress(p.read_bytes(),mtime=0)) for p in paths),tokensUsed=None,tokensPer100ReviewedWords=None,createdAt=datetime.now(timezone.utc).isoformat())
    R.atomic(OUT/'results.json',result);R.atomic(OUT/'progress.json',dict(phase='checkpoint1b-owner-review',**result))
 R.atomic(OUT/'validation.json',result);print(json.dumps(result),flush=True)
 return result
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--complete',action='store_true');a.add_argument('--finish',action='store_true');args=a.parse_args();main(args.complete,args.finish)
