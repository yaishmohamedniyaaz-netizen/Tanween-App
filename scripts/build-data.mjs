import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "src", "data");
const pagesDir = join(here, "..", "public", "pages");

const QDC_BASE = "https://api.qurancdn.com/api/qdc";
const CHAPTERS_URL = "https://api.qurancdn.com/api/v4/chapters?language=en";
const QUL_LAYOUT_URL =
  "https://qul.tarteel.ai/resources/mushaf-layout/10";
const PAGE_COUNT = 604;
const PAGE_START = Math.max(1, Number(process.env.PAGE_START ?? 1));
const PAGE_END = Math.min(PAGE_COUNT, Number(process.env.PAGE_END ?? PAGE_COUNT));
const PAGE_LIST = process.env.PAGE_LIST
  ? [...new Set(process.env.PAGE_LIST.split(",").map(Number))]
  : null;

if (
  !Number.isInteger(PAGE_START) ||
  !Number.isInteger(PAGE_END) ||
  PAGE_START > PAGE_END
) {
  throw new Error(
    `Invalid page range ${process.env.PAGE_START ?? 1}-${process.env.PAGE_END ?? PAGE_COUNT}`,
  );
}

if (
  PAGE_LIST?.some(
    (page) => !Number.isInteger(page) || page < 1 || page > PAGE_COUNT,
  )
) {
  throw new Error(`Invalid PAGE_LIST ${process.env.PAGE_LIST}`);
}

const REQUESTED_PAGES =
  PAGE_LIST ??
  Array.from(
    { length: PAGE_END - PAGE_START + 1 },
    (_, index) => PAGE_START + index,
  );

async function fetchText(url, retries = 2) {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "Tahqeeq-Mushaf-Builder/2.0" },
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) throw new Error(`fetch ${url}: ${response.status}`);
    return response.text();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise((resolve) => setTimeout(resolve, 500 * (3 - retries)));
    return fetchText(url, retries - 1);
  }
}

async function fetchJson(url, retries = 2) {
  return JSON.parse(await fetchText(url, retries));
}

async function fetchPageVerses(page) {
  const verses = [];
  const fields = [
    "line_number",
    "page_number",
    "position",
    "code_v2",
    "text_qpc_hafs",
  ].join(",");
  let nextPage = 1;

  while (nextPage) {
    const url =
      `${QDC_BASE}/verses/by_page/${page}` +
      `?words=true&word_fields=${fields}&per_page=50&page=${nextPage}`;
    const data = await fetchJson(url);
    verses.push(...(data.verses ?? []));
    nextPage = data.pagination?.next_page ?? 0;
  }

  return verses;
}

