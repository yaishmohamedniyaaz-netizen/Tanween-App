"""Small, reproducible CP2 experiments, cached alignment, changed-word evidence."""
import os
for key in ('OMP_NUM_THREADS','OPENBLAS_NUM_THREADS','MKL_NUM_THREADS'):os.environ[key]='1'
import argparse, json, pickle, hashlib, multiprocessing as mp, time
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
import labels_v3 as L
from bars_v3 import bars_v3, valid
import run_v2 as R
import review_v2_checkpoint as REVIEW
from sheet import PAL
OUT=R.HERE/'checkpoint2';CACHE=OUT/'cache';CACHE.mkdir(exist_ok=True)
read=REVIEW.read;atomic=R.atomic
FLAGS={5:'collisions',4:'detached',2:'stems',1:'stacked',3:'bowl','1r2':'stacked2'}
DEVPATTERN={'1r2':1}  # a revision reuses its pattern's dev cases, in its own folder

def base(p,w):
 path=CACHE/f'{p}-{w}.pickle'
 if path.exists():
  with path.open('rb') as f:r=pickle.load(f)
  old=read(R.RAW/f'p{p}.json')['words'][w]
  if old.get('labelSha256'):assert R.label_digest(r)==old['labelSha256'],f'cached baseline labels changed {w}'
  return r
 r=L.aligned_print(p,w)
 # Every unchanged baseline must match CP1b exact geometry/labels.
 old=read(R.RAW/f'p{p}.json')['words'][w]
 if old.get('labelSha256'):assert R.label_digest(r)==old['labelSha256'],f'baseline labels changed {w}'
 with path.open('wb') as f:pickle.dump(r,f)
 return r

def apply(r,flags):
 for key,fn in [('detached',L.fix_detached),('stems',L.fix_stems),('stacked',L.fix_stacked)]:
  if key in flags:r=fn(r)
 b=bars_v3(r,fix_colliding='collisions' in flags,fix_bowl='bowl' in flags,fix_stacked2='stacked2' in flags)
 return r,b

def job(arg):
 p,w,flags,candidate,role=arg;r=base(p,w)
 before,bb=apply(r,flags);after,ab=apply(r,flags+[candidate])
 tids=[t for t in r['tids'] if t!='__none__']
 def clean(b):return [list(b[t]) if b.get(t) else None for t in tids]
 return dict(page=p,wid=w,role=role,tids=tids,before=clean(bb),after=clean(ab),changed=bb!=ab,
   labelsChanged=not np.array_equal(before['labels'],after['labels']),beforeValid=valid(bb,r['ink'].shape[1]),
   afterValid=valid(ab,r['ink'].shape[1]),beforeLabelSha256=R.label_digest(before),afterLabelSha256=R.label_digest(after))

def metadata(items):
 saved=read(OUT/'target-metadata.json') if (OUT/'target-metadata.json').exists() else {}
 need=[(p,w) for p,w in items if w not in saved]
 if need:
  import subprocess,tempfile
  with tempfile.TemporaryDirectory() as tmp:
   dest=Path(tmp)/'units.json';subprocess.run(['node','--experimental-strip-types','scripts/letter-masks/dump_units.mts',*map(str,sorted({p for p,w in need})),'--out',str(dest)],cwd=R.ROOT,check=True,capture_output=True)
   raw=read(dest)
   for p,w in need:saved[w]=raw[w]
  atomic(OUT/'target-metadata.json',saved)
 return saved

