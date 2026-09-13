#!/usr/bin/env python3
"""Check a font file against what Tanween actually has to set.

    python3 fontcheck.py path/to/Atak-Regular.otf [more fonts...]

Needs fonttools (pip install fonttools brotli). The test that matters is the
first one: the four criteria names are the most repeated words in the app,
and three of them contain letters most Latin fonts stop short of.
"""
import sys
from fontTools.ttLib import TTFont

# Every character the app sets in Latin, taken from the UI strings themselves.
CRITERIA = "Laḥn Jalī Laḥn Khafī Faṣāḥa Adu / Raagu"
EXTRA    = "āīūḥṣḍṭẓʿʾĀĪ"          # transliteration letters used in headings
FIGURES  = "0123456789.,:–−/%"

def report(path):
    f = TTFont(path, fontNumber=0)
    cmap = f.getBestCmap()
    upm  = f["head"].unitsPerEm
    have = lambda s: "".join(c for c in s if c != " " and ord(c) not in cmap)

    miss_c, miss_e, miss_f = have(CRITERIA), have(EXTRA), have(FIGURES)
    feats = set()
    if "GSUB" in f:
        for r in f["GSUB"].table.FeatureList.FeatureRecord:
            feats.add(r.FeatureTag)

    adv = lambda ch: round(f["hmtx"][cmap[ord(ch)]][0] / upm * 1000) if ord(ch) in cmap else None
    digits = [adv(c) for c in "0123456789"]
    var = "fvar" in f
    axes = ", ".join(f"{a.axisTag} {a.minValue:g}-{a.maxValue:g}" for a in f["fvar"].axes) if var else "static"

    print(f"\n{path}")
    print(f"  criteria names   {'ALL PRESENT' if not miss_c else 'MISSING ' + miss_c}")
    print(f"  transliteration  {'ALL PRESENT' if not miss_e else 'MISSING ' + miss_e}")
    print(f"  figures & signs  {'ALL PRESENT' if not miss_f else 'MISSING ' + miss_f}")
    print(f"  axes             {axes}")
    print(f"  tabular figures  {'tnum' if 'tnum' in feats else 'NONE — score columns will not line up'}")
    print(f"  slashed zero     {'zero' if 'zero' in feats else 'not as a feature'}")
    print(f"  stylistic sets   {' '.join(sorted(t for t in feats if t.startswith('ss'))) or 'none'}")
    print(f"  glyphs in cmap   {len(cmap)}")
    print(f"  x-height/em      {f['OS/2'].sxHeight/upm:.3f}   cap {f['OS/2'].sCapHeight/upm:.3f}")
    print(f"  width of n       {adv('n')}/1000")
    if digits and len(set(digits)) > 1:
        print(f"  default figures  proportional (tnum needed for tables)")
    return not (miss_c or miss_e or miss_f)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    ok = all(report(p) for p in sys.argv[1:])
    print("\nVerdict:", "usable for the interface" if ok else
          "NOT usable as the only face — the missing letters are in the criteria names")
