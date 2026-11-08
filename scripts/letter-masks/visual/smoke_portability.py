"""Smoke-test synthetic labels in temporary output; never reads review/Quran data."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import tempfile

import numpy as np
from PIL import Image, ImageDraw
from font_support import load_font, runtime_info
import style_render


def check(destination):
    destination.mkdir(parents=True, exist_ok=True)
    style_render.OUT = destination
    labels = [{'key': 'joined-marks', 'text': '\u0628\u0650\u0633\u0652\u0645\u0650'},
              {'key': 'lam-alif', 'text': '\u0644\u064e\u0627'},
              {'key': 'combined-marks', 'text': '\u0645\u0651\u064e'}]
    style_render.render_gdi_labels(labels)
    paths = [destination / 'labels' / (label['key']+'.png') for label in labels]
    before = {str(p): (hashlib.sha256(p.read_bytes()).hexdigest(), p.stat().st_mtime_ns) for p in paths}
    # Changed incoming text must not replace an existing evidence label.
    style_render.render_gdi_labels([dict(label, text='changed') for label in labels])
    after = {str(p): (hashlib.sha256(p.read_bytes()).hexdigest(), p.stat().st_mtime_ns) for p in paths}
    assert before == after, 'Existing label bytes or timestamps were modified'
    sheet = Image.new('RGB', (540, 140), 'white')
    draw = ImageDraw.Draw(sheet)
    for i, p in enumerate(paths):
        picture = Image.open(p).convert('RGB')
        assert picture.size == (180, 100)
        ink = np.asarray(picture).min(axis=2) < 128
        assert ink.any(), f'No rendered text in {p.name}'
        sheet.paste(picture, (i*180, 30))
        draw.text((i*180+5, 5), labels[i]['key'], font=load_font(16), fill='black')
    sheet.save(destination/'synthetic-labels.png')
    assert not (destination/'label-input.json').exists()
    assert not (destination/'render-labels.ps1').exists()
    report = {**runtime_info(), 'labelsRendered': len(labels), 'existingLabelsPreserved': True,
              'syntheticOnly': True, 'preview': str(destination/'synthetic-labels.png')}
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, help='Optional fresh temporary folder to retain the synthetic preview')
    args = parser.parse_args()
    if args.output:
        if args.output.exists() and any(args.output.iterdir()):
            raise SystemExit('--output must be a new or empty temporary directory')
        check(args.output)
    else:
        with tempfile.TemporaryDirectory(prefix='tahqeeq-font-smoke-') as temporary:
            check(Path(temporary))
