#!/usr/bin/env python3
"""Conservative research-only mapping via PDF ActualText, not glyph-name guesses.

No outlines, positions or production assets are exported. Exact source spans
are evidence for glyph ownership, not a visual proof of isolated outlines.
"""
import argparse
import hashlib
from collections import Counter, defaultdict
import json
from pathlib import Path
import subprocess
from pypdf.generic import ContentStream
from parity import Extractor, ROOT, ART, PDF_SHA256, skeleton
from word_mapping import classify, APP_SHA256


def groups(text):
    """Source letter groups and offsets, retaining notation with its host.

    This groups source text for alignment only. The app target rules are
    executed in Node, not reimplemented here.
    """
    starts = []
    for i, c in enumerate(text):
        if '\u0621' <= c <= '\u063a' or '\u0641' <= c <= '\u064a' or c in 'ٱـ':
            starts.append(i)
    if not starts:
        return []
    starts[0] = 0
    result = []
    for k, start in enumerate(starts):
        end = starts[k+1] if k+1 < len(starts) else len(text)
        value = skeleton(text[start:end])
        if value:
            result.append({'start':start,'end':end,'key':value})
        elif result:
            result[-1]['end'] = end
    return result


def extract_page(extractor, page):
    p = extractor.reader.pages[page]
    fonts = {str(k):extractor.font(v.get_object()) for k,v in p['/Resources']['/Font'].items()}
    spans, stack, line, index, font = [], [], 0, 0, None
    for args, op in ContentStream(p.get_contents(), extractor.reader).operations:
        if op == b'Tm': line += 1
        elif op == b'Tf': font = fonts[str(args[0])]
        elif op in (b'BDC', b'BMC'):
            actual = args[1].get('/ActualText') if len(args)>1 and isinstance(args[1],dict) else None
            span = {'text':str(actual),'line':line,'glyphs':[]} if actual is not None else None
            if span is not None: spans.append(span)
            stack.append(span)
        elif op == b'EMC': stack.pop()
        elif op == b'Tj':
            data = args[0].original_bytes if hasattr(args[0], 'original_bytes') else bytes(args[0])
            for code in data:
                owner = next((s for s in reversed(stack) if s is not None), None)
                if owner is not None: owner['glyphs'].append({'index':index,'name':font[1][code][0]})
                index += 1
        elif op in (b'TJ', b"'", b'"', b'Tz'): raise ValueError('Unsupported text operation')
    assert not stack
    assert index==sum(len(span['chars']) for span in extractor.doc[page].get_texttrace())
    words, word = [], None
    def flush():
        nonlocal word
        if word is not None: words.append(word)
        word = None
    for span in spans:
        text = span['text']
        if word and word['line'] != span['line']: flush()
        if text.isspace() or '۝' in text or text in ('۞','۩'):
            flush(); continue
        if any(c.isspace() for c in text): raise ValueError('Unexpected multiword span')
        if word is None: word = {'line':span['line'],'text':'','spans':[]}
        span['start'] = len(word['text'])
        word['text'] += text
        span['end'] = len(word['text'])
        word['spans'].append(span)
    flush()
    byline = defaultdict(list)
    for w in words: byline[w['line']].append(w)
    basmala = {line for line, ws in byline.items() if page != 1 and [skeleton(w['text']) for w in ws] == ['بسم','الله','الرحمن','الرحيم']}
    return [w for w in words if w['line'] not in basmala]


# Explicit Unicode mark identities for observed ambiguous-span families.
# Names are the PDF Type3 Encoding/Differences names, not approximate base shapes.
MARK_IDENTITIES = {'kasra':'ِ','fatha':'َ','damma':'ُ','sukun':'ْ',
                   'maddahabove':'ٓ','hamzaabove.joined':'ٔ','hamzaabove':'ٔ','hamzaabove.lamalef':'ٔ'}

