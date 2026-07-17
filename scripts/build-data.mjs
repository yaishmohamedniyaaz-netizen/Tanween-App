import { writeFile, mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SRC =
  "https://raw.githubusercontent.com/thetruetruth/quran-data-kfgqpc/main/hafs/data/hafsData_v18.json";
const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "src", "data");
const pagesDir = join(here, "..", "public", "pages");

const ARABIC_INDIC = /^[٠-٩]+$/;
const stripTrailingNumber = (s) =>
  s.replace(/[\s٠-٩۝ٰ]*[٠-٩]+[\s]*$/u, "").trim();

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
  return res.json();
}

async function fetchWithRetry(url, retries = 1) {
  try { return await fetchJson(url); }
  catch (e) {
    if (retries > 0) { console.log(`  retry ${url}`); return fetchWithRetry(url, retries - 1); }
    throw e;
  }
}

async function fetchPageVerses(page) {
  const all = [];
  let nextUrl = `https://api.qurancdn.com/api/qdc/verses/by_page/${page}?words=true&word_fields=line_number,page_number,position&per_page=50`;
  while (nextUrl) {
    const data = await fetchWithRetry(nextUrl);
    if (data.verses) all.push(...data.verses);
    const np = data.pagination?.next_page;
    nextUrl = np ? `https://api.qurancdn.com/api/qdc/verses/by_page/${page}?words=true&word_fields=line_number,page_number,position&per_page=50&page=${np}` : null;
  }
  return all;
}

function normalize(text) {
  return text
    .normalize("NFKD")
    .replace(/ىٰ/g, "ا") // hafs long alef -> plain alef
    .replace(/ى/g, "ي") // remaining alef maksura -> ya
    .replace(/ٱ/g, "ا") // hamza-on-alef -> alef
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "") // diacritics
    .replace(/[\u06D6-\u06ED]/g, "") // pause marks
    .replace(/[\u06E0-\u06E4\u06E9]/g, "") // Quranic signs including sajdah
    .replace(/[\u0653-\u0655]/g, "") // hamza marks
    .replace(/[\u06E5\u06E6]/g, "") // small waw/yeh
    .replace(/[\u06DF\u06E1]/g, "") // small high rounded zero / dotless head of khah
    .replace(/[\u200E\u200F]/g, "") // LRM and RLM
    .replace(/[\u0621]/g, "") // standalone hamza
    .replace(/\s+/g, "") // remove all spaces
    .trim();
}

function alignWords(hafsWords, qdcWords) {
  const result = [];
  let h = 0, q = 0;

  while (h < hafsWords.length && q < qdcWords.length) {
    const hText = normalize(hafsWords[h]);
    const qText = normalize(qdcWords[q].text);

    if (hText === qText) {
      result.push({ hafsIndex: h, qdcPositions: [qdcWords[q].position] });
      h++; q++;
    } else if (q + 1 < qdcWords.length && hText === normalize(qdcWords[q].text + qdcWords[q + 1].text)) {
      result.push({ hafsIndex: h, qdcPositions: [qdcWords[q].position, qdcWords[q + 1].position] });
      h++; q += 2;
    } else if (h + 1 < hafsWords.length && normalize(hafsWords[h] + hafsWords[h + 1]) === qText) {
      result.push({ hafsIndex: h, qdcPositions: [qdcWords[q].position] });
      h += 2; q++;
    } else {
      let found = false;
      for (let qn = 2; qn <= 4 && q + qn <= qdcWords.length; qn++) {
        const combined = normalize(qdcWords.slice(q, q + qn).map((w) => w.text).join(""));
        if (hText === combined) {
          result.push({ hafsIndex: h, qdcPositions: qdcWords.slice(q, q + qn).map((w) => w.position) });
          h++; q += qn;
          found = true;
          break;
        }
      }
      if (!found) {
        for (let hn = 2; hn <= 4 && h + hn <= hafsWords.length; hn++) {
          const combined = normalize(hafsWords.slice(h, h + hn).join(""));
          if (combined === qText) {
            result.push({ hafsIndex: h, qdcPositions: [qdcWords[q].position] });
            h += hn; q++;
            found = true;
            break;
          }
        }
      }
      if (!found) {
        throw new Error(`Cannot align: hafs[${h}]="${hafsWords[h]}" vs qdc[${q}]="${qdcWords[q].text}"`);
      }
    }
  }

  if (h !== hafsWords.length || q !== qdcWords.length) {
    throw new Error(`Alignment incomplete: h=${h}/${hafsWords.length}, q=${q}/${qdcWords.length}`);
  }

  return result;
}

