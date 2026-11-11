"""Checkpoint 2 validation of the v3 export, its difference from v2, and the fresh-test evidence.

  validate_cp2.py              after run_v3.py --finalize: checks the automatic export
  validate_cp2.py --finish     after the fresh test: also checks the review evidence, withholds
                               observed wrong/unsure words and writes checkpoint2/results.json
The v2 export is read from git (commit V2_COMMIT), so nothing from Checkpoint 1b is rewritten.
"""
import argparse
import gzip
import json
import subprocess
from collections import Counter
from datetime import datetime, timezone
import review_cp2 as C
import run_v3 as R

OUT, TEST, BARS, ROOT, read, atomic = R.OUT, C.TEST, R.BARS, R.ROOT, R.read, R.atomic
V2_COMMIT = '9f3eab5858a1dcef227ed4954565ab01a12d4dfe'   # handoff commit: still holds the final v2 export
KEPT_SHEETS = ('pattern-1r2', 'pattern-3r2')             # sheets judged under the final kept flags
CP2_COMMIT = '0f29c2c54013989aefb0616cb274f5850b37d25b'  # Checkpoint 2 final export (before the stroke fix)
ROUND = C.ROUND


def git_json(path, commit=V2_COMMIT):
    return json.loads(subprocess.check_output(['git', 'show', f'{commit}:{path}'], cwd=ROOT))


def automatic():
    index = read(BARS / 'index.json')
    config, config_sha = R.configuration()
    assert index['method'] == R.METHOD and index['configSha256'] == config_sha and index['configuration']['kept'] == config['kept']
    assert index['pages'] == list(range(1, 605))
    protected = subprocess.check_output(['git', 'status', '--porcelain', '--', *R.PROTECTED], cwd=ROOT, text=True).strip()
    drift = subprocess.check_output(['git', 'diff', '--stat', R.MERGE_HEAD, 'HEAD', '--', *R.PROTECTED], cwd=ROOT, text=True).strip()
    assert not protected and not drift, 'protected paths changed'
    words = changed = same_labels = 0
    status, v2_status, gained, lost, changed_ok = Counter(), Counter(), 0, 0, 0
    prior_visual = {}
    labels_changed = changed_since_cp2 = 0
    cp2_bars = {}
    for p in range(1, 605):
        bars, raw = read(BARS / f'p{p}.json'), read(R.RAW / f'p{p}.json')
        assert R.reusable(raw, bars, p, config_sha, R.page_signature(p, config_sha)), ('stale page', p)
        old = git_json(f'public/letter-bars-dk/p{p}.json')
        mid = git_json(f'public/letter-bars-dk/p{p}.json', CP2_COMMIT)['words'] if ROUND > 1 else {}
        old_raw = read(R.V2.RAW / f'p{p}.json')['words']
        assert old['method'] == 'dk-guided-v2' and set(old['words']) == set(bars['words']), ('word inventory', p)
        for wid, w in bars['words'].items():
            o = old['words'][wid]
            words += 1
            if ROUND > 1:
                cp2_bars[wid] = mid[wid]['bars']
                changed_since_cp2 += w['bars'] != mid[wid]['bars']
            assert w['tids'] == o['tids'], ('targets changed', wid)
            auto = [c for c in w['checks'] if not c.startswith('visual-')]
            status['ok' if not auto else 'review'] += 1
            oauto = [c for c in o['checks'] if not c.startswith('visual-')]
            v2_status['ok' if not oauto else 'review'] += 1
            for c in o['checks']:
                if c.startswith('visual-'):
                    prior_visual[wid] = dict(page=p, check=c, sameBars=w['bars'] == o['bars'])
            if 'labelSha256' in old_raw[wid]:
                if raw['words'][wid]['labelSha256'] == old_raw[wid]['labelSha256']:
                    same_labels += 1
                else:
                    assert ROUND > 1, ('labels changed', wid)   # only the stroke fix (round 2) may change labels
                    labels_changed += 1
            if w['bars'] != o['bars']:
                changed += 1
                gained += bool(oauto) and not auto
                lost += bool(auto) and not oauto
                changed_ok += not auto
            if not auto:
                bs, box = w['bars'], raw['words'][wid]['box']
                assert len(bs) == len(w['tids']) and all(type(x) is int for b in bs for x in b)
                assert all(box[0] <= b[0] < b[1] <= box[2] and b[1] - b[0] >= 3 for b in bs), ('geometry', wid)
                assert all(l[1] <= r[0] for r, l in zip(bs, bs[1:])), ('overlap', wid)
    assert words == 77433
    result = dict(checkpoint=2, method=R.METHOD, kept=config['kept'], configSha256=config_sha, words=words,
                  automaticCounts=dict(status), automaticCoveragePercent=round(100 * status['ok'] / words, 2),
                  v2AutomaticCounts=dict(v2_status), v2AutomaticCoveragePercent=round(100 * v2_status['ok'] / words, 2),
                  wordsWithChangedBars=changed, changedBarsWithAutomaticOk=changed_ok,
                  gainedBars=gained, lostBars=lost, labelsIdenticalToV2=same_labels, labelsChangedFromV2=labels_changed,
                  wordsWithBarsChangedSinceCheckpoint2=changed_since_cp2 if ROUND > 1 else None, round=ROUND, targetsIdenticalToV2=words,
                  fitThreshold=index['thresholds']['fit'], failedChecks=index.get('automaticFailedChecks', index['failedChecks']),
                  protectedPathsUnchanged=True, v2Commit=V2_COMMIT)
    assert result['automaticCoveragePercent'] >= 85, 'automatic coverage below 85%'
    return result, prior_visual, cp2_bars


