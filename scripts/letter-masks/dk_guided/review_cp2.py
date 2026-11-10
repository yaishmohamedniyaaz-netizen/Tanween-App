"""Checkpoint 2 fresh test: freeze the sample, make sheets, record word and letter verdicts.

Order of use (each step refuses to run out of order):
  prepare        after run_v3.py --finalize; freezes the seed-20261114 sample BEFORE any viewing
  first100       makes the sheets for the first 100 sampled words
  rest           only if at least 95 of the first 100 are fully right (early-stop gate)
  report         prints the summary used in the written report
Verdicts are added with record(image, rows) after a sheet was actually viewed.
Nothing here changes bars, labels or any earlier checkpoint's evidence.
"""
import argparse
import hashlib
import json
import random
from collections import Counter
from datetime import datetime, timezone
import numpy as np
from PIL import Image, ImageDraw
import labels_v3 as L
import review_v2_checkpoint as REVIEW
import run_v2 as V2
import run_v3 as R
from sheet import PAL

OUT = R.OUT
TEST = OUT / 'test'
ROOT, BARS, atomic, read, sha = R.ROOT, R.BARS, R.atomic, R.read, R.sha
SEED, SIZE, GATE, SHEET_LIMIT = 20261114, 300, 95, 50
OBSERVER = 'cp2-fable-review'


def decisions():
    path = TEST / 'decisions.jsonl'
    return [json.loads(line) for line in path.read_text().splitlines()] if path.exists() else []


def audits():
    path = TEST / 'audit.jsonl'
    return [json.loads(line) for line in path.read_text().splitlines()] if path.exists() else []


def exposures():
    """Every word id seen or inspected during Checkpoint 2 development."""
    ids = set()
    for manifest in sorted(OUT.glob('pattern-*/manifest.json')):
        for sheet in read(manifest):
            ids.update(row['wid'] for row in sheet['rows'])
    for comparison in sorted(OUT.glob('pattern-*/comparison.json')):
        ids.update(row['wid'] for row in read(comparison)['rows'])
    extra = OUT / 'extra-exposures.json'
    if extra.exists():
        ids.update(read(extra)['words'])
    return ids


def prepare():
    target = TEST / 'sample.json'
    if target.exists():
        return read(target)
    assert not decisions() and not audits(), 'test evidence exists without a frozen sample'
    index = read(BARS / 'index.json')
    config, config_sha = R.configuration()
    assert index['method'] == R.METHOD and index['pages'] == list(range(1, 605))
    assert index['configSha256'] == config_sha, 'source changed since the full run'
    assert config['kept'] and sum(index['counts'].values()) == 77433
    excluded = set(read(OUT / 'excluded.json')) | exposures()
    eligible, snapshots = [], {}
    for p in range(1, 605):                       # numeric page order, then sorted word ids
        words = read(BARS / f'p{p}.json')['words']
        for wid in sorted(words):
            if p > 2 and words[wid]['status'] == 'ok' and wid not in excluded:
                eligible.append([p, wid])
    sample = random.Random(SEED).sample(eligible, SIZE)
    for p, wid in sample:
        snapshots[wid] = dict(page=p, **read(BARS / f'p{p}.json')['words'][wid])
    TEST.mkdir(exist_ok=True)
    atomic(TEST / 'eligible.json', eligible)
    atomic(TEST / 'excluded.json', sorted(excluded))
    atomic(TEST / 'frozen-index.json', index)
    atomic(TEST / 'frozen-predictions.json', snapshots)
    atomic(TEST / 'sample-provenance.json', dict(
        seed=SEED, size=SIZE, eligibleWords=len(eligible), excludedWords=len(excluded),
        cp2ExposureWords=len(exposures()), rule='p > 2, status ok, not excluded; numeric page order, sorted word ids',
        configSha256=config_sha, kept=config['kept'], frozenAt=datetime.now(timezone.utc).isoformat(),
        sampleSha256=hashlib.sha256(R.V1.encode(sample)).hexdigest(),
        predictionsSha256=sha(TEST / 'frozen-predictions.json'), eligibleSha256=sha(TEST / 'eligible.json'),
        excludedSha256=sha(TEST / 'excluded.json'), viewedBeforeFreeze=False))
    atomic(target, sample)                        # completion marker for the frozen bundle
    return sample


