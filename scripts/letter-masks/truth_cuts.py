"""Turn saved review docs into letter borders (crop px), as the review screen does."""
import json
import numpy as np
PAD = 8
def unrle(a, n):
    o = np.empty(n, np.int32); i = 0
    for k in range(0, len(a), 2): o[i:i+a[k+1]] = a[k]; i += a[k+1]
    return o
def spans_from(w, lab):
    pcs = unrle(json.loads(w['pieces']) if isinstance(w['pieces'], str) else w['pieces'], w['w']*w['h'])
    sk = set(w['skeleton']); n = len(w['letters']); sp = [None]*n; anyl = [None]*n
    for i in np.nonzero(lab)[0]:
        if not pcs[i]: continue
        L = lab[i]; x = int(i % w['w']); t = sp if pcs[i] in sk else anyl; s = t[L-1]
        t[L-1] = [min(s[0], x), max(s[1], x+1)] if s else [x, x+1]
    return [a or b for a, b in zip(sp, anyl)]
def cuts_from(w, sp):
    n = len(w['letters']); c = [None]*(n+1)
    r = next((q for q in sp if q), None); l = next((q for q in reversed(sp) if q), None)
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
def approved_cuts(words, docs):
    out = {}
    for d in docs:
        w = words.get(d.get('wid'))
        if not w or d.get('status') != 'approved': continue
        n = len(w['letters'])
        if d.get('mode') == 'edges' and d.get('cuts'):
            c = list(map(int, d['cuts'].split(',')))
            if len(c) == n+1 and (not d.get('tids') or d['tids'] == w['tids']): out[w['wid']] = c; continue
        if d.get('labels') and d.get('w') == w['w'] and d.get('h') == w['h']:
            lab = unrle([int(x) for x in d['labels'].split(',')], w['w']*w['h'])
            lab = np.array([w['oldToNew'][v-1]+1 if v else 0 for v in lab])
            out[w['wid']] = cuts_from(w, spans_from(w, lab))
    return out
