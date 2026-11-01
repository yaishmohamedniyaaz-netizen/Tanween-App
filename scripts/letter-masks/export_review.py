"""Export proposed letter areas for chosen pages as JSON for the review screen.

Usage: python3 scripts/letter-masks/export_review.py OUT.json 1 2

Per word: a padded crop of the page artwork (grey PNG, base64), a piece map
(which ink piece each pixel belongs to) and a proposed letter map (which letter
each ink pixel belongs to). Both maps are run-length encoded, row by row.
"""
import base64, io, json, sys
import numpy as np
from PIL import Image
from pieces import D, letters, groups
from cuts import propose

PAD = 8


def rle(arr):
    flat = arr.ravel()
    out = []
    prev = int(flat[0]); n = 0
    for v in flat:
        v = int(v)
        if v == prev:
            n += 1
        else:
            out += [prev, n]; prev = v; n = 1
    out += [prev, n]
    return out


def export(page):
    grey = Image.open(f'{D}/p{page}.png').convert('L')
    g = np.array(grey)
    items, lab, thick = propose(page)
    geo = {w['wid']: w for w in json.load(open(f'{D}/p{page}.json'))['words']}
    words = []
    for it in items:
        w = geo[it['wid']]
        bx0, by0, bx1, by1 = [int(round(v)) for v in w['body']]
        x0, y0 = max(0, bx0 - PAD), max(0, by0 - PAD)
        x1, y1 = min(g.shape[1], bx1 + PAD), min(g.shape[0], by1 + PAD)
        crop_lab = lab[y0:y1, x0:x1]
        ls = letters(w['text'])
        piece_map = np.zeros(crop_lab.shape, np.uint16)
        letter_map = np.zeros(crop_lab.shape, np.uint8)
        piece_ids = []
        # every piece the earlier pass gave to this word, skeleton pieces first
        kinds = dict(it['all'])
        owned = [pid for pid, k in it['all'] if k == 'skeleton'] + [pid for pid, k in it['all'] if k != 'skeleton']
        skeleton = [k for k, pid in enumerate(owned, 1) if kinds[pid] == 'skeleton']
        for k, pid in enumerate(owned, 1):
            piece_map[crop_lab == pid] = k
            piece_ids.append(int(pid))
        # skeleton letters from the proposed cuts
        spans = {}
        for grp, pid, box, cuts in it.get('groups', []):
            m = crop_lab == pid
            edges = [box[2]] + list(cuts) + [box[0]]
            xs = np.arange(x0, x1)
            for k, li in enumerate(grp):
                sel = (xs < edges[k]) & (xs >= edges[k + 1])
                letter_map[m & sel[None, :]] = li + 1
                cols = np.where((m & sel[None, :]).any(0))[0]
                if len(cols): spans[li] = (cols.min() + x0, cols.max() + x0)
        # marks go to the letter whose span holds the mark's centre, else the nearest
        for pid, box in it.get('marks', []):
            cx = (box[0] + box[2]) / 2
            best = None
            for li, (a, b) in spans.items():
                d = 0 if a <= cx <= b else min(abs(cx - a), abs(cx - b))
                if best is None or d < best[0]: best = (d, li)
            if best is not None:
                letter_map[crop_lab == pid] = best[1] + 1
        buf = io.BytesIO(); Image.fromarray(g[y0:y1, x0:x1]).save(buf, 'PNG', optimize=True)
        words.append(dict(
            wid=w['wid'], page=page, line=w['line'], text=w['text'],
            letters=[l + ''.join(m) for l, m in ls],
            groups=[[i for i in grp] for grp in groups(ls)],
            box=[x0, y0, x1, y1], w=x1 - x0, h=y1 - y0,
            png=base64.b64encode(buf.getvalue()).decode(),
            pieces=rle(piece_map), proposal=rle(letter_map), skeleton=skeleton,
            status=it['status'], reason=it.get('reason', ''),
        ))
    return words


if __name__ == '__main__':
    out = sys.argv[1]
    pages = [int(a) for a in sys.argv[2:]]
    data = dict(version=1, source='1405-artwork-5a5f9f3846158475', pages=pages,
                words=[w for p in pages for w in export(p)])
    json.dump(data, open(out, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(len(data['words']), 'words')
