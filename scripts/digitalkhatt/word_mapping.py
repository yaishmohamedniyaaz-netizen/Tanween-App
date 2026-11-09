#!/usr/bin/env python3
"""Pinned, research-only ordinal word correspondence. Never changes app text/IDs."""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import hashlib
import json
import math
from pathlib import Path

from parity import ART, ROOT, PIN, PDF_SHA256, Extractor, skeleton

APP_SHA256 = "fa39aeb5e6effea289f88e222d50f15000837477df13a80be0fc4e0a81cc997b"
EXCEPTIONS_SHA256 = "a57c0e5d77884f1d6c3a0e4c0d63ed80c0bc918b2fdc8686767017c18e8f38d4"
# Direction is app -> PDF skeleton, not a general Arabic equivalence relation.
RULES = (("long_initial_hamza", "أٓ", "ءا"),
         ("below_yeh_hamza", "يٕ", "ئ"),
         ("below_waw_hamza", "وٕ", "ؤ"))
SPECIAL = {
    "2.72.3": ("standalone_combining_hamza", "فادرءتم", "فادرٔتم", "ء", "ٔ"),
    "17.7.11": ("extra_source_maddah", "ليسءوا", "ليسٓءوا", "", "ٓ"),
}
EXPECTED_CLASSES = {"long_initial_hamza":277, "below_yeh_hamza":13,
                    "below_waw_hamza":1, "standalone_combining_hamza":1,
                    "extra_source_maddah":1}


def classify(app_text, source_text, wid):
    """Return exactly one directional, localized edit or reject the pair.

    These rules only validate correspondence. They do not determine glyph
    ownership, pronounceability, a tid, or the correct colourable unit.
    """
    a, d = skeleton(app_text), skeleton(source_text)
    if not a or not d:
        raise ValueError(f"{wid}: empty skeleton")
    if a == d:
        return {"kind":"strict_skeleton_equal"}
    candidates = []
    for kind, old, new in RULES:
        for pos in range(len(a)):
            if a.startswith(old,pos) and a[:pos]+new+a[pos+len(old):] == d:
                candidates.append({"kind":kind,"app_skeleton_range":[pos,pos+len(old)],
                                   "source_skeleton_range":[pos,pos+len(new)],
                                   "app_fragment":old,"source_fragment":new})
    special = SPECIAL.get(wid)
    if special and (a,d) == special[1:3]:
        kind, _, _, old, new = special
        pos = a.index(old) if old else 3
        candidates.append({"kind":kind,"app_skeleton_range":[pos,pos+len(old)],
                           "source_skeleton_range":[pos,pos+len(new)],
                           "app_fragment":old,"source_fragment":new})
    if len(candidates) != 1:
        raise ValueError(f"{wid}: unknown or ambiguous skeleton difference {a!r} -> {d!r}")
    return candidates[0]


def checked_box(box, frame, wid):
    if (not isinstance(box,(list,tuple)) or len(box)!=4 or
        not all(isinstance(x,(int,float)) and math.isfinite(x) for x in box) or
        box[2]<=box[0] or box[3]<=box[1]):
        raise ValueError(f"{wid}: invalid DigitalKhatt bounds")
    return {"finite_positive_bounds":True,
            "inside_source_frame":0<=box[0]<box[2]<=frame[0] and 0<=box[1]<box[3]<=frame[1]}


def pair_page(n, extracted, app):
    if len(extracted['frame']) != 2 or not all(math.isfinite(x) and x>0 for x in extracted['frame']):
        raise ValueError(f"p{n}: invalid source frame")
    aa, dd = defaultdict(list), defaultdict(list)
    for w in app['words']:
        if w['role']=='letter': aa[w['line']].append(w)
    for w in extracted['words']: dd[w['line']].append(w)
    if not aa or set(aa)!=set(dd):
        raise ValueError(f"p{n}: physical corpus lines differ")
    pairs, seen, diagnostics = [], set(), Counter()
    for line in sorted(aa):
        if len(aa[line])!=len(dd[line]):
            raise ValueError(f"p{n} line {line}: word counts differ")
        previous_center = None
        for slot,(a,d) in enumerate(zip(aa[line],dd[line]),1):
            if not a['wid'] or a['wid'] in seen:
                raise ValueError(f"p{n}: missing or duplicate wid {a['wid']}")
            seen.add(a['wid'])
            validation = classify(a['text'],d['text'],a['wid'])
            if d['skeleton'] != skeleton(d['text']):
                raise ValueError(f"{a['wid']}: inconsistent extracted skeleton")
            geometry = checked_box(d['box'],extracted['frame'],a['wid'])
            center=(d['box'][0]+d['box'][2])/2
            geometry['center_descends_from_previous_word'] = previous_center is None or center<previous_center
            previous_center=center
            for key,value in geometry.items():
                if not value: diagnostics[key+'_failures']+=1
            pairs.append({'page':n,'line':line,'slot':slot,'wid':a['wid'],
                          'app_text':a['text'],'source_text':d['text'],
                          'app_skeleton':skeleton(a['text']),'source_skeleton':d['skeleton'],
                          'validation':validation,'source_box':d['box'],'geometry':geometry})
    return {'page':n,'source_frame':extracted['frame'],'words':pairs,
            'geometry_diagnostics':dict(sorted(diagnostics.items()))}


