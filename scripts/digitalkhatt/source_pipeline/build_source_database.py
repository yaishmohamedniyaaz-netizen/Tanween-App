"""Create only the schema read by pinned native CLI, from the MIT website corpus.
No sample PDF, original unpublished database or unlicensed analyzer is read.
"""

import argparse, ast, json, sqlite3, hashlib, tempfile, os, sys
from pathlib import Path
from safety import output_directory, outside_repository, atomic_write

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--website", type=Path, required=True)
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
r = output_directory(args.output)
raw = (
    args.website / "ClientApp/src/app/services/quran_text_old_madinah.ts"
).read_bytes()
s = raw.decode("utf-8")
if (
    hashlib.sha256(raw).hexdigest()
    != "08972d48c6c250fda4ce9c58a2f23be52c17b0cf097ac093a040e3c392b79f07"
):
    raise ValueError("Website corpus differs from verified pin")
pages = ast.literal_eval(s[s.index("[") : s.rindex("]") + 1])
p = r / "website-source.sqlite"
outside_repository(p)
if p.is_symlink():
    raise ValueError(f"Refusing output symlink: {p}")
# Each run owns a unique temporary database; never unlink another run's file.
fd, name = tempfile.mkstemp(prefix=".source-database-", suffix=".sqlite", dir=r)
os.close(fd)
tmp = Path(name)
c = sqlite3.connect(tmp)
c.executescript(
    "CREATE TABLE words(word_number_all INTEGER PRIMARY KEY,dk_v1 TEXT NOT NULL); CREATE TABLE qpc_v1_layout(page INTEGER,line INTEGER,type TEXT,range_start INTEGER,range_end INTEGER);"
)
n = 0
kinds = {}
line_count = 0
for pn, page in enumerate(pages, 1):
    for ln, line in enumerate(page, 1):
        kind = "ayah"
        if line.startswith("سُورَةُ "):
            kind = "surah_name"
        elif line in [
            "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
            "بِّسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
        ]:
            kind = "basmallah"
        kinds[kind] = kinds.get(kind, 0) + 1
        line_count += 1
        start = n + 1
        if kind == "ayah":
            for word in line.split():
                n += 1
                c.execute("INSERT INTO words VALUES(?,?)", (n, word))
        c.execute(
            "INSERT INTO qpc_v1_layout VALUES(?,?,?,?,?)", (pn, ln, kind, start, n)
        )
c.commit()
# Exactly mimic CLI SELECT, then reconstruct all body source lines.
rows = c.execute(
    "SELECT l.page,l.line,l.type,w.dk_v1 FROM qpc_v1_layout l LEFT JOIN words w ON l.type='ayah' AND l.range_start<=w.word_number_all AND l.range_end>=w.word_number_all ORDER BY l.page,l.line,w.word_number_all"
).fetchall()
from collections import defaultdict

lines = defaultdict(list)
for pn, ln, kind, word in rows:
    if kind == "ayah":
        lines[pn, ln].append(word)
if not (len(pages) == 604 and line_count == 9046 and len(lines) == 8820 and n == 83670):
    raise ValueError("Source database coverage failed")
if kinds != {"surah_name": 114, "ayah": 8820, "basmallah": 112}:
    raise ValueError("Source database line classifications failed")
if {pn for pn, ln in lines} != set(range(1, 605)):
    raise ValueError("Source database page coverage failed")
if not all(
    " ".join(words) == pages[pn - 1][ln - 1] for (pn, ln), words in lines.items()
):
    raise ValueError("Source database text roundtrip failed")
c.close()
tmp.replace(p)
result = {
    "python_version": sys.version.split()[0],
    "sqlite_version": sqlite3.sqlite_version,
    "source_repository": "DigitalKhatt/digitalkhatt.org",
    "source_commit": "4213fab9892774f74f7164c70a70dd84a14f0215",
    "source_license": "https://github.com/DigitalKhatt/digitalkhatt.org/blob/4213fab9892774f74f7164c70a70dd84a14f0215/LICENSE",
    "source_sha256": hashlib.sha256(raw).hexdigest(),
    "pages": len(pages),
    "lines": line_count,
    "line_types": kinds,
    "word_rows_including_markers": n,
    "body_line_roundtrip_exact": True,
    "database_sha256": hashlib.sha256(p.read_bytes()).hexdigest(),
    "warning": "SQLite query roundtrip only. Native corpus normalization and heading generation must be separately validated.",
}
atomic_write(r / "website-source-database.json", json.dumps(result, indent=2).encode())
print(json.dumps(result, indent=2))
