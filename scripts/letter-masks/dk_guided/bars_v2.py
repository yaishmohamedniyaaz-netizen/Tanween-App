"""Underline bars v2 (Claude, 9 November 2026): replaces dkguide.bars().

Why: Checkpoint 1 scored 70% because bars came from each letter's lowest ink
only (upright letters and letters above a join got end-point bars) and
stacked letters got overlapping bars, unreadable at one height.

v2: whole letter body (marks ignored; a letter written on its own is a body),
columns with real ink only, and bars never overlap. Needs only the
label_print() result keys: labels, ink, tids.

Check on Codex's frozen 300 (scripts/letter-masks/dk_guided/review-v2/):
20 of 24 earlier wrong/unsure words now right; 12 of 12 earlier right words
still right. Graded by Claude (its own fix): needs an independent check.
"""
import numpy as np
from scipy import ndimage as ndi


def bars_v2(res, stack_share=0.5, col_share=0.15):
    """Underline per letter from the letter's whole body (marks ignored).
    - Marks for bars: small pieces lying mostly above or below the letters
      (a letter written on its own, like a final ر, is a body, not a mark).
    - A letter's columns count only where it has real ink (at least 15% of its
      tallest column), so a thin upright letter does not run along a join.
    - Neighbours that overlap a little are cut at the middle of the overlap;
      neighbours that overlap a lot (stacked letters) keep overlapping bars."""
    lab, ink = res['labels'], res['ink']
    comps, n = ndi.label(ink)
    sizes = ndi.sum(ink, comps, range(1, n + 1)) if n else []
    biggest = max(sizes) if n else 1
    total = ink.sum() or 1
    # the letter band: rows holding most of the word's ink
    rows = ink.sum(1)
    cum = np.cumsum(rows) / total
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
    spans = []
    for k, t in enumerate(res['tids']):
        if t == '__none__':
            spans.append(None); continue
        body = (lab == k + 1) & ~markmask
        if body.sum() < 6:
            body = lab == k + 1
        if not body.any():
            spans.append(None); continue
        cols = body.sum(0)
        keep = np.nonzero(cols >= max(1, col_share * cols.max()))[0]
        spans.append([float(keep.min()), float(keep.max()) + 1])
    # Bars never overlap (they are drawn at one height). Walk right to left:
    # each letter ends where the next one starts.
    order = [i for i, sp in enumerate(spans) if sp]
    for a, b in zip(order, order[1:]):  # a reads before b: a is to the right
        ra, rb = spans[a], spans[b]
        if rb[1] <= ra[0]:
            continue  # no overlap
        if rb[0] <= ra[0] and rb[1] >= ra[1] - 0.1 * (ra[1] - ra[0]):
            rb[1] = ra[0]          # b spans under all of a: b keeps the part beside a
        elif ra[0] <= rb[0] and ra[1] >= rb[1]:
            ra[0] = rb[1]          # a spans under all of b: a keeps the part beside b
        else:
            mid = (ra[0] + rb[1]) / 2
            ra[0] = mid; rb[1] = mid
    for i in order:  # a squeezed letter keeps at least 3 px
        sp = spans[i]
        if sp[1] - sp[0] < 3:
            c = (sp[0] + sp[1]) / 2; sp[0], sp[1] = c - 1.5, c + 1.5
    return {t: (None if sp is None else (int(round(sp[0])), int(round(sp[1])))) for t, sp in zip(res['tids'], spans)}
