"""Fetch unchanged artwork from the reviewed, pinned Quran iOS revision.

Usage: python scripts/fetch-fixed-mushaf.py
Downloads are resumable; every cached/downloaded PNG is fully decoded locally.
This does not establish artwork redistribution permission.
"""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tmp/mushaf-study-python'))
from PIL import Image

REVISION = '422ece54cee15d474654dc11466f8e2f0e39c3e6'
BASE = f'https://raw.githubusercontent.com/quran/quran-ios/{REVISION}/Example/QuranEngineApp/Resources/hafs_1405/images_1920/width_1920/'
OUT = ROOT / 'outputs/fixed-mushaf-source'
OUT.mkdir(parents=True, exist_ok=True)

def verify(path):
    with Image.open(path) as image:
        image.load()
        if image.format != 'PNG' or image.size != (1920, 3106):
            raise ValueError(f'Invalid artwork: {path.name}')
    raw = path.read_bytes()
    return {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}

def fetch(page):
    name = f'page{page:03}.png'
    target = OUT / name
    if target.exists():
        return {'page': page, 'url': BASE + name, **verify(target)}
    for attempt in range(3):
        try:
            with urllib.request.urlopen(BASE + name, timeout=45) as response:
                raw = response.read()
            temporary = OUT / (name + '.part')
            temporary.write_bytes(raw)
            result = verify(temporary)
            temporary.replace(target)
            return {'page': page, 'url': BASE + name, **result}
        except Exception:
            if attempt == 2:
                raise
            time.sleep(attempt + 1)

if __name__ == '__main__':
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for result in pool.map(fetch, range(1, 605)):
            results.append(result)
            if len(results) % 50 == 0:
                print(f'Validated {len(results)}/604 artwork pages', flush=True)
    manifest = {'revision': REVISION, 'pages': results,
                'imageBytes': sum(p['bytes'] for p in results)}
    (OUT / 'source-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf8')
    print(f'Validated 604 images: {manifest["imageBytes"]} bytes', flush=True)
