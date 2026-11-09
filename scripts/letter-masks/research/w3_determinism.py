"""Record/compare a complete fresh W3 run; elapsed-time fields are excluded.
Use --record after run one, then no arguments after run two.
"""
from pathlib import Path
import argparse,hashlib,json
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2];CACHE=ROOT/'tmp/letter-positions/w3'
p=argparse.ArgumentParser();p.add_argument('--record',action='store_true');args=p.parse_args()
files=list(CACHE.glob('*.pt'))+list((ROOT/'scripts/letter-masks/contact').glob('w3-*.png'))+[HERE/f for f in ['w3_predictions.json','w3_geometry_predictions.json','w3_synthetic-sequence_predictions.json','w3_shared_metrics.json','w3_synthetic_audit.json']]
manifest={str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(files)}
for name in ['w3_metrics.json','w3_synthetic_metrics.json']:
    d=json.loads((HERE/name).read_text());d.pop('seconds',None)
    manifest[name+'#without-seconds']=hashlib.sha256(json.dumps(d,sort_keys=True).encode()).hexdigest()
base=CACHE/'first-run-hashes.json'
if args.record:
    base.write_text(json.dumps(manifest,indent=2)+'\n');print('Recorded',len(manifest),'fresh first-run artifact hashes')
else:
    old=json.loads(base.read_text());differences=[k for k in sorted(set(old)|set(manifest)) if old.get(k)!=manifest.get(k)]
    result={'status':'pass' if not differences else 'fail','scope':'two fresh reconstruction executions; not old file recovery','artifactsCompared':len(manifest),'differentArtifacts':differences,'hashes':manifest}
    (HERE/'w3_determinism.json').write_text(json.dumps(result,indent=2)+'\n');print(result['status'],len(manifest),'artifacts',differences)
    if differences:raise SystemExit(1)