def exception_fingerprint(pages):
    rows=[[p['page'],w['line'],w['wid'],w['app_text'],w['source_text']]
          for p in pages for w in p['words'] if w['validation']['kind']!='strict_skeleton_equal']
    rows.sort(key=lambda r:(r[0],r[1],r[2]))
    return hashlib.sha256(json.dumps(rows,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()


def validate_corpus(pages):
    if [p['page'] for p in pages]!=list(range(1,605)):
        raise ValueError('Expected all 604 pages in order')
    words=[w for p in pages for w in p['words']]
    if len(words)!=77433 or len({w['wid'] for w in words})!=77433:
        raise ValueError('Corpus count or unique app wid coverage changed')
    counts=Counter(w['validation']['kind'] for w in words)
    if dict(counts)!=dict(EXPECTED_CLASSES,strict_skeleton_equal=77140):
        raise ValueError('Exception classes/counts changed')
    if exception_fingerprint(pages)!=EXCEPTIONS_SHA256:
        raise ValueError('Exact exception inventory changed; review required')
    return counts


def markdown(report):
    s=report['summary']
    lines=['# DigitalKhatt word correspondence','',
        '**Research only: all 77,433 words paired; no glyph-to-tid or visual approval claimed.**','',
        'The owner approved same-page, physical-line, reading-order pairing with DigitalKhatt’s own geometry. This supersedes the artwork-overlap gate only for this word-correspondence investigation. No religious text, app wid/tid, judging rule, runtime file, PDF, outline or public asset is changed.','',
        '## Validation','',
        '- All 604 pages, 77,433 unique app word IDs, identical physical corpus lines and words per line.',
        '- 77,140 strict skeleton pairs and 293 explicitly classified exceptions on 222 pages.',
        '- The source PDF and combined protected app files are SHA256-pinned. The exact exception inventory (page, line, wid, both original strings) has an additional pinned fingerprint.',
        '- New lines, counts, IDs, unknown edits, invalid geometry or changed exception records fail closed. The report is written only after all checks pass.',
        '- Every pair is checked with exact original strings and full-precision source-coordinate bounds. The publishable JSON stores per-page inventory hashes, diagnostic counts and all exception pairs without geometry. Optional --pairs-out writes the complete local research inventory outside the repository. Keys are page + physical line + one-based reading-order slot; wid is retained verbatim.',
        '', 'Class | Words','--- | ---']
    lines += [f'{k} | {v}' for k,v in s['classification_counts'].items()]
    lines += ['', '## Geometry and limits','',
        'Bounds are the source Type3 d1 union excluding waqf signs, not independently measured tight ink. No artwork box, IoU, fitting, warping or nearest-neighbour search is used to establish correspondence. Source-frame containment and descending RTL word-box centres are diagnostics, not matching inputs. Invalid/nonfinite/empty bounds are fatal.',
        '',f"Geometry diagnostics: `{json.dumps(s['geometry_diagnostics'],sort_keys=True)}`. An empty object means no failures.",
        '', 'Strict skeleton validation removes the same ordinary marks/CGJ as the existing parity audit. It is not exact full-text equality or theological review. Raw texts remain untouched. Three directional local replacement rules handle long hamza and below-seat hamza; the two singleton cases are restricted to their exact wid and entire skeleton pair. No generic hamza/maddah deletion is allowed.',
        '', 'In particular the extra maddah at 17.7.11 is retained in the source string and classified separately, not silently erased. This is correspondence evidence, not permission to omit it when rendering or assigning glyphs.',
        '', 'Repeated words are intentionally paired by their approved physical slot, never searched by text. Identical repeated words cannot independently prove semantic order; the pinned sources, extractor trace checks and exact count/order contract constrain that risk.',
        '', 'Standalone basmalas, headers, ayah/section markers are excluded by the unchanged parity extractor. Al-Fatiha’s judged basmala is retained. The unresolved PDF redistribution licence still prohibits treating this report as a production asset grant.',
        '', '## Reproduce','',
        'From the repository root, with requirements-parity.txt installed:', '',
        '```sh',
        'python scripts/digitalkhatt/word_mapping.py --pdf /path/to/old_Madinah_mushaf.pdf',
        'python -m unittest discover -s scripts/digitalkhatt -p "test_word_mapping.py"',
        '```','',
        'Run the generator with a second --out directory and compare both outputs byte-for-byte. No timestamp or machine-local input path is recorded.',
        '', 'Confidence: practicality 97/100; architecture/data safety 98/100; visual certainty 60/100 for final glyph rendering/colour ownership, which is explicitly outside this word-level proof.',
        '', '## All 293 exceptions','',
        'Each entry gives page/line/slot, app wid, class, exact app and exact source text.','']
    for p in report['pages']:
        for w in p['exceptions']:
            if w['validation']['kind']!='strict_skeleton_equal':
                lines.append(f"- p{p['page']} / line {w['line']} / slot {w['slot']}; {w['wid']}; {w['validation']['kind']}: app `{w['app_text']}` → source `{w['source_text']}`.")
    return '\n'.join(lines)+'\n'


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pdf',type=Path,required=True)
    parser.add_argument('--out',type=Path,default=ROOT/'scripts/digitalkhatt/reports')
    parser.add_argument('--pairs-out',type=Path,help='Optional complete local research inventory; must be outside the repository')
    args=parser.parse_args()
    if args.pairs_out and args.pairs_out.resolve().is_relative_to(ROOT.resolve()):
        raise ValueError('Full PDF-derived research inventory must remain outside the repository')
    raws=[(ART/f'p{n}.json').read_bytes() for n in range(1,605)]
    digest=hashlib.sha256()
    for n,raw in enumerate(raws,1):digest.update(f'p{n}.json\0'.encode()+raw)
    if digest.hexdigest()!=APP_SHA256:raise ValueError('Protected app corpus SHA256 changed')
    ext=Extractor(args.pdf)
    pages=[]
    for n,raw in enumerate(raws,1):
        pages.append(pair_page(n,ext.page(n),json.loads(raw)))
        if n%50==0 or n==604:print(f'Mapped {n}/604',flush=True)
    counts=validate_corpus(pages)
    diagnostics=Counter()
    for p in pages:diagnostics.update(p['geometry_diagnostics'])
    report={'schema':'digitalkhatt-word-correspondence-v1','research_only':True,
            'source':{'font_commit':PIN,'pdf_sha256':PDF_SHA256,'app_page_json_sha256':APP_SHA256,
                      'exact_exceptions_sha256':EXCEPTIONS_SHA256},
            'summary':{'pages':604,'words':77433,'classification_counts':dict(sorted(counts.items())),
                       'geometry_diagnostics':dict(sorted(diagnostics.items()))},'pages':pages}
    args.out.mkdir(parents=True,exist_ok=True)
    if args.pairs_out:
        args.pairs_out.parent.mkdir(parents=True,exist_ok=True)
        args.pairs_out.write_text(json.dumps(report,ensure_ascii=False,separators=(',',':'))+'\n')
    report['pages']=[{'page':p['page'],'words':len(p['words']),
        'correspondence_sha256':hashlib.sha256(json.dumps(p['words'],ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest(),
        'geometry_diagnostics':p['geometry_diagnostics'],
        'geometry_flags':[{'line':w['line'],'slot':w['slot'],'wid':w['wid'],
                           'failed_checks':[k for k,v in w['geometry'].items() if not v]}
                          for w in p['words'] if not all(w['geometry'].values())],
        'exceptions':[{k:v for k,v in w.items() if k not in ('source_box','geometry')}
                      for w in p['words'] if w['validation']['kind']!='strict_skeleton_equal']} for p in pages]
    # Publish measurements and limited text comparisons, never layout assets.
    (args.out/'word-mapping.json').write_text(json.dumps(report,ensure_ascii=False,separators=(',',':'))+'\n')
    (args.out/'WORD_MAPPING.md').write_text(markdown(report))
    print(json.dumps(report['summary'],indent=2))


if __name__=='__main__':main()
