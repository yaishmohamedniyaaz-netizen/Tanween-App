"""Does the starting guess steer the approved borders? (common-words batch)

Usage: python3 anchor_check.py review-data-app.json approvals.json
Half of the common-words batch started from today's first guess, half from
the shifted guess (anchor = "first" / "shift" in the review data). For each
half: how many words the owner approved untouched, and how far the approved
borders sit from each guess (px at desktop page size).
"""
import json, sys, statistics as st
from border_data import load
from border_shape_model import S
words, truth = load(sys.argv[1], sys.argv[2])
data = {w['wid']: w for w in json.load(open(sys.argv[1]))['words']}
for anchor in ['first', 'shift']:
    ids = [x for x in truth if data[x].get('anchor') == anchor and len(truth[x]) > 2]
    if not ids: print(anchor, 'no approved words yet'); continue
    start = {x: data[x].get('startCuts') or words[x]['_first'] for x in ids}
    untouched = sum(truth[x] == start[x] for x in ids)
    d_first = [abs(a-b)*S for x in ids for a, b in list(zip(truth[x], words[x]['_first']))[1:-1]]
    d_shift = [abs(a-b)*S for x in ids for a, b in list(zip(truth[x], data[x].get('startCuts') or words[x]['_first']))[1:-1]] if anchor == 'shift' else None
    print(f'started from {anchor}: {len(ids)} words, untouched {untouched}; approved vs first guess: within 2 px {100*sum(v<=2 for v in d_first)/len(d_first):.0f}%, median {st.median(d_first):.2f}')
    if d_shift: print(f'   approved vs shifted start: within 2 px {100*sum(v<=2 for v in d_shift)/len(d_shift):.0f}%, median {st.median(d_shift):.2f}')
