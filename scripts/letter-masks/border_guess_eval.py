"""Measure border guesses against the owner's approved borders (leave one word out).

Usage (from scripts/letter-masks):
  python3 border_guess_eval.py review-data-app.json approved/page1-approvals-2026-11-05.json

Prints, for borders between letters at desktop page size (473.6 px wide page):
median and mean distance, and the share within 1 px and 2 px.
"""
import json, glob, statistics as st, sys
import numpy as np
S = 473.624/1920
def unrle(a, n):
    o = np.empty(n, np.int32); i = 0
    for k in range(0, len(a), 2): o[i:i+a[k+1]] = a[k]; i += a[k+1]
    return o
data = json.load(open(sys.argv[1])); words = {w['wid']: w for w in data['words']}
approved = {}
for v in json.load(open(sys.argv[2]))['words']:
    if v.get('mode') == 'edges' and v.get('cuts'):
        c = list(map(int, v['cuts'].split(',')))
        if len(c) == len(words[v['wid']]['letters']) + 1: approved[v['wid']] = c
def profile(w):
    pcs = unrle(w['pieces'], w['w']*w['h']).reshape(w['h'], w['w']); sk = np.isin(pcs, w['skeleton'])
    return sk.sum(0).astype(float), (pcs > 0).any(0)
def key(w, i): return w['letters'][i][0] + ('F' if i == len(w['letters']) - 1 else '')
def priors(train):
    by = {}; allw = []
    for wid, c in train.items():
        w = words[wid]; h = w['h']
        for i in range(len(c) - 1):
            r = (c[i] - c[i+1]) / h; by.setdefault(key(w, i), []).append(r); allw.append(r)
    return {k: (st.median(v), len(v)) for k, v in by.items()}, st.median(allw)
def guess(w, pri, glob_med, lam=6.0):
    col, any_ink = profile(w); n = len(w['letters']); h = w['h']
    xs = np.where(any_ink)[0]; right, left = int(xs.max()) + 1, int(xs.min())
    norm = col / max(1.0, np.percentile(col[col > 0], 90))
    exp = []
    for i in range(n):
        m, cnt = pri.get(key(w, i), (glob_med, 0)); exp.append(m * h)
    scale = (right - left) / max(1.0, sum(exp)); exp = [e * scale for e in exp]   # fit expected widths to the word
    # DP over cut positions, right to left
    INF = 1e18; W = w['w']
    cost = {right: 0.0}; back = [{} for _ in range(n + 1)]
    prev = {right: 0.0}
    for i in range(n):
        cur = {}
        last = i == n - 1
        cand = [left] if last else range(left + 1, right)
        for x in cand:
            best = INF; arg = None
            for px, pc in prev.items():
                if x >= px: continue
                width = px - x
                c = pc + lam * ((width - exp[i]) / max(4.0, exp[i] * 0.5)) ** 2 + (0 if last else norm[min(x, W-1)] * 3)
                if c < best: best, arg = c, px
            if arg is not None: cur[x] = best; back[i+1][x] = arg
        prev = cur
    cuts = [left]
    for i in range(n, 0, -1): cuts.append(back[i][cuts[-1]])
    return cuts[::-1]
def evaluate(lam):
    errs = []
    for wid, c in approved.items():
        train = {k: v for k, v in approved.items() if k != wid}
        pri, gm = priors(train); g = guess(words[wid], pri, gm, lam)
        errs += [abs(a - b) * S for a, b in list(zip(c, g))[1:-1]]
    return errs
PAD = 8
def first_cuts(w):
    """Today's first guess: the export's proposed letter map turned into borders."""
    lab = unrle(w['proposal'], w['w']*w['h']); pcs = unrle(w['pieces'], w['w']*w['h']); sk = set(w['skeleton']); n = len(w['letters'])
    sp = [None]*n; anyl = [None]*n
    for i in np.nonzero(lab)[0]:
        if not pcs[i]: continue
        L = lab[i]; x = int(i % w['w']); t = sp if pcs[i] in sk else anyl; s = t[L-1]
        t[L-1] = [min(s[0], x), max(s[1], x+1)] if s else [x, x+1]
    sp = [a or b for a, b in zip(sp, anyl)]
    c = [None]*(n+1); r = next((q for q in sp if q), None); l = next((q for q in reversed(sp) if q), None)
    c[0] = r[1] if r else w['w']-PAD; c[n] = l[0] if l else PAD
    for i in range(1, n):
        a, b = sp[i-1], sp[i]; c[i] = round((a[0]+b[1])/2) if a and b else (a[0] if a else (b[1] if b else None))
    i = 0
    while i <= n:
        if c[i] is not None: i += 1; continue
        j = i
        while c[j] is None: j += 1
        a, b = c[i-1], c[j]
        for k in range(i, j): c[k] = round(a+(b-a)*(k-i+1)/(j-i+1))
        i = j
    for k in range(1, n+1):
        if c[k] > c[k-1]-1: c[k] = c[k-1]-1
    return c
def report(name, e):
    print('%-28s median %.2f px  mean %.2f  within 1px %2.0f%%  within 2px %2.0f%%' %
          (name, st.median(e), st.mean(e), 100*sum(x <= 1 for x in e)/len(e), 100*sum(x <= 2 for x in e)/len(e)))

if __name__ == '__main__':
    base_errs = [abs(a-b)*S for wid, c in approved.items() for a, b in list(zip(c, first_cuts(words[wid])))[1:-1]]
    report('first guess (export)', base_errs)
    for lam in [6, 15]:
        report(f'width prior, lam {lam}', evaluate(lam))