def kept_sheet_verdicts():
    rows = {}
    for entry in read(OUT / 'fix-log.json'):
        if f'pattern-{entry["pattern"]}' in KEPT_SHEETS:
            rows.update(entry['verdicts'])
    return rows


def review():
    sample = read(TEST / 'sample.json')
    prov = read(TEST / 'sample-provenance.json')
    assert prov['seed'] == C.SEED and len(sample) == C.SIZE and prov['viewedBeforeFreeze'] is False
    assert C.sha(TEST / 'frozen-predictions.json') == prov['predictionsSha256']
    assert C.sha(TEST / 'eligible.json') == prov['eligibleSha256'] and C.sha(TEST / 'excluded.json') == prov['excludedSha256']
    import random
    eligible, excluded = read(TEST / 'eligible.json'), set(read(TEST / 'excluded.json'))
    assert random.Random(C.SEED).sample(eligible, C.SIZE) == sample, 'sample is not the seeded draw'
    assert not {w for _, w in sample} & excluded and all(p > 2 for p, _ in sample)
    frozen = read(TEST / 'frozen-predictions.json')
    for wid, w in frozen.items():
        actual = read(BARS / f'p{w["page"]}.json')['words'][wid]
        assert actual['bars'] == w['bars'] and actual['tids'] == w['tids']
    ds = {r['wid']: r for r in C.decisions()}
    assert len(ds) == len(C.decisions())
    events, manifest = C.audits(), read(TEST / 'manifest.json')
    seen = []
    for e in events:
        entry = next(m for m in manifest if m['image'] == e['image'])
        assert e['event'] == 'actually-viewed' and e['observer'] and C.sha(ROOT / e['image']) == e['sha256'] == entry['sha256']
        assert e['words'] == entry['words'] and e['at'] >= prov['frozenAt'], 'viewed before the freeze'
        seen += [w for _, w in e['words']]
    assert sorted(seen) == sorted(ds), 'verdicts and viewed sheets do not match'
    first = [w for _, w in sample[:100]]
    assert all(w in ds for w in first), 'first 100 not complete'
    first_ok = sum(ds[w]['verdict'] == 'ok' for w in first)
    early = first_ok < C.GATE
    target = sample[:100] if early else sample
    assert set(ds) == {w for _, w in target}, 'unexpected or missing review ids'
    sheets_total = len(read(OUT / 'audit.json')) + C.earlier_test_sheets() + len(events)
    assert sheets_total <= C.SHEET_LIMIT
    rows = [ds[w] for _, w in target]
    letters = sum(r['letters'] for r in rows)
    right = sum(r['lettersRight'] for r in rows)
    return ds, dict(earlyStopped=early, earlyStopGate=C.GATE, first100Ok=first_ok,
                    test=dict(words=len(rows), counts=dict(Counter(r['verdict'] for r in rows)),
                              fullyRightPercent=round(100 * sum(r['verdict'] == 'ok' for r in rows) / len(rows), 2),
                              letters=letters, lettersRight=right, lettersWrong=sum(len(r['wrongLetters']) for r in rows),
                              lettersUnsure=sum(len(r['unsureLetters']) for r in rows), lettersRightPercent=round(100 * right / letters, 2)),
                    sheetsViewed=dict(patternTrials=len(read(OUT / 'audit.json')), earlierTest=C.earlier_test_sheets(), test=len(events), total=sheets_total, limit=C.SHEET_LIMIT),
                    seed=C.SEED, eligibleWords=prov['eligibleWords'], excludedWords=prov['excludedWords'])


