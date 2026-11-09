"""Record explicitly supplied human/agent visual verdicts after actual image inspection."""
import argparse,json,hashlib
from datetime import datetime,timezone
from run_all import HERE,ROOT,encode,BARS,INK

def record(image,rows):
 p=ROOT/image;assert p.exists();sha=hashlib.sha256(p.read_bytes()).hexdigest();dest=HERE/'review/decisions.jsonl';audit=HERE/'review/audit.jsonl'
 old={json.loads(x)['wid'] for x in dest.read_text().splitlines()} if dest.exists() else set()
 assert len({r['wid'] for r in rows})==len(rows)
 for r in rows:
  assert r['wid'] not in old and r['verdict'] in ('ok','wrong','unsure')
  assert r['verdict']=='ok' or r.get('note')
 digests={}
 for r in rows:
  page,wid=r['page'],r['wid'];w=json.loads((BARS/f'p{page}.json').read_text())['words'][wid];ink=None
  digests[wid]=hashlib.sha256(encode(dict(tids=w['tids'],bars=w['bars'],renderMethod='deterministic-label-print-on-demand'))).hexdigest()
 event=dict(event='actually-viewed',observer='cloud-root-dk-20261109',at=datetime.now(timezone.utc).isoformat(),image=image,sha256=sha,words=[[r['page'],r['wid']] for r in rows],predictionDigests=digests)
 with audit.open('a') as f:f.write(json.dumps(event)+'\n')
 with dest.open('a') as f:
  for r in rows:f.write(json.dumps(r,ensure_ascii=False)+'\n')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('image');p.add_argument('verdicts');args=p.parse_args();record(args.image,json.loads(args.verdicts))
