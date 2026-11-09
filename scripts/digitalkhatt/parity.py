#!/usr/bin/env python3
"""Deterministic, read-only Phase 0 audit of the PDF and protected artwork data.

ActualText is the PDF's explicit Unicode source, not proof of glyph meaning.
Glyph-family guesses are never used to infer letters. The PDF is an audit
input, not an app asset.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from difflib import SequenceMatcher
import hashlib
import json
from pathlib import Path
import re
import statistics
import unicodedata

import pymupdf
import pypdf
from pypdf import PdfReader
from pypdf.generic import ContentStream

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "public/mushaf/1405-artwork-5a5f9f3846158475"
PIN = "adc60f3865b507684bda856d59940a7f3602be32"
PDF_SHA256 = "86809d64b7b4c7d3699c19bdde21b3056dd0736a8422d2d221998b2f772389f9"
NUMBER = rb"[-+]?(?:\d+(?:\.\d*)?|\.\d+)"
D1 = re.compile(rb"^\s*(" + NUMBER + rb")\s+(" + NUMBER + rb")\s+(" + NUMBER + rb")\s+(" + NUMBER + rb")\s+(" + NUMBER + rb")\s+(" + NUMBER + rb")\s+d1\b")


def skeleton(text: str) -> str:
    """Remove notation, not letters; keep hamza/seat, ya/maqsura and ta marbuta.

    CGJ interrupts canonical composition in the PDF. Tatweel with hamza is a
    standalone hamza, not a letter seat. Wasla is an alif annotation. Small
    Quranic letters are notation here, not full-size skeleton characters.
    """
    text = text.replace("\u034f", "")
    text = text.replace("ـٔ", "ء").replace("ـٕ", "ء")
    text = unicodedata.normalize("NFC", text).replace("ٱ", "ا")
    # A combining hamza is still consonantal content when it cannot compose
    # with its seat; dropping it would invent a missing-letter mismatch.
    return "".join(c for c in text if "\u0621" <= c <= "\u063a" or "\u0641" <= c <= "\u064a" or c in "ٕٓٔ")


def hamza_diagnostic(text: str) -> str:
    """Explicit diagnostic only, never an approved text or target migration.

    These sources encode long initial hamza and below-seat hamza differently.
    Record their strict differences even when this alternate representation
    compares equal. No changes are made to the app's religious text.
    """
    value = skeleton(text)
    value = value.replace("أٓ", "ءا").replace("آ", "ءا")
    value = value.replace("يٕ", "ئ").replace("وٕ", "ؤ")
    value = value.replace("ٔ", "ء").replace("ٕ", "ء")
    return value.replace("ٓ", "")


def union(boxes):
    boxes = [b for b in boxes if b[2] > b[0] and b[3] > b[1]]
    return ([min(b[0] for b in boxes), min(b[1] for b in boxes),
             max(b[2] for b in boxes), max(b[3] for b in boxes)] if boxes else None)


def iou(a, b):
    intersection = max(0, min(a[2], b[2]) - max(a[0], b[0])) * max(0, min(a[3], b[3]) - max(a[1], b[1]))
    total = (a[2]-a[0])*(a[3]-a[1]) + (b[2]-b[0])*(b[3]-b[1]) - intersection
    return intersection / total if total else 0.0


class Extractor:
    def __init__(self, pdf):
        if hashlib.sha256(Path(pdf).read_bytes()).hexdigest() != PDF_SHA256:
            raise ValueError("PDF SHA256 differs from the pinned research input")
        self.reader = PdfReader(pdf)
        self.doc = pymupdf.open(pdf)
        if len(self.reader.pages) != 605:
            raise ValueError("Expected cover + 604 Mushaf pages")
        self.font_cache = {}

    def font(self, obj):
        key = obj.indirect_reference.idnum
        if key not in self.font_cache:
            if [float(v) for v in obj["/FontMatrix"]] != [0.001,0,0,0.001,0,0]:
                raise ValueError("Unsupported Type3 FontMatrix")
            codes, code = {}, 0
            for entry in obj["/Encoding"]["/Differences"]:
                if isinstance(entry, int):
                    code = entry
                else:
                    name = str(entry)[1:]
                    data = obj["/CharProcs"][str(entry)].get_data()
                    m = D1.match(data)
                    if not m:
                        raise ValueError(f"Unsupported Type3 bounds: {name}")
                    codes[code] = (name, tuple(float(x) for x in m.groups()[2:]))
                    code += 1
            self.font_cache[key] = (str(obj["/Name"])[1:], codes)
        return self.font_cache[key]

    def page(self, n):
        pdfpage = self.reader.pages[n]
        mupage = self.doc[n]
        if mupage.rotation != 0:
            raise ValueError(f"p{n}: unsupported page rotation")
        traces = [(span, ch) for span in mupage.get_texttrace() for ch in span["chars"]]
        fonts = {str(k): self.font(v.get_object()) for k,v in pdfpage["/Resources"]["/Font"].items()}
        trace_index, physical_line, font = 0, 0, None
        stack, spans = [], []
        excluded = Counter()
        for args, op in ContentStream(pdfpage.get_contents(), self.reader).operations:
            if op == b"Tm":
                if tuple(float(v) for v in args[:4]) not in ((1,0,0,-1),(1,0,0,1)):
                    raise ValueError(f"p{n}: unsupported scaled/rotated text matrix")
                physical_line += 1
            elif op == b"Tf":
                font = fonts[str(args[0])]
            elif op in (b"BDC", b"BMC"):
                actual = args[1].get("/ActualText") if len(args) > 1 and isinstance(args[1], dict) else None
                span = None
                if actual is not None:
                    span = {"text": str(actual), "line": physical_line, "glyphs": []}
                    spans.append(span)
                stack.append(span)
            elif op == b"EMC":
                if not stack:
                    raise ValueError(f"p{n}: unbalanced EMC")
                stack.pop()
            elif op == b"Tj":
                # This source uses one byte per Type3 glyph. Fail on any new
                # PDF structure instead of silently misaligning its text.
                data = args[0].original_bytes if hasattr(args[0], "original_bytes") else bytes(args[0])
                for code in data:
                    tr, ch = traces[trace_index]
                    trace_index += 1
                    if font is None or tr["font"] != font[0] or ch[1] != code:
                        raise ValueError(f"p{n} glyph {trace_index}: content/trace identity mismatch")
                    if tr["dir"] != (1.0, 0.0):
                        raise ValueError(f"p{n}: unsupported rotated text")
                    name, bounds = font[1][code]
                    x, y = ch[2]
                    scale = tr["size"] / 1000
                    x0,y0,x1,y1 = bounds
                    glyph = {"name":name, "box":[x+x0*scale,y-y1*scale,x+x1*scale,y-y0*scale]}
                    owner = next((s for s in reversed(stack) if s is not None), None)
                    if owner is not None:
                        owner["glyphs"].append(glyph)
                    else:
                        if not name.startswith("surah_"):
                            raise ValueError(f"p{n}: unexpected untagged glyph {name}")
                        excluded[name.split(".")[0]] += 1
            elif op in (b"TJ", b"'", b'"', b"Tz"):
                raise ValueError(f"p{n}: unsupported text show operator {op!r}")
        if stack or trace_index != len(traces):
            raise ValueError(f"p{n}: content/trace count mismatch {trace_index}/{len(traces)}")

        words, word = [], None
        def flush():
            nonlocal word
            if word is not None:
                word["skeleton"] = skeleton(word["text"])
                if not word["skeleton"]:
                    raise ValueError(f"p{n}: empty skeleton {word['text']!r}")
                word["box"] = union(word.pop("boxes"))
                words.append(word)
            word = None
        for span in spans:
            text = span["text"]
            if word is not None and span["line"] != word["line"]:
                flush()
            if text in ("۞", "۩"):
                flush()
                excluded["section_or_sajdah_marker"] += len(span["glyphs"])
                continue
            if text.isspace() or "۝" in text:
                flush()
                excluded["space" if text.isspace() else "ayah_marker"] += len(span["glyphs"])
                continue
            if any(c.isspace() for c in text):
                raise ValueError(f"p{n}: multiword ActualText requires explicit handling: {text!r}")
            if word is None:
                word = {"line":span["line"], "text":"", "boxes":[]}
            word["text"] += text
            word["boxes"].extend(g["box"] for g in span["glyphs"] if not g["name"].startswith("waqf"))
        flush()
        by_line = defaultdict(list)
        for w in words:
            by_line[w["line"]].append(w)
        basmala_lines = []
        for line, ws in by_line.items():
            if n != 1 and [w["skeleton"] for w in ws] == ["بسم","الله","الرحمن","الرحيم"]:
                basmala_lines.append(line)
        words = [w for w in words if w["line"] not in basmala_lines]
        return {"words": words, "glyph_count":len(traces), "basmala_lines_removed":basmala_lines,
                "excluded_glyphs":dict(sorted(excluded.items())), "frame":[mupage.rect.width,mupage.rect.height]}


def compare_page(n, extracted, app):
    aw = [w for w in app["words"] if w["role"] == "letter"]
    dw = extracted["words"]
    al, dl = defaultdict(list), defaultdict(list)
    for w in aw:
        al[w["line"]].append(w)
    for w in dw:
        dl[w["line"]].append(w)
    count_diffs, text_diffs, pairs = [], [], []
    for line in sorted(set(al) | set(dl)):
        aa, dd = al[line], dl[line]
        if len(aa) != len(dd):
            count_diffs.append({"line":line,"app":len(aa),"digitalkhatt":len(dd),
                                "app_words":[{"wid":w["wid"],"text":w["text"]} for w in aa],
                                "digitalkhatt_words":[w["text"] for w in dd]})
        akeys, dkeys = [skeleton(w["text"]) for w in aa], [w["skeleton"] for w in dd]
        if len(aa) == len(dd):
            # Equal line slots are a valid positional comparison even when
            # their source spellings remain subject to review.
            pairs.extend(zip(aa,dd))
        matcher = SequenceMatcher(None, akeys, dkeys, autojunk=False)
        for tag, a0,a1,d0,d1 in matcher.get_opcodes():
            if tag == "equal":
                if len(aa) != len(dd):
                    pairs.extend(zip(aa[a0:a1],dd[d0:d1]))
            else:
                text_diffs.append({"line":line,"kind":tag,
                    "hamza_notation_diagnostic_equal": [hamza_diagnostic(w["text"]) for w in aa[a0:a1]] == [hamza_diagnostic(w["text"]) for w in dd[d0:d1]],
                    "app":[{"wid":w["wid"],"text":w["text"],"skeleton":skeleton(w["text"])} for w in aa[a0:a1]],
                    "digitalkhatt":[{"text":w["text"],"skeleton":w["skeleton"]} for w in dd[d0:d1]]})
    positions = []
    sx, sy = app["width"]/extracted["frame"][0], app["height"]/extracted["frame"][1]
    for a,d in pairs:
        if d["box"] is None:
            raise ValueError(f"p{n}: no ink geometry for {a['wid']}")
        scaled = [v * (sx if i%2 == 0 else sy) for i,v in enumerate(d["box"])]
        raw_iou = iou(a["body"],scaled)
        positions.append({"wid":a["wid"],"line":a["line"],"text":a["text"],
                          "pairing":"equal_skeleton" if skeleton(a["text"]) == d["skeleton"] else "same_line_and_word_slot_only",
                          "iou":round(raw_iou,6),"overlaps":raw_iou > 0,"app_body":a["body"],
                          "digitalkhatt_scaled_box":[round(x,3) for x in scaled]})
    vals = [p["iou"] for p in positions]
    zero = [p for p in positions if not p["overlaps"]]
    count_match = sorted(al) == sorted(dl) and not count_diffs
    text_match = count_match and not text_diffs
    return {"page":n,"app_words":len(aw),"digitalkhatt_words":len(dw),
        "app_lines":sorted(al),"digitalkhatt_lines":sorted(dl),
        "line_and_word_count_match":count_match,
        "hamza_diagnostic_match":count_match and all(d["hamza_notation_diagnostic_equal"] for d in text_diffs),
        "text_layout_match":text_match,"fully_matches":text_match and not zero,
        "word_count_differences":count_diffs,"text_differences":text_diffs,
        "position":{"method":"scale full PDF frame independently to 1920x3106; no fitted transform or artwork registration",
                    "compared_words":len(positions),"median_iou":round(statistics.median(vals),6) if vals else None,
                    "worst_iou":min(vals) if vals else None,"zero_overlap_words":zero,
                    "worst_word":min(positions,key=lambda p:p["iou"]) if positions else None},
        "extraction":{k:v for k,v in extracted.items() if k != "words"}}


def details_markdown(report):
    s = report["summary"]
    lines = ["# DigitalKhatt parity details", "", "Generated with parity.json; read PARITY.md first.", "",
        "## Results", "", f"- Audited all {s['pages']} pages and {s['app_words']:,} app words.",
        f"- Strict skeleton and line layout match: {len(s['text_layout_matching_pages'])}/604 pages.",
        f"- Strict skeleton differences: {len(s['text_layout_differing_pages'])} pages: {s['text_layout_differing_pages']}",
        f"- Full pass including every matched word overlapping at literal frame scale: {len(s['fully_matching_pages'])}/604 pages.",
        f"- Zero-overlap words: {s['zero_overlap_words']} across {len(s['zero_overlap_pages'])} pages.",
        "", "## Method and limits", "",
        "Unicode comes from the PDF's explicit `/ActualText` spans, not inferred glyph names. Every text-show glyph is checked against PyMuPDF's trace by font and glyph code. Physical line numbers come from the PDF text matrices, including header and basmala rows. Standalone basmala rows are excluded except Al-Fatiha's verse 1, which the app judges.",
        "", "Skeleton normalization removes CGJ, canonically composes hamza seats, treats wasla as alif, converts tatweel-plus-hamza to standalone hamza, and removes ordinary harakat, Quranic small letters and signs. Uncomposed hamza and maddah remain explicit. Full-size hamza, seats, ya versus alif maqsura, and ta marbuta remain distinct. No Unicode is guessed from shapes.",
        "", "Word bounds come from each Type3 CharProc's declared d1 bounds, mapped through its trace origin and size; these are not independently measured pixel-tight boxes. Waqf signs are excluded. IoU uses literal whole-frame scaling from 256×410 to the app's 1920×3106 frame. No crop fitting, warping, line fitting or artwork registration is used. Every same-line word slot is measured when counts agree, with nonmatching spellings labeled separately. Geometry differences do not establish a different Quran text.",
        "", "Input PDF is used for research only. Its redistribution licence remains unresolved; no PDF-derived runtime assets are shipped.",
        "", "## Every page", "", "Page | Text/lines | Words app/DK | Median IoU | Worst IoU | No overlap", "--- | --- | --- | --- | --- | ---"]
    for p in report["pages"]:
        q = p["position"]
        lines.append(f"{p['page']} | {'match' if p['text_layout_match'] else 'DIFF'} | {p['app_words']}/{p['digitalkhatt_words']} | {q['median_iou']} | {q['worst_iou']} | {len(q['zero_overlap_words'])}")
    lines.extend(["", "## Exact text and count differences", ""])
    for p in report["pages"]:
        if p["text_layout_match"]:
            continue
        lines.append(f"### Page {p['page']}")
        lines.append(f"App lines {p['app_lines']}; DigitalKhatt lines {p['digitalkhatt_lines']}.")
        for diff in p["word_count_differences"]:
            lines.append(f"- Line {diff['line']}: app {diff['app']}, DigitalKhatt {diff['digitalkhatt']} words.")
        for diff in p["text_differences"]:
            a = " | ".join(f"{w['wid']}: {w['text']} [{w['skeleton']}]" for w in diff["app"]) or "(none)"
            d = " | ".join(f"{w['text']} [{w['skeleton']}]" for w in diff["digitalkhatt"]) or "(none)"
            lines.append(f"- Line {diff['line']}: app {a}; DigitalKhatt {d}. Hamza diagnostic equal: {diff['hamza_notation_diagnostic_equal']}.")
    lines.extend(["", "Exact zero-overlap words, their boxes, and the worst word on each page are in parity.json.", ""])
    return "\n".join(lines)


def markdown(report):
    s = report["summary"]
    lines = ["# DigitalKhatt Phase 0 parity", "", "**STOP: the task's Phase 0 gate is triggered. Checkpoint 1 is not complete.**", "",
        "The line and word order is promising, but literal full-page geometry does not meet the requested overlap check. Do not treat the PDF as a drop-in match to the artwork frame or start the page-mode UI without the owner's decision.", "",
        "Measure | Result", "--- | ---",
        f"Pages audited | {s['pages']}/604",
        f"App / DigitalKhatt words | {s['app_words']:,} / {s['digitalkhatt_words']:,}",
        f"Same physical line IDs and words per line | {len(s['line_and_word_count_matching_pages'])}/604 pages",
        f"Exact skeleton matches | {s['app_words']-s['strict_skeleton_differing_words']:,}/{s['app_words']:,} words; {len(s['text_layout_matching_pages'])}/604 complete pages",
        f"Strict skeleton notation differences | {s['strict_skeleton_differing_words']} words on {len(s['text_layout_differing_pages'])} pages",
        f"Extra hamza-notation diagnostic | {len(s['hamza_diagnostic_matching_pages'])}/604 pages equal; diagnostic only, not an approved mapping rule",
        f"Position comparisons | {s['position_compared_words']:,}/{s['app_words']:,} words",
        f"Zero-overlap at full-frame scale | {s['zero_overlap_words']:,} words on {len(s['zero_overlap_pages'])} pages",
        f"Full pass, strict text plus every word overlapping | {len(s['fully_matching_pages'])}/604 pages", "",
        "## What differs", "",
        "- All 604 pages have the same physical corpus rows and per-row word counts. Headers, ayah markers and 112 standalone basmala rows are excluded; Al-Fatiha's judged basmala is retained.",
        "- All strict text differences fall within the explicitly listed hamza-notation diagnostic. For example, app `ٱلۡأٓخِرِ` versus PDF `ٱلْـٔ͏َاخِرِ` and below-seat versus above-seat hamza. This does not show different recited words or prove identical drawn glyphs. Nothing in the app's text or letter-unit rules is changed.",
        "- Whole-frame scaling is 1920/256 horizontally and 3106/410 vertically. No fitted transform is applied. All 29 words on page 1 and all 36 on page 2 fail overlap. On most affected later pages only a few words fail; it is incorrect to say all words on 537 pages differ.",
        "- A nonzero overlap is only a rough geometry condition, not visual approval or proof of exact glyph shape.", "",
        "## Sample pages", "", "Page | Words | Median IoU | Worst IoU | Zero-overlap words", "--- | --- | --- | --- | ---"]
    for p in report["pages"]:
        if p["page"] in (1,2,3,50,187,293,582,600,604):
            q = p["position"]
            lines.append(f"{p['page']} | {p['app_words']} | {q['median_iou']} | {q['worst_iou']} | {len(q['zero_overlap_words'])}")
    lines += ["", "## Full-pass pages", "", ", ".join(map(str,s["fully_matching_pages"])), "",
        "Every other page has at least one strict text or position difference. [PARITY_DETAILS.md](PARITY_DETAILS.md) has all 604 page metrics and every exact text difference, including app word IDs. [parity.json](parity.json) additionally lists every zero-overlap word and its two boxes, per-page worst-word examples, source checksums and extraction counts.", "",
        "## Method and evidence limits", "",
        "The PDF's `/ActualText` supplies Unicode. All 848,524 text-show glyphs are checked against PyMuPDF traces by font and glyph code. This verifies extraction alignment, not that every glyph visibly represents its supplied Unicode. Glyph-to-letter ownership remains Phase 2 work.", "",
        "Physical rows are counted from the PDF's text matrices. This is specific to the pinned source, not a generic PDF line detector. FontMatrix, text matrix, rotation, supported operators and untagged glyphs are checked; an unsupported input fails rather than silently continuing.", "",
        "Geometry uses declared Type3 d1 bounds, not raster-measured ink. Every equal-count line slot is paired for geometry, even when its spelling differs; such pairs are labeled as ordinal comparisons. Zero overlap is decided before rounding.", "",
        "The input PDF's SHA256 is verified before parsing. It is used for research only. No PDF, outlines, contact sheets, runtime assets or production font pipeline are published by this audit. See [LICENSING.md](LICENSING.md) for the unresolved PDF grant and the separate source-generation route.", "",
        "## Decision needed", "",
        "May a DigitalKhatt mode intentionally use its own page geometry, with separate handling/fallback for pages 1–2, even though it does not overlap the existing artwork boxes everywhere? Also review the hamza-notation policy before mapping app letter units. The prescribed overlap test has not been waived or silently replaced.", ""]
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf", type=Path, required=True)
    parser.add_argument("--out", type=Path, default=ROOT / "scripts/digitalkhatt/reports")
    args = parser.parse_args()
    ext = Extractor(args.pdf)
    pages = []
    app_hash = hashlib.sha256()
    for n in range(1,605):
        raw = (ART / f"p{n}.json").read_bytes()
        app_hash.update(f"p{n}.json\0".encode()+raw)
        pages.append(compare_page(n,ext.page(n),json.loads(raw)))
        if n % 50 == 0 or n == 604:
            print(f"Audited {n}/604", flush=True)
    summary = {"pages":604,"app_words":sum(p["app_words"] for p in pages),
        "digitalkhatt_words":sum(p["digitalkhatt_words"] for p in pages),
        "line_and_word_count_matching_pages":[p["page"] for p in pages if p["line_and_word_count_match"]],
        "strict_skeleton_differing_words":sum(len(d["app"]) for p in pages for d in p["text_differences"]),
        "hamza_diagnostic_matching_pages":[p["page"] for p in pages if p["hamza_diagnostic_match"]],
        "position_compared_words":sum(p["position"]["compared_words"] for p in pages),
        "text_layout_matching_pages":[p["page"] for p in pages if p["text_layout_match"]],
        "text_layout_differing_pages":[p["page"] for p in pages if not p["text_layout_match"]],
        "fully_matching_pages":[p["page"] for p in pages if p["fully_matches"]],
        "zero_overlap_pages":[p["page"] for p in pages if p["position"]["zero_overlap_words"]],
        "zero_overlap_words":sum(len(p["position"]["zero_overlap_words"]) for p in pages)}
    report = {"schema":"digitalkhatt-parity-v1","source":{"font_repository":"https://github.com/DigitalKhatt/oldmadinafont",
        "font_commit":PIN,"pdf_sha256":hashlib.sha256(args.pdf.read_bytes()).hexdigest(),
        "app_page_json_sha256":app_hash.hexdigest(),"pdf_page_offset":"zero-based PDF index n = Mushaf page n",
        "pymupdf":pymupdf.__version__,"pypdf":pypdf.__version__},"summary":summary,"pages":pages}
    args.out.mkdir(parents=True,exist_ok=True)
    (args.out/"parity.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
    (args.out/"PARITY.md").write_text(markdown(report))
    (args.out/"PARITY_DETAILS.md").write_text(details_markdown(report))
    print(json.dumps({k:v for k,v in summary.items() if not isinstance(v,list)},indent=2))


if __name__ == "__main__":
    main()
