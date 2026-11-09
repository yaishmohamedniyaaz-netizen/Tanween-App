#!/usr/bin/env python3
"""PDF-independent, research-only native cluster-to-app-target audit.

Imports the semantic mapping function only; never opens a PDF or transfers its
indices. Native cluster offsets and glyph identities are independently checked.
"""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from glyph_mapping import map_word
from parity import ART, ROOT, skeleton
from word_mapping import APP_SHA256

PROFILES={
    'default-baseline':{
        'placements':'70abf6fa756a27a5d9474f0066d3d8c094824b004f5167a131d7e0cc7b952554',
        'binary':'3a9dda3d052865495f8e75c471ae3d05b485c554bb85ca044e40230822c328fb',
        'variants':638,'justifier':'harfbuzz','style':'same-size-by-page','shrink':'none',
        'geometryStatus':'Overfull lines found, not integration candidate'},
    'fitted-candidate':{
        'placements':'51babdf89874160043e39033ba69a401875f2c1a8c524f1fe439b414b36c78b0',
        'binary':'78800d93d3864398062dfa9d13310a06311da096b8f59a56e68f245d25b7ede8',
        'variants':4306,'justifier':'decl-policy','style':'font-size-xscale','shrink':'standard',
        'geometryStatus':'Independent native decoder reports no out-of-frame line advance endpoints; not full visual approval'}
}
SIDECAR_SHA256='a88ec463bf0d8df24082b01d29cda4678559ba647887ca04b13e14b434cb09fd'
RULE_SHA256='d8473cd99bdde2eb52c374a8339b9bc7745b54403ff07473926f659cc012d57d'
TOKENIZER_SHA256='3dd09f1fb64342ddcab9bf43b5021b45ea29decf2d573132d47e5307a6a72c1d'


def require(condition, message):
    if not condition: raise ValueError(message)


def digest_file(path):
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for block in iter(lambda:f.read(1048576),b''): h.update(block)
    return h.hexdigest()


def source_words(line):
    require(all(ord(c)<=0xffff for c in line),'Non-BMP source requires UTF16 conversion')
    return [{'text':m.group(),'start':m.start(),'end':m.end()} for m in re.finditer(r'\S+',line)]


def native_words(page, lines, glyph_names):
    """Clusters end at next distinct cluster or word end, never a guessed cut."""
    words={}; excluded=Counter(); glyphs=page['glyphs']
    for line_no,line in enumerate(lines,1):
        tokens=source_words(line)
        basmala=page['page']!=1 and [skeleton(w['text']) for w in tokens]==['بسم','الله','الرحمن','الرحيم']
        header=line.startswith('سُورَةُ ')
        for word_no,w in enumerate(tokens,1):
            reason='header' if header else 'standalone_basmala' if basmala else 'ayah_or_section_marker' if not skeleton(w['text']) else None
            words[line_no,word_no]={**w,'line':line_no,'word':word_no,'glyphs':[],'excluded':reason}
    for index,g in enumerate(glyphs):
        require(g['index']==index,'Native glyph indices must be contiguous per page')
        require(isinstance(g['cluster'],int) and isinstance(g['line'],int) and 1<=g['line']<=len(lines),'Invalid line/cluster')
        require(glyph_names.get(str(g['codepoint']))==g['name'],'Native codepoint/name differs from sidecar')
        require(isinstance(g['mark'],bool),'Invalid mark flag')
        if g['mark']:
            require(isinstance(g['base'],int) and 0<=g['base']<index,'Mark has invalid native attachment index')
            base=glyphs[g['base']]
            require(not base['mark'] and base['line']==g['line'],'Mark attaches outside base/line')
        else: require(g['base']==-1,'Native base unexpectedly has attachment index')
        if g['word']==0:
            require(g['name']=='space' and 0<=g['cluster']<len(lines[g['line']-1]) and lines[g['line']-1][g['cluster']].isspace(),'Unclassified zero-word glyph')
            excluded['space']+=1; continue
        key=(g['line'],g['word']);require(key in words,'Unknown native word index')
        word=words[key]
        require(word['start']<=g['cluster']<word['end'],'Native cluster outside declared word')
        if word['excluded']:
            excluded[word['excluded']]+=1; continue
        require(g['text']==word['text'],'Native word text differs from sidecar source')
        if g['mark']:
            require(glyphs[g['base']]['word']==g['word'],'Mark attaches outside its source word')
        word['glyphs'].append(g)
    result=[]
    for key,w in sorted(words.items()):
        if w['excluded']:continue
        require(w['glyphs'],'Recited native source word has no glyph records')
        clusters=sorted({g['cluster'] for g in w['glyphs']})
        require(clusters[0]==w['start'],'Native word starts with an uncovered source prefix')
        spans=[]
        for start,end in zip(clusters,clusters[1:]+[w['end']]):
            spans.append({'start':start-w['start'],'end':end-w['start'],
                          'text':lines[w['line']-1][start:end],
                          'glyphs':[{'index':g['index'],'name':g['name']} for g in w['glyphs'] if g['cluster']==start]})
        result.append({'line':w['line'],'text':w['text'],'spans':spans})
    return result,excluded


