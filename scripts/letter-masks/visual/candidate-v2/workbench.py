"""Isolated candidate review renderer/validator. Never infers annotation cuts."""
import argparse,hashlib,json,math,sys,subprocess
from pathlib import Path
from datetime import datetime,timezone
from collections import Counter
import numpy as np
from PIL import Image,ImageDraw
HERE=Path(__file__).resolve().parent;VIS=HERE.parent;ROOT=VIS.parents[2]
sys.path.insert(0,str(VIS))
from font_support import load_font
import style_render
BASE='0c7a7fa5dba20b46dc120825e6e24b999ad11eee'
ART=ROOT/'public/mushaf/1405-artwork-5a5f9f3846158475'
FONT=load_font(20);SMALL=load_font(16)
def read(p):return json.loads(p.read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def digest(obj):return hashlib.sha256(json.dumps(obj,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def save(p,obj):
 p.parent.mkdir(parents=True,exist_ok=True)
 with p.open('x') as f:json.dump(obj,f,ensure_ascii=False,indent=2);f.write('\n')
def records(p):return [json.loads(s) for s in p.read_text().splitlines() if s.strip()] if p.exists() else []
def setup():
 g=read(VIS/'groups.json');before={d['wid']:d for d in records(VIS/'decisions.jsonl')}
 # ID-only inventory: never use approval coordinates to select/calculate cuts.
 exposed=set()
 for p in (ROOT/'public/letter-borders').glob('p*.json'):exposed.update(read(p)['words'].keys())
 selected=[];words={};clusters=[]
 for rank in [17,54,82,86]:
  spelling,s=next((k,v) for k,v in g['spellings'].items() if v['rank']==rank)
  eligible=[]
  for c in s['clusters']:
   ids=[i for i in c['memberIds'] if i in before and i not in exposed]
   if len(ids)<3:continue
   rep=c['representative']['wid'];rep=rep if rep in ids else ids[0]
   box=g['words'][rep]['body'];aspect=(box[2]-box[0])/(box[3]-box[1]);eligible.append((aspect,c['id'],c,rep,ids))
  eligible.sort(key=lambda x:(x[0],x[1]));chosen=[eligible[0],eligible[-1]]
  for variant,entry in zip(['compact','extended'],chosen):
   aspect,_,c,rep,ids=entry;batch=[rep]+sorted([i for i in ids if i!=rep],key=lambda i:(g['words'][i]['page'],i))[:2]
   clusters.append(dict(rank=rank,spelling=spelling,id=c['id'],variant=variant,representative=rep,selectedIds=batch,eligibleMembers=len(ids),aspect=aspect))
   for wid in batch:
    selected.append(wid);words[wid]=dict(g['words'][wid],wid=wid,rank=rank,cluster=c['id'],role='representative' if wid==rep else 'member',variant=variant,units=[dict(u,tid=f'{wid}@r{u["start"]}') for u in s['unitVariants'][c['unitVariant']]])
 assert len(selected)==len(set(selected))==24
 save(HERE/'selection.json',dict(baseCommit=BASE,selectionRule='Four fixed pilot ranks; compact/extended aspect extremes among clusters with >=3 decided non-approved members. Representative plus first two members by page/id. This is targeted owner review, not a random accuracy sample or blind holdout.',words=words,order=selected,clusters=clusters,excludedApprovedIds=sorted(exposed)))
 save(HERE/'before.json',{i:before[i] for i in selected})
 paths=[VIS/'decisions.jsonl',VIS/'blind/decisions.jsonl',VIS/'checkpoint-a-test.json',VIS/'checkpoint-a-audit.json',VIS/'groups.json',VIS/'progress.json']
 save(HERE/'checkpoint-a-preservation.json',{str(p.relative_to(ROOT)):sha(p) for p in paths})
 style_render.OUT=HERE;style_render.render_gdi_labels([dict(key=f'{wid}-{i}',text=u['show']) for wid in selected for i,u in enumerate(words[wid]['units'])])
 print(json.dumps(clusters,ensure_ascii=False,indent=2))
def tile(wid,decision=None,title='Original',context=True):
 w=read(HERE/'selection.json')['words'][wid];b=list(map(round,w['body']));x0,y0,x1,y1=b
 pad=16;cb=(max(0,x0-pad),max(0,y0-pad),x1+pad,y1+pad)
 gray=Image.open(ART/f'p{w["page"]}.png').convert('L').crop(cb)
 scale=min(310/gray.height,820/gray.width);im=gray.resize((round(gray.width*scale),round(gray.height*scale)),Image.Resampling.LANCZOS)
 W,H=900,580;canvas=Image.new('RGB',(W,H),'white');draw=ImageDraw.Draw(canvas);ox=(W-im.width)//2;oy=65
 if decision:
  bg=Image.new('RGB',im.size,'white');d=ImageDraw.Draw(bg)
  for i,(r,l) in enumerate(zip(decision['x'],decision['x'][1:])):
   d.rectangle((round((l-cb[0])*scale),round((y0-cb[1])*scale),round((r-cb[0])*scale),round((y1-cb[1])*scale)),fill=(228,240,253) if i%2==0 else (253,239,220))
  im=Image.fromarray((np.asarray(im)[:,:,None]/255*np.asarray(bg)).astype('uint8'))
 else:im=im.convert('RGB')
 canvas.paste(im,(ox,oy));coord=lambda x:ox+round((x-cb[0])*scale)
 draw.rectangle((coord(x0),oy+round((y0-cb[1])*scale),coord(x1),oy+round((y1-cb[1])*scale)),outline='#ba5151',width=1)
 draw.text((12,7),f'{title} | {wid} p{w["page"]} rank{w["rank"]:03} {w["variant"]} {w["role"]}',font=FONT,fill='black')
 draw.text((12,33),'Red = immutable box; surrounding ink retained for clipping review',font=SMALL,fill='#555555')
 ry=oy+im.height+4;draw.line((ox,ry,ox+im.width,ry),fill='#555555')
 for x in range(math.ceil(cb[0]/5)*5,cb[2]+1,5):
  xx=coord(x);draw.line((xx,ry,xx,ry+(9 if x%20==0 else 4)),fill='black')
  if x%20==0:draw.text((xx,ry+10),str(x),font=SMALL,fill='black',anchor='mt')
 if decision:
  for x in decision['x']:draw.line((coord(x),oy+round((y0-cb[1])*scale),coord(x),oy+round((y1-cb[1])*scale)),fill='#56708c')
  for i,(r,l) in enumerate(zip(decision['x'],decision['x'][1:])):
   mid=(r+l)/2;half=.2*(r-l);draw.line((coord(mid-half),425,coord(mid+half),425),fill='#17633a',width=6);draw.text((coord(mid),410),str(i+1),font=SMALL,fill='#17633a',anchor='mm')
  draw.text((12,550),f"x={decision['x']} | confidence={decision['confidence']}",font=SMALL,fill='#444444')
 for i,u in enumerate(w['units']):
  cx=840-(i+.5)*780/len(w['units']);label=Image.open(HERE/'labels'/f'{wid}-{i}.png').convert('RGB').resize((112,62));canvas.paste(label,(round(cx-56),452));draw.text((cx,530),f'{i+1} '+u['primary'],font=SMALL,fill='black',anchor='mm')
 return canvas

def render(stage,draft=None):
 sel=read(HERE/'selection.json');ds=read(HERE/draft) if draft else None;entries=[]
 for start in range(0,24,4):
  ids=sel['order'][start:start+4];canvas=Image.new('RGB',(1800,1160),'#eeeeee')
  for i,wid in enumerate(ids):canvas.paste(tile(wid,ds[wid] if ds else None,stage),((i%2)*900,(i//2)*580))
  path=HERE/'images'/f'{stage}-{start//4+1:02}.png';path.parent.mkdir(exist_ok=True)
  with path.open('xb') as f:canvas.save(f,format='PNG')
  entries.append(dict(image=str(path.relative_to(ROOT)),words=ids,phase=stage,sha256=sha(path),decisionDigests={wid:digest(ds[wid]) for wid in ids} if ds else {}))
 save(HERE/f'{stage}-manifest.json',entries)

def audit(stage,nums):
 entries=read(HERE/f'{stage}-manifest.json')
 with (HERE/'audit.jsonl').open('a') as f:
  for n in nums:
   e=entries[n-1];assert sha(ROOT/e['image'])==e['sha256'];f.write(json.dumps(dict(e,event='visually-reviewed',observer='cloud-root-improvement-20261108',at=datetime.now(timezone.utc).isoformat(),note='Recorded only after actual tool image view and inspection of all named words.'),ensure_ascii=False)+'\n')

def validate(ds,sel=None,events=None):
 sel=sel or read(HERE/'selection.json');events=events if events is not None else records(HERE/'audit.jsonl')
 if set(ds)!=set(sel['words']):raise ValueError('Require exactly the frozen24 selected candidate IDs')
 for path,expected in read(HERE/'checkpoint-a-preservation.json').items():
  if sha(ROOT/path)!=expected:raise ValueError('Checkpoint A changed: '+path)
 for path,expected in read(HERE/'candidate-input-freeze.json').items():
  if sha(ROOT/path)!=expected:raise ValueError('Candidate input changed: '+path)
 for e in events:
  if not all(e.get(k) for k in ['event','observer','phase','at','image','words','sha256']):raise ValueError('Incomplete audit provenance')
  if sha(ROOT/e['image'])!=e['sha256']:raise ValueError('Audit image changed')
 for wid,d in ds.items():
  w=sel['words'][wid];xs=d['x'];flags=d.get('reviewFlags',[])
  if d.get('wid')!=wid or d.get('page')!=w['page'] or d.get('cluster')!=w['cluster'] or d.get('source')!='visual':raise ValueError('Candidate identity/source mismatch: '+wid)
  if len(xs)!=len(w['units'])+1 or not all(type(x) is int for x in xs) or any(r-l<2 for r,l in zip(xs,xs[1:])):raise ValueError('Invalid target geometry: '+wid)
  if xs[-1]<math.ceil(w['body'][0]) or xs[0]>math.floor(w['body'][2]):raise ValueError('Outside immutable box: '+wid)
  if d['confidence'] not in ['medium','low']:raise ValueError('Uncalibrated high confidence prohibited')
  if ('clipped-ink' in flags or 'stacked-overlap' in flags) and d['confidence']!='low':raise ValueError('Clipping/stacking requires low')
  if d['clipping']['kind'] not in ['none-observed','mark-tip','body-partial']:raise ValueError('Missing clipping distinction')
  if (d['clipping']['kind']!='none-observed')!=('clipped-ink' in flags):raise ValueError('Clipping flag mismatch')
  if not d.get('bodyReason') or not d.get('confidenceBasis'):raise ValueError('Missing manual visual rationale')
  if not any(e['event']=='visually-reviewed' and e['phase']=='original' and wid in e['words'] for e in events):raise ValueError('Missing original review: '+wid)
  if not any(e['event']=='visually-reviewed' and e['phase'].startswith('candidate-v') and wid in e['words'] and e.get('decisionDigests',{}).get(wid)==digest(d) for e in events):raise ValueError('Missing matching candidate review: '+wid)
 return dict(words=len(ds),confidence=dict(Counter(d['confidence'] for d in ds.values())),clipping=dict(Counter(d['clipping']['kind'] for d in ds.values())),changed=sum(d['x']!=read(HERE/'before.json')[wid]['x'] for wid,d in ds.items()))

def accept():
 ds=read(HERE/'draft-final.json');result=validate(ds);save(HERE/'candidate-decisions.json',ds)
 with (HERE/'candidate-decisions.jsonl').open('x') as f:
  for d in ds.values():f.write(json.dumps(d,ensure_ascii=False)+'\n')
 sel=read(HERE/'selection.json');pages={}
 for wid,d in ds.items():
  w=sel['words'][wid];pages.setdefault(w['page'],{})[wid]=dict(tids=[u['tid'] for u in w['units']],x=d['x'],confidence=d['confidence'],source=d['source'],reviewFlags=d['reviewFlags'])
 for page,words in pages.items():save(HERE/'candidate-guesses'/f'p{page}.json',dict(page=page,ruleVersion='qpc-hafs-v1-targets-4.0.0',method='visual-v2-candidate',ownerApproved=False,words=words))
 save(HERE/'validation.json',result);print(json.dumps(result))
if __name__=='__main__':
 cmd=sys.argv[1]
 if cmd=='setup':setup()
 elif cmd=='render':render(sys.argv[2],sys.argv[3] if len(sys.argv)>3 else None)
 elif cmd=='viewed':audit(sys.argv[2],list(map(int,sys.argv[3:])))
 elif cmd=='accept':accept()
