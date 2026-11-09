"""Summarize existing manual exception notes; never infer image verdicts."""
import json,re
from collections import Counter
from run_all import HERE,atomic

RULES=[
 ('Overlapping or stacked extents cannot be resolved',r'overlap|stack|crossing|crossed'),
 ('Lam stem or body absorbed; underline becomes an endpoint',r'\blam\b'),
 ('Alif stem merged, displaced or without a separate bar',r'\balif\b'),
 ('Wrong body receives a displaced span',r'displac|wrong body|another body|following body|next body|swapp|shift'),
 ('A curve is truncated or absorbed into another target',r'curve|tail|loop|bowl'),
 ('Initial connected tooth reduced to an endpoint',r'initial (?:ta|ya|ba)|\bfa\b'),
 ('Waw ownership or bar fails',r'\bwaw\b'),
 ('Mim loses its separate body span',r'\bmim\b'),
 ('Ra ownership or bar fails',r'\bra\b'),
 ('Target has detached ink or marks instead of its body',r'mark|detached|dot'),
 ('Unspecified initial target missing or displaced',r'initial target'),
 ('Bar bridges a disconnected gap',r'gap|disconnected')]

def main():
 rows=[json.loads(l) for l in (HERE/'review/decisions.jsonl').read_text().splitlines()]
 events=[json.loads(l) for l in (HERE/'review/audit.jsonl').read_text().splitlines()]
 images={wid:e['image'] for e in events for _,wid in e['words']};out=[]
 for label,pattern in RULES:
  matched=[r for r in rows if r['verdict']!='ok' and re.search(pattern,r['note'],re.I)]
  if not matched:continue
  preferred='unsure' if label==RULES[0][0] else 'wrong'
  example=next((r for r in matched if r['verdict']==preferred),matched[0])
  out.append(dict(pattern=label,taggedWords=len(matched),verdicts=dict(Counter(r['verdict'] for r in matched)),example=dict(page=example['page'],wid=example['wid'],verdict=example['verdict'],note=example['note'],image=images[example['wid']])))
 out.sort(key=lambda r:(-r['taggedWords'],r['pattern']))
 atomic(HERE/'failure-patterns.json',dict(scope=f'{len(rows)} unique actual image reviews; overlapping note tags, not an exhaustive anatomical census or accuracy estimate',method='Case-insensitive keyword tagging of existing manual exception notes; no new visual verdicts inferred',rules=[dict(pattern=a,noteRegex=b) for a,b in RULES],top10=out[:10],otherTags=out[10:]))
if __name__=='__main__':main()
