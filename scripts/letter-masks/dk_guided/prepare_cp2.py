"""Prepare historical CP2 inputs only; never generate or draw the fresh test."""
import hashlib
import json
import random
import re
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / 'checkpoint2'
ID = re.compile(r'^\d+\.\d+\.\d+$')


def encode(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


def pattern_tags(note):
    """Conservative text-derived candidate tags, not new visual judgments."""
    text = note.lower()
    tags = []
    if any(s in text for s in ('collid', 'overlap', 'reverse after squeezing')):
        tags.append(5)
    if 'detach' in text:
        tags.append(4)
    if any(s in text for s in ('lam', 'carrier', 'upright', 'stem')):
        tags.append(2)
    if any(s in text for s in ('jim', 'kha', 'ha body', 'ha head', 'ha upper', 'ha lower', 'ha receives', 'ح', 'ج', 'خ')):
        tags.append(1)
    if any(s in text for s in ('final ya', 'ya bowl', 'final ي', 'maqsura', 'returning bowl')):
        tags.append(3)
    return tags or ['other']


def all_ids(value):
    """Read IDs only from explicitly selected historical evidence sources."""
    if isinstance(value, str):
        return {value} if ID.fullmatch(value) else set()
    if isinstance(value, list):
        return set().union(*(all_ids(v) for v in value)) if value else set()
    if isinstance(value, dict):
        return all_ids(list(value)) | all_ids(list(value.values()))
    return set()


def main():
    sources = {}
    excluded = set()

    def read(relative):
        path = HERE / relative
        payload = path.read_bytes()
        value = ([json.loads(line) for line in payload.decode().splitlines() if line.strip()]
                 if path.suffix == '.jsonl' else json.loads(payload))
        ids = all_ids(value)
        excluded.update(ids)
        sources[relative] = {'sha256': hashlib.sha256(payload).hexdigest(), 'ids': len(ids)}
        return value

    histories = []
    cp1b = None
    for name in ('review/decisions.jsonl', 'checkpoint1b/decisions.jsonl'):
        rows = read(name)
        if name.startswith('checkpoint1b/'):
            cp1b = rows
        for i, row in enumerate(rows, 1):
            histories.append(dict(row, source=name, sourceRecord=i))
    for path in sorted((HERE / 'review-v2').glob('*.json')):
        name = path.relative_to(HERE).as_posix()
        for i, row in enumerate(read(name), 1):
            histories.append(dict(page=row[0], wid=row[1], verdict=row[2], note=row[3], source=name, sourceRecord=i))

    for name in ('checkpoint1b/excluded.json', 'checkpoint1b/prior-visual-reviewed-ids.json',
                 'review/sample-provenance.json', 'review/sample.json', 'checkpoint1b/sample.json'):
        read(name)
    for folder in ('review', 'checkpoint1b'):
        for path in sorted((HERE / folder).rglob('*')):
            if path.is_file() and path.suffix in ('.json', '.jsonl') and any(s in path.name for s in ('manifest', 'audit')):
                read(path.relative_to(HERE).as_posix())

    by_id = {}
    def add(row):
        entry = by_id.setdefault(row['wid'], dict(page=row['page'], wid=row['wid'], patterns=[], provenance=[]))
        assert entry['page'] == row['page'], row['wid']
        entry['provenance'].append(row)
        for tag in row['patterns']:
            if tag not in entry['patterns']:
                entry['patterns'].append(tag)

    for row in histories:
        if row['verdict'] in ('wrong', 'unsure') or 'label-wrong' in row.get('note', ''):
            add(dict(row, patterns=pattern_tags(row.get('note', '')), evidenceType='historical-review'))
    diagnostics = read('checkpoint1b/error-diagnostic.json')
    assert len(diagnostics) == 100 and len({w for _, w in diagnostics}) == 100
    for i, (page, wid) in enumerate(diagnostics, 1):
        add(dict(page=page, wid=wid, verdict='diagnostic-error', patterns=[5],
                 note='V2 bars overlap or reverse after squeezing; computer diagnostic, not a visual verdict.',
                 source='checkpoint1b/error-diagnostic.json', sourceRecord=i, evidenceType='computer-diagnostic'))
    failures = sorted(by_id.values(), key=lambda r: (r['page'], r['wid']))
    for row in failures:
        if len(row['patterns']) > 1 and 'other' in row['patterns']:
            row['patterns'].remove('other')

    # Latest CP1b verdict controls regression eligibility, including ok/label-wrong.
    latest = {row['wid']: row for row in cp1b}
    pool = sorted((r for r in latest.values() if r['verdict'] == 'ok'), key=lambda r: (r['page'], r['wid']))
    regression = random.Random('20261113-reg').sample(pool, 120)
    regression = [dict(r, source='checkpoint1b/decisions.jsonl') for r in regression]
    assert len({r['wid'] for r in regression}) == 120
    assert all(r['wid'] in excluded for r in failures + regression)
    artifacts = {'dev-failures.json': failures, 'regression120.json': regression, 'excluded.json': sorted(excluded)}
    summary = dict(checkpoint=2, regressionSeed='20261113-reg', regressionPool=len(pool),
                   regressionOrder='page numeric then wid lexical; Python random.Random string seed',
                   devFailureWords=len(failures), historicalQualifyingRecords=sum(len(r['provenance']) for r in failures)-100,
                   diagnosticCases=100, excludedWords=len(excluded),
                   patternCounts=dict(Counter(str(p) for r in failures for p in r['patterns'])),
                   tagging='Candidate patterns inferred conservatively from historical notes; not new visual verdicts. Preserve all qualifying history even if later right.',
                   regressionPolicy=dict(maxNewlyBroken=0, requireDevImprovement=True, source='Latest user instruction overrides document allowance of one break'),
                   freshTest=dict(seed=20261114, drawn=False, instruction='Draw only after final full run; extend exclusions for all new development exposure first.'),
                   sources=sources, artifacts={n: hashlib.sha256(encode(v)).hexdigest() for n,v in artifacts.items()})
    OUT.mkdir(exist_ok=True)
    for name, value in dict(artifacts, **{'input-summary.json': summary}).items():
        target = OUT / name
        temporary = target.with_suffix(target.suffix + '.tmp')
        temporary.write_bytes(encode(value))
        temporary.replace(target)
    print(json.dumps({k:summary[k] for k in ('devFailureWords','regressionPool','excludedWords','diagnosticCases')}, sort_keys=True))


if __name__ == '__main__':
    main()