def tile(p, wid, number):
    data = read(BARS / f'p{p}.json')['words'][wid]
    frozen = read(TEST / 'frozen-predictions.json')[wid]
    assert data['tids'] == frozen['tids'] and data['bars'] == frozen['bars'], 'prediction changed after freezing'
    config, _ = R.configuration()
    res, spans = R.apply(L.aligned_print(p, wid), config['kept'])
    rebuilt, metrics = R.convert(res, data['tids'], spans)
    assert rebuilt['bars'] == data['bars'], 'rendered bars differ from saved output'
    assert metrics['labelSha256'] == read(R.RAW / f'p{p}.json')['words'][wid]['labelSha256']
    word, box, alpha = R.G.art_word(p, wid)
    assert tuple(box) == tuple(res['box'])
    H, W = alpha.shape
    im = np.full((H, W, 3), 255., float)
    im[alpha > 90] = 30
    for k, t in enumerate(data['tids']):
        m = res['labels'] == res['tids'].index(t) + 1
        im[m] = .7 * im[m] + .3 * np.array(PAL[k % len(PAL)])
    canvas = Image.new('RGB', (W, H + 18), 'white')
    canvas.paste(Image.fromarray(im.astype('uint8')))
    d = ImageDraw.Draw(canvas)
    for k, b in enumerate(data['bars']):
        d.line((b[0] - box[0], H + 8, b[1] - box[0] - 1, H + 8), fill=PAL[k % len(PAL)], width=3)
    canvas = canvas.resize((W * 3, (H + 18) * 3))
    units = REVIEW.metadata([[p, wid]])[wid]['units']
    assert [u['tid'] for u in units] == data['tids']
    width = max(canvas.width, 400)
    positions, x, y = [], 3, 27
    for i, u in enumerate(units):
        prefix = f'{i + 1}:'
        span = max(60, int(REVIEW.FONT.getlength(prefix) + REVIEW.ARABIC_FONT.getlength(u['show'])) + 26)
        if x + span > width:
            x, y = 3, y + 22
        positions.append((x, y, i, prefix, u['show']))
        x += span
    top = y + 25
    out = Image.new('RGB', (width, canvas.height + top), 'white')
    out.paste(canvas, (0, top))
    draw = ImageDraw.Draw(out)
    head = f'#{number} p{p} {wid} '
    draw.text((3, 3), head, font=REVIEW.FONT, fill='black')
    draw.text((5 + int(REVIEW.FONT.getlength(head)), 0), word['text'], font=REVIEW.ARABIC_FONT, fill='black')
    for x, y, i, prefix, show in positions:
        draw.rectangle((x, y + 4, x + 8, y + 12), fill=PAL[i % len(PAL)])
        draw.text((x + 11, y + 2), prefix, font=REVIEW.FONT, fill='black')
        draw.text((x + 13 + int(REVIEW.FONT.getlength(prefix)), y), show, font=REVIEW.ARABIC_FONT, fill='black')
    return out


def gate_passed():
    sample = prepare()
    ds = {r['wid']: r for r in decisions()}
    first = [w for _, w in sample[:100]]
    assert all(w in ds for w in first), 'review the first 100 before continuing'
    return sum(ds[w]['verdict'] == 'ok' for w in first) >= GATE


