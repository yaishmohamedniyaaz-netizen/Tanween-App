"""Score every border-guess method against the owner's approved borders.

Usage (from scripts/letter-masks, after building review-data-app.json and
units.json as in docs/CODEX_TASK_LETTER_BORDERS.md):
  python3 border_compare.py review-data-app.json approved/pages1-2-approvals-2026-11-05.json units.json

Errors are borders between letters, in px at desktop page size (473.6 px page).
"words all <= 2px" = words whose every inner border is within 2 px: the share
the owner would not have to touch.
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
words, truth = load(*sys.argv[1:4])
for w in words.values(): prep(w)
ids = [x for x in truth if len(truth[x]) > 2]
p1 = [x for x in truth if words[x]['page'] == 1]; p2 = [x for x in ids if words[x]['page'] == 2]
first = {x: words[x]['_first'] for x in ids}
loo = {x: Model(words, truth, [y for y in truth if y != x]).guess(words[x], **BEST)[0] for x in ids}
m1 = Model(words, truth, p1); held = {x: m1.guess(words[x], **BEST)[0] for x in p2}
font = {x: font_guess(words[x], words[x]['_units'])[0] for x in ids}
print('| Method | Median px | Borders within 2 px | Borders off by more than 5 px | Words with every border within 2 px |')
print('| --- | --- | --- | --- | --- |')
for name, g, sel in [('First guess (today), pages 1-2', first, ids), ('First guess, page 2 only', first, p2),
                     ('Learned shapes, leave one word out, pages 1-2', loo, ids), ('Learned shapes, learn page 1 -> test page 2', held, p2),
                     ('Font + warping (no learning), pages 1-2', font, ids), ('Font + warping, page 2 only', font, p2)]:
    print(row(name, [(truth[x], g[x]) for x in sel]))
for th in [1, 2, 3]:
    sel = [x for x in ids if max(errs(first[x], font[x])) <= th]
    avg = {x: [round((a+b)/2) for a, b in zip(first[x], font[x])] for x in sel}
    ok = sum(all(v <= 2 for v in errs(truth[x], avg[x])) for x in sel)
    print(f'Agreement channel (first guess and font method agree within {th} px): {len(sel)}/{len(ids)} words; correct {ok}/{len(sel)}')
