"""One guarded v2 continuation monitor; generation/preparation only, no verdicts."""
import json,time,fcntl,importlib
from pathlib import Path
from datetime import datetime,timezone
import run_v2 as R
import review_v2_checkpoint as C
import validate_v2_checkpoint as V

def main():
 lock=Path('/tmp/dk-checkpoint1b-monitor.lock').open('w')
 fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 while True:
  pages=[];last=None
  for rp in R.RAW.glob('p*.json'):
   p=int(rp.stem[1:]);bp=R.BARS/rp.name
   if bp.exists() and C.read(bp)['method']==R.METHOD:
    pages.append(p)
    if last is None or bp.stat().st_mtime>last[0]:last=(bp.stat().st_mtime,p)
  now=datetime.now(timezone.utc).isoformat()
  R.atomic(R.OUT/'progress.json',dict(phase='v2-generation',pagesDone=sorted(pages),mostRecentPage=last[1] if last else None,updatedAt=now,tokensUsed=None))
  print(now,len(pages),'/604; latest page',last[1] if last else None,flush=True)
  if len(pages)==604:break
  time.sleep(50)
 # Preparation may be hardened while the unchanged computer-only runner works.
 importlib.reload(C);importlib.reload(V)
 R.finalize();V.main();C.prepare();C.sheets('recheck');C.sheets('fresh-first100')
 print('READY FOR ACTUAL REVIEW: 89 diagnostic words, then first 100 fresh words. No verdicts inferred.',flush=True)
if __name__=='__main__':main()
