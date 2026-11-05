"""Score border methods on the owner's regular-page sample.

Usage (from scripts/letter-masks):
  python3 sample_compare.py review-data-app.json approvals.json units.json [dev|test|all]

The sample (sample_review.py) is split by page: every other sampled page is
"test" and stays hidden while methods are tuned on "dev" (plus pages 1-2).
Errors: borders between letters, px at desktop page size (473.6 px page).
"""
import sys, statistics as st
from border_data import load
from border_shape_model import Model, prep, S
from border_font_dtw import guess as font_guess
BEST = dict(ws=1.0, wj=0.5, wsh=1.0, wf=1.0, T=12, step=2)
def errs(c, g): return [abs(a-b)*S for a, b in list(zip(c, g))[1:-1]]
def row(name, pairs):
    e = []; ok = 0; n = 0
    for c, g in pairs:
        if len(c) <= 2: continue
        n += 1; x = errs(c, g); e += x; ok += all(v <= 2 for v in x)
    return f'| {name} | {st.median(e):.2f} | {100*sum(v<=2 for v in e)/len(e):.0f}% | {100*sum(v>5 for v in e)/len(e):.0f}% | {ok}/{n} ({100*ok/n:.0f}%) |'
def split(words, truth):
    pages = sorted({words[x]['page'] for x in truth if words[x]['page'] > 2})
    test_pages = set(pages[1::2])
    dev = [x for x in truth if words[x]['page'] > 2 and words[x]['page'] not in test_pages]
    test = [x for x in truth if words[x]['page'] in test_pages]
    return dev, test
if __name__ == '__main__':
    words, truth = load(*sys.argv[1:4])
    for w in words.values(): prep(w)
    dev, test = split(words, truth); which = sys.argv[4] if len(sys.argv) > 4 else 'dev'
    sel = {'dev': dev, 'test': test, 'all': dev + test}[which]
    sel = [x for x in sel if len(truth[x]) > 2]
    opening = [x for x in truth if words[x]['page'] <= 2]
    first = {x: words[x]['_first'] for x in sel}
    m = Model(words, truth, opening + [x for x in dev if x not in sel])
    learned = {x: m.guess(words[x], **BEST)[0] for x in sel}
    font = {x: font_guess(words[x], words[x]['_units'])[0] for x in sel}
    print(f'Regular-page sample, {which}: {len(sel)} words with 2+ letters, {sum(len(truth[x])-2 for x in sel)} inner borders')
    print('| Method | Median px | Borders within 2 px | Borders off by more than 5 px | Words with every border within 2 px |')
    print('| --- | --- | --- | --- | --- |')
    for name, g in [('First guess (today)', first), ('Learned shapes (from pages 1-2 + dev)', learned), ('Font + warping (no learning)', font)]:
        print(row(name, [(truth[x], g[x]) for x in sel]))
    for th in [1, 2]:
        a = [x for x in sel if max(errs(first[x], font[x])) <= th]
        avg = {x: [round((p+q)/2) for p, q in zip(first[x], font[x])] for x in a}
        ok = sum(all(v <= 2 for v in errs(truth[x], avg[x])) for x in a)
        print(f'Agreement (first guess and font within {th} px): {len(a)}/{len(sel)} words; correct {ok}/{len(a)}')
