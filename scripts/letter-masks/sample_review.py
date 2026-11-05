"""Pick a fixed random sample of words from regular pages (3-604) for review.

Usage: python3 sample_review.py OUT.json [words=60] [seed=20261105]
Samples pages first (3 words per page), then words with at least two letters,
so the sample spreads across the Quran. The same seed gives the same sample.
"""
import json, random, sys
from export_review import export
out = sys.argv[1]; n = int(sys.argv[2]) if len(sys.argv) > 2 else 60
rng = random.Random(int(sys.argv[3]) if len(sys.argv) > 3 else 20261105)
pages = sorted(rng.sample(range(3, 605), n // 3))
words = []
for p in pages:
    ws = [w for w in export(p) if len(w['letters']) >= 2]
    words += rng.sample(ws, min(3, len(ws)))
for w in words: w['sample'] = True
json.dump(dict(version=1, source='1405-artwork-5a5f9f3846158475', pages=pages, words=words), open(out, 'w'))
print(len(words), 'words from pages', pages)