def main(finish):
    result, prior_visual, cp2_bars = automatic()
    if finish:
        ds, reviewed = review()
        result.update(reviewed)
        kept_verdicts = kept_sheet_verdicts()
        # Withhold what was actually seen wrong or unsure. A v2-era visual withholding is carried over
        # unless that word was judged right on a sheet made with the final kept rules.
        flags = {}
        for wid, row in prior_visual.items():
            if kept_verdicts.get(wid) != 'ok':
                flags[wid] = row['check']
        for wid, verdict in kept_verdicts.items():
            if verdict in ('wrong', 'unsure'):
                flags[wid] = 'visual-v3-' + verdict
        if ROUND > 1:
            # Round-1 test words seen wrong or unsure stay withheld while their bars are still the same.
            import json as _json
            for line in (OUT / 'test' / 'decisions.jsonl').read_text().splitlines():
                row = _json.loads(line)
                if row['verdict'] in ('wrong', 'unsure'):
                    now = read(BARS / f'p{row["page"]}.json')['words'][row['wid']]['bars']
                    if now == cp2_bars[row['wid']]:
                        flags[row['wid']] = 'visual-v3-' + row['verdict']
            # A kept-sheet or v2-era verdict describes the old bars; it is carried only if the bars did not change.
        for wid, row in ds.items():
            if row['verdict'] in ('wrong', 'unsure'):
                flags[wid] = 'visual-v3-' + row['verdict']
        after, checks = Counter(), Counter()
        for p in range(1, 605):
            path = BARS / f'p{p}.json'
            bars = read(path)
            dirty = False
            for wid, w in bars['words'].items():
                flag = flags.get(wid)
                if flag and flag not in w['checks']:
                    w['checks'].append(flag); w['status'] = 'review'; dirty = True
                after[w['status']] += 1
                checks.update(w['checks'])
            if dirty:
                atomic(path, bars)
        index = read(BARS / 'index.json')
        index.setdefault('automaticCounts', index['counts'])
        index.setdefault('automaticFailedChecks', index['failedChecks'])
        index.update(counts=dict(after), failedChecks=dict(checks))
        atomic(BARS / 'index.json', index)
        paths = sorted(BARS.glob('p*.json'))
        result.update(complete=True, finalCounts=dict(after), finalCoveragePercent=round(100 * after['ok'] / 77433, 2),
                      visuallyWithheldWords=len(flags), underlinesBytes=sum(p.stat().st_size for p in paths),
                      underlinesGzipBytes=sum(len(gzip.compress(p.read_bytes(), mtime=0)) for p in paths),
                      tokensUsed=None, createdAt=datetime.now(timezone.utc).isoformat())
        atomic(OUT / 'results.json', result)
    atomic(OUT / 'validation.json', result)
    print(json.dumps(result), flush=True)
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--finish', action='store_true')
    main(parser.parse_args().finish)
