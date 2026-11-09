"""Validate every emitted word against exact app targets and colour coordinates."""
import json,subprocess,tempfile,hashlib
from collections import Counter
from pathlib import Path
from PIL import Image
from run_all import ROOT,BARS,INK,RAW,atomic,HERE

def main():
 index=json.loads((BARS/'index.json').read_text());assert index['pages']==list(range(1,605));counts=Counter();total=0
 with tempfile.TemporaryDirectory() as tmp:
  for first in range(1,605,25):
   pages=list(range(first,min(605,first+25)));out=Path(tmp)/'units.json'
   subprocess.run(['node','--experimental-strip-types','scripts/letter-masks/dump_units.mts',*map(str,pages),'--out',str(out)],cwd=ROOT,check=True,capture_output=True)
   units=json.loads(out.read_text())
   for p in pages:
    b=json.loads((BARS/f'p{p}.json').read_text());meta=json.loads((RAW/f'p{p}.json').read_text())
    art=json.loads((ROOT/f'public/mushaf/1405-artwork-5a5f9f3846158475/p{p}.json').read_text())
    expected={w['wid'] for w in art['words'] if w.get('role')=='letter'}
    with Image.open(ROOT/f'public/mushaf/1405-artwork-5a5f9f3846158475/p{p}.png') as image:page_width=image.width
    assert b['page']==p and b['ruleVersion']=='qpc-hafs-v1-targets-4.0.0' and b['method']=='dk-guided-v1'
    assert set(b['words'])==set(meta['words'])==expected
    for wid,w in b['words'].items():
     assert w['tids']==[u['tid'] for u in units[wid]['units']],(p,wid,'tid mismatch')
     assert w['status'] in ('ok','review')
     assert ('fit-pending' not in w.get('checks',[]))
     if not any(c.startswith('error:') for c in w.get('checks',[])):assert len(w['bars'])==len(w['tids'])
     for bar in w['bars']:
      if bar is not None:assert len(bar)==2 and all(type(x)==int for x in bar) and 0<=bar[0]<bar[1]<=page_width
     if w['status']=='ok':assert not w['checks'] and len(w['bars'])==len(w['tids']) and all(b is not None and b[1]-b[0]>=3 for b in w['bars'])
     counts[w['status']]+=1;total+=1
 assert dict(counts)==index['counts']
 atomic(HERE/'batch-validation.json',dict(words=total,counts=dict(counts),pages=604,exactAppTargets=True,colourExport=False))
 print(total,dict(counts))
if __name__=='__main__':main()
