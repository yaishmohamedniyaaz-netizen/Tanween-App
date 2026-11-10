"""Checkpoint 2 opt-in label experiments; the v1/v2 source stays unchanged.

aligned_print is the unchanged dkguide alignment/assignment with extra internal
alignment arrays returned for candidate hooks. All options default off.
"""
from dkguide import *

def aligned_print(p, wid, flow=True):
    w, abox, alpha = art_word(p, wid)
    ink = alpha > 90
    dword, dbox, masks = dk_letters(p, wid)
    tids = list(masks)
    shape = next(iter(masks.values())).shape
    lab = np.zeros(shape, np.int32)  # 0 = background, k+1 = tids[k]
    for k, t in enumerate(tids):
        lab[masks[t] & (lab == 0)] = k + 1
    fmap, fit = align(masks, shape, ink)
    # Optional non-rigid refinement: optical flow from print ink to the box-aligned DK ink.
    H, W = ink.shape
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    mx, my = fmap(xx, yy)
    if flow:
        from skimage.registration import optical_flow_tvl1
        from scipy.ndimage import map_coordinates
        dk_any = (lab > 0).astype(float)
        warped_dk = map_coordinates(dk_any, [my, mx], order=1, cval=0)
        v, u = optical_flow_tvl1(ndi.gaussian_filter(ink.astype(float), 1.2), ndi.gaussian_filter(warped_dk, 1.2), attachment=8, tightness=0.3, num_warp=5)
        mx2 = map_coordinates(mx, [yy + v, xx + u], order=1, mode='nearest')
        my2 = map_coordinates(my, [yy + v, xx + u], order=1, mode='nearest')
        mx, my = mx2, my2
    # nearest DK letter for every print pixel
    dist, (iy, ix) = ndi.distance_transform_edt(lab == 0, return_indices=True)
    nearest = lab[iy, ix]
    px = np.clip(np.round(mx).astype(int), 0, shape[1] - 1)
    py = np.clip(np.round(my).astype(int), 0, shape[0] - 1)
    out = np.where(ink, nearest[py, px], 0)
    # Small separate pieces (dots, harakat, signs): match each to the nearest
    # DigitalKhatt small piece of the same kind, by centre after alignment.
    dk_pieces = []
    for k, t in enumerate(tids):
        dc, dn = ndi.label(masks[t])
        for c in range(1, dn + 1):
            m = dc == c
            dk_pieces.append((k + 1, m.sum(), ndi.center_of_mass(m)))
    def band_of(m_all):
        # the letters' main band: middle rows of the largest ink piece
        cc, nn = ndi.label(m_all)
        sz = ndi.sum(m_all, cc, range(1, nn + 1))
        ys = np.nonzero(cc == (np.argmax(sz) + 1))[0]
        lo, hi = np.percentile(ys, 30), np.percentile(ys, 85)
        return lo, hi, max(sz)
    def is_mark(m, band, biggest):
        ys = np.nonzero(m)[0]
        if m.sum() >= 0.3 * biggest: return False
        inside = ((ys >= band[0]) & (ys <= band[1])).mean()
        return m.sum() < 0.06 * biggest or inside < 0.35
    dk_all = np.zeros(shape, bool)
    for t in tids: dk_all |= masks[t]
    dband = band_of(dk_all)
    dk_small = []
    for k, t in enumerate(tids):
        dc, dn = ndi.label(masks[t])
        for c in range(1, dn + 1):
            m = dc == c
            if is_mark(m, dband[:2], dband[2]):
                cy, cx = ndi.center_of_mass(m)
                dk_small.append((k + 1, m.sum(), cy, cx))
    comps, n = ndi.label(ink)
    sizes = ndi.sum(ink, comps, range(1, n + 1))
    pband = band_of(ink)
    small = [c for c in range(1, n + 1) if is_mark(comps == c, pband[:2], pband[2])]
    if small and dk_small:
        # Marks keep their order: match print marks to DK marks right-to-left,
        # separately above and below the letters. One print mark may be two DK
        # marks that touch in the print (hamza + sukun).
        dk_main = np.zeros(shape, bool)
        for k, t in enumerate(tids):
            dk_main |= masks[t]
        mid_dk = (lambda ys: (ys.min() + ys.max()) / 2)(np.nonzero(dk_main)[0])
        wdk = np.ptp(np.nonzero(dk_main)[1]) or 1
        P = []
        for c in small:
            cy, cx = ndi.center_of_mass(comps == c)
            ty, tx = my[int(round(cy)), int(round(cx))], mx[int(round(cy)), int(round(cx))]
            P.append({'c': c, 'tx': tx, 'ty': ty, 'sz': sizes[c - 1]})
        D = [{'lbl': lbl, 'tx': dx, 'ty': dy, 'sz': sz} for lbl, sz, dy, dx in dk_small]
        def side(pc, y_of): return 'up' if y_of(pc) < mid_dk else 'down'
        for where in ('up', 'down'):
            ps = sorted([q for q in P if side(q, lambda q: q['ty']) == where], key=lambda q: -q['tx'])
            ds = sorted([d for d in D if side(d, lambda d: d['ty']) == where], key=lambda d: -d['tx'])
            if not ps:
                continue
            if not ds:
                ds = sorted(D, key=lambda d: -d['tx'])
            INF = 1e9
            n1, n2 = len(ps), len(ds)
            dp = np.full((n1 + 1, n2 + 1), INF); dp[0, :] = np.arange(n2 + 1) * 25; back = {}
            def c1(q, ds_):
                tx = np.mean([d['tx'] for d in ds_]); sz = sum(d['sz'] for d in ds_)
                return abs(q['tx'] - tx) / wdk * 100 + 8 * abs(np.log(max(1, q['sz']) / max(1, sz)))
            for i in range(1, n1 + 1):
                for j in range(0, n2 + 1):
                    opts = [(dp[i - 1, j] + 40, (i - 1, j, None))]  # print mark with no partner
                    if j >= 1:
                        opts.append((dp[i, j - 1] + 25, (i, j - 1, 'skip')))
                        opts.append((dp[i - 1, j - 1] + c1(ps[i - 1], [ds[j - 1]]), (i - 1, j - 1, [j - 1])))
                    if j >= 2:
                        opts.append((dp[i - 1, j - 2] + c1(ps[i - 1], ds[j - 2:j]) + 6, (i - 1, j - 2, [j - 2, j - 1])))
                    best = min(opts, key=lambda o: o[0])
                    dp[i, j] = best[0]; back[i, j] = best[1]
            i, j = n1, n2
            while i > 0:
                pi, pj, how = back[i, j]
                if how not in (None, 'skip'):
                    lbls = [ds[k]['lbl'] for k in how]
                    out[comps == ps[i - 1]['c']] = max(set(lbls), key=lbls.count) if len(set(lbls)) == 1 else lbls[0]
                elif how is None:
                    q = ps[i - 1]
                    out[comps == q['c']] = min(D, key=lambda d: (d['tx'] - q['tx']) ** 2 + (d['ty'] - q['ty']) ** 2)['lbl']
                i, j = pi, pj
    # waqf signs keep no letter
    if '__none__' in tids:
        out[out == tids.index('__none__') + 1] = 0
    # Expose existing body/mark classification for batch self-checks without changing labels.
    print_marks = np.isin(comps, small)
    dk_body_areas = []
    for t in tids:
        dc, dn = ndi.label(masks[t])
        body = np.zeros(shape, bool)
        for c in range(1, dn + 1):
            m = dc == c
            if not is_mark(m, dband[:2], dband[2]): body |= m
        dk_body_areas.append(int(body.sum()))
    a0, b0 = fmap(0, 0)
    a1, b1 = fmap(1, 1)
    scale_area = float((a1 - a0) * (b1 - b0))
    return {'wid': wid, 'page': p, 'tids': tids, 'labels': out, 'ink': ink,
            'box': abox, 'fit': fit, 'word': w, 'marks': print_marks,
            'dk_body_areas': dk_body_areas, 'scale_area': scale_area,
            '_dk_masks': masks, '_px': px, '_py': py, '_dk_lab': lab}