function parseQulLayout(html, page) {
  const blockPattern =
    /<div class="line-container" data-line="(\d+)">([\s\S]*?)(?=<div class="line-container" data-line="|<\/turbo-frame>)/g;
  const lines = [];
  let match;

  while ((match = blockPattern.exec(html))) {
    const lineNumber = Number(match[1]);
    const block = match[2];
    const classMatch = block.match(
      new RegExp(`<div class="line([^\"]*)" id="line-${lineNumber}">`),
    );
    if (!classMatch) continue;
    const classes = classMatch[1];
    const surahMatch = block.match(/surah(\d{3})/);
    const centered = classes.includes("line--center");

    if (classes.includes("line--surah-name")) {
      if (!surahMatch) {
        throw new Error(`QUL page ${page}, line ${lineNumber}: missing surah`);
      }
      lines.push({
        n: lineNumber,
        type: "surah-header",
        centered: true,
        surah: Number(surahMatch[1]),
      });
    } else if (classes.includes("line--bismillah")) {
      lines.push({ n: lineNumber, type: "basmala", centered: true });
    } else if (block.includes('class="ayah-container"')) {
      lines.push({ n: lineNumber, type: "ayah", centered });
    }
  }

  if (!lines.length) throw new Error(`QUL page ${page}: no layout lines found`);
  return lines.sort((a, b) => a.n - b.n);
}

async function fetchPageLayout(page) {
  const html = await fetchText(`${QUL_LAYOUT_URL}?page=${page}`);
  return parseQulLayout(html, page);
}

function wordsByQdcLine(verses, page) {
  const byLine = new Map();

  const isOrnament = (text) => /^[\u06DE\u06E9]+$/u.test(text);

  function expandWordGlyphs(word) {
    const semanticParts = word.text_qpc_hafs.trim().split(/\s+/u).filter(Boolean);
    const glyphChars = [...word.code_v2].filter((char) => !/\s/u.test(char));

    if (semanticParts.length === 1) {
      return [{ text: semanticParts[0], glyph: glyphChars.join("") }];
    }

    if (semanticParts.length === glyphChars.length) {
      return semanticParts.map((text, index) => ({
        text,
        glyph: glyphChars[index],
      }));
    }

    // Two QCF records contain one ordinary word drawn with two page glyphs
    // beside a rub/sajdah ornament. Keep those glyphs together while exposing
    // the ornament as its own non-selectable printed target.
    if (semanticParts.length === 2 && glyphChars.length > 2) {
      if (isOrnament(semanticParts[0])) {
        return [
          { text: semanticParts[0], glyph: glyphChars[0] },
          { text: semanticParts[1], glyph: glyphChars.slice(1).join("") },
        ];
      }
      if (isOrnament(semanticParts[1])) {
        return [
          { text: semanticParts[0], glyph: glyphChars.slice(0, -1).join("") },
          { text: semanticParts[1], glyph: glyphChars.at(-1) },
        ];
      }
    }

    throw new Error(
      `Cannot align QCF token ${JSON.stringify(word.text_qpc_hafs)} with ${JSON.stringify(word.code_v2)}`,
    );
  }

  for (const verse of verses) {
    const [surah, ayah] = verse.verse_key.split(":").map(Number);
    let semanticPosition = 0;
    let ornamentPosition = 0;
    for (const word of verse.words ?? []) {
      const isEnd = word.char_type_name === "end";
      const parts = expandWordGlyphs(word).map((part) => {
        const ornament = !isEnd && isOrnament(part.text);
        const wid = ornament
          ? `${surah}.${ayah}.${semanticPosition}~o${ornamentPosition++}`
          : `${surah}.${ayah}.${semanticPosition++}`;
        return {
          wid,
          text: part.text,
          glyph: part.glyph,
          surah,
          ayah,
          role: isEnd ? "ayah-end" : ornament ? "ornament" : "letter",
        };
      });

      // A verse can cross a page boundary. Positions above must still advance
      // through its off-page words so that IDs match the full semantic verse.
      if (word.page_number !== page) continue;
      const line = word.line_number;
      if (!byLine.has(line)) byLine.set(line, []);
      byLine.get(line).push(...parts);
    }
  }

  return [...byLine.entries()].sort(([a], [b]) => a - b);
}

async function main() {
  console.log("Fetching Quran.com chapter metadata...");
  const chapterData = await fetchJson(CHAPTERS_URL);
  const chapters = chapterData.chapters ?? [];
  if (chapters.length !== 114) {
    throw new Error(`Expected 114 chapters, received ${chapters.length}`);
  }

  const chapterByNumber = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const surahIndex = chapters.map((chapter) => ({
    number: chapter.id,
    nameAr: chapter.name_arabic,
    firstPage: chapter.pages[0],
  }));

  await mkdir(outDir, { recursive: true });
  await mkdir(pagesDir, { recursive: true });
  await writeFile(
    join(outDir, "surah-index.json"),
    JSON.stringify(surahIndex, null, 2),
  );

  // Al-Fatihah 1:1 supplies the semantic four-word Basmala used on the
  // dedicated Basmala rows. Quran text rows themselves use page-specific QCF
  // V2 glyphs; this separate Unicode row remains word-selectable.
  const firstPageVerses = await fetchPageVerses(1);
  const fatihaBasmala = firstPageVerses
    .find((verse) => verse.verse_key === "1:1")
    ?.words?.filter((word) => word.char_type_name !== "end")
    .map((word) => word.text_qpc_hafs);
  if (!fatihaBasmala || fatihaBasmala.length !== 4) {
    throw new Error("Could not resolve the four-word Basmala from 1:1");
  }

  const errors = [];
  const results = [];
  let cursor = 0;
  let completed = 0;
  const requestedPages = REQUESTED_PAGES.length;
  const concurrency = 10;

  async function buildPage(page) {
    const [verses, layout] = await Promise.all([
      page === 1 ? Promise.resolve(firstPageVerses) : fetchPageVerses(page),
      fetchPageLayout(page),
    ]);
    const qdcLines = wordsByQdcLine(verses, page);
    const ayahLayout = layout.filter((line) => line.type === "ayah");

    if (qdcLines.length !== ayahLayout.length) {
      throw new Error(
        `line mismatch: QDC=${qdcLines.length}, QUL=${ayahLayout.length}`,
      );
    }

    const wordsForLayoutLine = new Map();
    ayahLayout.forEach((line, index) => {
      wordsForLayoutLine.set(line.n, qdcLines[index][1]);
    });

    const lines = layout.map((line) => {
      if (line.type === "surah-header") {
        const chapter = chapterByNumber.get(line.surah);
        if (!chapter) throw new Error(`Unknown surah ${line.surah}`);
        return {
          n: line.n,
          type: "surah-header",
          centered: true,
          surah: line.surah,
          nameAr: chapter.name_arabic,
        };
      }

      if (line.type === "basmala") {
        const nextAyahLine = layout.find(
          (candidate) => candidate.n > line.n && candidate.type === "ayah",
        );
        const surah = nextAyahLine
          ? wordsForLayoutLine.get(nextAyahLine.n)?.[0]?.surah
          : null;
        if (!surah) {
          throw new Error(`Basmala line ${line.n}: could not resolve surah`);
        }
        return {
          n: line.n,
          type: "basmala",
          centered: true,
          surah,
          words: fatihaBasmala.map((text, index) => ({
            wid: `${surah}.b.${index}`,
            text,
            surah,
            ayah: null,
            role: "letter",
          })),
        };
      }

      return {
        n: line.n,
        type: "ayah",
        centered: line.centered,
        words: wordsForLayoutLine.get(line.n),
      };
    });

    const output = {
      page,
      font: "qcf-v2",
      layout: "KFGQPC V2 1421H",
      lines,
    };
    await writeFile(join(pagesDir, `p${page}.json`), JSON.stringify(output));

    completed += 1;
    if (completed % 25 === 0 || completed === requestedPages) {
      console.log(`  ${completed}/${requestedPages} requested pages built`);
    }
    results.push({ page, lines: lines.length, ayahLines: ayahLayout.length });
  }

  async function worker() {
    while (cursor < requestedPages) {
      const page = REQUESTED_PAGES[cursor];
      cursor += 1;
      try {
        await buildPage(page);
      } catch (error) {
        errors.push({ page, error: error.message });
        console.error(`Page ${page} FAILED: ${error.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  if (errors.length) {
    console.error(`\n${errors.length} pages failed:`);
    errors.forEach(({ page, error }) => console.error(`  ${page}: ${error}`));
    process.exit(1);
  }

  const page604 = await readFile(join(pagesDir, "p604.json"), "utf8");
  await writeFile(join(outDir, "page604.json"), page604);

  console.log("\nSpot checks:");
  for (const page of [1, 2, 3, 151, 255, 582, 604]) {
    const result = results.find((candidate) => candidate.page === page);
    console.log(
      `  Page ${page}: ${result?.lines} occupied lines, ${result?.ayahLines} Quran lines`,
    );
  }
  console.log(
    PAGE_LIST
      ? `\n${requestedPages} requested KFGQPC V2 pages built successfully.`
      : `\nKFGQPC V2 page range ${PAGE_START}-${PAGE_END} built successfully.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
