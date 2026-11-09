"""Validate review provenance and prediction identity; never infer verdicts."""
import json,hashlib,subprocess
from collections import Counter
from run_all import HERE,ROOT,BARS,encode

def main(require_complete=False):
 rows=[json.loads(l) for l in (HERE/'review/decisions.jsonl').read_text().splitlines()];ds={r['wid']:r for r in rows};assert len(ds)==len(rows)
 legacy_cache={}
 events=[json.loads(l) for l in (HERE/'review/audit.jsonl').read_text().splitlines()];coverage=set()
 for e in events:
  assert e['event']=='actually-viewed' and e['observer'] and e['at']
  assert hashlib.sha256((ROOT/e['image']).read_bytes()).hexdigest()==e['sha256']
  for p,wid in e['words']:
   r=ds[wid];assert r['page']==p and r['verdict'] in ('ok','wrong','unsure')
   assert r['verdict']=='ok' or r['note'];coverage.add(wid)
   w=json.loads((BARS/f'p{p}.json').read_text())['words'][wid]
   current=hashlib.sha256(encode(dict(tids=w['tids'],bars=w['bars'],renderMethod='deterministic-label-print-on-demand'))).hexdigest()
   if '/early/' in e['image']:
    # Historical review digests include colour bytes removed from the current tree.
    # Read the preserved old commit only; never write colour exports again.
    if p not in legacy_cache:
     legacy_cache[p]=json.loads(subprocess.check_output(['git','show',f'd240628:public/letter-ink-dk/p{p}.json'],cwd=ROOT))
    current=hashlib.sha256(encode(dict(tids=w['tids'],bars=w['bars'],letters=legacy_cache[p][wid]['letters']))).hexdigest()
   assert e['predictionDigests'][wid]==current,(wid,'prediction changed')
 assert coverage==set(ds)
 for check in ['size','order','empty-letter']:
  r=json.loads((HERE/f'calibration/{check}-review.json').read_text());assert r['actualImageViewed'] and len(r['decisions'])==24
  assert hashlib.sha256((ROOT/r['image']).read_bytes()).hexdigest()==r['sha256']
  assert dict(Counter(d['verdict'] for d in r['decisions']))==r['counts']
  for d in r['decisions']:
   w=json.loads((BARS/f'p{d["page"]}.json').read_text())['words'][d['wid']];snap=r['predictionSnapshots'][d['wid']]
   assert w['bars']==snap['bars'] and w['tids']==snap['tids']
 if require_complete:
  sample=json.loads((HERE/'review/sample.json').read_text());required={wid for group in sample.values() for _,wid in group};assert required<=set(ds),'Incomplete actual visual review'
  assert len(sample['random-ok'])==300
 print(len(ds),'unique reviewed words; 72 calibration reviews; hashes and current prediction identities verified')
if __name__=='__main__':main('--complete' in __import__('sys').argv)
