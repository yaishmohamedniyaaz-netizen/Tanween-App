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


JIM_FAMILY = 'جحخ'


def _base_char(res, tid):
    """Base letter of a target: tids end in @r<index into the word text>."""
    try:
        return res['word']['text'][int(tid.rsplit('@r', 1)[1])]
    except (KeyError, IndexError, ValueError):
        return ''


def bars_stacked(res, stack_share=0.5, col_share=0.15, short_share=0.45, core_share=0.6, carriers=JIM_FAMILY, final_carriers=''):
    """bars_v2 with one changed case (Checkpoint 2, pattern 1, revision 2).

    Case: a broad jim/ha/kha body (the carrier) lies under the whole of the
    letter before it (the rider: an initial ya/ta/lam tooth or stem written on
    top), and v2 would leave the carrier less than `short_share` of its own
    body width. v2 gives the rider its full span and the carrier a short
    end-point stub. Here the rider keeps only its own dense core at its right
    side (never more than a third of the carrier body), and the carrier gets
    everything left of that. Every other word is bit-for-bit v2.
    """
    lab, ink = res['labels'], res['ink']
    comps, n = ndi.label(ink)
    sizes = ndi.sum(ink, comps, range(1, n + 1)) if n else []
    biggest = max(sizes) if n else 1
    total = ink.sum() or 1
    cum = np.cumsum(ink.sum(1)) / total
    lo, hi = int(np.searchsorted(cum, 0.2)), int(np.searchsorted(cum, 0.8))
    markmask = np.zeros_like(ink)
    for c in range(1, n + 1):
        m = comps == c
        if sizes[c - 1] >= 0.35 * biggest:
            continue
        ys = np.nonzero(m)[0]
        inside = ((ys >= lo) & (ys <= hi)).mean()
        if sizes[c - 1] < 0.025 * total or inside < 0.15:
            markmask |= m
    spans, colink = [], []
    for k, t in enumerate(res['tids']):
        if t == '__none__':
            spans.append(None); colink.append(None); continue
        body = (lab == k + 1) & ~markmask
        if body.sum() < 6:
            body = lab == k + 1
        if not body.any():
            spans.append(None); colink.append(None); continue
        cols = body.sum(0)
        keep = np.nonzero(cols >= max(1, col_share * cols.max()))[0]
        spans.append([float(keep.min()), float(keep.max()) + 1]); colink.append(cols)
    changed = False
    order = [i for i, sp in enumerate(spans) if sp]
    for a, b in zip(order, order[1:]):
        ra, rb = spans[a], spans[b]
        if rb[1] <= ra[0]:
            continue
        if rb[0] <= ra[0] and rb[1] >= ra[1] - 0.1 * (ra[1] - ra[0]):
            bwidth = rb[1] - rb[0]
            ch = _base_char(res, res['tids'][b])
            if ((carriers is None or (ch and ch in carriers) or (b == order[-1] and ch and ch in final_carriers))
                    and ra[0] - rb[0] < short_share * bwidth):
                cols = colink[a][int(ra[0]):int(ra[1])]
                if cols.size and cols.max() > 0:        # a rider already squeezed to nothing keeps the v2 rule
                    peak = int(np.argmax(cols)); left = peak
                    while left > 0 and cols[left - 1] >= core_share * cols.max():
                        left -= 1
                    cut = ra[0] + left
                    cut = max(cut, ra[1] - bwidth / 3)  # rider: at most a third of the carrier body
                    cut = min(cut, ra[1] - 3)           # rider: at least 3 px
                    if cut - rb[0] >= 3 and cut > ra[0]:
                        ra[0] = cut; rb[1] = cut; changed = True
                        continue
            rb[1] = ra[0]
        elif ra[0] <= rb[0] and ra[1] >= rb[1]:
            ra[0] = rb[1]
        else:
            mid = (ra[0] + rb[1]) / 2
            ra[0] = mid; rb[1] = mid
    for i in order:
        sp = spans[i]
        if sp[1] - sp[0] < 3:
            c = (sp[0] + sp[1]) / 2; sp[0], sp[1] = c - 1.5, c + 1.5
    out = {t: (None if sp is None else (int(round(sp[0])), int(round(sp[1])))) for t, sp in zip(res['tids'], spans)}
    if not changed:
        assert out == bars_v2(res), 'unchanged words must equal v2 exactly'
    return out


def bars_v3(res, *, fix_colliding=False, fix_bowl=False, fix_stacked2=False, fix_bowl2=False):
    # bowl2 (pattern 3, revision 2) applies the stacked2 rule to a word-final ya/alif-maqsura
    # whose bowl returns under the letter before it; it is only tried on top of stacked2.
    if fix_bowl2:
        spans = bars_stacked(res, final_carriers='يى')
    else:
        spans = bars_stacked(res) if fix_stacked2 else bars_v2(res)
    if fix_bowl:
        spans = fix_final_bowl(res, spans)
    if fix_colliding:
        spans = fix_collisions(res, spans)
    return spans
