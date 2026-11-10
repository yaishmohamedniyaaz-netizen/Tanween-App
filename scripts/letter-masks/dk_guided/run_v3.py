"""CP2 final export. Run pages once after kept.json is frozen, then --finalize.

Page files are individually atomic. A pair is resumable only when its input,
configuration and content digests agree; interrupted pairs are regenerated.
No colour output is produced. --self-test never reads or writes public output.
"""
import os
for key in ('OMP_NUM_THREADS', 'OPENBLAS_NUM_THREADS', 'MKL_NUM_THREADS'):
    os.environ[key] = '1'
import argparse
import hashlib
import importlib.metadata
import json
import multiprocessing as mp
import platform
import subprocess
import tempfile
import time
from collections import Counter
from pathlib import Path
import numpy as np
import labels_v3 as L
from bars_v3 import bars_v3
import run_v2 as V2

V1 = V2.V1
G, ROOT, HERE, BARS = V1.G, V1.ROOT, V1.HERE, V1.BARS
OUT = HERE / 'checkpoint2'
RAW = OUT / 'batch'
METHOD = 'dk-guided-v3'
MERGE_HEAD = 'e3efc58'
ORDER = ('collisions', 'detached', 'stems', 'stacked', 'bowl', 'stacked2', 'bowl2')
PROTECTED = ['src', 'public/mushaf', 'public/pages', 'public/mushaf-dk', 'public/letter-borders']
atomic, sha = V1.atomic, V2.sha


def read(path):
    return json.loads(path.read_text())


def digest(obj):
    return hashlib.sha256(V1.encode(obj)).hexdigest()


def configuration():
    flags = read(OUT / 'kept.json')
    assert isinstance(flags, list) and all(isinstance(f, str) for f in flags)
    assert len(flags) == len(set(flags)) and set(flags) <= set(ORDER), flags
    flags = [f for f in ORDER if f in flags]
    sources = [HERE / name for name in ('run_v3.py', 'run_v2.py', 'run_all.py', 'dkguide.py', 'labels_v3.py', 'bars_v2.py', 'bars_v3.py')]
    sources += [HERE.parent / 'dump_units.mts'] + sorted((ROOT / 'src/lib').rglob('*.ts'))
    versions = {n: importlib.metadata.version(n) for n in ('numpy', 'scipy', 'scikit-image', 'Pillow', 'CairoSVG')}
    versions.update(python=platform.python_version(), node=subprocess.check_output(['node', '--version'], text=True).strip())
    config = dict(method=METHOD, ruleVersion=V1.RULE, kept=flags, colourExport=False,
                  thresholds={'coverage': .97, 'narrow-bar': 3, 'fitPercentile': 90},
                  sources={str(p.relative_to(ROOT)): sha(p) for p in sources},
                  glyphsSha256=sha(G.DK / 'glyphs.json'), versions=versions)
    return config, digest(config)


def page_signature(p, config_sha):
    paths = [G.ART / f'p{p}.json', G.ART / f'p{p}.png', G.DK / f'p{p}.json', ROOT / f'public/pages/p{p}.json']
    return digest(dict(configSha256=config_sha, inputs={str(path.relative_to(ROOT)): sha(path) for path in paths}))


def app_units(pages):
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / 'units.json'
        subprocess.run(['node', '--experimental-strip-types', 'scripts/letter-masks/dump_units.mts',
                        *map(str, pages), '--out', str(path)], cwd=ROOT, check=True, capture_output=True)
        return {wid: [u['tid'] for u in row['units']] for wid, row in read(path).items()}


def apply(r, flags):
    # Same sequential label hooks and bar composition used in checkpoint2_trial.
    for key, fn in [('detached', L.fix_detached), ('stems', L.fix_stems), ('stacked', L.fix_stacked)]:
        if key in flags:
            r = fn(r)
    return r, bars_v3(r, fix_colliding='collisions' in flags, fix_bowl='bowl' in flags, fix_stacked2='stacked2' in flags, fix_bowl2='bowl2' in flags)


