"""Render only the fixed 95 training approvals for human visual study.

The all-approvals snapshot is parsed only to obtain wid/page/status metadata.
Held-out approval cuts are never selected, printed, copied, or rendered.
Actual border coordinates come only from public approvals for training IDs.
No inference, scoring, or app/public writes are performed.
"""
from __future__ import annotations

import datetime as dt
import json
import os
from pathlib import Path
import subprocess
import tempfile

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from font_support import arabic_label, load_font

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
ART = ROOT / "public/mushaf/1405-artwork-5a5f9f3846158475"
OUT = HERE / "training"
COLORS = [(236, 243, 255), (255, 244, 225)]


def read(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def numeric(wid):
    return tuple((0, int(x)) if x.isdecimal() else (1, x) for x in wid.split("."))


def training_metadata():
    # Do not retain or expose any review payload from the sample snapshot.
    meta = [{"wid": d["wid"], "page": int(d["page"]), "status": d.get("status")}
            for d in read(HERE.parent / "approved/all-approvals-2026-11-06.json")["words"]]
    regular_pages = sorted({d["page"] for d in meta if d["page"] > 2})
    held_out_pages = set(regular_pages[1::2])
    selected = [d for d in meta if d["status"] == "approved" and d["page"] not in held_out_pages]
    selected.sort(key=lambda d: (d["page"], numeric(d["wid"])))
    assert len(selected) == 95, len(selected)
    return selected


def render_gdi_labels(labels):
    """Reuse existing labels; shape missing labels with GDI or Linux Pillow RAQM.

    The historical function name stays compatible with every review helper.
    Existing PNGs and old label-input/render-labels evidence are never overwritten.
    """
    labels_dir = OUT / "labels"
    labels_dir.mkdir(parents=True, exist_ok=True)
    missing = {}
    for label in labels:
        key = label['key']
        if not key or any(c in key for c in '/\\') or key in ('.', '..'):
            raise ValueError(f'Invalid label filename: {key!r}')
        if not (labels_dir / f'{key}.png').exists():
            if key in missing and missing[key]['text'] != label['text']:
                raise ValueError(f'Conflicting new label text: {key}')
            missing[key] = label
    if not missing:
        return
    if os.name != 'nt':
        for label in missing.values():
            path = labels_dir / f'{label["key"]}.png'
            picture = arabic_label(label['text'])
            with path.open('xb') as stream:
                picture.save(stream, format='PNG')
        return
    # GDI drawing settings are retained exactly; only missing labels are sent.
    with tempfile.TemporaryDirectory(prefix='tahqeeq-labels-') as temporary:
        label_input = Path(temporary) / 'label-input.json'
        label_input.write_text(json.dumps(list(missing.values()), ensure_ascii=False), encoding='utf-8')
        ps = Path(temporary) / 'render-labels.ps1'
        ps.write_text(r'''param([string]$InputPath, [string]$OutputDir)
Add-Type -AssemblyName System.Drawing
$labels = Get-Content -LiteralPath $InputPath -Raw -Encoding UTF8 | ConvertFrom-Json
$font = New-Object System.Drawing.Font('Traditional Arabic', 48, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$format = New-Object System.Drawing.StringFormat
$format.FormatFlags = [System.Drawing.StringFormatFlags]::DirectionRightToLeft
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center
foreach ($label in $labels) {
  $destination = Join-Path $OutputDir ($label.key + '.png')
  if (Test-Path -LiteralPath $destination) { continue }
  $bitmap = New-Object System.Drawing.Bitmap(180,100)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::White)
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $rectangle = New-Object System.Drawing.RectangleF(0,0,180,100)
  $graphics.DrawString($label.text, $font, [System.Drawing.Brushes]::Black, $rectangle, $format)
  $bitmap.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose(); $bitmap.Dispose()
}
$font.Dispose(); $format.Dispose()
''', encoding="utf-8")
        subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(ps),
                        "-InputPath", str(label_input), "-OutputDir", str(labels_dir.resolve())], check=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    meta = training_metadata()
    pages = sorted({d["page"] for d in meta})
    raw_units = OUT / "units-page-cache.json"
    subprocess.run(["node", "--experimental-strip-types", str(HERE.parent / "dump_units.mts"),
                    *map(str, pages), "--out", str(raw_units)], check=True, capture_output=True)
    all_units = read(raw_units)
    units = {d["wid"]: all_units[d["wid"]] for d in meta}
    # Retain only the 95 training words, even though the helper dumps whole pages.
    raw_units.write_text(json.dumps(units, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    labels = [{"key": f'{d["wid"]}-{i}', "text": u["show"]}
              for d in meta for i, u in enumerate(units[d["wid"]]["units"])]
    render_gdi_labels(labels)
    font = load_font(25)
    small = load_font(19)
    manifest = []
    for page in pages:
        page_image = Image.open(ART / f"p{page}.png").convert("RGB")
        geometry = {w["wid"]: w for w in read(ART / f"p{page}.json")["words"]}
        page_approved = read(ROOT / f"public/letter-borders/p{page}.json")["words"]
        for d in (d for d in meta if d["page"] == page):
            wid = d["wid"]
            g, approved, word_units = geometry[wid], page_approved[wid], units[wid]["units"]
            assert approved["tids"] == [u["tid"] for u in word_units]
            x0, y0, x1, y1 = [int(round(v)) for v in g["body"]]
            ink = np.asarray(page_image.crop((x0,y0,x1,y1)).convert("L")) < 128
            rows = np.flatnonzero(ink.any(1))
            assert len(rows)
            # This is display scale only. It has no effect on border coordinates.
            factor = 400 / (int(rows[-1]) - int(rows[0]) + 1)
            pad = 6
            box = (x0-pad, y0-pad, x1+pad, y1+pad)
            crop = page_image.crop(box)
            cw, ch = [round(v*factor) for v in crop.size]
            crop = crop.resize((cw,ch), Image.Resampling.LANCZOS)
            lum = np.array(crop.convert("L"), dtype=np.float32) / 255
            background = np.full((ch,cw,3),255,dtype=np.uint8)
            cuts = [round((x-box[0])*factor) for x in approved["x"]]
            for i in range(len(cuts)-1):
                background[:,max(0,cuts[i+1]):min(cw,cuts[i]),:] = COLORS[i%2]
            colored = Image.fromarray((background.astype(np.float32)*lum[:,:,None]).astype(np.uint8))
            count = len(word_units)
            width = max(cw+64, count*180+64, 640)
            canvas = Image.new("RGB", (width,ch+230), "white")
            draw = ImageDraw.Draw(canvas)
            draw.text((24,15),f"TRAINING APPROVAL   p{page}   {wid}",font=font,fill="#233344")
            draw.text((24,49),"Ink height 400 px; alternate shades = approved target spans",font=small,fill="#64717d")
            ox=(width-cw)//2
            canvas.paste(colored,(ox,86))
            for x in cuts:
                draw.line((ox+x,86,ox+x,86+ch), fill="#617d99",width=1)
            draw.text((24,93+ch),"Targets read RIGHT TO LEFT (numbered in reading order)",font=small,fill="#445566")
            for i,u in enumerate(word_units):
                left=(width-count*180)//2+(count-1-i)*180
                canvas.paste(Image.open(OUT/"labels"/f"{wid}-{i}.png"),(left,112+ch))
                draw.text((left+70,198+ch),str(i+1)+( " silent" if u["silent"] else ""),font=small,fill="#445566",anchor="mm")
            path=OUT/f"p{page:03d}-{wid}.png"
            canvas.save(path)
            manifest.append({"wid":wid,"page":page,"text":g["text"],"image":path.name,
                "x":approved["x"],"tids":approved["tids"],"targets":word_units,
                "displayInkHeight":400,"renderedAt":dt.datetime.now(dt.timezone.utc).isoformat()})
    (OUT/"manifest.json").write_text(json.dumps({"purpose":"training-only owner-style study",
        "trainingCount":len(manifest),"hiddenApprovalCutsSelectedOrDisplayed":False,"words":manifest},ensure_ascii=False,indent=2),encoding="utf-8")
    print(f"Rendered {len(manifest)} training approvals in {OUT}")
    for i,m in enumerate(manifest): print(f'{i+1:02d} {m["image"]}')


if __name__ == "__main__":
    main()
