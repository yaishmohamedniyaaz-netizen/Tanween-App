"""Freeze sheets for definite failures on completed pages 1–50 while fit is pending."""
import json,hashlib
from PIL import Image
from check_sheet import tile
from run_all import HERE,BARS,INK,ROOT,atomic,encode

def main(after_calibration=False):
 target=HERE/('review/definite-after-calibration' if after_calibration else 'review/early');target.mkdir(exist_ok=True)
 manifest=target/'manifest.json'
 if manifest.exists():raise SystemExit('Existing early review is immutable; reuse it.')
 items=[]
 reviewed=set()
 if after_calibration:
  from recheck import checks
  policy=json.loads((HERE/'calibration/active-checks.json').read_text())
  rp=HERE/'review/decisions.jsonl'
  if rp.exists():reviewed.update(json.loads(line)['wid'] for line in rp.read_text().splitlines())
  for cp in (HERE/'calibration').glob('*-review.json'):reviewed.update(r['wid'] for r in json.loads(cp.read_text())['decisions'])
 for p in range(1,51):
  path=BARS/f'p{p}.json'
  if not path.exists():continue
  for wid,w in sorted(json.loads(path.read_text())['words'].items()):
   failed=checks(w,json.loads((HERE/f'batch/p{p}.json').read_text())['words'][wid],policy) if after_calibration else [c for c in w['checks'] if c!='fit-pending']
   if failed and wid not in reviewed:items.append([p,wid])
 entries=[]
 for start in range(0,len(items),24):
  batch=items[start:start+24];tiles=[tile(*i) for i in batch];cw=max(t.width for t in tiles);ch=max(t.height for t in tiles);out=Image.new('RGB',(cw*4,ch*6),'white')
  for j,t in enumerate(tiles):out.paste(t,((j%4)*cw,(j//4)*ch))
  path=target/f'sheet-{start//24+1:03}.png';out.save(path)
  digests={}
  for p,wid in batch:
   w=json.loads((BARS/f'p{p}.json').read_text())['words'][wid]
   digests[wid]=hashlib.sha256(encode(dict(tids=w['tids'],bars=w['bars'],renderMethod='deterministic-label-print-on-demand'))).hexdigest()
  entries.append(dict(image=str(path.relative_to(ROOT)),words=batch,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),predictionDigests=digests,phase='definite-check-failures-before-global-fit'))
 atomic(manifest,entries);print(len(items),'words',len(entries),'sheets')
if __name__=='__main__':main('--after-calibration' in __import__('sys').argv)
