"""Fresh diagnostic recomputation of rejected spans; never repair predictions."""
import json
from datetime import datetime,timezone
import run_v2 as R

def main():
 examined=[]
 for rp in sorted(R.RAW.glob('p*.json'),key=lambda p:int(p.stem[1:])):
  p=int(rp.stem[1:]);raw=json.loads(rp.read_text());old=json.loads((R.V1.RAW/rp.name).read_text())['words'];changed=False
  for wid,m in list(raw['words'].items()):
   if 'error' not in m or 'labelSha256' in m:continue
   assert 'v2 bars overlap or reverse' in m['error'] or 'v2 bar outside saved crop' in m['error'],(p,wid,m['error'])
   res=R.G.label_print(p,wid);tids=json.loads((R.BARS/rp.name).read_text())['words'][wid]['tids'];_,_,metrics=R.V1.process(res,tids)
   for key in ('fit','coverage','bodyAreas','areaRatios','centres','box'):assert metrics[key]==old[wid][key],(p,wid,key)
   try:R.convert(res,tids)
   except ValueError as e:assert str(e) in m['error']
   else:raise AssertionError((p,wid,'saved geometry error did not reproduce'))
   metrics.update(error=m['error'],labelSha256=R.label_digest(res),sourceV2Spans=R.bars_v2(res),diagnosticRecomputedAt=datetime.now(timezone.utc).isoformat())
   raw['words'][wid]=metrics;changed=True;examined.append([p,wid])
  if changed:R.atomic(rp,raw)
  R.G.dk_page.cache_clear();R.G.art_page.cache_clear();R.G.art_alpha.cache_clear()
 previous=json.loads((R.OUT/'error-diagnostic.json').read_text()) if (R.OUT/'error-diagnostic.json').exists() else []
 R.atomic(R.OUT/'error-diagnostic.json',previous+examined)
 print('Freshly verified rejected-span diagnostics:',len(examined),flush=True)
if __name__=='__main__':main()
