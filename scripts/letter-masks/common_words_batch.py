"""Review batch: the most common word spellings, one drawing each, on regular pages.

Usage: python3 common_words_batch.py OUT.json [count=40] [seed=20261106]

Also an anchoring check: every second word starts from the "shifted" guess
(joined borders moved right by 0.046 of the word height, learned from pages
1-2) instead of today's first guess, stored as startCuts. Comparing how often
the owner edits each half shows how much the starting guess steers the
approved borders.
"""
import json, random, sys, collections
from export_review import export
out = sys.argv[1]; n = int(sys.argv[2]) if len(sys.argv) > 2 else 40
rng = random.Random(int(sys.argv[3]) if len(sys.argv) > 3 else 20261106)
occ = collections.defaultdict(list)
for p in range(3, 605):
    for line in json.load(open(f'../../public/pages/p{p}.json'))['lines']:
        for w in line.get('words', []):
            if w['role'] == 'letter': occ[w['text']].append((p, w['wid']))
done = {'ٱللَّهِ', 'ٱللَّهَ', 'ٱلَّذِينَ', 'إِلَّا', 'وَلَا', 'ذَٰلِكَ', 'رَبِّ'}   # already approved elsewhere
common = [t for t, v in sorted(occ.items(), key=lambda kv: -len(kv[1])) if t not in done and len(t.replace('ٰ','')) > 2][:n]
pick = {t: rng.choice(occ[t]) for t in common}
by_page = collections.defaultdict(set)
for t, (p, wid) in pick.items(): by_page[p].add(wid)
words = []
for p in sorted(by_page):
    for w in export(p):
        if w['wid'] in by_page[p]: w['batch'] = 'common'; w['freq'] = len(occ[w['text']]); words.append(w)
words.sort(key=lambda w: -w['freq'])
json.dump(dict(version=1, source='1405-artwork-5a5f9f3846158475', pages=sorted(by_page), words=words), open(out, 'w'))
print(len(words), 'words; covers', sum(w['freq'] for w in words), 'occurrences')
