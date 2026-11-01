"""Split each word's ink into pieces and compare with what the text predicts."""
import json, sys, unicodedata, collections
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage
D = str(Path(__file__).resolve().parents[2] / 'public/mushaf/1405-artwork-5a5f9f3846158475')
NO_LEFT_JOIN = set('اأإآٱدذرزوؤةءٲٳ')   # letters that do not connect to the next letter
NON_JOIN = set('ء')
def letters(text):
    """Base letters with their marks: [(letter, [marks])]."""
    out = []
    for ch in text:
        if unicodedata.category(ch) == 'Mn' or ch in 'ۛۚۗۖۘۙۜ۟۠ۢۥۦۭ':
            if out: out[-1][1].append(ch)
        else:
            out.append([ch, []])
    return out
def groups(ls):
    """Predicted connected skeleton groups (indices of letters)."""
    gs = []; cur = []
    for i, (ch, _) in enumerate(ls):
        if ch in NON_JOIN:
            if cur: gs.append(cur); cur = []
            gs.append([i]); continue
        cur.append(i)
        if ch in NO_LEFT_JOIN:
            gs.append(cur); cur = []
    if cur: gs.append(cur)
    return gs
def analyse(page, img=None):
    geo = json.load(open(f'{D}/p{page}.json'))
    if img is None:
        img = np.array(Image.open(f'{D}/p{page}.png').convert('L')) < 128
    res = []
    for w in geo['words']:
        if w['role'] != 'letter': continue
        x0, y0, x1, y1 = [int(round(v)) for v in w['body']]
        crop = img[y0:y1, x0:x1]
        lab, n = ndimage.label(crop, structure=np.ones((3, 3)))
        areas = ndimage.sum(crop, lab, range(1, n + 1))
        h = y1 - y0
        big = [a for a in areas if a > 0.035 * h * h]
        ls = letters(w['text']); gs = groups(ls)
        res.append(dict(wid=w['wid'], text=w['text'], pieces=len(big), predicted=len(gs),
                        letters=len(ls), alone=sum(1 for g in gs if len(g) == 1), n=n))
    return res
if __name__ == '__main__':
    pages = range(1, 605) if len(sys.argv) < 2 else [int(a) for a in sys.argv[1:]]
    tot = collections.Counter()
    for p in pages:
        for r in analyse(p):
            tot['words'] += 1; tot['letters'] += r['letters']
            tot['match'] += r['pieces'] == r['predicted']
            tot['alone'] += r['alone']
            tot['single_piece_words'] += r['predicted'] == 1
    print(dict(tot))
    print('piece count matches text: %.1f%%' % (100 * tot['match'] / tot['words']))
    print('letters alone in their piece: %.1f%%' % (100 * tot['alone'] / tot['letters']))
