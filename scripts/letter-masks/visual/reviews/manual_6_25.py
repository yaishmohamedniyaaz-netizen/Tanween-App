"""Manual visual-work session helpers. No automatic interior decisions.

Every `viewed`/`accept` call must follow actual tool image inspection.
"""
import sys,importlib.util,json,math,hashlib
from pathlib import Path
from PIL import Image
RANK=int(sys.argv[1]); V=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('pilot_helpers',V/'blind/pilot_workflow.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
H=p.HERE;M=p.read(H/'manifest.json');ROOT=p.ROOT
def append(path,d):
 path.parent.mkdir(exist_ok=True)
 with path.open('a',encoding='utf8') as f:f.write(json.dumps(d,ensure_ascii=False)+'\n')
def viewed(s):
 path=H/s['image'];append(V/f'audit/rank{RANK:03}.jsonl',{'event':'visually-reviewed','image':path.relative_to(ROOT).as_posix(),'words':s['words'],'stage':s.get('stage','original'),'observer':'visual_6_35','at':p.now(),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
def render(D,name,large=True):
 ids=list(D);n=6 if large else 25;tw,th=(1000,590) if large else (520,300);cols=2 if large else 5;sheets=[]
 for start in range(0,len(ids),n):
  batch=ids[start:start+n];im=Image.new('RGB',(cols*tw,math.ceil(n/cols)*th),'#eee')
  for i,wid in enumerate(batch):im.paste(p.tile(M['words'][wid],D[wid].get('x'),large),((i%cols)*tw,(i//cols)*th))
  path=H/f'{name}-{start//n+1:03}.png';assert not path.exists();im.save(path);sheets.append({'image':path.name,'words':batch,'stage':name})
 p.write(H/f'{name}-sheets.json',sheets);p.write(H/f'{name}-draft.json',D)
def accept(name,indexes,skip=()):
 D=p.read(H/f'{name}-draft.json');S=p.read(H/f'{name}-sheets.json');A=p.final_records();path=V/f'annotations/rank{RANK:03}.jsonl'
 for i in indexes:
  s=S[i-1];viewed(s)
  for wid in s['words']:
   if wid in skip:continue
   d=D[wid];d['note']=d['note'].replace('destination requires sheet review.','destination visually checked in '+s['image']+'.')
   if wid in A and A[wid]!=d:append(H/'superseded-annotations.jsonl',{'supersededAt':p.now(),**A[wid]})
   A[wid]=d
 path.parent.mkdir(exist_ok=True);path.write_text(''.join(json.dumps(d,ensure_ascii=False)+'\n' for d in A.values()),encoding='utf8');print('Accepted unique',len(A),flush=True)
def transfer(name):
 A=p.final_records();D={}
 for c in M['clusters']:
  rid=c['representative']['wid']
  if rid not in A:continue
  r=A[rid];src=M['words'][rid]
  for wid in c['memberIds']:
   if wid in A:continue
   w=M['words'][wid];xs=p.ends(w) if len(w['units'])==1 else p.warp(src,w,r['x'][1:-1])
   D[wid]={'wid':wid,'page':w['page'],'x':xs,'confidence':r['confidence'],'source':'visual-copy','cluster':c['id'],'note':f'Carried from visually decided {rid}; destination requires sheet review.'}
 render(D,name,False);print('Draft carries',len(D),flush=True)
