"""Validate every emitted word against exact app targets and colour coordinates."""
import json,subprocess,tempfile,hashlib
from collections import Counter
from pathlib import Path
from run_all import ROOT,BARS,INK,RAW,atomic,HERE

def main():
 index=json.loads((BARS/'index.json').read_text());assert index['pages']==list(range(1,605));counts=Counter();total=0
 with tempfile.TemporaryDirectory() as tmp:
  for first in range(1,605,25):
   pages=list(range(first,min(605,first+25)));out=Path(tmp)/'units.json'
   subprocess.run(['node','--experimental-strip-types','scripts/letter-masks/dump_units.mts',*map(str,pages),'--out',str(out)],cwd=ROOT,check=True,capture_output=True)
   units=json.loads(out.read_text())
   for p in pages:
    b=json.loads((BARS/f'p{p}.json').read_text());ink=json.loads((INK/f'p{p}.json').read_text());meta=json.loads((RAW/f'p{p}.json').read_text())
    art=json.loads((ROOT/f'public/mushaf/1405-artwork-5a5f9f3846158475/p{p}.json').read_text())
    expected={w['wid'] for w in art['words'] if w.get('role')=='letter'}
    assert set(b['words'])==set(ink)==set(meta['words'])==expected
    for wid,w in b['words'].items():
     assert w['tids']==[u['tid'] for u in units[wid]['units']],(p,wid,'tid mismatch')
     assert w['status']==ink[wid]['status'] and w['status'] in ('ok','review')
     assert ('fit-pending' not in w.get('checks',[]))
     if w['status']=='ok':assert not w['checks'] and len(w['bars'])==len(w['tids']) and all(b is not None and b[1]-b[0]>=3 for b in w['bars'])
     assert set(ink[wid]['letters'])<=set(w['tids'])
     for rows in ink[wid]['letters'].values():
      assert rows==sorted(rows)
      assert all(len(r)==3 and all(type(x)==int for x in r) and 0<=r[1]<r[2] and r[0]>=0 for r in rows)
     counts[w['status']]+=1;total+=1
 assert dict(counts)==index['counts']
 atomic(HERE/'batch-validation.json',dict(words=total,counts=dict(counts),pages=604,exactAppTargets=True,colourRowsValid=True))
 print(total,dict(counts))
if __name__=='__main__':main()
