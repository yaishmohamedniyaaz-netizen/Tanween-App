"""Portable display fonts and shaped Arabic labels; never changes word geometry."""
from __future__ import annotations

import json
import os
from pathlib import Path
import shutil
import subprocess

from PIL import Image, ImageDraw, ImageFont, features


def font_path(arabic=False):
    """Prefer the historical Windows font or installed Linux Noto/DejaVu fonts."""
    variable = 'TAHQEEQ_ARABIC_FONT' if arabic else 'TAHQEEQ_UI_FONT'
    override = os.environ.get(variable)
    if override:
        path = Path(override).expanduser()
        if not path.is_file():
            raise FileNotFoundError(f'{variable} does not name a font file: {path}')
        return path
    windows = Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts'
    candidates = ([windows / 'trad.ttf', windows / 'arial.ttf'] if arabic else
                  [windows / 'arial.ttf']) if os.name == 'nt' else []
    if arabic:
        candidates += [Path('/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf'),
                       Path('/usr/share/fonts/opentype/noto/NotoNaskhArabic-Regular.ttf')]
    candidates += [Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'),
                   Path('/usr/share/fonts/dejavu-sans-fonts/DejaVuSans.ttf')]
    for path in candidates:
        if path.is_file():
            return path
    if shutil.which('fc-match'):
        families = ['Noto Naskh Arabic', 'DejaVu Sans'] if arabic else ['DejaVu Sans']
        for family in families:
            result = subprocess.run(['fc-match', '-f', '%{file}', family],
                                    capture_output=True, text=True, check=True)
            path = Path(result.stdout.strip())
            if path.is_file():
                return path
    raise RuntimeError(f'No display font found. Install fonts-noto-core and '
                       f'fonts-dejavu-core, or set {variable} to a font file.')


def require_raqm():
    if not features.check_feature('raqm'):
        raise RuntimeError('Arabic labels require Pillow with RAQM on Linux. '
                           'Run setup-cloud.sh --install-system, then reinstall '
                           'the Pillow wheel. Unshaped Arabic is not an acceptable fallback.')


def load_font(size, arabic=False):
    if arabic:
        require_raqm()
        return ImageFont.truetype(str(font_path(True)), size,
                                  layout_engine=ImageFont.Layout.RAQM)
    return ImageFont.truetype(str(font_path()), size)


def arabic_label(text):
    """New 180x100 labels only; RAQM handles joining, bidi and combining marks."""
    canvas = Image.new('RGB', (180, 100), 'white')
    draw = ImageDraw.Draw(canvas)
    options = {'direction': 'rtl', 'language': 'ar'}
    font = load_font(48, arabic=True)
    box = draw.textbbox((0, 0), text, font=font, **options)
    # Keep exceptionally tall marks or combined targets within their display cell.
    for size in range(47, 15, -1):
        if box[2]-box[0] <= 172 and box[3]-box[1] <= 92:
            break
        font = load_font(size, arabic=True)
        box = draw.textbbox((0, 0), text, font=font, **options)
    xy = ((180-(box[2]-box[0]))/2-box[0], (100-(box[3]-box[1]))/2-box[1])
    draw.text(xy, text, font=font, fill='black', **options)
    return canvas


def runtime_info():
    info = {'platform': os.name, 'uiFont': str(font_path()),
            'arabicFont': 'Traditional Arabic (GDI requested family)' if os.name == 'nt' else str(font_path(True)),
            'pillowRaqm': features.check_feature('raqm'),
            'labelBackend': 'Windows GDI' if os.name == 'nt' else 'Pillow RAQM'}
    if os.name != 'nt':
        require_raqm()
    return info


if __name__ == '__main__':
    print(json.dumps(runtime_info(), indent=2))
