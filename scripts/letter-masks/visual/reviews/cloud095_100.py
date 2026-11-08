"""Manual observer utilities; coordinates always supplied after actual image views."""
import sys,json,hashlib,math
from pathlib import Path
import manual_6_25 as w
p=w.p;H=w.H;M=w.M;V=w.V

def viewed(s):
 path=H/s['image']
 w.append(V/f'audit/rank{w.RANK:03}.jsonl',{'event':'visually-reviewed','image':path.relative_to(w.ROOT).as_posix(),'words':s['words'],'stage':s.get('stage','original'),'observer':'cloud-ranks095_100','at':p.now(),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
w.viewed=viewed

def set_manual(values,name):
 D={}
 for c in M['clusters']:
  n=str(int(c['id'].split('-c')[-1]))
  if n not in values:continue
  inner,conf=values[n][:2];wid=c['representative']['wid'];word=M['words'][wid]
  r,l=values[n][3] if len(values[n])>3 else p.ends(word);xs=[r,*inner,l]
  assert len(xs)==len(word['units'])+1 and all(a-b>=2 for a,b in zip(xs,xs[1:])),(wid,xs)
  assert xs[0]<=math.floor(word['body'][2]) and xs[-1]>=math.ceil(word['body'][0])
  note=values[n][2] if len(values[n])>2 else 'Manual body divisions from actually viewed original ruler image; exact app targets retained, with marks following carriers.'
  d={'wid':wid,'page':word['page'],'x':xs,'confidence':conf,'source':'visual','cluster':c['id'],'note':note}
  if conf=='low':d.update(reviewFlags=['clipped-ink'],note=note+' Visible carrier or attached mark clipped by immutable crop; kept inside box for owner review.')
  D[wid]=d
 w.render(D,name)

if __name__=='__main__':
 action=sys.argv[2]
 if action=='set':set_manual(p.read(sys.argv[3]),sys.argv[4])
 elif action=='accept':w.accept(sys.argv[3],[int(n) for n in sys.argv[4:]])
 elif action=='accept-skip':w.accept(sys.argv[3],[int(n) for n in sys.argv[5:]],skip=sys.argv[4].split(','))
 elif action=='view':
  for manifest in sys.argv[3:]:
   for s in p.read(H/manifest):viewed(s)
 elif action=='transfer':w.transfer(sys.argv[3])
