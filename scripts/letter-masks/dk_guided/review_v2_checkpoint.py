"""Independent Checkpoint 1b sampling, image evidence and explicit verdicts."""
import json,hashlib,random,argparse,subprocess,tempfile
from datetime import datetime,timezone
from collections import Counter
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
import run_v2 as R
from sheet import PAL
G=R.G;ROOT=R.ROOT;HERE=R.HERE;OUT=R.OUT;BARS=R.BARS;atomic=R.atomic
FONT=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
ARABIC_FONT=ImageFont.truetype('/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf',18)
def metadata(items):
 path=OUT/'target-metadata.json';saved=read(path) if path.exists() else {};wanted={w for _,w in items}
 if not wanted<=set(saved):
  with tempfile.TemporaryDirectory() as tmp:
   dest=Path(tmp)/'units.json'
   subprocess.run(['node','--experimental-strip-types','scripts/letter-masks/dump_units.mts',*map(str,sorted({p for p,w in items if w not in saved})),'--out',str(dest)],cwd=ROOT,check=True,capture_output=True)
   for wid,w in read(dest).items():
    if wid in wanted:saved[wid]=w
  atomic(path,saved)
 return saved
def read(path):return json.loads(path.read_text())
def digest(w):return hashlib.sha256(R.V1.encode(dict(method=R.METHOD,tids=w['tids'],bars=w['bars']))).hexdigest()
def decisions():return [json.loads(l) for l in (OUT/'decisions.jsonl').read_text().splitlines()] if (OUT/'decisions.jsonl').exists() else []
def tile(p,wid):
 data=read(BARS/f'p{p}.json')['words'][wid];res=G.label_print(p,wid)
 try:
  rebuilt,metrics=R.convert(res,data['tids']);assert rebuilt['bars']==data['bars'],'Rendered bars differ from saved output'
 except ValueError as e:assert not data['bars'] and any(str(e) in c for c in data['checks'])
 raw=read(R.RAW/f'p{p}.json')['words'][wid]
 if 'labelSha256' in raw:assert R.label_digest(res)==raw['labelSha256'],'Labels differ from saved generation'
 w,box,alpha=G.art_word(p,wid);assert tuple(box)==tuple(res['box']);H,W=alpha.shape
 im=np.full((H,W,3),255.,float);im[alpha>90]=30
 for k,t in enumerate(data['tids']):
  m=res['labels']==res['tids'].index(t)+1;im[m]=.7*im[m]+.3*np.array(PAL[k%len(PAL)])
 canvas=Image.new('RGB',(W,H+18),'white');canvas.paste(Image.fromarray(im.astype('uint8')));d=ImageDraw.Draw(canvas)
 for k,b in enumerate(data['bars']):
  if b:d.line((b[0]-box[0],H+8,b[1]-box[0]-1,H+8),fill=PAL[k%len(PAL)],width=3)
 canvas=canvas.resize((W*3,(H+18)*3));units=metadata([[p,wid]])[wid]['units'];assert [u['tid'] for u in units]==data['tids']
 legend=[f'{i+1}: {u["show"]}' for i,u in enumerate(units)];width=max(canvas.width,400)
 positions=[];x=3;y=27
 for i,label in enumerate(legend):
  span=max(60,int(ARABIC_FONT.getlength(label))+18)
  if x+span>width:x=3;y+=22
  positions.append((x,y,i,label));x+=span
 top=y+25;out=Image.new('RGB',(width,canvas.height+top),'white');out.paste(canvas,(0,top));draw=ImageDraw.Draw(out)
 prefix=f'p{p} {wid} '
 draw.text((3,3),prefix,font=FONT,fill='black');draw.text((5+int(FONT.getlength(prefix)),0),w['text'],font=ARABIC_FONT,fill='black')
 for x,y,i,label in positions:
  draw.rectangle((x,y+4,x+8,y+12),fill=PAL[i%len(PAL)]);draw.text((x+11,y),label,font=ARABIC_FONT,fill='black')
 return out

