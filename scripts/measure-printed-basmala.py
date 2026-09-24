"""Measure supplemental hit regions without changing the pinned Mushaf images."""
from pathlib import Path
import json
import hashlib
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
descriptor = json.loads((ROOT / 'src/data/fixedMushafPackage.json').read_text())
directory = ROOT / 'public/mushaf' / descriptor['version']
rows = []
for page in range(1, 605):
    semantic = json.loads((directory / f'p{page}.text.json').read_text(encoding='utf-8'))
    basmalas = [line for line in semantic['lines'] if line['type'] == 'basmala']
    if not basmalas:
        continue
    geometry = json.loads((directory / f'p{page}.json').read_text(encoding='utf-8'))
    mask = np.array(Image.open(directory / f'p{page}.png').convert('RGBA'))[:, :, 3] > 50
    for line in basmalas:
        previous = [w['region'][3] for w in geometry['words'] if w['line'] < line['n']]
        following = [w['region'][1] for w in geometry['words'] if w['line'] > line['n']]
        top, bottom = int(max(previous, default=0)), int(min(following, default=3106))
        ink_rows = np.where(mask[top:bottom].any(axis=1))[0] + top
        # The Basmala is the final ink group before the first numbered ayah.
        groups = np.split(ink_rows, np.where(np.diff(ink_rows) > 20)[0] + 1)
        ys = groups[-1]
        y0, y1 = int(ys[0]), int(ys[-1]) + 1
        xs = np.where(mask[y0:y1].any(axis=0))[0]
        x0, x1 = int(xs[0]), int(xs[-1]) + 1
        # Reviewed word boundaries for the two printed calligraphic forms.
        # Do not divide the long opening stroke into equal-width word cells.
        edges = [1331, 1100, 997, 811, 609] if page == 2 else [1485, 900, 804, 642, 431]
        assert (x0, x1) == (edges[-1], edges[0])
        assert 120 <= y1-y0 <= 160
        rows.append({'page': page, 'line': line['n'], 'surah': line['surah'],
                     'imageSha256': hashlib.sha256((directory / f'p{page}.png').read_bytes()).hexdigest(),
                     'bounds': [x0,y0,x1,y1], 'edges': edges})
assert len(rows) == 112
output = ROOT / 'src/data/printedBasmalaRegions.json'
output.write_text(json.dumps({'packageVersion': descriptor['version'], 'rows': rows}, indent=2)+'\n', encoding='utf-8')
print(f'Measured {len(rows)} printed Basmala rows; artwork unchanged.')