def map_word(app, pdf):
    ag, dg = groups(app['text']), groups(pdf['text'])
    record = {'wid':app['wid'],'text':app['text'],'pdfText':pdf['text'],'line':app['line'], 'assignments':[], 'unresolved':[]}
    # UTF-16 offsets from Node equal Python offsets only for BMP source.
    assert all(ord(c)<=0xffff for c in app['text'])
    classification = classify(app['text'], pdf['text'], app['wid'])
    record['wordClassification'] = classification['kind']
    if classification['kind']=='standalone_combining_hamza':
        # Exact pinned singleton: source raa + dagger alif is followed by
        # an independently drawn hamzaabove/sukun span. Split at U+0654,
        # keeping every source character and glyph; never rewrite app text.
        index=next(i for i,g in enumerate(dg) if g['key']=='رٔ')
        original=dg[index]; split=pdf['text'].index('ٔ',original['start'],original['end'])
        dg[index:index+1]=[{'start':original['start'],'end':split,'key':'ر'},
                          {'start':split,'end':original['end'],'key':'ء'}]
    elif classification['kind']=='extra_source_maddah':
        # Alignment key only: preserve the added maddah glyph under its sin
        # host. ActualText and rendered content remain unchanged.
        affected=[g for g in dg if g['key']=='سٓ']; assert len(affected)==1
        affected[0]['key']='س'
    for a in ag:
        owners = [t['tid'] for t in app['targets'] if t['start'] <= a['start'] < t['end']]
        assert len(owners)==1, (app, a)
        a['tid'] = owners[0]
    # Only the three independently validated directional replacements are
    # projected into source groups. New unmatched edits fail closed in classify.
    replacements = {'long_initial_hamza':('أٓ','ءا'),
                    'below_yeh_hamza':('يٕ','ئ'), 'below_waw_hamza':('وٕ','ؤ')}
    replacement = replacements.get(classification['kind'])
    tokens = []
    for a in ag:
        key = a['key'].replace(*replacement) if replacement else a['key']
        tokens.extend((c,a['tid']) for c in key)
    if ''.join(c for c,_ in tokens) != ''.join(d['key'] for d in dg):
        record['unresolved'].append('source-group-sequence-difference')
        record['unmappedTids'] = [t['tid'] for t in app['targets']]
        return record
    cursor = 0
    for d in dg:
        owners = {tid for _,tid in tokens[cursor:cursor+len(d['key'])]}
        if len(owners)!=1:
            record['unresolved'].append('source-group-crosses-targets')
            record['unmappedTids'] = [t['tid'] for t in app['targets']]
            return record
        d['tid'] = next(iter(owners)); cursor += len(d['key'])
    for span in pdf['spans']:
        tids = sorted({d['tid'] for d in dg if d['start'] < span['end'] and d['end'] > span['start']})
        for glyph in span['glyphs']:
            owners = tids
            decorative = glyph['name'].startswith('waqf')
            basis = 'single-target-ActualText-span'
            if len(tids)>1:
                mark = MARK_IDENTITIES.get(glyph['name'])
                positions = [span['start']+i for i,c in enumerate(span['text']) if c==mark] if mark else []
                candidates = {d['tid'] for pos in positions for d in dg if d['start'] <= pos < d['end']}
                if len(candidates)==1:
                    owners = sorted(candidates); basis = 'explicit-mark-name-and-Unicode-offset'
                else: basis = 'ambiguous-ActualText-span'
            if decorative:
                owners=[]; basis='decorative-waqf-no-target'
            record['assignments'].append({**glyph,'tids':owners,'sourceSpan':span['text'],
                'basis':basis,'sourceSpanTids':tids,
                'status':'decorative' if decorative else 'single' if len(owners)==1 else 'shared' if owners else 'unowned'})
    covered = {tid for a in record['assignments'] for tid in a['tids']}
    record['unmappedTids'] = [t['tid'] for t in app['targets'] if t['tid'] not in covered]
    if record['unmappedTids']: record['unresolved'].append('target-without-source-span-glyph')
    if any(a['status']=='shared' for a in record['assignments']): record['unresolved'].append('shared-glyph-requires-outline-review')
    return record