def _pieces(mask, min_area=12):
    cc, n = ndi.label(mask)
    out = []
    for c in range(1, n + 1):
        m = cc == c
        if m.sum() < min_area:
            continue
        ys, xs = np.nonzero(m)
        out.append((float(xs.mean()), float(ys.mean()), m))
    return sorted(out, key=lambda q: -q[0])


def fix_detached(res):
    """Match non-mark isolated bodies in reading order, never pixel proximity.

    Only one-to-one component inventories with clear single-owner DK partners
    can override labels. Ambiguous or unmatched components retain v2 labels;
    this is a restricted experiment, not a complete detached-piece classifier.
    Connected multi-letter bodies are deliberately not claimed as one letter.
    """
    ink = res['ink']; lab = res['labels'].copy()
    masks = res['_dk_masks']; dlab = res['_dk_lab']
    pp = _pieces(ink & ~res['marks'])
    # Exclude the source DK mark classification using its main-body band.
    all_dk = dlab > 0
    allpieces = _pieces(all_dk)
    if not allpieces or not pp:
        return res
    largest = max(q[2].sum() for q in allpieces)
    ys = np.nonzero(max(allpieces, key=lambda q: q[2].sum())[2])[0]
    lo, hi = np.percentile(ys, [30, 85])
    dp = []
    for x, y, m in allpieces:
        yy = np.nonzero(m)[0]
        inside = ((yy >= lo) & (yy <= hi)).mean()
        if m.sum() < .3 * largest and (m.sum() < .06 * largest or inside < .35):
            continue
        labels, counts = np.unique(dlab[m], return_counts=True)
        owner = int(labels[np.argmax(counts)]) if max(counts) >= .95 * m.sum() else 0
        dp.append((x, y, m, owner))
    if len(pp) != len(dp):
        return res  # ambiguous inventory: preserve v2 instead of guessing
    for (_, _, pm), (_, _, dm, owner) in zip(pp, dp):
        if not owner or res['tids'][owner - 1] == '__none__':
            continue
        # Require comparable size after alignment and the same vertical band.
        scale = res['scale_area']
        ratio = pm.sum() * scale / dm.sum()
        cy, cx = ndi.center_of_mass(pm)
        my = res['_py'][int(round(cy)), int(round(cx))]
        dy = np.nonzero(dm)[0]
        if .35 <= ratio <= 2.8 and dy.min() - 10 <= my <= dy.max() + 10:
            lab[pm] = owner
    return dict(res, labels=lab)


