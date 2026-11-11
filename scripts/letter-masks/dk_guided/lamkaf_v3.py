"""Candidate label fix after the Checkpoint 2 test: lam before a non-final kaf.

Opt-in and NOT part of the published dk-guided-v3 bars (not in checkpoint2/kept.json,
not read by run_v3.py). Kept in its own file so the v3 run fingerprint is unchanged.
"""
import numpy as np
from labels_v3 import _stems

ALIFS = 'اأإآٱ'
def _units(res):
    text = res['word']['text']; idx = []
    for t in res['tids']:
        try: idx.append(int(t.rsplit('@r', 1)[1]))
        except (IndexError, ValueError): idx.append(None)
    real = [i for i in idx if i is not None]
    return [('' if i is None else text[i:min([j for j in real if j > i], default=len(text))]) for i in idx], idx

STEMMED = ALIFS + 'لطظ'

def fix_lamkaf(res, far=3.0, keep=1.5, reach=2.5):
    """Lam followed by a kaf that is not word-final (often the long S-shaped kaf, which the
    DigitalKhatt reference draws as a plain kaf): the lam keeps its own upright stroke and
    nothing far left of it; the ink left of that goes to the kaf.

    The lam stroke is the tall print stroke under the lam label, or failing that the first
    tall stroke just right of it that no other stem letter owns. Nothing else is touched."""
    units, idx = _units(res); text = res['word']['text']
    real = [k for k, i in enumerate(idx) if i is not None]
    pairs = [(a, b) for a, b in zip(real, real[1:])
             if text[idx[a]] == 'ل' and text[idx[b]] == 'ك' and b != real[-1]
             and not any(c in ALIFS for c in units[a][1:])]
    if not pairs: return res
    body = res['ink'] & ~res['marks']
    stems = [m for _, _, m in _stems(body)]
    lab = res['labels'].copy(); changed = False
    for a, b in pairs:
        lam = (lab == a + 1) & body
        if not lam.any(): continue
        lcols = np.nonzero(lam.any(0))[0]; l0, l1 = lcols.min(), lcols.max() + 1
        best = None
        for s in stems:
            xs = np.nonzero(s)[1]; x0, x1 = xs.min(), xs.max() + 1; sw = x1 - x0
            own = (lab[s] == a + 1).mean()
            ids, c = np.unique(lab[s], return_counts=True); top = int(ids[np.argmax(c)])
            other_stem = top not in (0, a + 1) and c.max() >= .85 * c.sum() and text[idx[top - 1]] in STEMMED if top and idx[top - 1] is not None else False
            if own >= .5: cand = (2, own, s, x0, x1)
            elif not other_stem and 0 <= x0 - l1 <= reach * sw or (not other_stem and l0 <= x0 < l1 and own < .5 and x1 > l1 - sw): cand = (1, -abs(x0 - l1), s, x0, x1)
            else: continue
            if best is None or cand[:2] > best[:2]: best = cand
        if best is None: continue
        _, _, s, x0, x1 = best; sw = x1 - x0; moved = False
        if (lab[s] == a + 1).mean() < .85:
            prev = real[real.index(a) - 1] + 1 if real.index(a) else 0
            lab[s] = a + 1; moved = True
            left = body & np.isin(lab, [b + 1, prev] if prev else [b + 1]); left[:, x0:] = False
            foot = left.copy(); foot[:, :max(0, x0 - sw)] = False
            lab[left & (lab == prev)] = b + 1                   # ink left of the lam stroke is not the letter before it
            lab[foot] = a + 1                                   # the lam's foot, just left of its stroke
        if moved or x0 - l0 > far * sw:
            cut = int(round(x0 - keep * sw))
            m = (lab == a + 1) & body; m[:, cut:] = False
            if m.any(): lab[m] = b + 1; moved = True
        changed |= moved
    return dict(res, labels=lab) if changed else res