def prepare():
 index=read(BARS/'index.json');assert index['method']==R.METHOD and index['pages']==list(range(1,605))
 target=OUT/'sample.json'
 if target.exists():return read(target)
 prior=[json.loads(l) for l in (HERE/'review/decisions.jsonl').read_text().splitlines()];old={r['wid']:r for r in prior}
 original=read(HERE/'review/sample.json')['random-ok'];recheck=[case for case in original if old[case[1]]['verdict']!='ok'];assert len(recheck)==89
 excluded=set(read(HERE/'review/sample-provenance.json')['excludedIds'])|set(old)
 earlier_visual=OUT/'prior-visual-reviewed-ids.json'
 if earlier_visual.exists():excluded.update(read(earlier_visual)['words'])
 for f in (HERE/'review-v2').glob('*.json'):excluded.update(row[1] for row in read(f))
 eligible=[]
 for p in range(1,605):
  for wid,w in sorted(read(BARS/f'p{p}.json')['words'].items()):
   if p>2 and w['status']=='ok' and wid not in excluded:eligible.append([p,wid])
 sample=dict(recheck89=recheck,fresh300=random.Random(20261112).sample(eligible,300))
 atomic(OUT/'eligible.json',eligible);atomic(OUT/'excluded.json',sorted(excluded));atomic(OUT/'frozen-index.json',index)
 snapshots={}
 for p,wid in recheck+sample['fresh300']:snapshots[wid]=dict(page=p,**read(BARS/f'p{p}.json')['words'][wid])
 atomic(OUT/'frozen-predictions.json',snapshots)
 atomic(OUT/'sample-provenance.json',dict(seed=20261112,eligibleWords=len(eligible),excludedWords=len(excluded),v1Commit=R.BASE,barsRuleSha256=R.sha(HERE/'bars_v2.py'),labelSourceSha256=R.sha(HERE/'dkguide.py'),sampleSha256=hashlib.sha256(R.V1.encode(sample)).hexdigest(),priorVisualIdsSha256=R.sha(earlier_visual) if earlier_visual.exists() else None,samplingNote='Fresh excludes all earlier recorded DK reviews, prior pilot/owner/approved exclusions, Claude review-v2 examples and the conservative earlier visual-border annotation/audit ID union. The 89 are diagnostic reuse, never fresh accuracy.'))
 # The sample file is the completion marker for this atomic-file bundle.
 atomic(target,sample)
 return sample

def sheets(phase):
 sample=prepare();allitems=sample['recheck89' if phase=='recheck' else 'fresh300']
 if phase=='fresh-first100':items=allitems[:100];offset=0
 elif phase=='fresh-rest':
  ds={r['wid']:r for r in decisions()};assert all(w in ds for _,w in allitems[:100]),'Review first 100 before continuing'
  assert sum(ds[w]['verdict']=='ok' for _,w in allitems[:100])>=90,'Early stop: first 100 below 90%'
  items=allitems[100:];offset=100
 else:items=allitems;offset=0
 metadata(items)
 manifest=read(OUT/'manifest.json') if (OUT/'manifest.json').exists() else []
 for start in range(0,len(items),24):
  batch=items[start:start+24];path=OUT/f'{phase}-{start//24+1:03}.png';known=next((e for e in manifest if e['image']==str(path.relative_to(ROOT))),None)
  if known:
   assert known['words']==batch and R.sha(path)==known['sha256'];continue
  tiles=[tile(p,wid) for p,wid in batch];cw=max(t.width for t in tiles);ch=max(t.height for t in tiles)
  out=Image.new('RGB',(cw*4,ch*((len(tiles)+3)//4)),'white')
  for j,t in enumerate(tiles):out.paste(t,((j%4)*cw,(j//4)*ch))
  if path.exists():
   with Image.open(path) as previous:assert previous.size==out.size and previous.convert('RGB').tobytes()==out.tobytes()
  else:out.save(path)
  manifest.append(dict(phase=phase,start=offset+start,image=str(path.relative_to(ROOT)),words=batch,sha256=R.sha(path)))
  atomic(OUT/'manifest.json',manifest)
  print(path.name,len(batch),flush=True)

def record(image,rows):
 entry=next(e for e in read(OUT/'manifest.json') if e['image']==image);assert [[r['page'],r['wid']] for r in rows]==entry['words']
 assert R.sha(ROOT/image)==entry['sha256'];old={r['wid'] for r in decisions()};digests={};labels={}
 for r in rows:
  assert r['wid'] not in old and r['verdict'] in ('ok','wrong','unsure');assert r['verdict']=='ok' or r.get('note')
  assert 'overlap' not in r.get('note','').lower(),'Non-overlapping v2 bars require a specific remaining uncertainty'
  w=read(BARS/f'p{r["page"]}.json')['words'][r['wid']];digests[r['wid']]=digest(w);labels[r['wid']]=read(R.RAW/f'p{r["page"]}.json')['words'][r['wid']].get('labelSha256')
 event=dict(event='actually-viewed',observer='cloud-root-dk-checkpoint1b',at=datetime.now(timezone.utc).isoformat(),phase=entry['phase'],image=image,sha256=entry['sha256'],words=entry['words'],predictionDigests=digests,labelDigests=labels)
 with (OUT/'audit.jsonl').open('a') as f:f.write(json.dumps(event)+'\n')
 with (OUT/'decisions.jsonl').open('a') as f:
  for r in rows:f.write(json.dumps(r,ensure_ascii=False)+'\n')
 atomic(OUT/'progress.json',dict(phase='actual-visual-review',reviewed=len(old)+len(rows),counts=dict(Counter(r['verdict'] for r in decisions())),tokensUsed=None,tokensPer100ReviewedWords=None))

if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('phase',choices=['prepare','recheck','fresh-first100','fresh-rest']);args=a.parse_args()
 if args.phase=='prepare':prepare()
 else:sheets(args.phase)
