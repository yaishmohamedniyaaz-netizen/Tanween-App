"""Reproduce the 1b comparison packet from frozen predictions and actual verdicts."""
from collections import Counter
import json
import review_v2_checkpoint as C

def main():
 out=C.OUT;read=C.read;rows=C.decisions();ds={r['wid']:r for r in rows}
 sample=read(out/'sample.json');frozen=read(out/'frozen-predictions.json')
 events=[json.loads(line) for line in (out/'audit.jsonl').read_text().splitlines()]
 evidence={wid:dict(image=e['image'],sha256=e['sha256'],phase=e['phase'],observer=e['observer'],at=e['at']) for e in events for _,wid in e['words']}
 old=read(out/'recheck89-source.json')
 comparison=[dict(**r,newPrediction=frozen[r['wid']],newDecision=ds[r['wid']],newEvidence=evidence[r['wid']]) for r in old]
 C.atomic(out/'recheck89-comparison.json',dict(note='Diagnostic reuse of the historical 89; not fresh accuracy. Original v1 verdicts, geometry and images are preserved.',words=comparison))
 fresh={w for _,w in sample['fresh300']}
 # Counts describe literal review-note tags, not an independent anatomical census.
 patterns={
  'bar-short':'bar-short',
  'bar-placement':'bar-placement',
  'bar-long':'bar-long',
  'neighbour-body':'neighbour-body',
  'body-boundary':'body-boundary',
  'carrier-boundary-uncertain':'carrier',
 }
 groups={}
 for name,tag in patterns.items():
  matched=[r for r in rows if (r['verdict']=='unsure' if name=='carrier-boundary-uncertain' else r['verdict']!='ok') and tag in r['note']]
  groups[name]=dict(words=len(matched),freshWords=sum(r['wid'] in fresh for r in matched),examples=[dict(**r,**evidence[r['wid']]) for r in matched[:3]])
 labels={}
 for group,ids in [('fresh300',fresh),('recheck89',{w for _,w in sample['recheck89']})]:
  labels[group]=dict(Counter(r['verdict'] for r in rows if r['wid'] in ids and 'label-wrong' in r['note']))
 C.atomic(out/'failure-patterns.json',dict(note='Literal exception-note tags; categories may intersect and do not estimate whole-corpus frequencies. Label-wrong is a separate visual tag and does not automatically make a bar wrong. Verdict wording corrections are in review-note-errata.json.',patterns=groups,labelWrongByVerdict=labels))
 print(json.dumps(dict(patterns={k:dict(words=v['words'],freshWords=v['freshWords']) for k,v in groups.items()},labelWrongByVerdict=labels)))

if __name__=='__main__':main()