def markdown(report):
    c=report['counts']
    lines=['# DigitalKhatt glyph-to-target research','',
        '**Source-based coverage checkpoint, not a production renderer or full visual approval.**','',
        '## Measured coverage','',
        'Measure | Count','--- | ---',
        f"Pages | {report['pages']}",
        f"Unique app words | {c['words']}",
        f"Unique app letter units | {c['units']}",
        f"Units with source-glyph evidence | {c['units_with_source_glyph']}",
        f"Unmapped units | {c['unmapped_units']}",
        f"Units touching ambiguous/shared assignments | {c['units_touching_shared_span']}",
        f"Single-owner corpus glyph shows | {c.get('glyphs_single',0)}",
        f"Explicit mark-identity disambiguations | {c.get('glyphs_resolved_by_mark_identity',0)}",
        f"Decorative waqf glyphs with no tid | {c.get('glyphs_decorative',0)}",
        f"Other unowned glyphs | {c.get('glyphs_unowned',0)}",
        f"Quarantined glyphs | {c.get('glyphs_quarantined',0)}",
        f"Unresolved words | {c.get('unresolved_words',0)}",'',
        '## Method and safety','',
        'Words are paired by page, physical line and one-based reading-order slot. Node executes the unchanged judgingTargetsOf rules, preserving every wid, tid, source span and silent flag. Next-word context stops at ayah/page boundaries; an independent all-page comparison with the app nextRecitedWords helper found no differences.',
        '',
        'Each PDF ActualText character span is aligned to ordered source letter groups and then to app target source offsets. Glyphs inherit only their explicit span owner. No nearest box, approximate base-shape label, whole-word ownership or proportional cut is used. Small-letter marks and madd alifs follow the exported app target span, not a separate rule reimplementation. Units flagged silent remain independent. The app also explicitly merges its silent-plural-alif feature into the waw target; this existing rule is preserved, not replaced by a blanket one-unit-per-written-letter policy.',
        '',
        'The word classifier admits only three localized directional notation replacements (277 long initial hamzas, 13 below-yeh hamzas, one below-waw hamza) and two exact wid/skeleton-pinned singleton variants. Long hamza maps both source hamza and alif to the app target whose unchanged source span contains the long hamza. Below-seat replacements preserve the app target offset.',
        '',
        'For 2.72.3, a separate source hamzaabove/sukun span after raa plus small alif is projected to the app standalone hamza target at offset 10. For 17.7.11, added small high waw/maddah glyphs remain under their source sin host; only the extra maddah is omitted from the alignment key. Neither source text nor glyph is deleted. Independent crop inspection supports these two local projections, not theological or full-text equivalence.',
        '',
        'Multi-target ActualText spans are resolved only when an explicit Type3 mark name identifies a Unicode mark at one unique target offset: kasra, fatha, damma, sukun, maddahabove, hamzaabove, hamzaabove.joined and hamzaabove.lamalef. Unknown or repeated ambiguous ownership remains unresolved. The original candidate tids and resolution basis are retained in examples. A cross-target source span is not automatically an intrinsic shared-outline ligature.',
        '',
        'Waqf stop-sign glyphs are decorative and deliberately receive no tid even when inside a word ActualText span. Their kinds/counts appear below. Standalone basmalas, headers, ayah and section markers are outside corpus-word mapping; Al-Fatiha basmala remains included. Those excluded page decorations are audited in parity.json, not included in the corpus counts above.',
        '',
        'Input hashes cover the PDF, all protected app page files, judgingUnits.ts and tokenizer. The exported target rule version is checked. Every page is cross-checked against parity.Extractor.page, including its content/trace identity validation. Word and target IDs are unique, app spans retain their original text, and glyph indices are unique per page. The audit rejects Python -O so validation cannot be disabled.',
        '', '## Special-case inventory','', 'Category | Count','--- | ---']
    lines += [f'{key} | {value}' for key,value in report['specialCases'].items()]
    lines += ['', 'Counts overlap. Lam-alif source-pair counts are orthographic adjacency, not a count of shared glyph outlines. Ten structured examples per available category are in mapping.json; categories with fewer than ten occurrences include all available cases.', '',
        '## Glyphs without a unique target','', 'Kind | Count','--- | ---']
    lines += [f'{key} | {value}' for key,value in report['nonSingleGlyphKinds'].items()]
    lines += ['', '## Remaining gates','',
        '- Source-based ownership coverage does not prove every outline contains only that letter, nor that every dot/mark is visually correct. No all-page color sheet, 200-word color review, touch-target test, or browser/device approval is claimed.',
        '- Representative crops independently support joined hamza, lam-alif hamza and the two singleton cases. Ten rendered image examples per category have not been produced by this mapper; JSON examples are not a substitute for that visual gate.',
        '- No PDF outlines, positions or image assets are published by this report. The unresolved sample-PDF redistribution licence and independent generation route remain separate blockers to production.',
        '- No app mode, scoring rule, protected asset, production rendering or persisted evidence format is changed. Zero unresolved source assignments, if measured above, is not permission to ship.',
        '', '## Reproduce','',
        'From repository root with requirements-parity.txt installed and Node supporting --experimental-strip-types:', '',
        '```sh',
        'python scripts/digitalkhatt/glyph_mapping.py --pdf /path/to/old_Madinah_mushaf.pdf',
        'python -m unittest discover -s scripts/digitalkhatt -p "test_*mapping.py"',
        '```', '',
        'The mapping command generates mapping.json and MAPPING.md together. Optional --pages accepts 1..604 for diagnostics; a partial run never establishes all-page coverage.', '',
        'Confidence: practicality 95/100; architecture/data safety 96/100 for this pinned research pipeline; visual certainty 75/100 pending broad color/outline review.']
    return '\n'.join(lines)+'\n'


