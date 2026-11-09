#!/usr/bin/env python3
"""Create a private, nine-page comparison PDF from already generated PNGs.

This does not shape text, generate glyphs, alter source PNGs, or integrate a
renderer. Requires Pillow, pypdf and ReportLab. Output must be outside the repo.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import tempfile

from PIL import Image
from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.pagesizes import A3, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


PAGES = (1, 2, 3, 50, 187, 293, 582, 600, 604)
REPO = Path(__file__).resolve().parents[3]
PDF_NAME = "DigitalKhatt-source-body-comparison.pdf"
MANIFEST_NAME = "contact-proof-manifest.json"
W, H = landscape(A3)
MARGIN = 42
TEXT = colors.HexColor("#17212B")
MUTED = colors.HexColor("#465361")
BORDER = colors.HexColor("#D8DFE5")
REGULAR = "ProofSans"
BOLD = "ProofSansBold"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def line(c: canvas.Canvas, text: str, x: float, y: float,
         font: str = REGULAR, size: float = 11.5,
         color=TEXT, max_width: float | None = None) -> None:
    if max_width is not None:
        require(c.stringWidth(text, font, size) <= max_width,
                f"Text exceeds its available width: {text}")
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawString(x, y, text)


def add_image(c: canvas.Canvas, path: Path, center_x: float,
              y: float = 110, height: float = 600) -> dict:
    with Image.open(path) as im:
        width_px, height_px = im.size
        im.verify()
    width = height * width_px / height_px
    x = center_x - width / 2
    require(x > MARGIN and x + width < W - MARGIN,
            f"Image outside page: {path}")
    c.drawImage(ImageReader(str(path)), x, y, width=width, height=height,
                preserveAspectRatio=True, mask="auto")
    c.setStrokeColor(BORDER)
    c.setLineWidth(0.5)
    c.rect(x - 1, y - 1, width + 2, height + 2, stroke=1, fill=0)
    return {
        "path": str(path), "sha256": sha256(path),
        "pixels": [width_px, height_px],
        "pdfBoxPoints": [x, y, width, height],
        "aspectRatioPreserved": True, "cropped": False,
    }


def validate_evidence(report: dict) -> None:
    require(report.get("samplePdfRead") is False,
            "This comparison requires a source-only native report.")
    require(report["nativeFrame"]["width"] == 17000,
            "Unexpected native frame width.")
    require(report["nativeFrame"]["height"] == 27400,
            "Unexpected original native frame height.")
    require(len(report["nativeFrame"]["inkBounds"]["outside_frame"]) == 6,
            "Recheck the original-frame limitation caption.")
    padded = report["paddedFrameResearchCandidate"]
    require(padded["bottom_padding"] == 120 and padded["height"] == 27520,
            "Recheck the padding caption.")
    require(padded["glyph_coordinates_unchanged"] is True,
            "The padding must preserve original glyph transforms.")
    require(padded["outside_frame"] == [] and padded["production_choice"] is False,
            "Recheck the padded research-candidate caption.")


def make_pdf(artwork: Path, native: Path, report_path: Path, output: Path,
             font_regular: Path, font_bold: Path) -> dict:
    report = json.loads(report_path.read_text())
    validate_evidence(report)
    pdfmetrics.registerFont(TTFont(REGULAR, str(font_regular)))
    pdfmetrics.registerFont(TTFont(BOLD, str(font_bold)))
    output = output.resolve()
    require(not output.is_relative_to(REPO), "Output must be outside the repository.")
    output.mkdir(parents=True, exist_ok=True)
    pdf = output / PDF_NAME
    manifest_path = output / MANIFEST_NAME
    for target in (pdf, manifest_path):
        require(not target.is_symlink(), f"Refusing symlink output: {target}")

    pairs = []
    for page in PAGES:
        left = artwork / f"p{page}.png"
        right = native / f"p{page}-native.png"
        require(left.is_file() and right.is_file(), f"Missing page {page} input.")
        with Image.open(right) as im:
            require(im.width * 27520 == im.height * 17000,
                    f"Page {page} does not match the padded native aspect ratio.")
        pairs.append((page, left, right))

    fd, tmp_name = tempfile.mkstemp(prefix=".contact-proof-", suffix=".pdf", dir=output)
    os.close(fd)
    tmp = Path(tmp_name)
    try:
        c = canvas.Canvas(str(tmp), pagesize=(W, H), pageCompression=1, invariant=1,
                          initialFontName=REGULAR)
        c.setTitle("DigitalKhatt source body comparison")
        c.setAuthor("Tanween")
        c.setSubject("Nine private checkpoint comparisons of current print artwork and "
                     "a source-generated DigitalKhatt body-only research candidate")
        entries = []
        for index, (page, left, right) in enumerate(pairs, 1):
            key = f"checkpoint-{page}"
            c.bookmarkPage(key)
            c.addOutlineEntry(f"Mushaf page {page}", key, 0)
            line(c, "DigitalKhatt source body comparison", MARGIN, H - 43,
                 BOLD, 23)
            c.setFillColor(TEXT)
            c.setFont(BOLD, 17)
            c.drawRightString(W - MARGIN, H - 41, f"Mushaf page {page}")
            line(c, "Review the body layout beside the current print image. "
                 "The generated body uses official source, not sample-PDF contours.",
                 MARGIN, H - 66, size=12, color=MUTED, max_width=W - 2 * MARGIN)

            centers = (W * 0.26, W * 0.74)
            titles = ("Current print artwork", "Source-generated DigitalKhatt body")
            captions = ("Existing Tanween page image; shown in full.",
                        "Body-only candidate; decorative surah headings omitted.")
            for center, title, caption in zip(centers, titles, captions):
                c.setFillColor(TEXT)
                c.setFont(BOLD, 17)
                c.drawCentredString(center, 750, title)
                c.setFillColor(MUTED)
                c.setFont(REGULAR, 11.5)
                c.drawCentredString(center, 731, caption)

            entries.append({
                "checkpointPage": page, "pdfPage": index,
                "currentArtwork": add_image(c, left, centers[0]),
                "sourceGeneratedBody": add_image(c, right, centers[1]),
            })

            footers = (
                "Research proof only. Decorative surah headings are intentionally absent "
                "on the right; blank heading areas are not a finished page design.",
                "Candidate canvas: 17,000 x 27,520 units (+120 at the bottom). "
                "Glyph coordinates and scales are unchanged. Neither image is cropped or fitted to the other.",
                "The original 27,400-unit frame clipped six low-meem marks. "
                "The reported 604-page bounds check found no out-of-frame ink in this padded candidate.",
                "App integration is not implemented. Browser, Safari/tablet, offline behavior "
                "and owner visual approval remain open. This is not a religious proofread.",
                "DigitalKhatt font: SIL OFL 1.1; sponsored by Tarteel. Website corpus: MIT. "
                "VisualMetaFont engine: AGPL v3, used at build time.",
            )
            for i, text in enumerate(footers):
                line(c, text, MARGIN, 85 - 14 * i, size=10.5, color=MUTED,
                     max_width=W - 2 * MARGIN - (60 if i == 4 else 0))
            c.setFillColor(MUTED)
            c.setFont(REGULAR, 10.5)
            c.drawRightString(W - MARGIN, 29, f"{index} / {len(PAGES)}")
            c.linkURL("https://github.com/DigitalKhatt/oldmadinafont/blob/"
                      "adc60f3865b507684bda856d59940a7f3602be32/LICENSE",
                      (MARGIN, 26, MARGIN + 180, 39), relative=0, thickness=0)
            c.linkURL("https://github.com/DigitalKhatt/digitalkhatt.org/blob/"
                      "4213fab9892774f74f7164c70a70dd84a14f0215/LICENSE",
                      (MARGIN + 296, 26, MARGIN + 410, 39), relative=0, thickness=0)
            c.linkURL("https://github.com/DigitalKhatt/visualmetafont/blob/"
                      "220658be8bad76cfe628ddf0e903c5a86e454e4f/LICENSE",
                      (MARGIN + 414, 26, MARGIN + 680, 39), relative=0, thickness=0)
            c.showPage()
        c.save()

        reader = PdfReader(tmp)
        require(len(reader.pages) == len(PAGES), "PDF page count is not nine.")
        for i, p in enumerate(reader.pages):
            text = p.extract_text()
            for expected in (f"Mushaf page {PAGES[i]}", "Current print artwork",
                             "Source-generated DigitalKhatt body",
                             "decorative surah headings omitted.",
                             "App integration is not implemented.", "SIL OFL 1.1"):
                require(expected in text, f"Page {i + 1} missing caption: {expected}")
            require(float(p.mediabox.width) > float(p.mediabox.height),
                    f"PDF page {i + 1} is not landscape.")
        os.replace(tmp, pdf)
        result = {
            "schema": "digitalkhatt-contact-proof-v1", "researchOnly": True,
            "pdf": str(pdf), "pdfBytes": pdf.stat().st_size,
            "pdfSha256": sha256(pdf), "pdfPageCount": len(PAGES),
            "pageSizePoints": [W, H], "evidenceReport": str(report_path),
            "evidenceReportSha256": sha256(report_path),
            "checkpointPages": list(PAGES), "pages": entries,
            "embeddedCaptionFonts": [
                {"path": str(font_regular), "sha256": sha256(font_regular)},
                {"path": str(font_bold), "sha256": sha256(font_bold)},
            ],
            "sourceImagesModified": False,
            "visualQa": "Render and inspect all pages separately before delivery.",
        }
        fd, manifest_tmp_name = tempfile.mkstemp(prefix=".contact-manifest-",
                                                suffix=".json", dir=output)
        with os.fdopen(fd, "w") as f:
            json.dump(result, f, indent=2)
            f.write("\n")
        os.replace(manifest_tmp_name, manifest_path)
        return result
    finally:
        tmp.unlink(missing_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--artwork", type=Path, required=True)
    parser.add_argument("--native", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--font-regular", type=Path,
                        default=Path("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"))
    parser.add_argument("--font-bold", type=Path,
                        default=Path("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"))
    args = parser.parse_args()
    result = make_pdf(args.artwork.resolve(), args.native.resolve(),
                      args.report.resolve(), args.output,
                      args.font_regular.resolve(), args.font_bold.resolve())
    print(json.dumps({k: result[k] for k in
                      ("pdf", "pdfBytes", "pdfSha256", "pdfPageCount")}, indent=2))


if __name__ == "__main__":
    main()
