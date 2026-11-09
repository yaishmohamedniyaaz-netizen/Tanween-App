#!/usr/bin/env python3
"""Local-only source contour colour sheets. No PDF input or production assets."""
import argparse
from collections import defaultdict
import hashlib
from html import escape
import json
import math
from pathlib import Path
import random
import struct
import subprocess

from fontTools.pens.boundsPen import BoundsPen
from fontTools.svgLib.path import parse_path
from map_native import (ART, ROOT, APP_SHA256, PROFILES, SIDECAR_SHA256,
                        RULE_SHA256, TOKENIZER_SHA256, digest_file, require,
                        native_words, map_word, exclude_native_placeholders)
from safety import output_directory, atomic_write

SEED = 20261109
ATTRIBUTION = 'DigitalKhatt · OFL 1.1 · sponsored by Tarteel · source-only research'


def decode(data, meta):
    """Decode pinned extended DKLY v4; preserve native geometry, not JSON rounding."""
    offset = 0
    def get(fmt):
        nonlocal offset
        size = struct.calcsize('>' + fmt)
        require(offset + size <= len(data), 'Truncated DKLY')
        values = struct.unpack_from('>' + fmt, data, offset)
        offset += size
        require(all(not isinstance(v, float) or math.isfinite(v) and abs(v)<1000000 for v in values), 'Unsafe coordinate')
        return values[0] if len(values) == 1 else values
    require(get('I') == 0x444B4C59 and get('H') == 4, 'Unknown DKLY')
    width, spacing = get('II')
    require((width, spacing) == (17000, 1800), 'Unexpected frame')
    variants = {}
    for vid in range(1, get('H') + 1):
        code, contours = get('H'), get('B')
        name = meta['glyphNames'][str(code)]
        path = []
        for _ in range(contours):
            path.append('M' + ' '.join(map(repr, get('ff'))))
            for _ in range(get('B')):
                path.append('C' + ' '.join(map(repr, get('ffffff'))))
            path.append('Z')
        path = ' '.join(path)
        require(path or name == 'space', 'Unexpected empty outline')
        pen = BoundsPen(None)
        parse_path(path, pen)
        variants[vid] = dict(code=code, name=name, path=path, bounds=pen.bounds)
    count = get('H')
    require(count == len(meta['pages']) == 604, 'Page coverage changed')
    pages = []
    for pn in range(count):
        records = []
        linecount = get('B')
        require(linecount == len(meta['pages'][pn]), 'Line count differs')
        for ln in range(linecount):
            glyphs = []
            for _ in range(get('B')):
                vid, cluster, mask = get('HBB')
                require(mask & 240 == 0, 'Unknown bitmask')
                glyphs.append((vid, cluster, *[get(f) if mask & (1<<b) else 0 for b,f in enumerate(('h','h','h','B'))]))
            kind, xstart, xs, fs, textlen = get('BhiiH')
            require(kind in (0,1,2), 'Unknown line kind')
            if kind == 1: get('B')
            require(textlen == len(meta['pages'][pn][ln].encode('utf-16-le'))//2, 'Text length differs')
            if kind == 1:
                require(all(g[0]==0 for g in glyphs), 'Unexpected heading outline')
                continue
            fs /= 65536
            sx = fs * (xs / 65536 if kind == 0 else 1)
            require(0 < fs < 100 and 0 < sx < 100, 'Unsafe scale')
            right = width - xstart
            x = right
            for ordinal, (vid, cluster, ax, dx, dy, colour) in enumerate(glyphs):
                require(0 <= cluster < textlen, 'Invalid cluster')
                v = variants[vid]
                x -= ax
                px = right + (x + dx - right) * sx
                py = -meta['baselines'][pn][ln] - dy * fs
                box = None
                if v['bounds']:
                    a,b,c,d = v['bounds']
                    box = [px+a*sx, py-d*fs, px+c*sx, py-b*fs]
                records.append(dict(line=ln+1, ordinal=ordinal, vid=vid, cluster=cluster,
                                    codepoint=v['code'], name=v['name'], advance=ax, offsets=[dx,dy], x=px,y=py,sx=sx,sy=-fs,box=box))
        pages.append(records)
    require(offset == len(data), 'Trailing DKLY bytes')
    return variants, pages


def align_page(source, binary):
    """Strict occurrence-order bijection after excluding only verified empty spaces.

    No transferred page index: each nonempty occurrence must match its physical
    line, source cluster, codepoint and name; repeated identities retain order.
    """
    src = [g for g in source['glyphs'] if g['name'] != 'space']
    dst = [g for g in binary if g['box'] is not None]
    require(len(src) == len(dst), 'Nonempty occurrence counts differ')
    linked = {}
    for a,b in zip(src,dst):
        key = ('line','cluster','codepoint','name')
        require(tuple(a[k] for k in key) == tuple(b[k] for k in key),
                f"Native identity sequence mismatch page {source['page']} index {a['index']}")
        require(a['final'] == b['offsets'] and a['shaped'][2] == b['advance'], 'Native occurrence positioning differs')
        require(a['index'] not in linked, 'Duplicate JSONL index')
        linked[a['index']] = b
    return linked


def svg_word(record, variants, x, y, w, h):
    glyphs = record['geometry']
    box = [min(g['box'][0] for g in glyphs),min(g['box'][1] for g in glyphs),
           max(g['box'][2] for g in glyphs),max(g['box'][3] for g in glyphs)]
    scale = min((w-36)/(box[2]-box[0]), (h-74)/(box[3]-box[1]))
    tx = x + (w-(box[2]-box[0])*scale)/2-box[0]*scale
    ty = y+44+(h-74-(box[3]-box[1])*scale)/2-box[1]*scale
    result = [f'<rect x="{x+5}" y="{y+5}" width="{w-10}" height="{h-10}" rx="8" fill="#fff7f8" stroke="#dedede"/>',
              f'<text x="{x+15}" y="{y+23}" font-size="14">p{record["page"]} · {escape(record["wid"])} · {escape(record["tid"])}</text>',
              f'<text x="{x+15}" y="{y+39}" font-size="10">source indices: {escape(str(record["selectedSourceGlyphIndices"]))}</text>',
              f'<text x="{x+w-15}" y="{y+h-16}" text-anchor="start" direction="rtl" font-family="sans-serif" font-size="16">{escape(record["text"])}</text>',
              f'<g transform="translate({tx} {ty}) scale({scale})">']
    for g in glyphs:
        colour = '#ca244d' if g['selected'] else '#161616'
        result.append(f'<path fill="{colour}" d="{variants[g["vid"]]["path"]}" transform="translate({g["x"]} {g["y"]}) scale({g["sx"]} {g["sy"]})"/>')
    return ''.join(result)+'</g>'


def render_sheet(records, variants, title, output):
    cols, cellw, cellh = 4, 420, 230
    height = 90 + math.ceil(len(records)/cols)*cellh
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="1680" height="{height}" viewBox="0 0 1680 {height}"><rect width="100%" height="100%" fill="white"/><g font-family="sans-serif" fill="#222"><text x="20" y="30" font-size="22">{escape(title)}</text><text x="20" y="57" font-size="15">{ATTRIBUTION}</text>'
    for i,r in enumerate(records):
        svg += svg_word(r,variants,(i%cols)*cellw,80+(i//cols)*cellh,cellw,cellh)
    svg += '</g></svg>'
    atomic_write(output.with_suffix('.svg'), svg.encode())
    # Inkscape handles Arabic labels; rasterizes our SVG, not a PDF source.
    require(not output.with_suffix('.png').is_symlink(), 'Refusing raster symlink')
    subprocess.run(['inkscape',str(output.with_suffix('.svg')),'--export-type=png',
                    '--export-filename='+str(output.with_suffix('.png'))],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--native',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    out=output_directory(args.output)
    files={'binary':args.native/'oldmadina.bin','sidecar':args.native/'oldmadina.bin.json','placements':args.native/'placements.jsonl'}
    require(not out.is_relative_to(args.native.resolve()), 'Output must not overwrite native inputs')
    pins={**{k:PROFILES['fitted-candidate'][k] for k in ('binary','placements')},'sidecar':SIDECAR_SHA256}
    for k,p in files.items(): require(digest_file(p)==pins[k],f'Changed {k}')
    digest=hashlib.sha256()
    for n in range(1,605):digest.update(f'p{n}.json\0'.encode()+(ART/f'p{n}.json').read_bytes())
    require(digest.hexdigest()==APP_SHA256,'Changed app corpus')
    for name,pin in [('judgingUnits.ts',RULE_SHA256),('tokenize.ts',TOKENIZER_SHA256)]:require(digest_file(ROOT/'src/lib'/name)==pin,'Changed rules')
    meta=json.loads(files['sidecar'].read_text())
    variants,binary=decode(files['binary'].read_bytes(),meta)
    exported=json.loads(subprocess.check_output(['node','--experimental-strip-types',str(ROOT/'scripts/digitalkhatt/export_judging_targets.mjs')],cwd=ROOT))
    require(exported['ruleVersion']=='qpc-hafs-v1-targets-4.0.0','Changed rule version')
    corpus=[dict(a,page=p['page']) for p in exported['pages'] for a in p['words']]
    rng=random.Random(SEED)
    random_words=rng.sample(corpus,200)
    chosen={a['wid']:rng.choice(a['targets'])['tid'] for a in random_words}
    # Textual class, not a claim that every selected word is visibly stacked.
    special=[a for a in corpus if 'لا' in ''.join(c for c in a['text'] if '\u0621'<=c<='\u064a') or ''.join(c for c in a['text'] if '\u0621'<=c<='\u064a') in ('على','لكم','بسم')]
    special_words=rng.sample([a for a in special if a['wid'] not in chosen],40)
    for a in special_words:chosen[a['wid']]=rng.choice(a['targets'])['tid']
    hard={'2.72.3':'2.72.3@r7','17.7.11':'17.7.11@r4','1.7.7':'1.7.7@r2','2.4.9':'2.4.9@r7','2.2.3':'2.2.3@r2'}
    chosen.update(hard)
    checkpoint=[1,2,3,50,187,293,582,600,604]
    page_words=[]
    for pn in checkpoint:
        a=next(a for a in corpus if a['page']==pn and a['wid'] not in chosen)
        chosen[a['wid']]=a['targets'][0]['tid'];page_words.append(a)
    records={};alignment_count=0
    with files['placements'].open() as stream:
        for pn,line in enumerate(stream,1):
            page=json.loads(line);require(page['page']==pn,'Page sequence changed')
            linked=align_page(page,binary[pn-1]);alignment_count+=len(linked)
            native,_=native_words(page,meta['pages'][pn-1],meta['glyphNames'])
            app=exported['pages'][pn-1]['words']
            require(len(native)==len(app),'Word coverage differs')
            for a,d in zip(app,native):
                require(a['line']==d['line'],'Word line differs')
                if a['wid'] not in chosen:continue
                for t in a['targets']:require(t['fullGlyph']==a['text'][t['start']:t['end']],'Target slice changed')
                record=exclude_native_placeholders(a,map_word(a,d))
                require(not record['unresolved'] and not record['unmappedTids'],'Unresolved sampled word')
                tid=chosen[a['wid']]
                require(tid in {t['tid'] for t in a['targets']},'Chosen tid missing')
                geometry=[];indices=[];unowned=[]
                for g in record['assignments']:
                    if g['status']=='empty-placeholder':continue
                    require(g['index'] in linked,'Missing drawable occurrence')
                    selected=tid in g['tids']
                    require(g['status']=='single' or not g['tids'],'Unexpected non-single assignment')
                    if selected:indices.append(g['index'])
                    if not g['tids']:unowned.append(g['index'])
                    geometry.append(dict(linked[g['index']],index=g['index'],selected=selected))
                require(indices,'Selected tid has no ink')
                records[a['wid']]=dict(page=pn,wid=a['wid'],tid=tid,text=a['text'],nativeText=d['text'],selectedSourceGlyphIndices=indices,noTidGlyphIndices=unowned,geometry=geometry)
    require(pn==604 and len(records)==len(chosen),'Incomplete proof coverage')
    for start in range(0,200,20):render_sheet([records[a['wid']] for a in random_words[start:start+20]],variants,f'Random colour words {start+1}–{start+20}; seed {SEED}',out/f'random-{start//20+1:02}')
    for start in range(0,40,20):render_sheet([records[a['wid']] for a in special_words[start:start+20]],variants,'Text-selected lam-alif / stacked-word candidates',out/f'special-{start//20+1:02}')
    render_sheet([records[wid] for wid in hard],variants,'Exact source cases: raa, added maddah, lam-alif, long hamza, waqf',out/'hard-cases')
    render_sheet([records[a['wid']] for a in page_words],variants,'Nine checkpoint pages: one native colour word each',out/'nine-pages')
    manifest=dict(schema='native-colour-proof-v1',researchOnly=True,pdfInput=False,seed=SEED,inputChecksums=pins,
                  matchedNonemptyOccurrences=alignment_count,randomCount=200,specialCount=40,
                  specialSelection='Arabic base-letter skeleton contains lam-alif or equals على / لكم / بسم; not visual stack classification',
                  ruleVersion=exported['ruleVersion'],attribution=ATTRIBUTION,
                  randomWords=[a['wid'] for a in random_words],specialWords=[a['wid'] for a in special_words],
                  records=[{k:v for k,v in r.items() if k!='geometry'} for r in records.values()])
    atomic_write(out/'manifest.json',(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode())
    print(json.dumps({k:v for k,v in manifest.items() if k not in ('records','randomWords','specialWords')},indent=2))

if __name__=='__main__':main()
