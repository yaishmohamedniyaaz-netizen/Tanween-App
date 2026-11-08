"""Produce final before/after review images from accepted rows; never score or annotate."""
from collections import Counter
from datetime import datetime,timezone
from PIL import Image
import workbench as w

def main():
 target=w.HERE/'packet-manifest.json'
 if target.exists():raise SystemExit('Preserve existing evidence packet; do not overwrite it.')
 ds=w.read(w.HERE/'candidate-decisions.json');before=w.read(w.HERE/'before.json');s=w.read(w.HERE/'selection.json');w.validate(ds)
 images=[];rows=[];request=[]
 for wid in s['order']:
  canvas=Image.new('RGB',(1800,580),'white');canvas.paste(w.tile(wid,before[wid],'Checkpoint A baseline'),(0,0));canvas.paste(w.tile(wid,ds[wid],'Candidate v2 - unapproved'),(900,0))
  path=w.HERE/'images'/f'comparison-{wid}.png'
  with path.open('xb') as stream:canvas.save(stream,format='PNG')
  images.append(dict(image=str(path.relative_to(w.ROOT)),words=[wid],phase='final-owner-comparison-generated',sha256=w.sha(path),decisionDigests={wid:w.digest(ds[wid])},viewClaim=False))
  old=before[wid]['x'];new=ds[wid]['x'];widths=lambda xs:[r-l for r,l in zip(xs,xs[1:])]
  rows.append(dict(wid=wid,rank=s['words'][wid]['rank'],role=s['words'][wid]['role'],before=old,after=new,beforeWidths=widths(old),afterWidths=widths(new),maxBorderMovementSourcePx=max(abs(x-y) for x,y in zip(old,new)),beforeConfidence=before[wid]['confidence'],afterConfidence=ds[wid]['confidence'],clipping=ds[wid]['clipping']['kind'],changed=old!=new,image=str(path.relative_to(w.ROOT))))
  idx=s['order'].index(wid)//4;request.append(dict(wid=wid,page=s['words'][wid]['page'],units=s['words'][wid]['units'],originalImage=f'images/original-{idx+1:02}.png',status='awaiting-owner-reference',note='Unapproved targeted method-development case; not a random blind holdout. No reference border supplied.'))
 w.save(target,dict(createdAtUtc=datetime.now(timezone.utc).isoformat(),method='visual-v2-candidate',ownerApproved=False,scope='24 targeted existing-pilot words; no B/C expansion',candidateSha256=w.sha(w.HERE/'candidate-decisions.json'),images=images))
 w.save(w.HERE/'before-after-changes.json',dict(kind='Coordinate differences only; not accuracy metrics',rows=rows,beforeConfidence=dict(Counter(d['confidence'] for d in before.values())),afterConfidence=dict(Counter(d['confidence'] for d in ds.values()))))
 w.save(w.HERE/'owner-review-request.json',request)
 print('Generated24 final comparisons; no view claims added; no scoring.')
if __name__=='__main__':main()
