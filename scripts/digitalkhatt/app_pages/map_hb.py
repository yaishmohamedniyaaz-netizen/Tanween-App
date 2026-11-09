#!/usr/bin/env python3
"""Map DigitalKhatt web-layout glyphs to the app's word ids and letter units.

Input: layout-p{N}.json from layout.mjs (HarfBuzz cluster level 1, so each glyph's
cluster is the UTF-16 index of its source character in the line), the OTF used
for shaping (glyph names), and the app targets exported by
scripts/digitalkhatt/app_pages/export_targets.mts (recited and printed Basmala words).

Word pairing: physical line + reading-order slot, exactly like the native audit.
Letter ownership: Codex's tested glyph_mapping.map_word (source-text alignment,
no shape guessing). Output per page: for every glyph, the app wid and tid (or none).

Usage: python3 map_hb.py <layout-dir> <font.otf> <targets.json> <out-dir> [pages...]
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fontTools.ttLib import TTFont  # noqa: E402
import glyph_mapping  # noqa: E402
from glyph_mapping import map_word  # noqa: E402

# The web font names marks by code point; add them to the explicit mark table
# (same identities as the PDF names kasra, fatha, damma, sukun, maddah, hamza).
glyph_mapping.MARK_IDENTITIES.update({'uni0650': 'ِ', 'uni064E': 'َ', 'uni064F': 'ُ', 'uni0652': 'ْ',
                                      'uni0653': 'ٓ', 'uni0654': 'ٔ'})
from parity import skeleton  # noqa: E402


# Pause (waqf) signs are decoration, not part of a letter: map_word gives names
# starting with "waqf" no letter unit. Small meem/seen reading signs stay with their letter.
WAQF = {'uni06D6', 'uni06D7', 'uni06D8', 'uni06D9', 'uni06DA', 'uni06DB'}


def glyph_name(names, gid):
    name = names[gid]
    return 'waqf.' + name if name in WAQF else name


def tokens(line):
    return [{'text': m.group(), 'start': m.start(), 'end': m.end()} for m in re.finditer(r'\S+', line)]


def native_words(page_no, layout, names):
    words = []
    for line_no, L in enumerate(layout['lines'], 1):
        if L['type'] == 'sura':
            continue
        text = L['text']
        toks = tokens(text)
        for t in toks:
            if not skeleton(t['text']):
                continue  # ayah / section marker
            gl = [(i, g) for i, g in enumerate(L['glyphs']) if t['start'] <= g['c'] < t['end']]
            clusters = sorted({g['c'] for _, g in gl})
            assert clusters and clusters[0] == t['start'], (page_no, line_no, t)
            spans = []
            for start, end in zip(clusters, clusters[1:] + [t['end']]):
                spans.append({'start': start - t['start'], 'end': end - t['start'], 'text': text[start:end],
                              'glyphs': [{'index': i, 'name': glyph_name(names, g['g'])} for i, g in gl if g['c'] == start]})
            words.append({'line': line_no, 'text': t['text'], 'spans': spans})
    return words


def main():
    layout_dir, font_path, targets_path, out_dir, *pages = sys.argv[1:]
    names = TTFont(font_path).getGlyphOrder()
    exported = json.load(open(targets_path))
    assert exported['ruleVersion'] == 'qpc-hafs-v1-targets-4.0.0'
    # Printed Basmala rows are selectable words too (surah.b.i), so they are mapped like any word.
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    pages = [int(p) for p in pages] or list(range(1, 605))
    total = Counter()
    problems = []
    for p in pages:
        layout = json.load(open(Path(layout_dir) / f'layout-p{p}.json'))
        app = exported['pages'][p - 1]['words']
        native = native_words(p, layout, names)
        assert len(app) == len(native), (p, len(app), len(native))
        # glyph key "line:index" -> [wid, tid]
        owner = {}
        for a, d in zip(app, native):
            assert a['line'] == d['line'], (p, a['wid'], a['line'], d['line'])
            r = map_word(a, d)
            total['words'] += 1
            total['units'] += len(a['targets'])
            total['unmapped_units'] += len(r.get('unmappedTids', []))
            for g in r['assignments']:
                total['glyphs_' + g['status']] += 1
                owner[(d['line'], g['index'])] = (a['wid'], g['tids'])  # [] = no unit (waqf), 2+ = shared
            if r['unresolved']:
                problems.append({'page': p, 'wid': a['wid'], 'text': a['text'], 'dk': d['text'],
                                 'unresolved': r['unresolved'], 'unmapped': r.get('unmappedTids', [])})
        lines = []
        for line_no, L in enumerate(layout['lines'], 1):
            lines.append([list(owner.get((line_no, i), (None, []))) for i in range(len(L['glyphs']))])
        (out / f'owners-p{p}.json').write_text(json.dumps(lines, ensure_ascii=False))
    print(json.dumps(dict(total), indent=1))
    (out / 'mapping-summary.json').write_text(json.dumps({'counts': dict(total), 'problems': problems}, ensure_ascii=False, indent=1))
    print('problem words', len(problems))
    for pr in problems[:15]:
        print(json.dumps(pr, ensure_ascii=False))


if __name__ == '__main__':
    main()
