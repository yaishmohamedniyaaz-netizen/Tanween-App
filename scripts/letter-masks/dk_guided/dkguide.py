"""DigitalKhatt-guided letter areas on the printed artwork (pilot).

For one word: render each DigitalKhatt letter unit (tid) as its own mask, align
the DigitalKhatt word onto the print word, then give every print ink pixel the
letter of the nearest aligned DigitalKhatt letter. Small separate ink pieces
(dots, harakat) keep one letter for the whole piece.
"""
import json, io
from functools import lru_cache
from pathlib import Path
import numpy as np
from PIL import Image
import cairosvg
from scipy import ndimage as ndi

REPO = Path(__file__).resolve().parents[3]
ART = REPO / 'public/mushaf/1405-artwork-5a5f9f3846158475'
DK = REPO / 'public/mushaf-dk/dk-web-4213fab-v1'


@lru_cache(None)
def glyphs():
    return json.loads((DK / 'glyphs.json').read_text())


@lru_cache(None)
def dk_page(p):
    return json.loads((DK / f'p{p}.json').read_text())


@lru_cache(None)
def art_page(p):
    return json.loads((ART / f'p{p}.json').read_text())


@lru_cache(8)
def art_alpha(p):
    return np.array(Image.open(ART / f'p{p}.png').convert('RGBA'))[:, :, 3]


def art_word(p, wid, pad=6, reach=40):
    """The word's ink: every ink piece that touches the word's body box, kept whole
    (a crop alone cuts long strokes and lets neighbours in)."""
    w = next(w for w in art_page(p)['words'] if w['wid'] == wid)
    x0, y0, x1, y1 = [int(round(v)) for v in w['body']]
    A = art_alpha(p)
    big = (max(0, x0 - reach), max(0, y0 - reach), min(A.shape[1], x1 + reach), min(A.shape[0], y1 + reach))
    a = A[big[1]:big[3], big[0]:big[2]]
    comps, n = ndi.label(a > 90)
    core = comps[y0 - big[1]:y1 - big[1], x0 - big[0]:x1 - big[0]]
    keep = np.isin(comps, np.unique(core[core > 0]))
    # pieces mostly outside the body belong to a neighbour; keep only those mostly inside
    out = np.zeros_like(keep)
    for c in np.unique(core[core > 0]):
        m = comps == c
        ys, xs = np.nonzero(m)
        inside = ((xs + big[0] >= x0) & (xs + big[0] < x1)).mean()
        if inside >= 0.5:
            out |= m
    ys, xs = np.nonzero(out)
    bx0, by0, bx1, by1 = xs.min() - pad, ys.min() - pad, xs.max() + 1 + pad, ys.max() + 1 + pad
    bx0, by0 = max(0, bx0), max(0, by0)
    alpha = np.where(out, a, 0)[by0:by1, bx0:bx1]
    return w, (big[0] + bx0, big[1] + by0, big[0] + bx1, big[1] + by1), alpha


def dk_letters(p, wid, pad=6):
    """Per-tid masks of the DigitalKhatt word, rendered 1 unit = 1 artwork px."""
    page = dk_page(p)
    wi = next(i for i, w in enumerate(page['words']) if w['wid'] == wid)
    word = page['words'][wi]
    x0, y0, x1, y1 = word['body']
    box = (x0 - pad, y0 - pad, x1 + pad, y1 + pad)
    W, H = int(np.ceil(box[2] - box[0])), int(np.ceil(box[3] - box[1]))
    line = next(l for l in page['lines'] if l['n'] == word['line'])
    groups = {}
    for g in line['g']:
        if g[3] != wi:
            continue
        tids = [page['units'][g[4]]] if g[4] >= 0 else ['__none__']
        if len(g) > 5:
            tids.append(page['units'][g[5]])
        for t in tids:
            groups.setdefault(t, []).append(g)
    masks = {}
    for t, gs in groups.items():
        uses = ''.join(f'<path d="{glyphs()[str(g[0])]}" transform="translate({g[1]} {g[2]})"/>' for g in gs)
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="{box[0]} {box[1]} {W} {H}">'
               f'<g transform="translate({line["right"]} {line["base"]}) scale({line["sx"]} {-line["sy"]})">{uses}</g></svg>')
        png = cairosvg.svg2png(bytestring=svg.encode())
        masks[t] = np.array(Image.open(io.BytesIO(png)).convert('RGBA'))[:, :, 3] > 100
    return word, box, masks


def align(dk_masks, dk_shape, art_ink):
    """Scale + shift the DK word onto the print word (box fit, then a small
    search that maximises ink overlap). Returns a function mapping print pixel
    coords -> DK pixel coords."""
    dk_any = np.zeros(dk_shape, bool)
    for m in dk_masks.values():
        dk_any |= m
    def bbox(m):
        ys, xs = np.nonzero(m)
        return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    ax0, ay0, ax1, ay1 = bbox(art_ink)
    dx0, dy0, dx1, dy1 = bbox(dk_any)
    best = None
    H, W = art_ink.shape
    yy, xx = np.mgrid[0:H, 0:W]
    ink_y, ink_x = np.nonzero(art_ink)
    dt_dk = ndi.distance_transform_edt(~dk_any)
    for sxf in (0.94, 0.97, 1.0, 1.03, 1.06):
        for syf in (0.94, 0.97, 1.0, 1.03, 1.06):
            sx = (dx1 - dx0) / (ax1 - ax0) * sxf
            sy = (dy1 - dy0) / (ay1 - ay0) * syf
            cx_a, cy_a = (ax0 + ax1) / 2, (ay0 + ay1) / 2
            cx_d, cy_d = (dx0 + dx1) / 2, (dy0 + dy1) / 2
            for ox in range(-4, 5, 2):
                for oy in range(-4, 5, 2):
                    mx = (ink_x - cx_a) * sx + cx_d + ox
                    my = (ink_y - cy_a) * sy + cy_d + oy
                    ok = (mx >= 0) & (mx < dk_shape[1]) & (my >= 0) & (my < dk_shape[0])
                    d = np.full(mx.shape, 30.0)
                    d[ok] = dt_dk[my[ok].astype(int), mx[ok].astype(int)]
                    score = np.mean(np.minimum(d, 30))
                    if best is None or score < best[0]:
                        best = (score, sx, sy, cx_a, cy_a, cx_d + ox, cy_d + oy)
    _, sx, sy, cx_a, cy_a, cx_d, cy_d = best
    return (lambda x, y: ((x - cx_a) * sx + cx_d, (y - cy_a) * sy + cy_d)), best[0]


def label_print(p, wid, flow=True):
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
            'dk_body_areas': dk_body_areas, 'scale_area': scale_area}


def bars(res, base_frac=0.45):
    """Underline per letter: x-range of the letter's ink in the lower part of the word."""
    out = {}
    lab = res['labels']
    H = lab.shape[0]
    for k, t in enumerate(res['tids']):
        ys, xs = np.nonzero(lab == k + 1)
        if len(xs) == 0:
            out[t] = None; continue
        lower = ys >= np.percentile(ys, 100 * (1 - base_frac)) if len(ys) > 20 else np.ones_like(ys, bool)
        out[t] = (int(xs[lower].min()), int(xs[lower].max()) + 1)
    return out
