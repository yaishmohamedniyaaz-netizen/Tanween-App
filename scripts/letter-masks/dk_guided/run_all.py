"""Deterministic, resumable DK-guided batch export. Run with --finalize after all pages."""
import os
for key in ('OMP_NUM_THREADS','OPENBLAS_NUM_THREADS','MKL_NUM_THREADS'):os.environ[key]='1'
import argparse,json,gzip,tempfile,multiprocessing as mp
from pathlib import Path
from collections import Counter
import numpy as np
import dkguide as G
ROOT=G.REPO; HERE=Path(__file__).resolve().parent
BARS=ROOT/'public/letter-bars-dk';INK=ROOT/'public/letter-ink-dk';RAW=HERE/'batch'
RULE='qpc-hafs-v1-targets-4.0.0';METHOD='dk-guided-v1'
TH={'empty-letter':12,'narrow-bar':3,'size':[.35,2.8],'coverage':.97,'fitPercentile':90}
def encode(o):return json.dumps(o,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False,default=lambda x:x.item() if isinstance(x,np.generic) else str(x)).encode()+b'\n'
def atomic(p,o):
 p.parent.mkdir(parents=True,exist_ok=True)
 data=encode(o)
 with tempfile.NamedTemporaryFile(dir=p.parent,delete=False) as f:f.write(data);name=f.name
 os.replace(name,p)
def runs(mask,box,gap=0):
 out=[]
 for y in range(mask.shape[0]):
  xs=np.flatnonzero(mask[y])
  if not len(xs):continue
  starts=np.r_[0,np.flatnonzero(np.diff(xs)>gap+1)+1];ends=np.r_[starts[1:]-1,len(xs)-1]
  out.extend([[int(y+box[1]),int(xs[a]+box[0]),int(xs[b]+1+box[0])] for a,b in zip(starts,ends)])
 return out
def process(r,tids,colour=False):
 checks=[];bs=G.bars(r);lab=r['labels'];body=r['ink']&~r['marks'];areas=[];centres=[];ratios=[];bars=[];colour_data={}
 if set(tids)!=set(r['tids'])-{'__none__'}:checks.append('tids')
 for t in tids:
  k=r['tids'].index(t)+1 if t in r['tids'] else -1;m=(lab==k)&body;ys,xs=np.nonzero(m);area=len(xs)
  areas.append(area);centres.append(float(xs.mean()) if area else None)
  da=r['dk_body_areas'][k-1]/r['scale_area'] if k>0 else 0;ratios.append(float(area/da) if da else None)
  b=bs.get(t);bars.append([b[0]+r['box'][0],b[1]+r['box'][0]] if b else None)
  if colour:colour_data[t]=runs(lab==k,r['box']) if k>0 else []
 if any(a<12 for a in areas):checks.append('empty-letter')
 if any(b is None or b[1]-b[0]<3 for b in bars):checks.append('narrow-bar')
 if any(a is None or b is None or a<b for a,b in zip(centres,centres[1:])):checks.append('order')
 if any(a is None or not .35<=a<=2.8 for a in ratios):checks.append('size')
 coverage=float(((lab>0)|r['marks'])[r['ink']].mean())
 if coverage<.97:checks.append('coverage')
 return dict(tids=tids,bars=bars,status='review',checks=checks+['fit-pending']),dict(status='review',letters=colour_data),dict(fit=float(r['fit']),coverage=coverage,bodyAreas=areas,areaRatios=ratios,centres=centres,box=list(r['box']))
def page_job(arg):
 p,force=arg; paths=[BARS/f'p{p}.json',RAW/f'p{p}.json']
 if not force and all(x.exists() for x in paths):return p,'skipped'
 words={};metrics={};units=G.dk_page(p)['units']
 for w in G.art_page(p)['words']:
  if w.get('role')!='letter':continue
  wid=w['wid'];tids=[t for t in units if t.startswith(wid+'@')]
  try:words[wid],_,metrics[wid]=process(G.label_print(p,wid),tids)
  except Exception as e:
   words[wid]=dict(tids=tids,bars=[],status='review',checks=['error: '+type(e).__name__+': '+str(e)])
   metrics[wid]=dict(error=words[wid]['checks'][0])
 atomic(paths[1],dict(page=p,words=metrics,colourExport=False))
 atomic(paths[0],dict(page=p,ruleVersion=RULE,method=METHOD,words=words))
 G.dk_page.cache_clear();G.art_page.cache_clear();G.art_alpha.cache_clear()
 return p,len(words)

def finalize():
 assert (HERE/'calibration/policy.json').exists(),'Complete owner-requested false-alarm calibration before finalization/sample'
 assert all((RAW/f'p{p}.json').exists() and (BARS/f'p{p}.json').exists() for p in range(1,605)),'Full run required'
 fits=[]
 for p in range(1,605):fits.extend(v['fit'] for v in json.loads((RAW/f'p{p}.json').read_text())['words'].values() if 'fit' in v)
 cutoff=float(np.percentile(fits,90));counts=Counter();failures=Counter()
 for p in range(1,605):
  bp=BARS/f'p{p}.json';b=json.loads(bp.read_text());m=json.loads((RAW/f'p{p}.json').read_text())
  for wid,w in b['words'].items():
   from recheck import checks as apply_checks
   w.setdefault('originalChecks',w['checks'][:])
   policy=json.loads((HERE/'calibration/active-checks.json').read_text())
   checks=apply_checks(w,m['words'][wid],policy)
   if m['words'][wid].get('fit',0)>cutoff:checks.append('fit')
   w['checks']=checks;w['status']='review' if checks else 'ok';counts[w['status']]+=1;failures.update(checks)
  atomic(bp,b)
 atomic(BARS/'index.json',dict(ruleVersion=RULE,method=METHOD,pages=list(range(1,605)),counts=dict(counts),thresholds=dict(TH,fit=cutoff,disabled=policy['disabled'],orderRequiresDefinedCentres=True),failedChecks=dict(failures),fitPopulation=len(fits)))
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--force',action='store_true');a.add_argument('--pages',default='1:604');a.add_argument('--workers',type=int,default=len(os.sched_getaffinity(0)));a.add_argument('--finalize',action='store_true');args=a.parse_args()
 if args.finalize:finalize()
 else:
  lo,hi=map(int,args.pages.split(':'))
  with mp.Pool(args.workers) as pool:
   for p,n in pool.imap_unordered(page_job,[(p,args.force) for p in range(lo,hi+1)]):print(p,n,flush=True)
