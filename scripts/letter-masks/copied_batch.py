"""Spot-check batch: random words whose borders were copied (border_copy.py).

Usage: python3 copied_batch.py copy-all.json OUT.json [count=30] [seed=20261106]
Each word starts from its copied borders (startCuts). The owner's edits show
how good copying is in real use.
"""
import json, random, sys, collections
from export_review import export
copied = json.load(open(sys.argv[1])); out = sys.argv[2]
n = int(sys.argv[3]) if len(sys.argv) > 3 else 30
rng = random.Random(int(sys.argv[4]) if len(sys.argv) > 4 else 20261106)
pick = rng.sample(sorted(copied), min(n, len(copied)))
by_page = collections.defaultdict(set)
for wid in pick: by_page[copied[wid]['page']].add(wid)
words = []
for p in sorted(by_page):
    for w in export(p):
        if w['wid'] in by_page[p]:
            c = copied[w['wid']]
            assert c['box'] == w['box']
            w['batch'] = 'copied'; w['copiedCuts'] = c['cuts']; w['copySource'] = c['source']; words.append(w)
json.dump(dict(version=1, source='1405-artwork-5a5f9f3846158475', pages=sorted(by_page), words=words), open(out, 'w'))
print(len(words), 'words from', len(by_page), 'pages')
