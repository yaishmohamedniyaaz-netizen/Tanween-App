"""Write the owner-approved letter borders for the app.

Usage (from scripts/letter-masks):
  python3 export_app_borders.py review-data-app.json approvals.json

approvals.json: {"words": [review docs]} as saved by the review screen
(collection "reviews"). Only docs with status "approved" whose letters match
the app's current letter units are written. Output, per page:
  public/letter-borders/p{N}.json
    {"page": N, "ruleVersion": "...", "words": {wid: {"tids": [...], "x": [...]}}}
x: borders in artwork px (1920-wide page), right to left; letter i spans
x[i+1]..x[i]. A word not listed keeps the plain word highlight in the app.
"""
import json, sys, os, subprocess
import numpy as np
from truth_cuts import approved_cuts

RULE = subprocess.run(['node', '--experimental-strip-types', '-e',
    'import("../../src/lib/judgingUnits.ts").then(m=>console.log(m.TARGET_RULE_VERSION))'],
    capture_output=True, text=True, check=True).stdout.strip()
data = json.load(open(sys.argv[1])); words = {w['wid']: w for w in data['words']}
docs = json.load(open(sys.argv[2]))['words']
pages = {}
for wid, cuts in approved_cuts(words, docs).items():
    w = words[wid]
    pages.setdefault(w['page'], {})[wid] = {'tids': w['tids'], 'x': [w['box'][0] + c for c in cuts]}
out = '../../public/letter-borders'; os.makedirs(out, exist_ok=True)
for p, ws in sorted(pages.items()):
    json.dump({'page': p, 'ruleVersion': RULE, 'words': dict(sorted(ws.items(), key=lambda kv: [int(x) for x in kv[0].split('.')]))},
              open(f'{out}/p{p}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump({'ruleVersion': RULE, 'pages': sorted(pages)}, open(f'{out}/index.json', 'w'))
print('rule', RULE, 'pages', sorted(pages), 'words', sum(len(v) for v in pages.values()))