def resolve_native_singleton(app, native, record):
    """Resolve only the pinned raa/small-alif/standalone-hamza cluster.

    Native base attachments are geometric, not semantic. No attachment edge
    is used here: exact glyph identities project to exact source characters.
    """
    if (app['wid'],app['text'],native['text']) != (
        '2.72.3','فَٱدَّٰرَٰءۡتُمۡ','فَٱدَّٰرَٰ͏ْٔتُمْ'):
        return record
    if record['wordClassification']!='standalone_combining_hamza':return record
    unresolved=[g for g in record['assignments'] if g['status']=='shared']
    if Counter(g['name'] for g in unresolved)!=Counter({'reh.isol':1,'smallalef.isol':1}):return record
    target=next((t for t in app['targets'] if t['start']==7 and t['end']==10 and t['fullGlyph']=='رَٰ'),None)
    if target is None:return record
    if not all(g['sourceSpan']=='رَٰ͏ْٔ' and set(g['tids'])=={'2.72.3@r7','2.72.3@r10'} for g in unresolved):return record
    identities={'reh.isol':(7,'ر'),'smallalef.isol':(9,'ٰ')}
    for g in unresolved:
        offset,character=identities[g['name']]
        require(native['text'][offset]==character,'Pinned native singleton character changed')
        g['tids']=[target['tid']];g['status']='single'
        g['basis']='native-exact-singleton-glyph-and-source-offset'
        g['nativeSourceCharacterOffset']=offset
    record['unresolved']=[reason for reason in record['unresolved'] if reason!='shared-glyph-requires-outline-review']
    return record


def exclude_native_placeholders(app, record):
    # Native shaping emits empty space placeholders inside some word clusters,
    # in addition to word=0 separator spaces. Neither is letter ink.
    for glyph in record['assignments']:
        if glyph['name']=='space':
            glyph['tids']=[];glyph['status']='empty-placeholder'
            glyph['basis']='native-zero-contour-space-no-target'
    covered={tid for g in record['assignments'] for tid in g['tids']}
    record['unmappedTids']=[t['tid'] for t in app['targets'] if t['tid'] not in covered]
    if record['unmappedTids'] and 'target-without-source-span-glyph' not in record['unresolved']:
        record['unresolved'].append('target-without-source-span-glyph')
    return record


def markdown(r):
    c=r['counts']
    lines=['# Native source glyph mapping','', '**Research only; independent native cluster evidence, not transferred PDF indices.**','',
           f"Native policy: {r['nativeProfile']['name']} ({r['nativeProfile']['justifier']}, {r['nativeProfile']['style']}, shrink {r['nativeProfile']['shrink']}). {r['nativeProfile']['geometryStatus']}.",'', 'Measure | Count','--- | ---']
    lines += [f'{k} | {v}' for k,v in c.items()]
    lines += ['', '## Method','',
      'The final normalized native sidecar provides UTF-16 source lines. Word starts and ends are derived from that exact source. Each unique native cluster ends at the next cluster within its word or the word end. Every glyph index, word/line bound, native codepoint/name and mark/base attachment is validated before adapting clusters into source spans.',
      '', 'The semantic mapper executes unchanged app targets in Node and applies only independently validated directional notation classifications. Its PDF extraction code is never called. For the default-baseline coarse clusters, a single exact native word (2.72.3) can resolve reh.isol to source raa offset7 and smallalef.isol to dagger-alif offset9, both in app target@r7. This requires exact app/native strings, classifier, glyph-name inventory, candidate tids and source-character checks. The fitted-candidate output has finer source clusters and needs zero such supplemental resolutions; the count above records actual use. Geometric base attachments are never treated as letter ownership. Native cluster spans can be coarser than PDF ActualText spans: unresolved multi-target clusters remain ambiguous; no forced shape-name ownership or whole-word mapping is added.',
      '', 'Waqf glyphs and empty in-word space placeholders receive no tid. In-word empty placeholders are counted separately from word=0 separator spaces; neither contributes visible ink. Spaces, standalone basmalas, ayah/section markers and header lines are excluded. Al-Fatiha basmala remains judged. Detailed glyph positions/outlines are not emitted by this report.',
      '', '## Limits','',
      f"Contour audit: {r['contourAudit']}. Assigned source glyphs are not proof of visible ink when contour validation is unavailable.",
      'Unknown shared clusters and source-glyph coverage are reported separately. Even complete cluster coverage is not full visual, browser, licensing or release approval. Native output may differ visually from the PDF. The nonheading export omits surah headings and is not yet a complete-page app renderer. No app source, rules or production assets are changed.',
      '', '## Reproduce','', '```sh',
      'python scripts/digitalkhatt/source_pipeline/map_native.py --placements /outside/repo/native-fit/placements.jsonl --sidecar /outside/repo/native-fit/oldmadina.bin.json --binary /outside/repo/native-fit/oldmadina.bin --contour-audit /outside/repo/native-fit-proof/native-proof.json --out scripts/digitalkhatt/reports/native-mapping.json',
      'python -m unittest discover -s scripts/digitalkhatt/source_pipeline -p test_native_mapping.py', '```','']
    return '\n'.join(lines)


