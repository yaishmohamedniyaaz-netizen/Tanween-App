"""Reapply checks from saved metrics; no rendering or alignment."""
import json
from collections import Counter
from run_all import HERE,BARS,RAW,atomic

def checks(w,m,policy):
 old=w.get('originalChecks',w.get('checks',[]));out=[c for c in old if c not in ('size','order','empty-letter','fit','fit-pending')]
 if 'error' in m:return out
 if 'empty-letter' not in policy['disabled'] and any(a<12 for a in m['bodyAreas']):out.append('empty-letter')
 if any(a is not None and b is not None and a<b for a,b in zip(m['centres'],m['centres'][1:])):out.append('order')
 if 'size' not in policy['disabled'] and any(a is None or not .35<=a<=2.8 for a in m['areaRatios']):out.append('size')
 return out

def main():
 policy=json.loads((HERE/'calibration/active-checks.json').read_text());old=Counter();new=Counter();pages=[]
 for p in range(1,605):
  bp=BARS/f'p{p}.json';mp=RAW/f'p{p}.json'
  if not bp.exists() or not mp.exists():continue
  b=json.loads(bp.read_text());metrics=json.loads(mp.read_text())['words'];pages.append(p)
  for wid,w in b['words'].items():
   w.setdefault('originalChecks',w['checks'][:]);initial=[c for c in w['originalChecks'] if c not in ('fit-pending','fit')];old['review' if initial else 'ok']+=1
   cc=checks(w,metrics[wid],policy);new['review' if cc else 'ok']+=1;w['checks']=cc+['fit-pending'];w['status']='review'
  atomic(bp,b)
 atomic(HERE/'calibration/acceptance-before-global-fit.json',dict(pages=pages,old=dict(old),new=dict(new),note='Non-fit checks only; full-run fit percentile pending. Export status remains review until finalization.'))
 print(dict(old),dict(new),len(pages))
if __name__=='__main__':main()
