"""Build visual-v1 files only from explicitly recorded visual decisions.

python scripts/letter-masks/visual/build_guess_files.py
This never infers a missing border. Approved borders retain precedence.
"""
import argparse
from collections import Counter
import json
import math
from pathlib import Path
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
ART = ROOT / 'public/mushaf/1405-artwork-5a5f9f3846158475'
OUT = ROOT / 'public/letter-borders-guess'
RULE = 'qpc-hafs-v1-targets-4.0.0'


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def write(path, value):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':'))+'\n', encoding='utf-8')


def load_decisions(path):
    result = {}
    for line_number, line in enumerate(Path(path).read_text(encoding='utf-8').splitlines(), 1):
        if not line.strip(): continue
        d = json.loads(line)
        if d['wid'] in result: raise ValueError(f'Duplicate decision at line {line_number}: {d["wid"]}')
        if d.get('source') not in ('visual', 'visual-copy'): raise ValueError(f'Unreviewed source: {d["wid"]}')
        if d.get('confidence') not in ('high', 'medium', 'low'): raise ValueError(f'Invalid confidence: {d["wid"]}')
        if not isinstance(d.get('note'), str) or not isinstance(d.get('cluster'), str): raise ValueError(f'Missing provenance: {d["wid"]}')
        result[d['wid']] = d
    return result


def build(decision_path, output=OUT):
    decisions = load_decisions(decision_path)
    root_resolved = ROOT.resolve()
    if output.resolve() != (root_resolved/'public/letter-borders-guess').resolve():
        raise ValueError('Output must be the separate unapproved guess directory')
    # Export actual app units, never reimplement Quran target rules in Python.
    cache=ROOT/'tmp/visual-borders'; cache.mkdir(parents=True,exist_ok=True)
    unit_path=cache/'units.json'
    subprocess.run(['node','--experimental-strip-types',str(HERE.parent/'dump_units.mts'),
                    *map(str,range(1,605)),'--out',str(unit_path)],check=True,capture_output=True)
    units=read(unit_path)
    approved=set()
    for path in (ROOT/'public/letter-borders').glob('p*.json'): approved.update(read(path)['words'])
    pages={p:{} for p in range(1,605)}; found=set(); counts=Counter()
    for p in range(1,605):
        for word in read(ART/f'p{p}.json')['words']:
            wid=word['wid']
            if wid not in decisions: continue
            d=decisions[wid]; found.add(wid)
            if word['role'] != 'letter' or d['page'] != p: raise ValueError(f'Wrong page/role: {wid}')
            tids=[u['tid'] for u in units[wid]['units']]
            x=d['x']
            if len(x)!=len(tids)+1 or not all(type(v) is int for v in x): raise ValueError(f'Invalid integer borders: {wid}')
            if any(a-b<2 for a,b in zip(x,x[1:])): raise ValueError(f'Invalid border order/width: {wid}')
            left,right=word['body'][0],word['body'][2]
            if x[-1]<math.ceil(left) or x[0]>math.floor(right):
                raise ValueError(f'Outer ink/body conflict must be resolved before publishing: {wid}')
            counts['decisions']+=1
            if wid in approved:
                counts['approvedDecisionsOmitted']+=1
                continue
            pages[p][wid]=dict(tids=tids,x=x,confidence=d['confidence'],source=d['source'])
            counts[d['confidence']]+=1; counts[d['source']]+=1; counts['guesses']+=1
    if found!=set(decisions): raise ValueError(f'Unknown artwork words: {sorted(set(decisions)-found)}')
    output.mkdir(parents=True,exist_ok=True)
    for p,words in pages.items():
        write(output/f'p{p}.json',dict(page=p,ruleVersion=RULE,method='visual-v1',words=words))
    write(output/'index.json',dict(ruleVersion=RULE,method='visual-v1',pages=[p for p,ws in pages.items() if ws]))
    report=dict(method='visual-v1',counts=dict(counts),pages=[dict(page=p,guessed=len(ws),
                **dict(Counter(w['confidence'] for w in ws.values()))) for p,ws in pages.items()])
    write(HERE/'build-report.json',report)
    return report


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--decisions',type=Path,default=HERE/'decisions.jsonl')
    args=parser.parse_args()
    print(json.dumps(build(args.decisions)['counts'],indent=2))
