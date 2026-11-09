#!/usr/bin/env python3
"""Measure local-only PDF-derived SVG candidates; never publish page assets.

This is not the production renderer. The PDF licensing gate remains open.
SVG assets are written only to an explicit directory outside this repository.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import xml.etree.ElementTree as ET

from parity import Extractor, PDF_SHA256, ROOT

CHECKPOINT_PAGES = (1, 2, 3, 50, 187, 293, 582, 600, 604)


def align_visible_shows(traces, uses, tolerance=0.01):
    """Account only for omitted, proven zero-area space shows, never real ink."""
    j, omitted = 0, []
    for i, trace in enumerate(traces):
        matches = j < len(uses) and all(abs(a - b) < tolerance for a, b in zip(trace['origin'], uses[j]))
        if matches:
            j += 1
        elif trace['name'] == 'space' and trace['bounds'] == [0.0, 0.0, 0.0, 0.0]:
            omitted.append({'trace_index_zero_based': i, 'name': trace['name'], 'origin': trace['origin']})
        else:
            raise ValueError(f'Unexplained SVG/trace divergence at trace {i}: {trace}')
    if j != len(uses):
        raise ValueError(f'Unconsumed SVG uses: {len(uses) - j}')
    return omitted


def measure(pdf, local_out):
    local_out = local_out.resolve()
    if local_out == ROOT or ROOT in local_out.parents:
        raise ValueError('Local PDF-derived SVGs must remain outside the repository')
    local_out.mkdir(parents=True, exist_ok=True)
    ex = Extractor(pdf)
    pages = []
    for n in CHECKPOINT_PAGES:
        path = local_out / f'p{n}.svg'
        subprocess.run(['pdftocairo', '-svg', '-f', str(n + 1), '-l', str(n + 1), str(pdf), str(path)],
                       capture_output=True, check=True)
        data = path.read_bytes()
        xml = ET.fromstring(data)
        uses = [(float(e.get('x')), float(e.get('y'))) for e in xml.iter()
                if e.tag.endswith('}use') and e.get('{http://www.w3.org/1999/xlink}href', '').startswith('#glyph-')]
        fonts = {ex.font(v.get_object())[0]: ex.font(v.get_object())[1]
                 for v in ex.reader.pages[n]['/Resources']['/Font'].values()}
        traces = []
        for span in ex.doc[n].get_texttrace():
            for ch in span['chars']:
                name, bounds = fonts[span['font']][ch[1]]
                traces.append({'name': name, 'bounds': list(bounds), 'origin': [round(v, 6) for v in ch[2]]})
        omitted = align_visible_shows(traces, uses)
        brotli = subprocess.run(['node', '-e', "const z=require('node:zlib');let a=[];process.stdin.on('data',d=>a.push(d)).on('end',()=>process.stdout.write(z.brotliCompressSync(Buffer.concat(a),{params:{[z.constants.BROTLI_PARAM_QUALITY]:11}})))"],
                                input=data, capture_output=True, check=True).stdout
        pages.append({'page': n, 'inline_svg_bytes': len(data), 'gzip_9_bytes': len(gzip.compress(data, compresslevel=9, mtime=0)),
                      'brotli_11_bytes': len(brotli), 'sha256': hashlib.sha256(data).hexdigest(),
                      'trace_shows': len(traces), 'svg_glyph_uses': len(uses), 'omitted_zero_ink_spaces': omitted,
                      'svg_image_elements': sum(e.tag.endswith('}image') for e in xml.iter())})
    return {'schema': 'digitalkhatt-svg-research-v1', 'input_pdf_sha256': PDF_SHA256,
            'source_status': 'Local research only. PDF redistribution grant unresolved.',
            'scope': 'Nine checkpoint pages only; not an all-page size, atlas or first-paint measurement.',
            'alignment_limit': 'Origin sequence checked within 0.01 PDF units. Not proof of every outline or letter ownership.',
            'pdftocairo_version': subprocess.run(['pdftocairo', '-v'], capture_output=True, text=True).stderr.splitlines()[0],
            'pages': pages}


def markdown(report):
    lines = ['# Local-only SVG delivery measurements', '',
             'Research measurements, not a selected production pipeline. No SVG, outline, image or font is committed by this script.', '',
             '## Nine checkpoint pages', '',
             'Page | Raw SVG bytes | Gzip 9 bytes | Brotli 11 bytes | Traces / SVG uses | Omitted empty spaces',
             '--- | --- | --- | --- | --- | ---']
    for p in report['pages']:
        lines.append(f"{p['page']} | {p['inline_svg_bytes']:,} | {p['gzip_9_bytes']:,} | {p['brotli_11_bytes']:,} | {p['trace_shows']} / {p['svg_glyph_uses']} | {len(p['omitted_zero_ink_spaces'])}")
    lines += ['', '## Page 1 prototype gap explained', '',
              'The 356-trace/355-use difference is an omitted zero-ink `space` at zero-based trace index 129, origin (99, 147.75). Its Type3 bounds are exactly zero. No Arabic ink glyph is removed to make the counts agree. The stricter research alignment accepts only this kind of omitted space and rejects any other skipped trace or extra SVG use.', '',
              'This explains the count failure; it does not approve all glyph-to-unit assignments or fix the reference prototype in place. Page 187 has one additional omitted zero-ink space, also recorded in svg-research.json.', '',
              '## Limits and next gate', '',
              '- Inline SVG option A was measured for nine pages only. Embedded decorative images remain in these local research files.',
              '- A deduplicated atlas, all-page transfer size, first paint and tablet memory are not measured.',
              '- The local Chromium first-paint harness was prepared (measure_svg_browser.mjs), but Chromium could not start: socket() failed with Operation not permitted. An approved elevated execution returned the same failure. No timing result exists; no attempt was made to bypass the restriction.',
              '- B source-engine and C positioned-font feasibility are tracked separately in PIPELINE_FEASIBILITY.md.',
              '- No option is selected until provenance, exact geometry, letter ownership and browser rendering pass.',
              '- The sample PDF redistribution grant remains unresolved. Local files are not app assets or a public preview.', '',
              'Confidence: practicality 90/100 for these size/count measurements; architecture/data safety 98/100 for keeping them outside runtime assets; visual certainty 60/100 until independent all-page rendering and colour review.', '']
    return '\n'.join(lines)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pdf', type=Path, required=True)
    parser.add_argument('--local-out', type=Path, required=True)
    parser.add_argument('--report-out', type=Path, default=ROOT / 'scripts/digitalkhatt/reports')
    args = parser.parse_args()
    report = measure(args.pdf, args.local_out)
    args.report_out.mkdir(parents=True, exist_ok=True)
    (args.report_out / 'svg-research.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    (args.report_out / 'SVG_RESEARCH.md').write_text(markdown(report))
    print(json.dumps({'pages': len(report['pages']), 'omitted_zero_ink_spaces': sum(len(p['omitted_zero_ink_spaces']) for p in report['pages'])}))
