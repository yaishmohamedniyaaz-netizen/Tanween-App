"""Re-key the review data to the app's own letter units (madd alifs and silent letters merged)."""
import json, sys, unicodedata
sys.path.insert(0, __import__('os').path.dirname(__file__))
from pieces import letters
def unrle(a, n):
    out = []; [out.extend([a[k]] * a[k+1]) for k in range(0, len(a), 2)]; return out
def rle(arr):
    out = []; p = arr[0]; n = 0
    for v in arr:
        if v == p: n += 1
        else: out += [p, n]; p = v; n = 1
    return out + [p, n]
data = json.load(open('review-data.json')); units = json.load(open('units.json'))
for w in data['words']:
    u = units[w['wid']]['units']
    # character offset where each python letter starts
    offs = []; pos = 0
    for ch, marks in letters(w['text']):
        offs.append(pos); pos += 1 + len(marks)
    old_to_new = [next(i for i, x in enumerate(u) if x['start'] <= o < x['end']) for o in offs]
    lab = unrle(w['proposal'], w['w'] * w['h'])
    lab = [old_to_new[v - 1] + 1 if v else 0 for v in lab]
    w['proposal'] = rle(lab); w['oldToNew'] = old_to_new; w['oldLetters'] = len(offs)
    w['letters'] = [x['show'] for x in u]; w['tids'] = [x['tid'] for x in u]
    w.pop('groups', None)
json.dump(data, open('review-data-app.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('words', len(data['words']), 'changed', sum(1 for w in data['words'] if len(w['letters']) != w['oldLetters']))
