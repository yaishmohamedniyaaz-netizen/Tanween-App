import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "src", "data");
const pagesDir = join(here, "..", "public", "pages");

const QDC_BASE = "https://api.qurancdn.com/api/qdc";
const CHAPTERS_URL = "https://api.qurancdn.com/api/v4/chapters?language=en";
const QUL_LAYOUT_URL =
  "https://qul.tarteel.ai/resources/mushaf-layout/15";
const QUL_SCRIPT_URL =
  "https://qul.tarteel.ai/resources/quran-script/57";
const WORD_FIELDS = [
  "line_number",
  "page_number",
  "position",
  "code_v1",
  "text_qpc_hafs",
].join(",");
const PAGE_COUNT = 604;
const PAGE_START = Math.max(1, Number(process.env.PAGE_START ?? 1));
const PAGE_END = Math.min(PAGE_COUNT, Number(process.env.PAGE_END ?? PAGE_COUNT));
const PAGE_LIST = process.env.PAGE_LIST
  ? [...new Set(process.env.PAGE_LIST.split(",").map(Number))]
  : null;
const AYAH_MARKER_TEXT = /^[\u0660-\u0669\u06F0-\u06F9]+$/u;

function isAyahEndWord(word) {
  return (
    word.char_type_name === "end" ||
    AYAH_MARKER_TEXT.test(String(word.text_qpc_hafs ?? "").trim())
  );
}

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
  let nextPage = 1;

  while (nextPage) {
    const url =
      `${QDC_BASE}/verses/by_page/${page}` +
      `?words=true&word_fields=${WORD_FIELDS}&per_page=50&page=${nextPage}`;
    const data = await fetchJson(url);
    verses.push(...(data.verses ?? []));
    nextPage = data.pagination?.next_page ?? 0;
  }

  return verses;
}

const versePromises = new Map();
const qulVerseGlyphPromises = new Map();

function fetchVerse(verseKey) {
  if (!versePromises.has(verseKey)) {
    const url =
      `${QDC_BASE}/verses/by_key/${verseKey}` +
      `?words=true&word_fields=${WORD_FIELDS}`;
    versePromises.set(
      verseKey,
      fetchJson(url).then((data) => {
        if (!data.verse) throw new Error(`Missing verse ${verseKey}`);
        return data.verse;
      }),
    );
  }
  return versePromises.get(verseKey);
}

function fetchQulVerseGlyphs(verseKey) {
  if (!qulVerseGlyphPromises.has(verseKey)) {
    const url = `${QUL_SCRIPT_URL}?ayah=${encodeURIComponent(verseKey)}`;
    qulVerseGlyphPromises.set(
      verseKey,
      fetchText(url).then((html) => {
        const glyphs = [];
        const pattern =
          /<span class="px-4 py-2 border border-gray-300 word">[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>[\s\S]*?<\/span>/g;
        let match;
        while ((match = pattern.exec(html))) {
          glyphs.push(
            match[1].replace(/<[^>]+>/g, "").replace(/\s+/gu, ""),
          );
        }
        if (!glyphs.length) {
          throw new Error(`QUL script ${verseKey}: no V1 glyphs found`);
        }
        return glyphs;
      }),
    );
  }
  return qulVerseGlyphPromises.get(verseKey);
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
      const words = [];
      const wordPattern =
        /<span class="char([^"]*)"[\s\S]*?data-location="([^"]+)"[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/span>/g;
      let wordMatch;

      while ((wordMatch = wordPattern.exec(block))) {
        const wordClasses = wordMatch[1];
        const glyph = wordMatch[3]
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/gu, "");
        if (!glyph) {
          throw new Error(
            `QUL page ${page}, line ${lineNumber}: empty V1 glyph`,
          );
        }
        words.push({
          location: wordMatch[2],
          glyph,
          role: wordClasses.includes("char-end") ? "ayah-end" : "letter",
        });
      }

      if (!words.length) {
        throw new Error(
          `QUL page ${page}, line ${lineNumber}: no V1 words found`,
        );
      }
      lines.push({ n: lineNumber, type: "ayah", centered, words });
    }
  }

  if (!lines.length) throw new Error(`QUL page ${page}: no layout lines found`);
  return lines.sort((a, b) => a.n - b.n);
}

async function fetchPageLayout(page) {
  const html = await fetchText(`${QUL_LAYOUT_URL}?page=${page}`);
  return parseQulLayout(html, page);
}

