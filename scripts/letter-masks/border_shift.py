"""Method A: move each joined border right by a share of the word height.

Big first-guess errors are on joined strokes and too far left: on stretched
joins the owner gives the stretch to the letter on the left. 0.046 was the
median correction on pages 1-2. Borders between separate ink pieces stay.
"""
import numpy as np
def joined(w, x):
    pcs = w['_pcs'].reshape(w['h'], w['w'])
    return len(set(np.unique(pcs[:, max(0, x-1):x+1])) & set(w['skeleton'])) > 0
def guess(w, k=0.046):
    f = list(w['_first'])
    g = [f[0]] + [f[i] + (int(round(k*w['h'])) if joined(w, f[i]) else 0) for i in range(1, len(f)-1)] + [f[-1]]
    for q in range(1, len(g)):
        if g[q] > g[q-1]-1: g[q] = g[q-1]-1
    return g
