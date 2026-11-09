"""Wait for atomic page outputs, then finalize and prepare (not perform) visual review."""
import json,time,subprocess,sys
from datetime import datetime,timezone
from run_all import HERE,BARS,INK,RAW,atomic
progress=HERE/'review/progress.json'
def checked():
 p=HERE/'review/decisions.jsonl'
 return len({json.loads(line)['wid'] for line in p.read_text().splitlines() if line}) if p.exists() else 0
while True:
 pages=[p for p in range(1,605) if all((d/f'p{p}.json').exists() for d in (BARS,RAW))]
 words=sum(len(json.loads((BARS/f'p{p}.json').read_text())['words']) for p in pages)
 atomic(progress,dict(phase='batch-running',checkpoint1Complete=False,pagesDone=pages,wordsGenerated=words,wordsChecked=checked(),tokensUsed=None,tokenMeasurement='Exact token telemetry unavailable; no measured rate claimed.',updatedAt=datetime.now(timezone.utc).isoformat()))
 print(len(pages),words,flush=True)
 if len(pages)==604:break
 time.sleep(45)
for command in [('run_all.py','--finalize'),('validate_batch.py',),('check_sheet.py',)]:
 subprocess.run([sys.executable,str(HERE/command[0]),*command[1:]],check=True)
samples=json.loads((HERE/'review/sample.json').read_text())
atomic(progress,dict(phase='awaiting-actual-image-review',checkpoint1Complete=False,pagesDone=pages,wordsGenerated=words,wordsChecked=checked(),randomSampleWords=len(samples['random-ok']),flaggedSampleWords=len(samples['review-p001-050']),tokensUsed=None,tokenMeasurement='Exact token telemetry unavailable.',updatedAt=datetime.now(timezone.utc).isoformat()))
print('READY FOR ACTUAL VISUAL REVIEW; no verdicts or accuracy claims generated.',flush=True)
