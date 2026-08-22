"""Import Quran Android's canonical 1260px word coordinates.

The source database is generated alongside the Madani page images used by
Quran for Android. The checked-in output is intentionally page-scoped so the
browser only downloads coordinates for the page being viewed.
"""

from __future__ import annotations

import argparse
from collections import defaultdict
import json
import sqlite3
import tempfile
import urllib.request
import zipfile
from pathlib import Path


SOURCE_URL = (
    "https://android.quran.com/data/databases/ayahinfo/ayahinfo_1260.zip"
)
IMAGE_WIDTH = 1260
IMAGE_HEIGHT = 2038
SOURCE_VERSION = "quran-android-madani-v8-ayahinfo-1260"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("public/madani-coordinates"),
    )
    parser.add_argument(
        "--pages",
        type=Path,
        default=Path("public/pages"),
        help="Tahqeeq's checked QCF V1 page JSON directory",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    args.output.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="tahqeeq-madani-") as temp_dir:
        temp_path = Path(temp_dir)
        archive_path = temp_path / "ayahinfo_1260.zip"
        request = urllib.request.Request(
            SOURCE_URL,
            headers={"User-Agent": "Tahqeeq Mushaf data importer"},
        )
        with urllib.request.urlopen(request) as response:
            archive_path.write_bytes(response.read())
        with zipfile.ZipFile(archive_path) as archive:
            archive.extractall(temp_path)

        database_path = temp_path / "ayahinfo_1260.db"
        database = sqlite3.connect(database_path)
        database_rows = database.execute(
            """
            SELECT page_number, sura_number, ayah_number, position,
                   min_x, min_y, max_x, max_y
            FROM glyphs
            ORDER BY page_number, sura_number, ayah_number, position
            """
        ).fetchall()
        database.close()

    rows_by_ayah: dict[tuple[int, int, int], list[tuple[int, ...]]] = defaultdict(list)
    for row in database_rows:
        rows_by_ayah[(row[0], row[1], row[2])].append(row)

    pages: dict[int, dict[str, list[int]]] = {}
    consumed_rows = 0
    for page in range(1, 605):
        page_data = json.loads(
            (args.pages / f"p{page}.json").read_text(encoding="utf-8")
        )
        words_by_ayah: dict[tuple[int, int], list[dict[str, object]]] = defaultdict(list)
        for line in page_data["lines"]:
            for word in line.get("words", []):
                if word.get("ayah") is not None:
                    words_by_ayah[(word["surah"], word["ayah"])].append(word)

        words: dict[str, list[int]] = {}
        for (surah, ayah), ayah_words in words_by_ayah.items():
            rows = rows_by_ayah[(page, surah, ayah)]
            cursor = 0
            for word in ayah_words:
                if word["role"] not in ("letter", "ornament"):
                    continue
                glyph_count = len(word.get("glyph", ""))
                word_rows = rows[cursor : cursor + glyph_count]
                cursor += glyph_count
                if len(word_rows) != glyph_count:
                    raise RuntimeError(f"Missing bounds for {word['wid']}")
                consumed_rows += len(word_rows)
                if word["role"] != "letter":
                    continue
                words[word["wid"]] = [
                    min(min(row[4], row[6]) for row in word_rows),
                    min(min(row[5], row[7]) for row in word_rows),
                    max(max(row[4], row[6]) for row in word_rows),
                    max(max(row[5], row[7]) for row in word_rows),
                ]

            # Generated ayah data can retain the ayah-end ornament and, for
            # sajdah verses, the sajdah ornament. Neither is a judging target.
            if len(rows) - cursor not in (0, 1, 2):
                raise RuntimeError(
                    f"Unexpected coordinate remainder on {page} {surah}:{ayah}"
                )
        pages[page] = words

    for page, words in pages.items():
        payload = {
            "page": page,
            "width": IMAGE_WIDTH,
            "height": IMAGE_HEIGHT,
            "source": SOURCE_VERSION,
            "words": words,
        }
        output_path = args.output / f"p{page}.json"
        output_path.write_text(
            json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )

    print(
        f"Wrote {len(pages)} page coordinate files from "
        f"{consumed_rows}/{len(database_rows)} canonical glyph rows"
    )


if __name__ == "__main__":
    main()
