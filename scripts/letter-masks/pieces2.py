"""Pass 2: label ink on the whole page, give each piece to one word, classify by shape."""
import json, sys, collections, numpy as np
from PIL import Image
from scipy import ndimage
from pieces import D, letters, groups
def page_pieces(page):
    geo = json.load(open(f'{D}/p{page}.json', encoding='utf-8'))
    ink = np.array(Image.open(f'{D}/p{page}.png').convert('L')) < 128
    lab, n = ndimage.label(ink, structure=np.ones((3, 3)))
    objs = ndimage.find_objects(lab)
    words = [w for w in geo['words'] if w['role'] == 'letter']
    owner = {}
    for wi, w in enumerate(words):
        x0, y0, x1, y1 = [int(round(v)) for v in w['body']]
        ids, counts = np.unique(lab[y0:y1, x0:x1], return_counts=True)
        for i, c in zip(ids, counts):
            if i == 0: continue
            if c > owner.get(i, (0, -1))[0]: owner[i] = (c, wi)
    per = collections.defaultdict(list)
    for i, (c, wi) in owner.items():
        sl = objs[i - 1]; area = int((lab[sl] == i).sum())
        if c < 0.5 * area: continue          # mostly outside every word box
        per[wi].append(dict(id=i, box=(sl[1].start, sl[0].start, sl[1].stop, sl[0].stop), area=area))
    # baseline of each line = the row with the most ink inside that line's word boxes
    base = {}
    for ln in sorted(set(w['line'] for w in words)):
        ws = [w for w in words if w['line'] == ln]
        y0 = int(min(w['band'][1] for w in ws)); y1 = int(max(w['band'][3] for w in ws))
        x0 = int(min(w['body'][0] for w in ws)); x1 = int(max(w['body'][2] for w in ws))
        prof = ink[y0:y1, x0:x1].sum(1)
        base[ln] = y0 + int(np.argmax(prof))
    out = []
    for wi, w in enumerate(words):
        b = base[w['line']]
        ps = per[wi]
        for p in ps:
            top, bot = p['box'][1], p['box'][3]
            p['kind'] = 'skeleton' if (top - 6 <= b <= bot + 6 and p['area'] > 60) else 'mark'
        out.append(dict(word=w, pieces=ps, baseline=b))
    return out, lab
if __name__ == '__main__':
    pages = range(1, 605) if len(sys.argv) < 2 else [int(a) for a in sys.argv[1:]]
    t = collections.Counter()
    for p in pages:
        res, _ = page_pieces(p)
        for r in res:
            ls = letters(r['word']['text']); gs = groups(ls)
            sk = sum(1 for q in r['pieces'] if q['kind'] == 'skeleton')
            t['words'] += 1; t['match'] += sk == len(gs); t['letters'] += len(ls)
            if sk == len(gs): t['alone_ok'] += sum(1 for g in gs if len(g) == 1); t['letters_ok'] += len(ls)
    print(dict(t)); print('piece count matches: %.1f%%' % (100*t['match']/t['words']))
    print('letters in matching words: %.1f%%; of those alone in piece: %.1f%%' % (100*t['letters_ok']/t['letters'], 100*t['alone_ok']/max(1,t['letters_ok'])))