function buildSemanticGroups(verses, page) {
  const groups = [];
  const isOrnament = (text) => /^[\u06DE\u06E9]+$/u.test(text);

  function expandWordGlyphs(word, glyph) {
    const semanticParts = word.text_qpc_hafs.trim().split(/\s+/u).filter(Boolean);
    const glyphChars = [...glyph].filter((char) => !/\s/u.test(char));

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

    // QPC V1 has one exceptional ligature that draws two ordinary semantic
    // words with a single page glyph. Keep those words independently
    // selectable and let them fall back to the semantic Quran font.
    if (
      semanticParts.length > 1 &&
      glyphChars.length === 1 &&
      semanticParts.every((text) => !isOrnament(text))
    ) {
      return semanticParts.map((text) => ({ text, glyph: undefined }));
    }

    throw new Error(
      `Cannot align QPC V1 token ${JSON.stringify(word.text_qpc_hafs)} with ${JSON.stringify(glyph)}`,
    );
  }

  for (const verse of verses) {
    const [surah, ayah] = verse.verse_key.split(":").map(Number);
    let semanticPosition = 0;
    let ornamentPosition = 0;
    for (const word of verse.words ?? []) {
      // The semantic Arabic number is a second, source-independent guard.
      // Quran.com currently reports the 2:181 marker as an ordinary word even
      // though it is the printed ayah ending. Requiring every numeric marker to
      // be an ayah end keeps generated question boundaries complete.
      const isEnd = isAyahEndWord(word);
      const sourceGlyph = word.code_v1.replace(/\s+/gu, "");
      const parts = expandWordGlyphs(word, sourceGlyph).map((part) => {
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
      groups.push({
        location: `${verse.verse_key}:${word.position}`,
        parts,
        glyph: sourceGlyph,
      });
    }
  }

  return groups;
}

function verseKeyFromLocation(location) {
  return location.split(":").slice(0, 2).join(":");
}

function assignGlyphToParts(parts, glyph, page, location) {
  const glyphChars = [...glyph];
  if (parts.length === 1) return [{ ...parts[0], glyph }];
  if (parts.length === glyphChars.length) {
    return parts.map((part, index) => ({ ...part, glyph: glyphChars[index] }));
  }

  const ornamentIndex = parts.findIndex((part) => part.role === "ornament");
  if (parts.length === 2 && ornamentIndex >= 0 && glyphChars.length > 2) {
    return ornamentIndex === 0
      ? [
          { ...parts[0], glyph: glyphChars[0] },
          { ...parts[1], glyph: glyphChars.slice(1).join("") },
        ]
      : [
          { ...parts[0], glyph: glyphChars.slice(0, -1).join("") },
          { ...parts[1], glyph: glyphChars.at(-1) },
        ];
  }

  throw new Error(
    `QUL script page ${page}: cannot align exact V1 word ${location}`,
  );
}

async function buildExactQulSemanticGroups(verses, page) {
  const groups = buildSemanticGroups(verses, page);
  const groupsByVerse = new Map();
  for (const group of groups) {
    const key = verseKeyFromLocation(group.location);
    if (!groupsByVerse.has(key)) groupsByVerse.set(key, []);
    groupsByVerse.get(key).push(group);
  }

  const exactGroups = [];
  for (const verse of verses) {
    const glyphs = await fetchQulVerseGlyphs(verse.verse_key);
    const verseGroups = groupsByVerse.get(verse.verse_key) ?? [];
    let glyphIndex = 0;

    for (const group of verseGroups) {
      const splitOrdinaryWords =
        group.parts.length > 1 &&
        group.parts.every((part) => part.role === "letter");
      let parts;
      let glyph;

      if (splitOrdinaryWords) {
        const groupGlyphs = glyphs.slice(
          glyphIndex,
          glyphIndex + group.parts.length,
        );
        if (groupGlyphs.length !== group.parts.length) {
          throw new Error(
            `QUL script ${verse.verse_key}: incomplete split word ${group.location}`,
          );
        }
        parts = group.parts.map((part, index) => ({
          ...part,
          glyph: groupGlyphs[index],
        }));
        glyph = groupGlyphs.join("");
        glyphIndex += group.parts.length;
      } else {
        glyph = glyphs[glyphIndex];
        if (!glyph) {
          throw new Error(
            `QUL script ${verse.verse_key}: missing word ${group.location}`,
          );
        }
        parts = assignGlyphToParts(group.parts, glyph, page, group.location);
        glyphIndex += 1;
      }

      exactGroups.push({ ...group, glyph, parts });
    }

    if (glyphIndex !== glyphs.length) {
      throw new Error(
        `QUL script ${verse.verse_key}: used ${glyphIndex}/${glyphs.length} V1 words`,
      );
    }
  }

  return exactGroups;
}

async function resolveLayoutVerses(layout, pageVerses) {
  const neededKeys = new Set();
  for (const line of layout) {
    for (const word of line.words ?? []) {
      neededKeys.add(verseKeyFromLocation(word.location));
    }
  }
  const byKey = new Map(pageVerses.map((verse) => [verse.verse_key, verse]));
  const missingKeys = [...neededKeys].filter((key) => !byKey.has(key));
  const supplements = await Promise.all(missingKeys.map(fetchVerse));
  for (const verse of supplements) byKey.set(verse.verse_key, verse);

  return [...neededKeys]
    .map((key) => byKey.get(key))
    .filter(Boolean)
    .sort((a, b) => {
      const [aSurah, aAyah] = a.verse_key.split(":").map(Number);
      const [bSurah, bAyah] = b.verse_key.split(":").map(Number);
      return aSurah - bSurah || aAyah - bAyah;
    });
}

function alignWordsByQulLine(layout, semanticGroups, page) {
  const layoutChars = [];
  for (const line of layout) {
    if (line.type !== "ayah") continue;
    for (const word of line.words) {
      for (const glyph of word.glyph) layoutChars.push({ glyph, line: line.n });
    }
  }

  const semanticChars = [];
  semanticGroups.forEach((group, groupIndex) => {
    for (const glyph of group.glyph) semanticChars.push({ glyph, groupIndex });
  });

  const matches = [];
  for (
    let start = 0;
    start <= semanticChars.length - layoutChars.length;
    start += 1
  ) {
    let matchesAtStart = true;
    for (let index = 0; index < layoutChars.length; index += 1) {
      if (semanticChars[start + index].glyph !== layoutChars[index].glyph) {
        matchesAtStart = false;
        break;
      }
    }
    if (matchesAtStart) matches.push(start);
  }

  if (matches.length !== 1) {
    throw new Error(
      `QPC V1 page ${page}: expected one exact glyph-stream match, found ${matches.length}`,
    );
  }

  const matchStart = matches[0];
  const matchEnd = matchStart + layoutChars.length;
  const groupRanges = [];
  let cursor = 0;
  semanticGroups.forEach((group) => {
    const start = cursor;
    cursor += [...group.glyph].length;
    groupRanges.push({ start, end: cursor });
  });

  const wordsByLine = new Map();
  semanticGroups.forEach((group, groupIndex) => {
    const range = groupRanges[groupIndex];
    if (range.end <= matchStart || range.start >= matchEnd) return;
    if (range.start < matchStart || range.end > matchEnd) {
      throw new Error(
        `QPC V1 page ${page}: page boundary splits ${group.location}`,
      );
    }

    const groupLayoutStart = range.start - matchStart;
    const groupLines = new Set(
      layoutChars
        .slice(groupLayoutStart, groupLayoutStart + (range.end - range.start))
        .map((entry) => entry.line),
    );

    let partOffset = 0;
    for (const part of group.parts) {
      const partLength = part.glyph ? [...part.glyph].length : 0;
      const partLines = partLength
        ? new Set(
            layoutChars
              .slice(
                groupLayoutStart + partOffset,
                groupLayoutStart + partOffset + partLength,
              )
              .map((entry) => entry.line),
          )
        : groupLines;
      if (partLines.size !== 1) {
        throw new Error(
          `QPC V1 page ${page}: line boundary splits ${part.wid}`,
        );
      }
      const line = [...partLines][0];
      if (!wordsByLine.has(line)) wordsByLine.set(line, []);
      wordsByLine.get(line).push(part);
      partOffset += partLength;
    }
  });

  return wordsByLine;
}

async function wordsByQulLine(layout, semanticGroups, verses, page) {
  try {
    return alignWordsByQulLine(layout, semanticGroups, page);
  } catch (error) {
    if (!String(error.message).includes("exact glyph-stream match")) throw error;
    const exactGroups = await buildExactQulSemanticGroups(verses, page);
    return alignWordsByQulLine(layout, exactGroups, page);
  }
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
  // dedicated Basmala rows. Quran text rows themselves use page-specific QPC
  // V1 glyphs; this separate Unicode row remains word-selectable.
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
    const layoutVerses = await resolveLayoutVerses(layout, verses);
    const semanticGroups = buildSemanticGroups(layoutVerses, page);
    const ayahLayout = layout.filter((line) => line.type === "ayah");
    const wordsForLayoutLine = await wordsByQulLine(
      layout,
      semanticGroups,
      layoutVerses,
      page,
    );

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
      font: "qcf-v1",
      layout: "KFGQPC V1 1405H",
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
      ? `\n${requestedPages} requested KFGQPC V1 pages built successfully.`
      : `\nKFGQPC V1 page range ${PAGE_START}-${PAGE_END} built successfully.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
