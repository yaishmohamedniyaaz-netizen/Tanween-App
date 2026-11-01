"""Pass 3: propose cut lines inside joined pieces, assign marks, build letter areas."""
import json, sys, collections, numpy as np
from PIL import Image
from scipy import ndimage
from pieces import D, letters, groups
from pieces2 import page_pieces
def thin_runs(colink, colbase, thick):
    """Column runs where the only ink is a thin stroke at the baseline."""
    ok = (colink <= thick * 1.35) & (colbase > 0)
    runs = []; start = None
    for x, v in enumerate(ok):
        if v and start is None: start = x
        if not v and start is not None: runs.append((start, x)); start = None
    if start is not None: runs.append((start, len(ok)))
    return [r for r in runs if r[1] - r[0] >= 2]
def propose(page):
    res, lab = page_pieces(page)
    out = []
    # stroke thickness: median ink run height at the baseline
    runs = []
    for r in res:
        b = r['baseline']
        for p in r['pieces']:
            if p['kind'] != 'skeleton': continue
            x0, y0, x1, y1 = p['box']; m = lab[y0:y1, x0:x1] == p['id']
            col = m.sum(0); runs += list(col[col > 0])
    thick = float(np.percentile(runs, 20)) if runs else 10
    for r in res:
        w = r['word']; ls = letters(w['text']); gs = groups(ls); b = r['baseline']
        sk = sorted([p for p in r['pieces'] if p['kind'] == 'skeleton'], key=lambda p: -p['box'][2])  # right to left
        marks = [p for p in r['pieces'] if p['kind'] == 'mark']
        item = dict(wid=w['wid'], text=w['text'], status='red', letters=[], reason='')
        if len(sk) != len(gs):
            item['reason'] = f'pieces {len(sk)} vs text {len(gs)}'; out.append(item); continue
        status = 'yellow'; cutsall = []
        for g, p in zip(gs, sk):
            x0, y0, x1, y1 = p['box']; m = lab[y0:y1, x0:x1] == p['id']
            if len(g) == 1:
                cutsall.append((g, p, [])); continue
            band = m[max(0, b - y0 - int(thick)):max(0, b - y0 + int(thick)) + 1]
            rs = thin_runs(m.sum(0), band.sum(0), thick)
            cx = [x0 + (a + c) // 2 for a, c in rs]
            cx = [c for c in cx if x0 + thick < c < x1 - thick]
            if len(cx) != len(g) - 1:
                status = 'red'; item['reason'] = f'cuts {len(cx)} vs {len(g)-1} in {"".join(ls[i][0] for i in g)}'
                cx = list(np.linspace(x1, x0, len(g) + 1)[1:-1].astype(int))
            cutsall.append((g, p, sorted(cx, reverse=True)))
        if all(len(g) == 1 for g, _, _ in cutsall): status = 'green-candidate'
        item['status'] = status; item['groups'] = [(g, p['id'], p['box'], c) for g, p, c in cutsall]
        item['marks'] = [(q['id'], q['box']) for q in marks]
        out.append(item)
    return out, lab, thick
if __name__ == '__main__':
    pages = [int(a) for a in sys.argv[1:]] or range(1, 605)
    t = collections.Counter()
    for pg in pages:
        o, _, _ = propose(pg)
        for i in o: t[i['status']] += 1
    print(dict(t))