def main():
    if not __debug__:raise RuntimeError('Audit must not run under Python -O')
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--placements',type=Path,required=True);ap.add_argument('--sidecar',type=Path,required=True)
    ap.add_argument('--out',type=Path,default=ROOT/'scripts/digitalkhatt/reports/native-mapping.json')
    ap.add_argument('--pages',type=int,default=604)
    ap.add_argument('--profile',choices=PROFILES,default='fitted-candidate')
    ap.add_argument('--binary',type=Path,required=True);ap.add_argument('--contour-audit',type=Path,required=True)
    args=ap.parse_args();profile=PROFILES[args.profile];require(1<=args.pages<=604,'Pages must be 1..604')
    for path in (args.placements,args.sidecar,args.binary,args.contour_audit):
        require(not path.resolve().is_relative_to(ROOT.resolve()),'Native source artifacts must remain outside repository')
    require(not args.out.is_symlink() and not args.out.with_name('NATIVE_MAPPING.md').is_symlink(),'Refusing report symlink')
    require(all(output.resolve() not in (args.placements.resolve(),args.sidecar.resolve(),args.binary.resolve(),args.contour_audit.resolve()) for output in (args.out,args.out.with_name('NATIVE_MAPPING.md'))),'Refusing to overwrite input')
    allowed=(ROOT/'scripts/digitalkhatt/reports').resolve()
    require(not args.out.resolve().is_relative_to(ROOT.resolve()) or args.out.resolve().parent==allowed,'Report inside repository must be in reports directory')
    hashes={'placements':digest_file(args.placements),'sidecar':digest_file(args.sidecar)}
    require(hashes['placements']==profile['placements'],'Native placements differ from independently verified pin')
    require(hashes['sidecar']==SIDECAR_SHA256,'Native sidecar differs from validated all604 pin')
    digest=hashlib.sha256()
    for n in range(1,605):digest.update(f'p{n}.json\0'.encode()+(ART/f'p{n}.json').read_bytes())
    require(digest.hexdigest()==APP_SHA256,'Protected app corpus changed');hashes['app']=APP_SHA256
    for file,pin in [('judgingUnits.ts',RULE_SHA256),('tokenize.ts',TOKENIZER_SHA256)]:
        require(digest_file(ROOT/'src/lib'/file)==pin,'App semantic rules changed');hashes[file]=pin
    hashes['binary']=digest_file(args.binary);require(hashes['binary']==profile['binary'],'Native binary changed')
    hashes['contourAudit']=digest_file(args.contour_audit)
    contour_audit=json.loads(args.contour_audit.read_text())
    require(contour_audit['binary_sha256']==profile['binary'] and contour_audit['sidecar_sha256']==SIDECAR_SHA256,'Contour audit belongs to other native inputs')
    require(contour_audit['pages']==604 and contour_audit['missing_outline_references']==0,'Contour audit incomplete')
    sidecar=json.loads(args.sidecar.read_text());require(len(sidecar['pages'])==604,'Native sidecar must cover604pages')
    contours=defaultdict(list)
    require(len(contour_audit['variant_contours'])==profile['variants'],'Native variant inventory changed')
    for variant in contour_audit['variant_contours'].values():
        require(sidecar['glyphNames'].get(str(variant['codepoint']))==variant['name'],'Contour name differs from native sidecar')
        require(isinstance(variant['contours'],int) and variant['contours']>=0,'Invalid contour count')
        contours[variant['codepoint']].append(variant['contours'])
        require(variant['contours']>0 or variant['name']=='space','Unexpected empty nonspace native outline')
    exported=json.loads(subprocess.check_output(['node','--experimental-strip-types',str(Path(__file__).resolve().parents[1]/'export_judging_targets.mjs')],cwd=ROOT))
    require(exported['ruleVersion']=='qpc-hafs-v1-targets-4.0.0','Target rule version changed')
    seen_tids=set()
    counts=Counter();page_coverage=[];failures=[];non_single=Counter();examples=defaultdict(list);seen=set();excluded=Counter()
    with args.placements.open() as stream:
        for number,line in enumerate(stream,1):
            require(number<=604,'Extra native pages')
            page=json.loads(line);require(page['page']==number,'Native page order/coverage mismatch')
            if number>args.pages:continue
            for glyph in page['glyphs']:
                require(glyph['codepoint'] in contours,'Native glyph has no contour variant evidence')
            native,decorations=native_words(page,sidecar['pages'][number-1],sidecar['glyphNames']);excluded.update(decorations)
            app=exported['pages'][number-1]['words'];require(len(native)==len(app),'Native/app word count differs')
            local=Counter();slot=Counter()
            for a,d in zip(app,native):
                require(a['line']==d['line'],'Native/app physical line differs')
                require(a['wid'] not in seen,'Duplicate app wid');seen.add(a['wid']);slot[a['line']]+=1
                for target in a['targets']:
                    require(target['tid'] not in seen_tids,'Duplicate native app tid');seen_tids.add(target['tid'])
                    require(target['fullGlyph']==a['text'][target['start']:target['end']],'Exported source span differs')
                r=exclude_native_placeholders(a,resolve_native_singleton(a,d,map_word(a,d)));r['nativeText']=r.pop('pdfText');r.update(page=number,slot=slot[a['line']]);local['words']+=1;local['units']+=len(a['targets'])
                ambiguous={tid for g in r['assignments'] if g['status']=='shared' for tid in g['tids']}
                local['unmapped_units']+=len(r['unmappedTids']);local['units_with_source_glyph']+=len(a['targets'])-len(r['unmappedTids'])
                local['units_touching_shared_clusters']+=len(ambiguous)
                drawable_tids={tid for g in r['assignments'] if all(contours[page['glyphs'][g['index']]['codepoint']]) for tid in g['tids']}
                local['units_with_nonempty_source_glyph']+=len(drawable_tids)
                local['zero_contour_corpus_glyphs']+=sum(not all(contours[page['glyphs'][g['index']]['codepoint']]) for g in r['assignments'])
                for g in r['assignments']:
                    local['glyphs_'+g['status']]+=1
                    if g['basis']=='native-exact-singleton-glyph-and-source-offset':local['glyphs_exact_singleton_resolved']+=1
                    if g['status'] not in ('single','decorative','empty-placeholder'):non_single[g['name']]+=1
                if r['unresolved']:
                    failures.append({**r,'assignments':[g for g in r['assignments'] if g['status'] not in ('single','decorative','empty-placeholder')]});local['unresolved_words']+=1
                elif len(examples[r['wordClassification']])<10:examples[r['wordClassification']].append({'page':number,'wid':a['wid'],'line':a['line'],'slot':slot[a['line']],'text':a['text']})
            counts.update(local);page_coverage.append({'page':number,**local})
            if number%100==0:print('page',number,flush=True)
    require(number==604,'Native placements must cover604pages')
    require(len(page_coverage)==args.pages,'Incomplete requested page audit')
    if args.pages==604:require(len(seen)==77433,'Native corpus unique word coverage changed')
    for key in ('glyphs_shared','glyphs_unowned','unresolved_words','glyphs_exact_singleton_resolved'):counts.setdefault(key,0)
    r={'nativeProfile':{'name':args.profile,**profile},'engineSource':'VisualMetaFont 220658be, scratch-only RTLD_LAZY fix','schema':'native-cluster-mapping-research-v1','researchOnly':True,'pdfRead':False,'pages':args.pages,'inputChecksums':hashes,'ruleVersion':exported['ruleVersion'],'counts':dict(counts),'excludedGlyphs':dict(excluded),'nonSingleGlyphKinds':dict(non_single),'contourAudit':{'variants':profile['variants'],'emptyVariantNames':['space'],'allNativeGlyphCodesHaveVariantEvidence':True,'binaryEmptySpaceOccurrences':contour_audit['empty_contour_placements']['space'],'note':'Native JSONL and binary decorative-space occurrence inventories differ; no index transfer asserted.'},'pageCoverage':page_coverage,'examples':dict(examples),'unresolvedWords':failures}
    args.out.parent.mkdir(parents=True,exist_ok=True);args.out.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');args.out.with_name('NATIVE_MAPPING.md').write_text(markdown(r));print(json.dumps(dict(counts),indent=2))

if __name__=='__main__':main()
