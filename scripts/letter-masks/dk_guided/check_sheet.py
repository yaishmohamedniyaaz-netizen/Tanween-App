"""Render saved batch outputs, never recompute or tune predictions during review."""
import argparse,json,random,hashlib
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
import dkguide as G
from run_all import BARS,INK,HERE,atomic
from sheet import PAL
FONT=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
def tile(p,wid):
 data=json.loads((BARS/f'p{p}.json').read_text())['words'][wid];colour=None
 w,box,alpha=G.art_word(p,wid);H,W=alpha.shape;im=np.full((H,W,3),255.,float);im[alpha>90]=30
 # Rebuild colour labels only for displayed words; never export them.
 res=G.label_print(p,wid)
 expected=G.bars(res)
 assert [list(expected[t]) if expected.get(t) else None for t in data['tids']]==[[b[0]-res['box'][0],b[1]-res['box'][0]] if b else None for b in data['bars']], 'Rebuilt bars differ from saved prediction'
 assert tuple(box)==tuple(res['box'])
 for k,t in enumerate(data['tids']):
  mask=res['labels']==res['tids'].index(t)+1
  im[mask]=.7*im[mask]+.3*np.array(PAL[k%len(PAL)])
 canvas=Image.new('RGB',(W,H+18),'white');canvas.paste(Image.fromarray(im.astype('uint8')));draw=ImageDraw.Draw(canvas)
 for k,b in enumerate(data['bars']):
  if b:draw.line((b[0]-box[0],H+8,b[1]-box[0]-1,H+8),fill=PAL[k%len(PAL)],width=3)
 canvas=canvas.resize((W*3,(H+18)*3));out=Image.new('RGB',(max(canvas.width,400),canvas.height+30),'white');out.paste(canvas,(0,30));ImageDraw.Draw(out).text((3,3),f'p{p} {wid} {w["text"]}',font=FONT,fill='black');return out

def main():
 idx=json.loads((BARS/'index.json').read_text());assert idx['pages']==list(range(1,605))
 eligible=[];flagged=[]
 excluded={'2.112.16','2.89.12','2.174.20','2.107.0'}
 for sample in (HERE/'calibration').glob('*-sample.json'):
  excluded.update(wid for _,wid in json.loads(sample.read_text())['words'])
 reviewed=HERE/'review/decisions.jsonl'
 if reviewed.exists():excluded.update(json.loads(line)['wid'] for line in reviewed.read_text().splitlines())
 for p in range(1,605):
  for wid,w in sorted(json.loads((BARS/f'p{p}.json').read_text())['words'].items()):
   if w['status']=='ok' and wid not in excluded:eligible.append([p,wid])
   elif w['status']=='review' and p<=50:flagged.append([p,wid])
 samples={'random-ok':random.Random(20261110).sample(eligible,300),'review-p001-050':flagged}
 target=HERE/'review';target.mkdir(exist_ok=True)
 manifest=[]
 for phase,items in samples.items():
  for start in range(0,len(items),24):
   batch=items[start:start+24];tiles=[]
   for page,wid in batch:
    try:tiles.append(tile(page,wid))
    except Exception as e:
     placeholder=Image.new('RGB',(600,200),'white')
     ImageDraw.Draw(placeholder).text((5,5),f'p{page} {wid} render error: {type(e).__name__}: {e}',font=FONT,fill='red')
     tiles.append(placeholder)
   cw=max(t.width for t in tiles);ch=max(t.height for t in tiles)
   out=Image.new('RGB',(cw*4,ch*6),'white')
   for j,t in enumerate(tiles):out.paste(t,((j%4)*cw,(j//4)*ch))
   path=target/f'{phase}-{start//24+1:03}.png'
   if path.exists():raise RuntimeError('Preserve existing sheet '+str(path))
   out.save(path);manifest.append(dict(phase=phase,image=str(path.relative_to(G.REPO)),words=batch,sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
 atomic(target/'manifest.json',manifest);atomic(target/'sample.json',samples)
if __name__=='__main__':main()