def metrics_for(r, tids):
    body = r['ink'] & ~r['marks']
    areas, ratios, centres = [], [], []
    for t in tids:
        k = r['tids'].index(t) + 1 if t in r['tids'] else -1
        ys, xs = np.nonzero((r['labels'] == k) & body)
        area = len(xs)
        dk_area = r['dk_body_areas'][k - 1] / r['scale_area'] if k > 0 else 0
        areas.append(area)
        centres.append(float(xs.mean()) if area else None)
        ratios.append(float(area / dk_area) if dk_area else None)
    return dict(fit=float(r['fit']), coverage=float(((r['labels'] > 0) | r['marks'])[r['ink']].mean()),
                bodyAreas=areas, areaRatios=ratios, centres=centres, box=list(r['box']), labelSha256=V2.label_digest(r))


def geometry_checks(bars, box):
    defined = [b for b in bars if b is not None]
    checks = []
    if any(len(b) != 2 or any(type(x) is not int for x in b) or not box[0] <= b[0] < b[1] <= box[2] for b in defined):
        checks.append('bounds')
    if any(left[1] > right[0] for right, left in zip(defined, defined[1:])):
        checks.append('overlap')
    return checks


def convert(r, tids, spans):
    metrics = metrics_for(r, tids)
    bars = [([int(spans[t][0]) + int(r['box'][0]), int(spans[t][1]) + int(r['box'][0])] if spans.get(t) is not None else None) for t in tids]
    checks = []
    if set(tids) != set(r['tids']) - {'__none__'}:
        checks.append('tids')
    if any(b is None or b[1] - b[0] < 3 for b in bars):
        checks.append('narrow-bar')
    if metrics['coverage'] < .97:
        checks.append('coverage')
    invalid = geometry_checks(bars, r['box'])
    if invalid:
        metrics['rejectedBars'] = bars
        # Malformed geometry never enters the public export, even on review words.
        bars = []
        checks += invalid + ['error: invalid bar geometry']
    assert np.isfinite(metrics['fit']) and np.isfinite(metrics['coverage']), 'nonfinite metrics'
    return dict(tids=tids, bars=bars, status='review', checks=checks + ['fit-pending']), metrics


def reusable(raw, bars, p, config_sha, page_sha):
    return (raw.get('page') == bars.get('page') == p and bars.get('method') == METHOD
            and raw.get('configSha256') == bars.get('configSha256') == config_sha
            and raw.get('pageSha256') == bars.get('pageSha256') == page_sha
            and bars.get('metricsSha256') == digest(raw)
            and raw.get('predictionSha256') == digest({wid: {'tids': w['tids'], 'bars': w['bars']} for wid, w in bars['words'].items()}))


def page_job(arg):
    p, config, config_sha = arg
    started = time.monotonic()
    page_sha = page_signature(p, config_sha)
    bp, rp = BARS / f'p{p}.json', RAW / f'p{p}.json'
    if rp.exists() and bp.exists():
        try:
            if reusable(read(rp), read(bp), p, config_sha, page_sha):
                return p, 'skipped'
        except (ValueError, KeyError, TypeError):
            pass
    targets = app_units([p])
    expected = {w['wid'] for w in G.art_page(p)['words'] if w.get('role') == 'letter'}
    assert set(targets) == expected, ('app/art inventory', p)
    words, metrics = {}, {}
    for wid, tids in targets.items():
        r = None
        try:
            r = L.aligned_print(p, wid)
            r, spans = apply(r, config['kept'])
            words[wid], metrics[wid] = convert(r, tids, spans)
        except Exception as exc:
            error = 'error: ' + type(exc).__name__ + ': ' + str(exc)
            words[wid] = dict(tids=tids, bars=[], status='review', checks=[error])
            metrics[wid] = dict(error=error)
            if r is not None:
                try:
                    metrics[wid].update(metrics_for(r, tids))
                except Exception:
                    pass
    raw = dict(page=p, method=METHOD, configSha256=config_sha, pageSha256=page_sha,
               colourExport=False, words=metrics,
               predictionSha256=digest({wid: {'tids': w['tids'], 'bars': w['bars']} for wid, w in words.items()}))
    bars = dict(page=p, ruleVersion=V1.RULE, method=METHOD, configSha256=config_sha,
                pageSha256=page_sha, metricsSha256=digest(raw), words=words)
    atomic(rp, raw)
    atomic(bp, bars)
    G.dk_page.cache_clear(); G.art_page.cache_clear(); G.art_alpha.cache_clear()
    return p, dict(words=len(words), errors=sum('error' in m for m in metrics.values()), seconds=round(time.monotonic() - started, 3))


