"""Freeze single-check diagnostic samples and render actual saved predictions."""
import json,random,hashlib,argparse
from PIL import Image
from run_all import HERE,BARS,atomic
from check_sheet import tile

def main(check):
 target=HERE/'calibration';target.mkdir(exist_ok=True);sample=target/f'{check}-sample.json'
 if sample.exists():items=json.loads(sample.read_text())['words']
 else:
  eligible=[];pages=[]
  for p in range(1,605):
   bp=BARS/f'p{p}.json'
   if not bp.exists():continue
   pages.append(p)
   for wid,w in sorted(json.loads(bp.read_text())['words'].items()):
    if [c for c in w['checks'] if c!='fit-pending']==[check]:eligible.append([p,wid])
  if len(eligible)<24:raise SystemExit(f'{check}: only {len(eligible)} exclusive failures; no sample fabricated')
  items=random.Random('20261111-'+check).sample(eligible,24)
  atomic(sample,dict(seed='20261111-'+check,words=items,eligible=len(eligible),pages=pages,note='Single non-fit check failures. Full-run fit threshold pending; calibration set excluded from later accuracy sample.'))
 path=target/f'{check}.png'
 if path.exists():raise SystemExit('Sheet already exists; preserve and inspect it')
 tiles=[tile(*item) for item in items];cw=max(t.width for t in tiles);ch=max(t.height for t in tiles);out=Image.new('RGB',(cw*4,ch*6),'white')
 for j,t in enumerate(tiles):out.paste(t,((j%4)*cw,(j//4)*ch))
 out.save(path);atomic(target/f'{check}-image.json',dict(image=str(path.relative_to(HERE.parents[2])),sha256=hashlib.sha256(path.read_bytes()).hexdigest(),words=items))
 print(items)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('check',choices=['size','order','empty-letter']);main(p.parse_args().check)
