"""Opt-in CP2 bar changes. Unmodified v2 remains the default and reference."""
import numpy as np
from scipy import ndimage as ndi
from bars_v2 import bars_v2


def body_columns(res):
    lab, ink = res['labels'], res['ink']
    comps, n = ndi.label(ink)
    sizes = ndi.sum(ink, comps, range(1, n + 1)) if n else []
    biggest = max(sizes) if n else 1
    total = ink.sum() or 1
    cum = np.cumsum(ink.sum(1)) / total
    lo, hi = int(np.searchsorted(cum, .2)), int(np.searchsorted(cum, .8))
    marks = np.zeros_like(ink)
    for c in range(1, n + 1):
        m = comps == c
        if sizes[c - 1] >= .35 * biggest:
            continue
        ys = np.nonzero(m)[0]
        if sizes[c - 1] < .025 * total or ((ys >= lo) & (ys <= hi)).mean() < .15:
            marks |= m
    out = {}
    for k, t in enumerate(res['tids'], 1):
        m = (lab == k) & ~marks
        if m.sum() < 6:
            m = lab == k
        cols = m.sum(0)
        out[t] = np.flatnonzero(cols >= max(1, .15 * cols.max()))
    return out


def valid(spans, width):
    bs = [b for t, b in spans.items() if t != '__none__']
    return (all(b is not None and 0 <= b[0] < b[1] <= width and b[1] - b[0] >= 3 for b in bs)
            and all(l[1] <= r[0] for r, l in zip(bs, bs[1:])))


def fix_collisions(res, spans):
    """Integer min-cost allocation within each body's own column envelope.

    Endpoint dynamic programming enforces 3px within a letter, zero or larger
    gap between letters. A neighbour can shrink but never be widened into its
    neighbour. Existing valid v2 predictions are bit-for-bit unchanged.
    """
    W = res['ink'].shape[1]
    if valid(spans, W):
        return spans
    cols = body_columns(res)
    order = [t for t in res['tids'] if t != '__none__'][::-1]
    x = np.arange(W + 1); dp = np.zeros(W + 1); histories = []
    for t in order:
        cs = cols[t]; target = spans.get(t)
        if len(cs) == 0 or target is None or cs[-1] - cs[0] + 1 < 3:
            return spans
        for endpoint, delta in ((0, 0), (1, 3)):
            pref = np.minimum.accumulate(dp)
            arg = np.zeros(W + 1, dtype=int); best = 0
            for j in range(W + 1):
                if dp[j] < dp[best]: best = j
                arg[j] = best
            prior = x - delta
            low, high = ((cs[0], cs[-1] - 2) if endpoint == 0 else (cs[0] + 3, cs[-1] + 1))
            allowed = (x >= low) & (x <= high) & (prior >= 0)
            now = np.full(W + 1, np.inf)
            now[allowed] = pref[prior[allowed]] + (x[allowed] - target[endpoint]) ** 2
            back = np.full(W + 1, -1, dtype=int)
            back[allowed] = arg[prior[allowed]]
            histories.append(back); dp = now
    if not np.isfinite(dp).any():
        return spans
    pos = int(np.argmin(dp)); edges = []
    for back in histories[::-1]:
        edges.append(pos); pos = int(back[pos])
    edges.reverse(); out = spans.copy()
    for j, t in enumerate(order):
        a, b = edges[2*j:2*j+2]
        # A 3px compromise must include actual own-body ink, not just its envelope.
        if not np.any((cols[t] >= a) & (cols[t] < b)):
            return spans
        out[t] = (a, b)
    return out if valid(out, W) else spans


def fix_final_bowl(res, spans):
    """Use left-side lower-bowl columns for final ya/alif-maqsura/noon only."""
    text = ''.join(c for c in res['word']['text'] if '\u0620' <= c <= '\u064a')
    tids = [t for t in res['tids'] if t != '__none__']
    if not text or text[-1] not in 'يىن' or len(tids) < 2:
        return spans
    last, prev = tids[-1], tids[-2]
    if not spans.get(last) or not spans.get(prev):
        return spans
    lab = res['labels']; k = res['tids'].index(last) + 1
    body = (lab == k) & ~res['marks']; ys, xs = np.nonzero(body)
    if len(xs) < 12:
        return spans
    cutoff = spans[prev][0]
    lower = body.copy(); lower[:int(np.median(ys)), :] = False
    cols = lower.sum(0); keep = np.flatnonzero(cols >= max(2, .15 * cols.max()))
    keep = keep[keep < cutoff]
    if len(keep) == 0:
        return spans
    out = spans.copy(); out[last] = (int(keep.min()), min(cutoff, int(keep.max()) + 1))
    return out if valid(out, lab.shape[1]) else spans


def bars_v3(res, *, fix_colliding=False, fix_bowl=False):
    spans = bars_v2(res)
    if fix_bowl:
        spans = fix_final_bowl(res, spans)
    if fix_colliding:
        spans = fix_collisions(res, spans)
    return spans
