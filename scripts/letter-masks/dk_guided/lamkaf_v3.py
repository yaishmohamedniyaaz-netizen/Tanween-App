"""Candidate label fix after the Checkpoint 2 test: lam before a non-final kaf.

Opt-in and NOT part of the published dk-guided-v3 bars (not in checkpoint2/kept.json,
not read by run_v3.py). Kept in its own file so the v3 run fingerprint is unchanged.
"""
import numpy as np
from labels_v3 import _stems

ALIFS = 'اأإآٱ'
def _units(res):
    text = res['word']['text']; idx = []
    for t in res['tids']:
        try: idx.append(int(t.rsplit('@r', 1)[1]))
        except (IndexError, ValueError): idx.append(None)
    real = [i for i in idx if i is not None]
    return [('' if i is None else text[i:min([j for j in real if j > i], default=len(text))]) for i in idx], idx

STEMMED = ALIFS + 'لطظ'
UPRIGHT = ALIFS + 'ل'


def fix_lamkaf(res, reach=2.5):
    """Lam followed by a kaf that is not word-final (often the long S-shaped kaf, which the
    DigitalKhatt reference draws as a plain kaf). Only one case is changed: the lam's upright
    stroke was given to another letter. The stroke and its foot go back to the lam, and ink
    left of the stroke that the letter before the lam held goes to the kaf.

    A lam that already owns its stroke is left exactly as it is (owner review, 11 Nov 2026:
    those words were balanced; trimming the lam to its stroke was an over-correction)."""
    units, idx = _units(res); text = res['word']['text']
    real = [k for k, i in enumerate(idx) if i is not None]
    pairs = [(a, b) for a, b in zip(real, real[1:])
             if text[idx[a]] == 'ل' and text[idx[b]] == 'ك' and b != real[-1]
             and not any(c in ALIFS for c in units[a][1:])]
    if not pairs: return res
    body = res['ink'] & ~res['marks']
    stems = [m for _, _, m in _stems(body)]
    lab = res['labels'].copy(); changed = False
    for a, b in pairs:
        lam = (lab == a + 1) & body
        if not lam.any(): continue
        lcols = np.nonzero(lam.any(0))[0]; l0, l1 = lcols.min(), lcols.max() + 1
        best = None
        for s in stems:
            xs = np.nonzero(s)[1]; x0, x1 = xs.min(), xs.max() + 1; sw = x1 - x0
            own = (lab[s] == a + 1).mean()
            if own >= .5: best = None; break                    # the lam has its stroke: nothing to do
            ids, c = np.unique(lab[s], return_counts=True); top = int(ids[np.argmax(c)])
            other_stem = bool(top) and top != a + 1 and idx[top - 1] is not None and c.max() >= .85 * c.sum() and text[idx[top - 1]] in STEMMED
            near = 0 <= x0 - l1 <= reach * sw or (l0 <= x0 < l1 and x1 > l1 - sw)
            if other_stem or not near: continue
            cand = (-abs(x0 - l1), s, x0, x1)
            if best is None or cand[0] > best[0]: best = cand
        if best is None: continue
        _, s, x0, x1 = best; sw = x1 - x0
        prev = real[real.index(a) - 1] + 1 if real.index(a) else 0
        lab[s] = a + 1
        left = body & np.isin(lab, [b + 1, prev] if prev else [b + 1]); left[:, x0:] = False
        foot = left.copy(); foot[:, :max(0, x0 - sw)] = False
        if prev: lab[left & (lab == prev)] = b + 1               # ink left of the lam stroke is not the letter before it
        lab[foot] = a + 1                                        # the lam's foot, just left of its stroke
        far = body & (lab == a + 1); far[:, max(0, x0 - 3 * sw):] = False
        lab[far] = b + 1                                         # old lam ink far left of the stroke is the kaf
        changed = True
    return dict(res, labels=lab) if changed else res


def widen_upright(res, spans, minimum=20, sep=2, keep=2.0):
    """Minimum bar width for alif and lam (owner review, 11 Nov 2026: a bar the width of the
    stroke is too small to see). A narrow alif or lam bar first grows into the empty space
    beside it; if that is not enough it takes from a neighbour that stays at least
    `keep` x `minimum` wide. Very tight letters stay small. Invalid words are not touched."""
    units, idx = _units(res); text = res['word']['text']; W = res['ink'].shape[1]
    order = [k for k, t in enumerate(res['tids']) if t != '__none__']
    bs = [spans.get(res['tids'][k]) for k in order]
    if any(b is None for b in bs) or any(l[1] > r[0] for r, l in zip(bs, bs[1:])): return spans
    bs = [list(b) for b in bs]
    for n, k in enumerate(order):
        if idx[k] is None or text[idx[k]] not in UPRIGHT: continue
        need = minimum - (bs[n][1] - bs[n][0])
        if need <= 0: continue
        right = (bs[n - 1][0] - sep if n else W) - bs[n][1]
        left = bs[n][0] - (bs[n + 1][1] + sep if n + 1 < len(bs) else 0)
        right, left = max(0, right), max(0, left)
        tr = min(right, (need + 1) // 2); tl = min(left, need - tr); tr = min(right, need - tl)
        bs[n][1] += tr; bs[n][0] -= tl; need -= tr + tl
        for m, side in ((n + 1, 0), (n - 1, 1)):                 # then a wide neighbour: next letter first
            if need <= 0 or not 0 <= m < len(bs): continue
            touching = bs[n][0] - bs[m][1] <= sep if side == 0 else bs[m][0] - bs[n][1] <= sep
            give = min(need, int((bs[m][1] - bs[m][0]) - keep * minimum))
            if not touching or give <= 0: continue
            if side == 0: bs[m][1] -= give; bs[n][0] = bs[m][1]
            else: bs[m][0] += give; bs[n][1] = bs[m][0]
            need -= give
    out = dict(spans)
    for k, b in zip(order, bs): out[res['tids'][k]] = (int(b[0]), int(b[1]))
    return out