def finalize():
    config, config_sha = configuration()
    fits, pages = [], []
    for p in range(1, 605):
        raw, bars = read(RAW / f'p{p}.json'), read(BARS / f'p{p}.json')
        assert reusable(raw, bars, p, config_sha, page_signature(p, config_sha)), ('stale or incomplete page', p)
        fits.extend(m['fit'] for m in raw['words'].values() if 'fit' in m)
        pages.append((p, raw, bars))
    assert fits and np.isfinite(fits).all()
    cutoff = float(np.percentile(fits, 90))
    counts, failures, errors = Counter(), Counter(), []
    for p, raw, bars in pages:
        for wid, word in bars['words'].items():
            checks = [c for c in word['checks'] if c not in ('fit', 'fit-pending')]
            if raw['words'][wid].get('fit', 0) > cutoff:
                checks.append('fit')
            word.update(checks=checks, status='review' if checks else 'ok')
            counts[word['status']] += 1
            failures.update(checks)
            if any(c.startswith('error:') for c in checks):
                errors.append(dict(page=p, wid=wid, checks=checks))
        atomic(BARS / f'p{p}.json', bars)
    assert sum(counts.values()) == 77433
    index = dict(method=METHOD, ruleVersion=V1.RULE, pages=list(range(1, 605)), counts=dict(counts),
                 failedChecks=dict(failures), thresholds=dict(config['thresholds'], fit=cutoff, disabled=['size', 'empty-letter', 'order']),
                 fitPopulation=len(fits), missingFitPopulation=77433-len(fits), configSha256=config_sha,
                 configuration=config, colourExport=False)
    atomic(OUT / 'generation-errors.json', errors)
    atomic(OUT / 'automatic-index.json', index)
    atomic(BARS / 'index.json', index)
    print(json.dumps(index), flush=True)
    return index


def self_test():
    assert geometry_checks([[8, 11], [3, 6]], [0, 0, 12, 5]) == []
    assert geometry_checks([[8, 11], [6, 9]], [0, 0, 12, 5]) == ['overlap']
    assert geometry_checks([[10, 13]], [0, 0, 12, 5]) == ['bounds']
    raw = dict(page=1, configSha256='c', pageSha256='p', predictionSha256=digest({'w': {'tids': ['t'], 'bars': [[3, 6]]}}))
    bars = dict(page=1, method=METHOD, configSha256='c', pageSha256='p', metricsSha256=digest(raw), words={'w': dict(tids=['t'], bars=[[3, 6]])})
    assert reusable(raw, bars, 1, 'c', 'p')
    assert not reusable(raw, bars, 1, 'changed', 'p')
    bars['words']['w']['bars'] = [[4, 7]]
    assert not reusable(raw, bars, 1, 'c', 'p')
    print('CP2 runner self-checks passed; no corpus outputs touched.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workers', type=int, default=5)
    parser.add_argument('--pages', default='1:604')
    parser.add_argument('--finalize', action='store_true')
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        self_test()
    elif args.finalize:
        finalize()
    else:
        lo, hi = map(int, args.pages.split(':'))
        assert 1 <= lo <= hi <= 604 and args.workers >= 1
        config, config_sha = configuration()
        atomic(OUT / 'run-configuration.json', dict(configSha256=config_sha, configuration=config))
        with mp.Pool(args.workers) as pool:
            for p, result in pool.imap_unordered(page_job, [(p, config, config_sha) for p in range(lo, hi + 1)]):
                print(p, json.dumps(result), flush=True)
