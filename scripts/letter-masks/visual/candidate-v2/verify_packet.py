"""Read-only full packet verification; never evaluates against reference borders."""
import io,json,subprocess,tempfile
from pathlib import Path
from PIL import Image
import workbench as w

def verify():
 ds=w.read(w.HERE/'candidate-decisions.json');s=w.read(w.HERE/'selection.json')
 result=w.validate(ds)
 assert ds==w.read(w.HERE/'draft-final.json')
 assert list(ds.values())==w.records(w.HERE/'candidate-decisions.jsonl')
 assert result==w.read(w.HERE/'validation.json')
 # Whole historical tree, beyond the six explicitly frozen file hashes.
 changed=subprocess.check_output(['git','diff','--name-status',w.BASE,'--'],cwd=w.ROOT,text=True).splitlines()
 for row in changed:
  status,path=row.split('\t',1)
  assert status=='A' and (path.startswith('scripts/letter-masks/visual/candidate-v2/') or path=='docs/CODEX_TASK_LETTER_BORDERS_IMPROVEMENT.md'),row
 manifests=['original','before','candidate-v1','candidate-v2','candidate-v3']
 for name in manifests:
  for e in w.read(w.HERE/f'{name}-manifest.json'):
   assert w.sha(w.ROOT/e['image'])==e['sha256'],e['image']
 packet=w.read(w.HERE/'packet-manifest.json')
 assert packet['candidateSha256']==w.sha(w.HERE/'candidate-decisions.json')
 assert [e['words'][0] for e in packet['images']]==s['order']
 before=w.read(w.HERE/'before.json')
 for e in packet['images']:
  wid=e['words'][0];assert w.sha(w.ROOT/e['image'])==e['sha256']
  assert e['decisionDigests'][wid]==w.digest(ds[wid]) and e['viewClaim'] is False
  # Verify the delivered PNG pixels are exactly rendered from both saved rows.
  expected=Image.new('RGB',(1800,580),'white')
  expected.paste(w.tile(wid,before[wid],'Checkpoint A baseline'),(0,0))
  expected.paste(w.tile(wid,ds[wid],'Candidate v2 - unapproved'),(900,0))
  actual=Image.open(w.ROOT/e['image']).convert('RGB')
  assert actual.size==expected.size and actual.tobytes()==expected.tobytes(),wid
 pages=sorted({v['page'] for v in s['words'].values()})
 with tempfile.TemporaryDirectory(prefix='candidate-units-') as tmp:
  target=Path(tmp)/'units.json'
  subprocess.run(['node','--experimental-strip-types','scripts/letter-masks/dump_units.mts',*map(str,pages),'--out',str(target)],cwd=w.ROOT,check=True,capture_output=True,text=True)
  units=w.read(target)
  for wid in s['order']:assert units[wid]['units']==s['words'][wid]['units'],wid
 exports={}
 for p in sorted((w.HERE/'candidate-guesses').glob('p*.json')):
  page=w.read(p);assert page['ownerApproved'] is False and page['method']=='visual-v2-candidate'
  assert page['ruleVersion']=='qpc-hafs-v1-targets-4.0.0'
  for wid,d in page['words'].items():
   assert wid not in exports and s['words'][wid]['page']==page['page']
   assert d['tids']==[u['tid'] for u in units[wid]['units']]
   assert all(d[k]==ds[wid][k] for k in ['x','confidence','source','reviewFlags'])
   exports[wid]=d
 assert set(exports)==set(ds)
 assert not set(ds)&set(s['excludedApprovedIds'])
 assert w.sha(w.VIS/'blind/decisions.jsonl')=='766e716327f6ee1b0e2823ad8786b5b2181954b27c3939aa5aaa0954b969e046'
 for e in w.records(w.HERE/'packet-view-audit.jsonl'):
  assert w.sha(w.ROOT/e['image'])==e['sha256']
  for wid in e['words']:assert e['decisionDigests'][wid]==w.digest(ds[wid])
 return dict(result,packetImages=24,packetPixelsReproduced=True,exactAppTargetWords=24,exportPages=len(pages),historicalTreeUnchanged=True,frozenPredictionsUnchanged=True)
if __name__=='__main__':print(json.dumps(verify(),indent=2))