def sheets(phase):
    sample = prepare()
    if phase == 'first100':
        items, offset = sample[:100], 0
    else:
        assert gate_passed(), f'early stop: fewer than {GATE} of the first 100 are fully right'
        items, offset = sample[100:], 100
    REVIEW.metadata(items)
    manifest = read(TEST / 'manifest.json') if (TEST / 'manifest.json').exists() else []
    for start in range(0, len(items), 24):
        batch = items[start:start + 24]
        path = TEST / f'{phase}-{start // 24 + 1:03}.png'
        rel = str(path.relative_to(ROOT))
        known = next((e for e in manifest if e['image'] == rel), None)
        if known:
            assert known['words'] == batch and sha(path) == known['sha256']
            continue
        tiles = [tile(p, wid, offset + start + j + 1) for j, (p, wid) in enumerate(batch)]
        cw, ch = max(t.width for t in tiles), max(t.height for t in tiles)
        out = Image.new('RGB', (cw * 4, ch * ((len(tiles) + 3) // 4)), 'white')
        for j, t in enumerate(tiles):
            out.paste(t, ((j % 4) * cw, (j // 4) * ch))
        out.save(path)
        manifest.append(dict(phase=phase, start=offset + start, image=rel, words=batch, sha256=sha(path)))
        atomic(TEST / 'manifest.json', manifest)
        print(path.name, len(batch), flush=True)


def record(image, rows):
    """rows: one dict per word on the sheet, in sheet order:
    {page, wid, verdict: ok|wrong|unsure, note, wrongLetters: [1-based], unsureLetters: [1-based]}"""
    entry = next(e for e in read(TEST / 'manifest.json') if e['image'] == image)
    assert [[r['page'], r['wid']] for r in rows] == entry['words']
    assert sha(ROOT / image) == entry['sha256']
    assert not any(a['image'] == image for a in audits()), 'sheet already recorded'
    pattern_sheets = len(read(OUT / 'audit.json'))
    assert pattern_sheets + len(audits()) + 1 <= SHEET_LIMIT, 'sheet limit reached'
    frozen = read(TEST / 'frozen-predictions.json')
    old = {r['wid'] for r in decisions()}
    digests, labels, out = {}, {}, []
    for r in rows:
        n = len(frozen[r['wid']]['tids'])
        wrong, unsure = sorted(set(r.get('wrongLetters', []))), sorted(set(r.get('unsureLetters', [])))
        assert r['wid'] not in old and r['verdict'] in ('ok', 'wrong', 'unsure')
        assert all(1 <= i <= n for i in wrong + unsure) and not set(wrong) & set(unsure)
        if r['verdict'] == 'ok':
            assert not wrong and not unsure
        else:
            assert r.get('note'), 'a wrong or unsure word needs a note'
            assert wrong if r['verdict'] == 'wrong' else (unsure and not wrong)
        word = read(BARS / f'p{r["page"]}.json')['words'][r['wid']]
        assert word['bars'] == frozen[r['wid']]['bars']
        digests[r['wid']] = hashlib.sha256(R.V1.encode(dict(method=R.METHOD, tids=word['tids'], bars=word['bars']))).hexdigest()
        labels[r['wid']] = read(R.RAW / f'p{r["page"]}.json')['words'][r['wid']]['labelSha256']
        out.append(dict(page=r['page'], wid=r['wid'], verdict=r['verdict'], note=r.get('note', ''), letters=n,
                        wrongLetters=wrong, unsureLetters=unsure, lettersRight=n - len(wrong) - len(unsure)))
    event = dict(event='actually-viewed', observer=OBSERVER, at=datetime.now(timezone.utc).isoformat(), phase=entry['phase'],
                 image=image, sha256=entry['sha256'], words=entry['words'], predictionDigests=digests, labelDigests=labels)
    with (TEST / 'audit.jsonl').open('a') as f:
        f.write(json.dumps(event) + '\n')
    with (TEST / 'decisions.jsonl').open('a') as f:
        for r in out:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
    progress = read(OUT / 'progress.json')
    progress.update(phase='fresh-test', testDrawn=True, sheetsViewed=pattern_sheets + len(audits()),
                    testReviewed=len(decisions()), testCounts=dict(Counter(r['verdict'] for r in decisions())))
    atomic(OUT / 'progress.json', progress)
    return summary()


def summary():
    ds = decisions()
    sample = read(TEST / 'sample.json')
    order = {w: i for i, (_, w) in enumerate(sample)}
    first = [r for r in ds if order[r['wid']] < 100]
    def part(rows):
        letters = sum(r['letters'] for r in rows)
        return dict(words=len(rows), ok=sum(r['verdict'] == 'ok' for r in rows), wrong=sum(r['verdict'] == 'wrong' for r in rows),
                    unsure=sum(r['verdict'] == 'unsure' for r in rows), letters=letters,
                    lettersRight=sum(r['lettersRight'] for r in rows),
                    lettersWrong=sum(len(r['wrongLetters']) for r in rows), lettersUnsure=sum(len(r['unsureLetters']) for r in rows))
    return dict(first100=part(first), all=part(ds), reviewed=len(ds), of=len(sample),
                sheetsViewedTest=len(audits()), sheetsViewedTotal=len(read(OUT / 'audit.json')) + len(audits()))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('phase', choices=['prepare', 'first100', 'rest', 'report'])
    args = parser.parse_args()
    if args.phase == 'prepare':
        s = prepare()
        print(json.dumps(read(TEST / 'sample-provenance.json')))
    elif args.phase == 'report':
        print(json.dumps(summary()))
    else:
        sheets(args.phase)
