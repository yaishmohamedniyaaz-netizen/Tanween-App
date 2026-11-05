"""Words (crop ink, letters, first guess) and the owner's approved borders.

load(review_data, approvals, units=None) -> (words, truth)
  review_data: review-data-app.json (export_review.py + to_app_units.py)
  approvals:   {"words": [review docs]}, e.g. approved/pages1-2-approvals-2026-11-05.json
  units:       units.json from dump_units.mts (needed by the font method)
truth[wid] = borders in crop px, right to left (N letters -> N+1 borders).
"""
import json, base64, io
import numpy as np
from PIL import Image
from truth_cuts import unrle, spans_from, cuts_from, approved_cuts
def load(review_data, approvals, units=None):
    data = json.load(open(review_data)); words = {}
    U = json.load(open(units)) if units else {}
    for w in data['words']:
        w['_pcs'] = unrle(json.loads(w['pieces']) if isinstance(w['pieces'], str) else w['pieces'], w['w']*w['h'])
        w['_ink'] = np.array(Image.open(io.BytesIO(base64.b64decode(w['png']))).convert('L')) < 128
        proposal = json.loads(w['proposal']) if isinstance(w['proposal'], str) else w['proposal']
        w['_first'] = cuts_from(w, spans_from(w, unrle(proposal, w['w']*w['h'])))
        if w['wid'] in U: w['_units'] = [(u['start'], u['end'], u['tid']) for u in U[w['wid']]['units']]
        words[w['wid']] = w
    return words, approved_cuts(words, json.load(open(approvals))['words'])