async function main() {
  console.log("Fetching Hafs v18 data...");
  const all = await fetchJson(SRC);

  const fatihaOne = all.find((a) => a.sora === 1 && a.aya_no === 1);
  if (!fatihaOne) throw new Error("could not find Al-Fatihah 1:1 for Basmala");
  const basmala = stripTrailingNumber(fatihaOne.aya_text);
  const basmalaWords = basmala.split(/\s+/).filter(Boolean);

  const hafsByVerse = new Map();
  const surahMeta = new Map();
  for (const a of all) {
    const key = `${a.sora}:${a.aya_no}`;
    const words = a.aya_text.trim().split(/\s+/).filter(Boolean);
    hafsByVerse.set(key, { ...a, words });
    if (!surahMeta.has(a.sora) || a.page < surahMeta.get(a.sora).firstPage) {
      surahMeta.set(a.sora, { nameAr: a.sora_name_ar, firstPage: a.page });
    }
  }

  await mkdir(outDir, { recursive: true });
  await mkdir(pagesDir, { recursive: true });

  const surahIndex = [...surahMeta.entries()].map(([number, meta]) => ({
    number,
    nameAr: meta.nameAr,
    firstPage: meta.firstPage,
  })).sort((a, b) => a.number - b.number);
  const idxFile = join(outDir, "surah-index.json");
  await writeFile(idxFile, JSON.stringify(surahIndex, null, 2));
  console.log(`Wrote ${idxFile}`);

  const SPECIAL = new Set([1, 2]);
  const errors = [];
  const results = [];

  const CONCURRENCY = 8;
  let completed = 0;
  const total = 604;

  async function buildPage(page) {
    const verses = await fetchPageVerses(page);
    const isSpecial = SPECIAL.has(page);

    let lineWords = new Map();
    const surahFirstLine = new Map();

    for (const v of verses) {
      const [surahStr, ayahStr] = v.verse_key.split(":");
      const surah = Number(surahStr);
      const ayah = Number(ayahStr);
      const hafs = hafsByVerse.get(`${surah}:${ayah}`);
      if (!hafs) throw new Error(`Missing hafs for ${v.verse_key}`);
      const hafsWords = hafs.words;

      const qdcWords = v.words;
      const alignment = alignWords(hafsWords, qdcWords);
      const posToHafs = new Map();
      for (const a of alignment) {
        for (const pos of a.qdcPositions) {
          posToHafs.set(pos, a.hafsIndex);
        }
      }

      let currentHafsIndex = -1;
      let currentLine = null;

      for (const w of qdcWords) {
        if (w.page_number !== page) continue;
        const hafsIndex = posToHafs.get(w.position);
        if (hafsIndex === undefined) {
          throw new Error(`${v.verse_key} position ${w.position} not in alignment`);
        }
        const text = hafsWords[hafsIndex];
        const role = ARABIC_INDIC.test(text) ? "ayah-end" : "letter";
        const entry = {
          wid: `${surah}.${ayah}.${hafsIndex}`,
          text,
          surah,
          ayah,
          role,
        };

        const ln = w.line_number;
        if (!lineWords.has(ln)) lineWords.set(ln, []);

        // Merge consecutive qdc words that map to the same hafs word
        if (hafsIndex === currentHafsIndex && ln === currentLine) {
          continue;
        }

        lineWords.get(ln).push(entry);
        currentHafsIndex = hafsIndex;
        currentLine = ln;

        if (!surahFirstLine.has(surah) || ln < surahFirstLine.get(surah)) {
          surahFirstLine.set(surah, ln);
        }
      }
    }

    const lines = [];
    const sortedLineNums = [...lineWords.keys()].sort((a, b) => a - b);
    const maxLine = sortedLineNums.length ? sortedLineNums[sortedLineNums.length - 1] : 0;

    if (isSpecial) {
      for (const ln of sortedLineNums) {
        lines.push({ n: ln, type: "ayah", words: lineWords.get(ln) });
      }
    } else {
      const startingSurahs = [];
      for (const [surah, firstLn] of surahFirstLine) {
        const hafsSurah = hafsByVerse.get(`${surah}:1`);
        if (!hafsSurah) continue;
        const ayah1OnPage = verses.some((v) => {
          const [s, a] = v.verse_key.split(":").map(Number);
          return s === surah && a === 1 && v.words.some((w) => w.page_number === page);
        });
        if (ayah1OnPage) {
          startingSurahs.push({ surah, firstLn, nameAr: surahMeta.get(surah).nameAr });
        }
      }
      startingSurahs.sort((a, b) => a.firstLn - b.firstLn);

      // Calculate line shift for new surahs that start at the beginning of the page
      // where the API's firstLn is too small (header/basmala would go to line <= 0)
      let lineShift = 0;
      for (const { surah, firstLn } of startingSurahs) {
        if (firstLn <= 2) {
          const hasBasmala = surah !== 1 && surah !== 9;
          // Need header on line 1, basmala on line 2 (if applicable)
          // If firstLn == 2 and there's a basmala, verses must shift by +1
          const neededShift = hasBasmala ? (3 - firstLn) : (2 - firstLn);
          lineShift = Math.max(lineShift, neededShift);
        }
      }
      if (lineShift > 0) {
        const shifted = new Map();
        for (const [ln, words] of lineWords) {
          shifted.set(ln + lineShift, words);
        }
        lineWords = shifted;
        // Also update firstLn values for later logic
        for (const s of startingSurahs) {
          s.firstLn += lineShift;
        }
      }

      const reserved = new Map();
      for (const { surah, firstLn, nameAr } of startingSurahs) {
        if (firstLn >= 3) {
          reserved.set(firstLn - 2, { n: firstLn - 2, type: "surah-header", surah, nameAr });
          if (surah !== 1 && surah !== 9) {
            reserved.set(firstLn - 1, {
              n: firstLn - 1,
              type: "basmala",
              surah,
              words: basmalaWords.map((text, i) => ({
                wid: `${surah}.b.${i}`,
                text,
                surah,
                ayah: null,
                role: "letter",
              })),
            });
          }
        }
      }

      for (let n = 1; n <= 15; n++) {
        if (reserved.has(n)) {
          lines.push(reserved.get(n));
        } else if (lineWords.has(n)) {
          lines.push({ n, type: "ayah", words: lineWords.get(n) });
        }
      }
    }

    lines.sort((a, b) => a.n - b.n);

    const out = {
      page,
      ...(isSpecial && { special: true }),
      lines,
    };

    const file = join(pagesDir, `p${page}.json`);
    await writeFile(file, JSON.stringify(out));
    completed++;
    if (completed % 50 === 0 || page === 604) {
      console.log(`  ${completed}/${total} pages built`);
    }
    return { page, lineCount: lines.length, maxLine };
  }

  let idx = 1;
  async function worker() {
    while (idx <= 604) {
      const page = idx++;
      try {
        const r = await buildPage(page);
        results.push(r);
      } catch (e) {
        console.error(`Page ${page} FAILED: ${e.message}`);
        errors.push({ page, error: e.message });
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  if (errors.length) {
    console.error(`\n${errors.length} pages failed:`);
    for (const e of errors) console.error(`  Page ${e.page}: ${e.error}`);
    process.exit(1);
  }

  const p604Raw = await readFile(join(pagesDir, "p604.json"), "utf8");
  await writeFile(join(outDir, "page604.json"), p604Raw);
  console.log("Updated src/data/page604.json");

  console.log("\nSpot checks:");
  for (const p of [1, 2, 3, 50, 255, 582, 604]) {
    const r = results.find((x) => x.page === p);
    console.log(`  Page ${p}: ${r?.lineCount} lines, maxLine ${r?.maxLine}`);
  }

  console.log("\nAll 604 pages built successfully.");
}

main().catch((e) => { console.error(e); process.exit(1); });