def tile(row,flags):
 p,w=row['page'],row['wid'];r,bs=apply(base(p,w),flags);H,W=r['ink'].shape
 assert [list(bs[t]) if bs.get(t) else None for t in row['tids']]==row['after']
 assert R.label_digest(r)==row['afterLabelSha256']
 im=np.full((H,W,3),255.,float);im[r['ink']]=30
 for k,t in enumerate(row['tids']):
  m=r['labels']==r['tids'].index(t)+1;im[m]=.7*im[m]+.3*np.array(PAL[k%len(PAL)])
 canvas=Image.new('RGB',(W,H+30),'white');canvas.paste(Image.fromarray(im.astype('uint8')));draw=ImageDraw.Draw(canvas)
 for k,b in enumerate(row['after']):
  if b:draw.line((b[0],H+8,b[1]-1,H+8),fill=PAL[k%len(PAL)],width=3)
 for k,b in enumerate(row['before']):
  if b:draw.line((b[0],H+21,b[1]-1,H+21),fill=PAL[k%len(PAL)],width=2)
 canvas=canvas.resize((W*3,(H+30)*3))
 units=metadata([(p,w)])[w]['units'];assert [u['tid'] for u in units]==row['tids']
 width=max(canvas.width,420);positions=[];x=3;y=27
 for i,u in enumerate(units):
  label=f'{i+1}: {u["show"]}';span=max(60,int(REVIEW.ARABIC_FONT.getlength(label))+18)
  if x+span>width:x=3;y+=22
  positions.append((x,y,i,label));x+=span
 top=y+25;out=Image.new('RGB',(width,canvas.height+top),'white');out.paste(canvas,(0,top));d=ImageDraw.Draw(out)
 d.text((3,3),f'{row["role"]} p{p} {w}',font=REVIEW.FONT,fill='black')
 for x,y,i,label in positions:
  d.rectangle((x,y+4,x+8,y+12),fill=PAL[i%len(PAL)]);d.text((x+11,y),label,font=REVIEW.ARABIC_FONT,fill='black')
 return out

def trial(pattern):
 flags=read(OUT/'kept.json') if (OUT/'kept.json').exists() else []
 dev=[r for r in read(OUT/'dev-failures.json') if DEVPATTERN.get(pattern,pattern) in r['patterns']]
 reg=read(OUT/'regression120.json');ids={r['wid'] for r in reg}
 args=[(r['page'],r['wid'],flags,FLAGS[pattern],'regression') for r in reg]
 args +=[(r['page'],r['wid'],flags,FLAGS[pattern],'dev') for r in dev if r['wid'] not in ids]
 with mp.Pool(7) as pool:rows=list(pool.imap(job,args))
 folder=OUT/f'pattern-{pattern}';folder.mkdir(exist_ok=True)
 atomic(folder/'comparison.json',dict(pattern=pattern,keptBefore=flags,candidate=FLAGS[pattern],rows=rows))
 changed=[r for r in rows if r['changed']]
 # Inspect all changed regressions. Select dev cases with current 1b failures
 # first, then newly rescued geometry errors, then older failures. No unseen
 # automatic change is counted as a visual repair.
 latest={r['wid']:r for r in REVIEW.decisions()}
 def rank(r):
  if r['role']=='regression':return (0,r['page'],r['wid'])
  if latest.get(r['wid'],{}).get('verdict') in ('wrong','unsure'):return (1,r['page'],r['wid'])
  if not r['beforeValid'] and r['afterValid']:return (2,r['page'],r['wid'])
  return (3,r['page'],r['wid'])
 changed.sort(key=rank)
 nr=sum(r['role']=='regression' for r in changed)
 selected=changed[:max(24, ((nr+23)//24)*24 + (24 if nr and nr % 24 == 0 else 0))]
 metadata([(r['page'],r['wid']) for r in selected])
 manifest=[]
 for start in range(0,len(selected),24):
  batch=selected[start:start+24];tiles=[tile(r,flags+[FLAGS[pattern]]) for r in batch]
  cw=max(t.width for t in tiles);ch=max(t.height for t in tiles)
  img=Image.new('RGB',(cw*4,ch*((len(tiles)+3)//4)),'white')
  for i,t in enumerate(tiles):img.paste(t,((i%4)*cw,(i//4)*ch))
  path=folder/f'changed-{start//24+1:03}.png';img.save(path)
  manifest.append(dict(image=str(path.relative_to(R.ROOT)),sha256=R.sha(path),rows=batch))
 atomic(folder/'manifest.json',manifest)
 print(json.dumps(dict(pattern=pattern,run=len(rows),changed=len(changed),changedRegression=nr,sheets=len(manifest),selected=[(r['wid'],r['role']) for r in selected])))

if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('pattern');x=a.parse_args().pattern;trial(int(x) if x.isdigit() else x)
