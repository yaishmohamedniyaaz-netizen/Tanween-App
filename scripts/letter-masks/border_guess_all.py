"""Deterministic, unapproved letter-border proposals. See BORDER_GUESS_ALL.md.

Run from any directory: python scripts/letter-masks/border_guess_all.py
Development: --dev. Locked, once-only evaluation: --test.
Only --dev reads dev labels; --test additionally opens the held-out labels.
The production generator excludes all test approvals from its learned templates.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import random
import subprocess
import time

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from cuts import propose
from pieces import D, letters
from truth_cuts import cuts_from, approved_cuts
from border_shift import guess as shift_guess, joined
from border_shape_model import forms, prep, seg, GH

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
ART = Path(D)
CACHE = ROOT / 'tmp/letter-borders'
OUT = ROOT / 'public/letter-borders-guess'
RULE = 'qpc-hafs-v1-targets-4.0.0'
METHOD = 'copy-joint-shape-v1'
SCALE = 473.6 / 1920


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def write(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n', encoding='utf-8')


def numeric(wid):
    return tuple((0,int(part)) if part.isdecimal() else (1,part) for part in wid.split('.'))


def dump_units():
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / 'units.json'
    subprocess.run(['node', '--experimental-strip-types', str(HERE / 'dump_units.mts'),
                    *map(str, range(1, 605)), '--out', str(path)], check=True, capture_output=True)
    return read(path)


def approval_docs():
    # Chronological file names; a newer snapshot takes precedence. No file is written.
    docs = {}
    paths = sorted((HERE / 'approved').glob('*.json'), key=lambda p: (p.stem[-10:], p.name))
    for p in paths:
        for d in read(p)['words']:
            if d.get('status') == 'approved':
                docs[d['wid']] = d
    pages = sorted({int(d['page']) for d in docs.values() if int(d['page']) > 2})
    # Freeze the original sample split; extra approvals must never move its pages.
    sample = read(HERE / 'approved/all-approvals-2026-11-06.json')['words']
    pages = sorted({int(d['page']) for d in sample if int(d['page']) > 2})
    test_pages = set(pages[1::2])
    sample_ids = {d['wid'] for d in sample}
    dev = sorted((wid for wid, d in docs.items() if wid in sample_ids and int(d['page']) > 2 and int(d['page']) not in test_pages), key=numeric)
    test = sorted((wid for wid, d in docs.items() if wid in sample_ids and int(d['page']) in test_pages), key=numeric)
    training = sorted(set(docs) - set(test), key=numeric)
    return docs, training, dev, test, [p.name for p in paths]


def rle(a):
    flat = a.ravel()
    edges = np.r_[0, np.flatnonzero(np.diff(flat)) + 1, len(flat)]
    return np.column_stack((flat[edges[:-1]], np.diff(edges))).astype(int).ravel().tolist()


def page_words(page, units):
    """Same proposal and unit mapping as export_review + to_app_units, without PNG/RLE round trips."""
    grey = np.array(Image.open(ART / f'p{page}.png').convert('L'))
    items, lab, thick = propose(page)
    geo = {w['wid']: w for w in read(ART / f'p{page}.json')['words']}
    out = []
    for it in items:
        g = geo[it['wid']]
        bx0, by0, bx1, by1 = map(lambda x: int(round(x)), g['body'])
        x0, y0, x1, y1 = max(0, bx0-8), max(0, by0-8), min(grey.shape[1], bx1+8), min(grey.shape[0], by1+8)
        cl = lab[y0:y1, x0:x1]
        pcs = np.zeros(cl.shape, np.int32)
        kinds = dict(it['all'])
        owned = [pid for pid, k in it['all'] if k == 'skeleton'] + [pid for pid, k in it['all'] if k != 'skeleton']
        skeleton = [i for i, pid in enumerate(owned, 1) if kinds[pid] == 'skeleton']
        for i, pid in enumerate(owned, 1):
            pcs[cl == pid] = i
        u = units[it['wid']]['units']
        old = letters(g['text']); offsets = []; pos = 0
        for ch, marks in old:
            offsets.append(pos); pos += 1 + len(marks)
        mapping = [next(i for i, q in enumerate(u) if q['start'] <= o < q['end']) for o in offsets]
        lm = np.zeros(cl.shape, np.int32)
        oldsp = {}
        xs = np.arange(x0, x1)
        for group, pid, box, cs in it.get('groups', []):
            edges = [box[2]] + list(cs) + [box[0]]
            for k, li in enumerate(group):
                mask = (cl == pid) & ((xs < edges[k]) & (xs >= edges[k+1]))[None, :]
                lm[mask] = mapping[li] + 1
                cols = np.flatnonzero(mask.any(0))
                if len(cols): oldsp[li] = (int(cols.min())+x0, int(cols.max())+x0)
        for pid, box in it.get('marks', []):
            cx = (box[0]+box[2])/2
            if oldsp:
                li = min(oldsp, key=lambda i: max(oldsp[i][0]-cx, cx-oldsp[i][1], 0))
                lm[cl == pid] = mapping[li]+1
        w = dict(wid=it['wid'], page=page, text=g['text'], box=[x0,y0,x1,y1],
                 body=g['body'], w=x1-x0, h=y1-y0, letters=[q['show'] for q in u],
                 tids=[q['tid'] for q in u], silent=[q['silent'] for q in u],
                 oldToNew=mapping, skeleton=skeleton, status=it['status'],
                 _ink=grey[y0:y1,x0:x1]<128, _pcs=pcs.ravel(), _thick=thick)
        sp = []
        for i in range(len(u)):
            skmask = (lm == i+1) & np.isin(pcs, skeleton)
            mask = skmask if skmask.any() else ((lm == i+1) & (pcs > 0))
            cols = np.flatnonzero(mask.any(0))
            sp.append([int(cols.min()), int(cols.max())+1] if len(cols) else None)
        w['_first'] = cuts_from(w, sp)
        # Outer ink is measured inside the immutable body box. Padded crops can
        # contain neighbours; never use their ink as this word's extent.
        own = (pcs > 0) & w['_ink']
        own[:, :bx0-x0] = False; own[:, bx1-x0:] = False
        cols = np.flatnonzero(own.any(0))
        if not len(cols):
            mask = w['_ink'].copy(); mask[:, :bx0-x0] = False; mask[:, bx1-x0:] = False
            cols = np.flatnonzero(mask.any(0))
        if not len(cols): raise ValueError(f'No ink: {w["wid"]}')
        w['_ends'] = [min(int(cols.max())+1,int(np.floor(g['body'][2]))-x0),
                      max(int(cols.min()),int(np.ceil(g['body'][0]))-x0)]
        out.append(w)
    return out


def constrain(cuts, w):
    n = len(w['tids']); right, left = w['_ends']
    if right-left < 2*n: raise ValueError(f'Insufficient ink width: {w["wid"]}')
    c = [right] + [int(round(x)) for x in cuts[1:-1]] + [left]
    if len(c) != n+1: raise ValueError(f'Wrong cut count: {w["wid"]}')
    for i in range(1, n): c[i] = min(c[i-1]-2, max(left+2*(n-i), c[i]))
    return c


def truth_for(words, docs, ids):
    selected = {wid: words[wid] for wid in ids}
    for w in selected.values(): w['pieces'] = rle(w['_pcs'])
    truth = approved_cuts(selected, [docs[wid] for wid in ids])
    if set(truth) != set(ids): raise ValueError(f'Approval/unit mismatch: {set(ids)-set(truth)}')
    return truth


def profile(ink, baseline, height, bins=16):
    edges = np.linspace(baseline-.75*height, baseline+.35*height, bins+1).round().astype(int)
    f = np.zeros((bins, ink.shape[1]))
    for i, (a,b) in enumerate(zip(edges, edges[1:])):
        a, b = max(0,a), min(ink.shape[0],b)
        if b > a: f[i] = ink[a:b].mean(0)
    return f


def art(w):
    pcs = w['_pcs'].reshape(w['h'], w['w'])
    ink = np.isin(pcs, w['skeleton']) & w['_ink']
    if not ink.any(): ink = (pcs > 0) & w['_ink']
    if not ink.any(): ink = w['_ink']
    rows = np.flatnonzero(ink.any(1))
    return ink, int(np.argmax(ink.sum(1))), int(rows[-1]-rows[0]+1)


def dtw(a, b):
    cost = np.abs(a[:,:,None]-b[:,None,:]).sum(0)
    n,m = cost.shape
    d = np.full((n+1,m+1), np.inf); d[0,0] = 0
    for i in range(1,n+1):
        c = cost[i-1]; cumulative = np.cumsum(c)
        d[i,1:] = cumulative + np.minimum.accumulate(np.minimum(d[i-1,:m], d[i-1,1:]) - np.r_[0,cumulative[:-1]])
    path = []; i,j = n,m
    while i and j:
        path.append((i-1,j-1))
        step = int(np.argmin([d[i-1,j-1], d[i-1,j], d[i,j-1]]))
        if step != 2: i -= 1
        if step != 1: j -= 1
    return path, float(np.mean([cost[i,j] for i,j in path]))


def copy_borders(src, cuts, dst):
    sk,sb,sh = art(src); dk,db,dh = art(dst)
    ratio = dh/sh
    scaled = np.array(Image.fromarray((sk*255).astype('uint8')).resize(
        (max(1,round(src['w']*ratio)), max(1,round(src['h']*ratio))), Image.Resampling.BILINEAR)) > 127
    sr,sl = [round(v*ratio) for v in src['_ends']]; dr,dl = dst['_ends']
    a = profile(dk[:,dl:dr], db, dst['h'])[:,::-1]
    b = profile(scaled[:,sl:sr], round(sb*ratio), dst['h'])[:,::-1]
    path,cost = dtw(a,b); mapping = defaultdict(list)
    for i,j in path: mapping[j].append(i)
    c = [dr]
    for x in cuts[1:-1]:
        j = min(max(round(sr-x*ratio),0), b.shape[1]-1)
        c.append(round(dr-np.mean(mapping[j])))
    return constrain(c+[dl],dst),cost


class Model:
    def __init__(self, words, truth, ids):
        self.sources = defaultdict(list); self.shapes = defaultdict(list); self.widths = defaultdict(list)
        for wid in sorted(ids, key=numeric):
            w = words[wid]; prep(w)
            self.sources[(w['text'], tuple(forms(w['letters'])))].append((w,truth[wid]))
            for i,key in enumerate(forms(w['letters'])):
                a,b = truth[wid][i+1],truth[wid][i]
                if a < 0 or b > w['w'] or b-a < 2: continue
                self.shapes[key].append(seg(w['_Fc'],a,b))
                self.widths[key].append((b-a)/w['h'])
        self.shapes = {key: np.array(v) for key,v in self.shapes.items()}

    def shape(self, w, strength=1.0):
        prep(w); first = constrain(shift_guess(w),w); n = len(w['tids'])
        if n == 1: return first
        right,left = w['_ends']; h = w['h']; sk,bl,_ = art(w)
        col = sk.sum(0).astype(float); col /= max(1,np.percentile(col[col>0],90))
        # Bounded DP over local shifts; thin baseline joins have low column cost,
        # while tall strokes incur a penalty. The width prior stays weak.
        positions = [[right]]
        for i in range(1,n):
            centre = first[i]; radius = max(12,round(.14*h))
            positions.append(sorted({centre, *range(max(left+2*(n-i),centre-radius), min(right-2*i,centre+radius)+1, 3)}, reverse=True))
        positions.append([left]); state = {right: (0.0,[right])}
        for i,key in enumerate(forms(w['letters'])):
            new = {}; temps = self.shapes.get(key)
            for a in positions[i+1]:
                best = None
                for b,(prev,path) in state.items():
                    if b-a < 2: continue
                    value = prev
                    if temps is not None:
                        sample = seg(w['_Fc'],a,b)
                        # Normalised correlation; adjacent row shifts tolerate a
                        # small baseline displacement without changing letter form.
                        scores = []
                        for shift in (-1,0,1):
                            q = np.roll(sample,shift,axis=0).ravel(); q = q-q.mean()
                            t = temps.reshape(len(temps),-1); t = t-t.mean(1)[:,None]
                            corr = (t@q)/np.maximum(np.linalg.norm(t,axis=1)*np.linalg.norm(q),1e-8)
                            scores.append(float(corr.max()))
                        value += strength*(1-max(scores))
                        value += .08*abs(np.log(((b-a)/h)/np.median(self.widths[key])))
                    if i < n-1:
                        value += .3*col[min(a,len(col)-1)] + .8*abs(a-first[i+1])/max(1,.1*h)
                    candidate = (value,path+[a])
                    if best is None or candidate[0] < best[0]: best = candidate
                if best is not None: new[a] = best
            state = new
        return state[left][1]

    def guess(self, w, mode='copy-shift', strength=1.0):
        c = constrain(shift_guess(w),w); source = 'joint'; cost = None
        if mode == 'first': c = constrain(w['_first'],w); source = 'fallback'
        elif mode in ('shape','copy-shape'):
            c = self.shape(w,strength); source = 'shape'
        sources = self.sources.get((w['text'],tuple(forms(w['letters']))),[])
        if mode.startswith('copy') and sources:
            candidates = [(copy_borders(src,t,w), src['wid']) for src,t in sources if src['wid'] != w['wid']]
            if candidates:
                (c,cost),_ = min(candidates,key=lambda q:(q[0][1],numeric(q[1])))
                source = 'copy'
        if w['status'] == 'red' and source == 'joint': source = 'fallback'
        return dict(cuts=c,source=source,copyCost=cost)


def metrics(rows):
    errors=[]; words_ok=exact=bars=letter_count=0; exact_borders=0
    for w,g,t in rows:
        e = [abs(a-b)*SCALE for a,b in zip(g['cuts'][1:-1],t[1:-1])]
        errors += e; words_ok += all(abs(a-b)*SCALE<=2 for a,b in zip(g['cuts'],t))
        exact += g['cuts'] == t
        exact_borders += sum(a==b for a,b in zip(g['cuts'][1:-1],t[1:-1]))
        for i,(r,l) in enumerate(zip(g['cuts'],g['cuts'][1:])):
            centre=(r+l)/2; half=.2*(r-l)
            bars += centre-half >= t[i+1] and centre+half <= t[i]
            letter_count += 1
    n=len(rows); b=len(errors)
    return dict(words=n,innerBorders=b,letters=letter_count,medianPx=float(np.median(errors)) if errors else None,
                bordersWithin2=sum(x<=2 for x in errors)/b if b else None,
                bordersOver5=sum(x>5 for x in errors)/b if b else None,
                wordsWithin2=words_ok/n if n else None,exactWords=exact/n if n else None,
                exactBorders=exact_borders/b if b else None,shortBar=bars/letter_count if letter_count else None)


def load_approved_words(units, docs):
    words={}
    for p in sorted({int(d['page']) for d in docs.values()}):
        words.update((w['wid'],w) for w in page_words(p,units) if w['wid'] in docs)
    return words


def evaluate_dev(units):
    docs,training,dev,test,files=approval_docs(); words=load_approved_words(units,docs)
    truth=truth_for(words,docs,training)
    results={}; predictions={}
    for mode,strength in [('first',1),('shift',1),('copy-shift',1),('shape',.6),('shape',1.2),('copy-shape',.6),('copy-shape',1.2)]:
        name=f'{mode}:{strength}'; rows=[]
        for wid in dev:
            # A dev drawing never trains its own predictor (including copy).
            model=Model(words,truth,[x for x in training if x!=wid])
            g=model.guess(words[wid],mode,strength); rows.append((words[wid],g,truth[wid]))
        results[name]=metrics(rows); predictions[name]=rows
        print(name,json.dumps(results[name]),flush=True)
    write(HERE/'dev-comparison.json',results)
    write(HERE/'dev-details.json', {name:[dict(wid=w['wid'],page=w['page'],text=w['text'],letters=w['letters'],
        status=w['status'],guess=g,truth=t,joined=sum(joined(w,x) for x in w['_first'][1:-1]),
        maxErrorPx=max(abs(a-b)*SCALE for a,b in zip(g['cuts'],t))) for w,g,t in rows] for name,rows in predictions.items()})
    # Candidate selection and confidence calibration are deliberately separate
    # from hidden-test scoring. Freeze config after reviewing dev-comparison.
    return words,truth,predictions


def confidence(w,g):
    # Frozen on dev. Five agreeing copy words were all within 2px, versus 0/1
    # for the remaining copy word. This is a pilot label, not statistical proof.
    if g['source'] == 'copy':
        first = constrain(w['_first'],w)
        if max(abs(a-b)*SCALE for a,b in zip(first,g['cuts'])) <= 2:
            return 'high'
        return 'medium'
    return 'low'


def input_fingerprint():
    files = [HERE/'border_guess_all.py', HERE/'dump_units.mts', HERE/'pieces2.py',
             HERE/'pieces.py', HERE/'cuts.py', HERE/'truth_cuts.py', HERE/'border_shift.py',
             HERE/'border_shape_model.py', ROOT/'src/lib/judgingUnits.ts', ROOT/'src/lib/recitedNeighbours.ts']
    files += sorted((HERE/'approved').glob('*.json'))
    files += sorted((ROOT/'public/letter-borders').glob('*.json'))
    files += sorted(ART.glob('p*.*')) + sorted((ROOT/'public/pages').glob('p*.json'))
    h=hashlib.sha256()
    for path in files:
        h.update(path.relative_to(ROOT).as_posix().encode()); h.update(path.read_bytes())
    return h.hexdigest()


def evaluation(units,which):
    dest=HERE/f'{which}-evaluation.json'
    if which == 'test' and dest.exists():
        raise SystemExit('Test already scored: read test-evaluation.json; do not tune or overwrite it.')
    docs,training,dev,test,files=approval_docs(); words=load_approved_words(units,docs)
    truth=truth_for(words,docs,training)
    model=Model(words,truth,training)
    selected = dev if which=='dev' else test
    predictions={}; rows=[]; baseline=[]; original=[]
    # Produce/freeze every prediction before extracting any held-out cuts.
    for wid in selected:
        m=Model(words,truth,[x for x in training if x!=wid]) if which=='dev' else model
        predictions[wid]=m.guess(words[wid])
    if which=='test': truth.update(truth_for(words,docs,test))
    for wid in selected:
        w=words[wid]; g=predictions[wid]; g['confidence']=confidence(w,g)
        rows.append((w,g,truth[wid])); baseline.append((w,model.guess(w,'shift'),truth[wid]))
        original.append((w,model.guess(w,'first'),truth[wid]))
    by_level={level:metrics([r for r in rows if r[1]['confidence']==level]) for level in ['high','medium','low']}
    worst=[]; pairs=defaultdict(list)
    for w,g,t in rows:
        errors=[round(abs(a-b)*SCALE,6) for a,b in zip(g['cuts'],t)]
        worst.append(dict(wid=w['wid'],page=w['page'],text=w['text'],confidence=g['confidence'],source=g['source'],
                          errorsPx=errors,maxErrorPx=max(errors),guess=g['cuts'],approved=t))
        fs=forms(w['letters'])
        for i,e in enumerate(errors[1:-1]): pairs[f'{fs[i][0]} | {fs[i+1][0]}'].append(e)
    pair_rows=[dict(pair=k,borders=len(v),over5=sum(x>5 for x in v),meanPx=sum(v)/len(v),maxPx=max(v)) for k,v in pairs.items()]
    report=dict(method=METHOD,split=which,trainingWords=len(training),approvalFiles=files,inputSha256=input_fingerprint(),
                overall=metrics(rows),first=metrics(original),methodA=metrics(baseline),confidence=by_level,
                worst=sorted(worst,key=lambda r:(-r['maxErrorPx'],numeric(r['wid'])))[:10],
                failingPairs=sorted(pair_rows,key=lambda r:(-r['over5'],-r['maxPx'],r['pair'])),
                predictions=worst)
    # Exclusive creation is a second guard against accidental repeat test scoring.
    if which=='test':
        with dest.open('x',encoding='utf-8') as f: json.dump(report,f,ensure_ascii=False,separators=(',',':')); f.write('\n')
    else: write(dest,report)
    contact([(words[r['wid']],predictions[r['wid']],truth[r['wid']]) for r in report['worst']],
            HERE/'contact'/f'{which}-worst.png',f'{which.upper()}: guessed cyan / owner magenta',columns=2)
    print(json.dumps({k:report[k] for k in ('split','overall','first','methodA','confidence')},indent=2),flush=True)


def contact(rows,path,title,columns=4):
    cellw,cellh=480,220
    canvas=Image.new('RGB',(columns*cellw,60+((len(rows)+columns-1)//columns)*cellh),'#eeeeee')
    draw=ImageDraw.Draw(canvas); font=ImageFont.load_default(size=17)
    draw.text((16,18),title,fill='black',font=font)
    for index,(w,g,truth) in enumerate(rows):
        col,row=index%columns,index//columns; x=col*cellw+12; y=60+row*cellh
        label=g.get('confidence',confidence(w,g))
        draw.text((x,y+5),f'p{w["page"]} {w["wid"]}  {label} / {g["source"]}',fill='black',font=font)
        crop=Image.open(ART/f'p{w["page"]}.png').convert('RGB').crop(w['box'])
        ratio=min((cellw-24)/crop.width,(cellh-60)/crop.height,1.5)
        size=(round(crop.width*ratio),round(crop.height*ratio)); crop=crop.resize(size,Image.Resampling.LANCZOS)
        ox=x+(cellw-24-size[0])//2; oy=y+35
        canvas.paste(crop,(ox,oy))
        for c in g['cuts']:
            xx=ox+round(c*ratio); draw.line((xx,oy,xx,oy+size[1]),fill='#0089a4',width=2)
        if truth:
            for c in truth:
                xx=ox+round(c*ratio); draw.line((xx,oy+size[1]-12,xx,oy+size[1]+5),fill='#bb0066',width=3)
        # Short bar sits inside the bottom of the word crop, only as a review aid.
        for r,l in zip(g['cuts'],g['cuts'][1:]):
            mid=(r+l)/2; half=.2*(r-l)
            draw.line((ox+round((mid-half)*ratio),oy+size[1]-6,ox+round((mid+half)*ratio),oy+size[1]-6),fill='#0089a4',width=3)
    Path(path).parent.mkdir(parents=True,exist_ok=True); canvas.save(path)


def production(units):
    start=time.perf_counter(); docs,training,dev,test,files=approval_docs()
    approved_words=load_approved_words(units,docs); truth=truth_for(approved_words,docs,training)
    model=Model(approved_words,truth,training)
    existing={}
    for p in (ROOT/'public/letter-borders').glob('p*.json'): existing.update(read(p)['words'])
    all_meta={}
    for page in range(1,605):
        for w in read(ART/f'p{page}.json')['words']:
            if w['role']=='letter': all_meta[w['wid']]=dict(page=page,text=w['text'])
    counts=Counter(w['text'] for w in all_meta.values())
    random_ids=random.Random(20261106).sample(sorted([x for x in all_meta if all_meta[x]['page']>=3],key=lambda x:(all_meta[x]['page'],numeric(x))),200)
    random_set=set(random_ids); captured={}; lows=[]; report=[]; sources=Counter(); total=Counter()
    for page in range(1,605):
        words=page_words(page,units); output={}; pc=Counter(words=len(words))
        for w in words:
            wid=w['wid']
            if wid in existing:
                pc['approved']+=1
                if wid in random_set:
                    c=[x-w['box'][0] for x in existing[wid]['x']]
                    captured[wid]=(w,dict(cuts=c,source='approved',confidence='approved'),None)
                continue
            g=model.guess(w); level=confidence(w,g); g['confidence']=level
            x=[v+w['box'][0] for v in g['cuts']]
            if not (w['body'][0]<=x[-1]<x[0]<=w['body'][2]): raise ValueError(f'Outside box: {wid}')
            if min(a-b for a,b in zip(x,x[1:]))<2: raise ValueError(f'Narrow letter: {wid}')
            output[wid]=dict(tids=w['tids'],x=x,confidence=level,source=g['source'])
            pc['guessed']+=1; pc[level]+=1; sources[g['source']]+=1
            if level=='low':
                lows.append(dict(wid=wid,page=page,text=w['text'],occurrences=counts[w['text']],letters=len(w['tids']),source=g['source']))
            if wid in random_set: captured[wid]=(w,g,None)
        total.update(pc); report.append(dict(page=page,**{k:pc[k] for k in ['words','approved','guessed','high','medium','low']}))
        write(OUT/f'p{page}.json',dict(page=page,ruleVersion=RULE,method=METHOD,words=output))
        if page%25==0: print(f'Page {page}/604: {total["guessed"]} guesses, {time.perf_counter()-start:.1f}s',flush=True)
    write(OUT/'index.json',dict(ruleVersion=RULE,method=METHOD,pages=list(range(1,605))))
    lows.sort(key=lambda r:(-r['occurrences'],r['text'],r['page'],numeric(r['wid'])))
    write(HERE/'review-queue.json',dict(method=METHOD,order='spelling frequency descending, then spelling/page/word; low confidence only',words=lows))
    for i in range(10):
        contact([captured[x] for x in random_ids[i*20:(i+1)*20]],HERE/'contact'/f'random-{i+1:02}.png',f'Unapproved guesses: sample {i+1}/10 | seed 20261106 | borders + 40% bars')
    # One representative of each common spelling; forty repeated instances of
    # the same word would waste the owner's review effort.
    representatives=[]; seen=set()
    for r in lows:
        if r['text'] in seen: continue
        seen.add(r['text']); representatives.append(r)
        if len(representatives)==40: break
    bypage=defaultdict(set)
    for r in representatives: bypage[r['page']].add(r['wid'])
    common={}
    for p,ids in sorted(bypage.items()):
        for w in page_words(p,units):
            if w['wid'] in ids:
                g=model.guess(w); g['confidence']='low'; common[w['wid']]=(w,g,None)
    contact([common[r['wid']] for r in representatives],HERE/'contact/common-low-40.png','40 common spellings: low confidence | cyan borders + 40% bars')
    write(HERE/'contact/manifest.json',dict(seed=20261106,randomWords=[dict(wid=x,**all_meta[x]) for x in random_ids],commonLow=representatives))
    digest=hashlib.sha256()
    for p in sorted(OUT.glob('*.json')): digest.update(p.name.encode()); digest.update(p.read_bytes())
    summary=dict(method=METHOD,ruleVersion=RULE,totals=dict(total),sources=dict(sources),pages=report,
                 approvalFiles=files,trainingWords=len(training),heldOutWordsExcluded=len(test),
                 semanticOnlyWordsWithoutArtworkBoxes=len(set(units)-set(all_meta)),
                 outputSha256=digest.hexdigest(),inputSha256=input_fingerprint(),reviewQueueWords=len(lows))
    write(HERE/'full-mushaf-report.json',summary)
    print(json.dumps({k:v for k,v in summary.items() if k!='pages'},indent=2),flush=True)
    print(f'Complete in {time.perf_counter()-start:.2f} seconds',flush=True)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dev',action='store_true')
    parser.add_argument('--test',action='store_true')
    parser.add_argument('--calibrate',action='store_true')
    args=parser.parse_args()
    units=dump_units()
    if args.dev: evaluate_dev(units)
    elif args.calibrate: evaluation(units,'dev')
    elif args.test: evaluation(units,'test')
    else: production(units)


if __name__ == '__main__': main()
