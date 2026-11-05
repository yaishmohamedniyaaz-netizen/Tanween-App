"""Copy approved letter borders to other drawings of the same spelling.

The same calligrapher drew every page, so two drawings of one spelling differ
mainly in how far joins are stretched. Each drawing's base-letter ink is
turned into a column profile around its baseline; dynamic time warping aligns
the two profiles, and the approved borders are carried across.

  python3 border_copy.py review-data-app.json approvals.json units.json OUT.json [first_page last_page]

Writes {wid: {text, page, box, cuts, source, cost}} for every drawing (pages
in range) of an approved spelling that is not itself approved. cuts are in
the word's crop px (same crop as the review screen), right to left.
Measured on approved pairs (6 Nov 2026): 75% of borders within 2 px, 5% off by
more than 5 px (42 pairs).
"""
import json, sys, base64, io, time
import numpy as np
from PIL import Image
from border_font_dtw import prof, dtw

def prepare(w):
    """Ink and base-letter ink of a review-data word (export_review format)."""
    from truth_cuts import unrle
    if '_ink' not in w:
        w['_ink'] = np.array(Image.open(io.BytesIO(base64.b64decode(w['png']))).convert('L')) < 128
        pcs = w['pieces']; pcs = json.loads(pcs) if isinstance(pcs, str) else pcs
        w['_pcs'] = unrle(pcs, w['w'] * w['h'])
    return w

def art(w):
    pcs = w['_pcs'].reshape(w['h'], w['w']); sk = np.isin(pcs, w['skeleton']) & w['_ink']
    if not sk.any(): sk = w['_ink']
    own = (pcs > 0) & w['_ink']   # this word's pieces only; the crop margin can hold a neighbour's ink
    cols = np.where((own if own.any() else w['_ink']).any(0))[0]; R = int(cols.max()) + 1; L = int(cols.min())
    bl = int(np.argmax(sk.sum(1))); ys = np.where(sk.any(1))[0]
    return sk, L, R, bl, ys.max() - ys.min() + 1

def copy(src, cuts, dst):
    """Approved borders of src (crop px) mapped onto dst. Returns (cuts, cost)."""
    ss, sL, sR, sbl, sh = art(src); ds, dL, dR, dbl, dh = art(dst)
    k = dh / sh
    simg = np.array(Image.fromarray((ss * 255).astype(np.uint8)).resize(
        (max(1, int(round(src['w'] * k))), max(1, int(round(src['h'] * k)))), Image.BILINEAR)) > 127
    sl, sr, sb = int(round(sL * k)), int(round(sR * k)), int(round(sbl * k))
    A = prof(ds[:, dL:dR].astype(float), dbl, dst['h'])[:, ::-1]
    B = prof(simg[:, sl:sr].astype(float), sb, dst['h'])[:, ::-1]
    path = dtw(A, B); mp = {}
    for i, j in path: mp.setdefault(j, []).append(i)
    cost = float(np.mean([np.abs(A[:, i] - B[:, j]).sum() for i, j in path]))
    W = B.shape[1]
    def col(x):
        j = min(max(int(round(sr - x * k)), 0), W - 1)
        while j not in mp and j > 0: j -= 1
        return dR - np.mean(mp.get(j, [0]))
    g = [dR] + [int(round(col(c))) for c in cuts[1:-1]] + [dL]
    for q in range(1, len(g)):
        if g[q] > g[q - 1] - 1: g[q] = g[q - 1] - 1
    return g, cost

if __name__ == '__main__':
    from border_data import load
    from export_review import export
    words, truth = load(*sys.argv[1:4]); out_path = sys.argv[4]
    first, last = (int(sys.argv[5]), int(sys.argv[6])) if len(sys.argv) > 6 else (1, 604)
    sources = {}
    for wid, c in truth.items():
        if len(c) > 2: sources.setdefault(words[wid]['text'], []).append((words[wid], c))
    occ = {}
    for p in range(first, last + 1):
        for line in json.load(open(f'../../public/pages/p{p}.json'))['lines']:
            for w in line.get('words', []):
                if w['role'] == 'letter' and w['text'] in sources and w['wid'] not in truth: occ.setdefault(p, set()).add(w['wid'])
    out = {}; t0 = time.time()
    for n, p in enumerate(sorted(occ)):
        for w in export(p):
            if w['wid'] not in occ[p]: continue
            prepare(w); best = None
            for src, c in sources[w['text']]:
                g, cost = copy(src, c, w)
                if best is None or cost < best[1]: best = (g, cost, src['wid'])
            out[w['wid']] = dict(text=w['text'], page=p, box=w['box'], cuts=best[0], source=best[2], cost=round(best[1], 3))
        if n % 20 == 0: print(f'page {p}: {len(out)} words, {time.time()-t0:.0f}s', flush=True)
    json.dump(out, open(out_path, 'w'), ensure_ascii=False)
    print('done', len(out), 'words from', len(sources), 'approved spellings')