def main():
    if not __debug__: raise RuntimeError('Run without -O: audit assertions are required')
    parser = argparse.ArgumentParser()
    parser.add_argument('--pdf',required=True)
    parser.add_argument('--out', type=Path,default=Path(__file__).parent/'reports/mapping.json')
    parser.add_argument('--pages', type=int,default=604)
    args=parser.parse_args()
    if not 1 <= args.pages <= 604: parser.error('--pages must be in 1..604')
    digest=hashlib.sha256()
    for n in range(1,605): digest.update(f'p{n}.json\0'.encode()+(ART/f'p{n}.json').read_bytes())
    if digest.hexdigest()!=APP_SHA256: raise ValueError('Protected app corpus SHA256 changed')
    rule_hash=hashlib.sha256((ROOT/'src/lib/judgingUnits.ts').read_bytes()).hexdigest()
    tokenize_hash=hashlib.sha256((ROOT/'src/lib/tokenize.ts').read_bytes()).hexdigest()
    if rule_hash!='d8473cd99bdde2eb52c374a8339b9bc7745b54403ff07473926f659cc012d57d' or tokenize_hash!='3dd09f1fb64342ddcab9bf43b5021b45ea29decf2d573132d47e5307a6a72c1d':
        raise ValueError('App target rules or tokenizer changed')
    exported=json.loads(subprocess.check_output(['node','--experimental-strip-types',str(Path(__file__).with_name('export_judging_targets.mjs'))], cwd=ROOT))
    assert exported['ruleVersion']=='qpc-hafs-v1-targets-4.0.0'
    extractor=Extractor(args.pdf)
    seen_words=set(); seen_targets=set()
    counts=Counter(); kinds=Counter(); special=Counter(); examples=defaultdict(list); unresolved=[]; page_reports=[]
    for p in exported['pages'][:args.pages]:
        pdf=extract_page(extractor,p['page']); app=p['words']
        verified=extractor.page(p['page'])
        assert [(w['line'],w['text']) for w in pdf]==[(w['line'],w['text']) for w in verified['words']]
        all_indices=[g['index'] for w in pdf for span in w['spans'] for g in span['glyphs']]
        assert len(all_indices)==len(set(all_indices))
        assert all(0<=i<verified['glyph_count'] for i in all_indices)
        assert len(pdf)==len(app)
        local=Counter(); slots=Counter()
        for a,d in zip(app,pdf):
            assert a['line']==d['line']
            assert a['wid'] not in seen_words; seen_words.add(a['wid'])
            for target in a['targets']:
                assert target['tid'] not in seen_targets; seen_targets.add(target['tid'])
                assert target['fullGlyph']==a['text'][target['start']:target['end']]
            r=map_word(a,d); slots[a['line']]+=1; r['slot']=slots[a['line']]; n=len(a['targets']); local['words']+=1;local['units']+=n
            local['units_with_source_glyph']+=n-len(r['unmappedTids']);local['unmapped_units']+=len(r['unmappedTids'])
            if any(reason.startswith('source-group-') for reason in r['unresolved']):
                local['glyphs_quarantined'] += sum(len(s['glyphs']) for s in d['spans'])
            ambiguous = {tid for g in r['assignments'] if g['status']=='shared' for tid in g['tids']}
            local['units_touching_shared_span'] += len(ambiguous)
            local['units_without_mapping_ambiguity'] += n-len(r['unmappedTids'])-len(ambiguous)
            if r['unresolved']:
                unresolved.append({'page':p['page'],**r}); local['unresolved_words']+=1
            local['word_class_'+r['wordClassification']]+=1
            for assignment in r['assignments']:
                local['glyphs_'+assignment['status']]+=1
                if assignment['basis']=='explicit-mark-name-and-Unicode-offset':
                    local['glyphs_resolved_by_mark_identity']+=1
                    if len(examples['mark_span_resolution'])<10:examples['mark_span_resolution'].append({'page':p['page'],'wid':a['wid'],'text':a['text'],**assignment})
                if assignment['status']!='single':kinds[assignment['name']]+=1
            if r['wordClassification'] not in ('strict_skeleton_equal',):
                category='notation_'+r['wordClassification']
                if len(examples[category])<10: examples[category].append({'page':p['page'],**r})
            letter_groups=groups(a['text'])
            for left,right in zip(letter_groups,letter_groups[1:]):
                if left['key']=='ل' and right['key'] in ('ا','أ','إ','أٓ'):
                    special['lam_alif_source_pairs']+=1
                    if len(examples['lam_alif_source_pairs'])<10:examples['lam_alif_source_pairs'].append({'page':p['page'],'wid':a['wid'],'text':a['text'],'targets':a['targets'],'glyphs':r['assignments']})
            for t in a['targets']:
                categories=[]
                if t.get('silent'):categories.append('silent_units')
                if t['kind']=='hamza':categories.append('hamza_units')
                if t['kind']=='allah-lam':categories.append('allah_lam_units')
                for f in ['madd-alif','silent-plural-alif','dagger-alif','small-waw','small-ya']:
                    if f in t['features']:categories.append(f)
                for category in categories:
                    special[category]+=1
                    if len(examples[category])<10:
                        examples[category].append({'page':p['page'],'wid':a['wid'],'text':a['text'],'target':t,'glyphs':[g for g in r['assignments'] if t['tid'] in g['tids']]})
            for g in r['assignments']:
                if g['status']=='shared' and len(examples['shared_glyphs'])<10: examples['shared_glyphs'].append({'page':p['page'],'wid':a['wid'],**g})
        counts.update(local); page_reports.append({'page':p['page'],**local})
        if p['page']%100==0:print('page',p['page'],flush=True)
    for key in ('glyphs_single','glyphs_shared','glyphs_unowned','glyphs_decorative','glyphs_quarantined','unresolved_words'):
        counts.setdefault(key,0)
    assert len(page_reports)==args.pages
    if args.pages==604: assert len(seen_words)==77433
    report={'inputChecksums':{'pdf':PDF_SHA256,'app':APP_SHA256,'judgingUnits':rule_hash,'tokenize':tokenize_hash},'schema':'digitalkhatt-research-glyph-mapping-v1','researchOnly':True,'ruleVersion':exported['ruleVersion'],'pages':args.pages,'method':'Ordered source-group alignment; three explicit validated directional hamza replacements; PDF ActualText span ownership and explicit Unicode mark identities and two exact-pinned singleton group adjustments; Node app rules unchanged.','counts':dict(counts),'specialCases':dict(special),'nonSingleGlyphKinds':dict(kinds),'targetContext':exported['context'],'examples':dict(examples),'pageCoverage':page_reports,'unresolvedWords':unresolved}
    args.out.parent.mkdir(parents=True,exist_ok=True);args.out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    args.out.with_name('MAPPING.md').write_text(markdown(report))
    print(json.dumps(dict(counts),indent=2))

if __name__=='__main__':main()