def _stems(mask):
    length = max(18, int(mask.shape[0] * .26))
    core = ndi.binary_opening(mask, structure=np.ones((length, 1), bool))
    parts = []
    for x, y, m in _pieces(core, min_area=length * 2):
        yy, xx = np.nonzero(m)
        if np.ptp(yy) + 1 < 2.5 * (np.ptp(xx) + 1):
            continue
        parts.append((x, y, ndi.binary_dilation(m, structure=np.ones((3, 3))) & mask))
    return parts


def fix_stems(res):
    """Match long print and DK upright runs one-to-one, right-to-left."""
    lab = res['labels'].copy(); dlab = res['_dk_lab']
    ps = _stems(res['ink'] & ~res['marks']); ds = _stems(dlab > 0)
    if not ps or len(ps) != len(ds):
        return res
    for (_, _, pm), (_, _, dm) in zip(ps, ds):
        ids, counts = np.unique(dlab[dm], return_counts=True)
        owner = int(ids[np.argmax(counts)])
        if owner and max(counts) >= .85 * dm.sum() and res['tids'][owner - 1] != '__none__':
            lab[pm] = owner
    return dict(res, labels=lab)


def fix_stacked(res):
    """Geodesic growth through connected ink from deep aligned DK seeds.

    Restricted to words containing jim/ha/kha. Separate marks retain their
    original assignment. Missing secure seeds preserve that component in v2.
    """
    if not any(c in res['word']['text'] for c in 'جحخ'):
        return res
    from skimage.graph import MCP_Geometric
    body = res['ink'] & ~res['marks']; lab = res['labels'].copy()
    dlab = res['_dk_lab']; px, py = res['_px'], res['_py']
    warped = dlab[py, px]
    distances = {}; seeds = {}
    for k, t in enumerate(res['tids'], 1):
        if t == '__none__':
            continue
        mask = warped == k
        distances[k] = ndi.distance_transform_edt(~mask)
        deep = ndi.distance_transform_edt(mask) >= 3
        seeds[k] = body & deep
    for _, _, comp in _pieces(body):
        owners = [k for k in distances if np.any(seeds[k] & comp)]
        oldowners = set(np.unique(lab[comp])) - {0}
        if len(owners) < 2 or not oldowners <= set(owners):
            continue
        costs = []
        for k in owners:
            cost = np.where(comp, 1. + .08 * distances[k] ** 2, np.inf)
            starts = np.transpose(np.nonzero(seeds[k] & comp))
            accumulated, _ = MCP_Geometric(cost).find_costs(starts)
            costs.append(accumulated)
        best = np.argmin(np.array(costs), axis=0)
        lab[comp] = np.array(owners)[best[comp]]
    return dict(res, labels=lab)


def label_print(p, wid, *, fix_detached_ink=False, fix_stems_flag=False,
                fix_stacked_ink=False):
    res = aligned_print(p, wid)
    if fix_detached_ink:
        res = fix_detached(res)
    if fix_stems_flag:
        res = fix_stems(res)
    if fix_stacked_ink:
        res = fix_stacked(res)
    return res
