"""Checkpoint 1b: unchanged labels, supplied v2 bars, atomic/resumable pages."""
import os
for key in ('OMP_NUM_THREADS','OPENBLAS_NUM_THREADS','MKL_NUM_THREADS'):os.environ[key]='1'
import argparse,json,hashlib,multiprocessing as mp
from collections import Counter
import numpy as np
import run_all as V1
from bars_v2 import bars_v2
G=V1.G;ROOT=V1.ROOT;HERE=V1.HERE;BARS=V1.BARS;atomic=V1.atomic
OUT=HERE/'checkpoint1b';RAW=OUT/'batch';METHOD='dk-guided-v2'
BASE='7f676c36261d5e826bcc128394d7bbe2b64649ce'

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def label_digest(r):
 return hashlib.sha256(r['labels'].astype('<i4').tobytes()+np.packbits(r['ink']).tobytes()+V1.encode(dict(tids=r['tids'],box=r['box']))).hexdigest()
def convert(r,tids):
 # Retain the existing metrics and alignment; replace only the bar derivation.
 _,_,metrics=V1.process(r,tids)
 metrics['labelSha256']=label_digest(r)
 spans=bars_v2(r)
 bs=[([spans[t][0]+r['box'][0],spans[t][1]+r['box'][0]] if spans.get(t) else None) for t in tids]
 checks=[]
 if set(tids)!=set(r['tids'])-{'__none__'}:checks.append('tids')
 if any(b is None or b[1]-b[0]<3 for b in bs):checks.append('narrow-bar')
 if metrics['coverage']<.97:checks.append('coverage')
 # The supplied function can expand squeezed spans. Reject invalid geometry;
 # do not silently repair its output or change letter labels.
 if any(b and not r['box'][0]<=b[0]<b[1]<=r['box'][2] for b in bs):raise ValueError('v2 bar outside saved crop')
 defined=[b for b in bs if b]
 if any(left[1]>right[0] for right,left in zip(defined,defined[1:])):raise ValueError('v2 bars overlap or reverse after squeezing')
 return dict(tids=tids,bars=bs,status='review',checks=checks+['fit-pending']),metrics

def page_job(p):
 bp=BARS/f'p{p}.json';rp=RAW/f'p{p}.json'
 if rp.exists() and bp.exists():
  raw=json.loads(rp.read_text());old=json.loads(bp.read_text())
  if old['method']==METHOD and raw.get('barsRuleSha256')==sha(HERE/'bars_v2.py'):return p,'skipped'
 words={};metrics={};units=G.dk_page(p)['units']
 oldmetrics=json.loads((V1.RAW/f'p{p}.json').read_text())['words']
 for w in G.art_page(p)['words']:
  if w.get('role')!='letter':continue
  wid=w['wid'];tids=[t for t in units if t.startswith(wid+'@')]
  try:
   res=G.label_print(p,wid)
   words[wid],metrics[wid]=convert(res,tids)
   # A changed alignment must be investigated, not silently called bars-only.
   for key in ('fit','coverage','bodyAreas','areaRatios','centres','box'):
    assert metrics[wid][key]==oldmetrics[wid][key],f'v1 alignment changed: {key}'
  except Exception as e:
   words[wid]=dict(tids=tids,bars=[],status='review',checks=['error: '+type(e).__name__+': '+str(e)])
   metrics[wid]=dict(error=words[wid]['checks'][0],**{k:v for k,v in oldmetrics[wid].items() if k in ('fit','coverage','box')})
 atomic(rp,dict(page=p,barsRuleSha256=sha(HERE/'bars_v2.py'),words=metrics))
 atomic(bp,dict(page=p,ruleVersion=V1.RULE,method=METHOD,words=words))
 G.dk_page.cache_clear();G.art_page.cache_clear();G.art_alpha.cache_clear()
 return p,len(words)

def finalize():
 assert all((RAW/f'p{p}.json').exists() for p in range(1,605))
 fits=[];counts=Counter();failures=Counter();errors=[]
 for p in range(1,605):
  m=json.loads((RAW/f'p{p}.json').read_text());fits.extend(v['fit'] for v in m['words'].values() if 'fit' in v)
 cutoff=float(np.percentile(fits,90))
 for p in range(1,605):
  bp=BARS/f'p{p}.json';b=json.loads(bp.read_text());m=json.loads((RAW/f'p{p}.json').read_text())['words'];assert b['method']==METHOD
  for wid,w in b['words'].items():
   checks=[c for c in w['checks'] if c not in ('fit','fit-pending')]
   if m[wid].get('fit',0)>cutoff:checks.append('fit')
   w['checks']=checks;w['status']='review' if checks else 'ok';counts[w['status']]+=1;failures.update(checks)
   if any(c.startswith('error:') for c in checks):errors.append(dict(page=p,wid=wid,checks=checks))
  atomic(bp,b)
 index=dict(ruleVersion=V1.RULE,method=METHOD,pages=list(range(1,605)),counts=dict(counts),failedChecks=dict(failures),thresholds=dict(coverage=.97,**{'narrow-bar':3},fit=cutoff,fitPercentile=90,disabled=['size','empty-letter','order']),fitPopulation=len(fits),barsRuleSha256=sha(HERE/'bars_v2.py'))
 atomic(BARS/'index.json',index);atomic(OUT/'automatic-index.json',index);atomic(OUT/'generation-errors.json',errors)
 print(json.dumps(index),flush=True)

if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--workers',type=int,default=5);a.add_argument('--pages',default='1:604');a.add_argument('--finalize',action='store_true');args=a.parse_args()
 OUT.mkdir(exist_ok=True)
 if args.finalize:finalize()
 else:
  lo,hi=map(int,args.pages.split(':'))
  with mp.Pool(args.workers) as pool:
   for p,n in pool.imap_unordered(page_job,range(lo,hi+1)):print(p,n,flush=True)
