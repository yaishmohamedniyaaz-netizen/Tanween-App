"""Freeze a future owner-approved batch before learning; never trains or scores.

CLI: python scripts/letter-masks/research/split_batch.py NNN
Reads approved/batch-NNN.json without changing it. Writes heldout-NNN.json in
approved/, train-NNN.json and split-NNN.json in research/batches/. There is no
current owner batch: do not execute this CLI until an actual approved batch is
provided. Status must explicitly be 'approved'; reviewed/proposal is not consent.
Optional bars and existing geometry are preserved verbatim, never synthesized.
The word-random split can share drawing families and is not a family-heldout test.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
from pathlib import Path
import random
import re

HERE = Path(__file__).resolve().parent
MASKS = HERE.parent
ROOT = MASKS.parents[1]
ART = ROOT / 'public/mushaf/1405-artwork-5a5f9f3846158475'
SEED = 20261108


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def numeric(wid):
    if not isinstance(wid, str) or not re.fullmatch(r'[1-9][0-9]*\.[1-9][0-9]*\.[0-9]+', wid):
        raise ValueError(f'invalid word ID: {wid!r}')
    return tuple(map(int, wid.split('.')))


def choose_ids(ids):
    ids = sorted(ids, key=numeric)
    if not ids or len(ids) != len(set(ids)):
        raise ValueError('empty batch or duplicate word IDs')
    return set(random.Random(SEED).sample(ids, math.ceil(.15 * len(ids))))


def write_new(path, value):
    # Exclusive creation prevents accidental overwrite. An interrupted partial
    # split is deliberately not repaired automatically on a later invocation.
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('x', encoding='utf-8') as f:
        json.dump(value, f, ensure_ascii=False, sort_keys=True, allow_nan=False)
        f.write('\n')


def split(number, approved_dir=MASKS/'approved', output_dir=HERE/'batches', artwork_dir=ART):
    if not str(number).isdigit() or int(number) < 1:
        raise ValueError('batch number must be a positive integer')
    number = f'{int(number):03d}'
    approved_dir, output_dir, artwork_dir = map(Path, (approved_dir, output_dir, artwork_dir))
    source = approved_dir/f'batch-{number}.json'
    heldout = approved_dir/f'heldout-{number}.json'
    train = output_dir/f'train-{number}.json'
    manifest = output_dir/f'split-{number}.json'
    if manifest.exists():
        saved = read(manifest)
        for path, key in ((source, 'sourceSha256'), (heldout, 'heldoutSha256'), (train, 'trainSha256')):
            if not path.exists() or digest(path) != saved.get(key):
                raise ValueError('frozen split changed or incomplete; do not overwrite')
        return saved
    if heldout.exists() or train.exists():
        raise ValueError('partial existing split; reconcile manually, do not overwrite')
    batch = read(source)
    words = batch.get('words')
    if not isinstance(words, list) or any(not isinstance(w, dict) for w in words):
        raise ValueError('batch must contain a words list')
    ids = [w.get('wid') for w in words]
    test_ids = choose_ids(ids)
    if any(w.get('status') != 'approved' for w in words):
        raise ValueError('every word needs explicit approved status')
    # Membership/page checks use immutable artwork, not a fabricated test corpus.
    pages = {}
    for w in words:
        page = w.get('page')
        if type(page) is not int or not 1 <= page <= 604:
            raise ValueError('invalid artwork page')
        if page not in pages:
            pages[page] = {v['wid'] for v in read(artwork_dir/f'p{page}.json')['words'] if v.get('role') == 'letter'}
        if w['wid'] not in pages[page]:
            raise ValueError(f"word is absent from specified artwork page: {w['wid']}")
    excluded = {w['wid'] for w in read(approved_dir/'all-approvals-2026-11-06.json')['words']}
    for path in sorted(approved_dir.glob('heldout-*.json')) + sorted(output_dir.glob('train-*.json')):
        excluded.update(w['wid'] for w in read(path)['words'])
    if set(ids) & excluded:
        raise ValueError('historic or previously split IDs cannot become fresh heldout data')
    common = {k: v for k, v in batch.items() if k != 'words'}
    common.update(splitSeed=SEED, sourceBatch=source.name, sourceSha256=digest(source))
    training = sorted((w for w in words if w['wid'] not in test_ids), key=lambda w: numeric(w['wid']))
    testing = sorted((w for w in words if w['wid'] in test_ids), key=lambda w: numeric(w['wid']))
    # Validate serializability before creating either output; bars/geometry remain unchanged.
    train_doc = {**common, 'split': 'training', 'words': training}
    test_doc = {**common, 'split': 'heldout-never-train-or-tune', 'words': testing}
    json.dumps([train_doc, test_doc], allow_nan=False)
    families_train = {str(w['family']) for w in training if w.get('family') is not None}
    families_test = {str(w['family']) for w in testing if w.get('family') is not None}
    write_new(heldout, test_doc)
    write_new(train, train_doc)
    result = {'schemaVersion': 1, 'seed': SEED, 'batch': number,
              'sourceSha256': digest(source), 'heldoutSha256': digest(heldout), 'trainSha256': digest(train),
              'requestedHeldoutFraction': .15, 'rounding': 'ceil', 'totalWords': len(ids),
              'heldoutWords': len(testing), 'trainingWords': len(training),
              'heldoutIds': sorted(test_ids, key=numeric), 'trainIds': sorted(set(ids)-test_ids, key=numeric),
              'sharedKnownFamilies': sorted(families_train & families_test),
              'wordsWithoutFamily': sum(w.get('family') is None for w in words),
              'warning': 'Word-random split, not an independent drawing-family test. Family overlap may exist even without family metadata. Never train or tune on heldout labels; score only at authorized checkpoints.'}
    write_new(manifest, result)
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('batch')
    print(json.dumps(split(parser.parse_args().batch), indent=2))
