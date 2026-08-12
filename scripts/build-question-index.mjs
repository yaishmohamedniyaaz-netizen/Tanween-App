import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const pagesDir = join(root, "public", "pages");
const outputFile = join(root, "public", "question-index.json");

const PAGE_COUNT = 604;
const EXPECTED_AYAH_COUNT = 6236;
const INDEX_VERSION = "qpc-v1-1405h-question-index-v1";
const SOURCE_VERSION = "v1-1405-r2";
const MUSHAF_LAYOUT = "KFGQPC V1 1405H";

function fail(message) {
  throw new Error(`Question index: ${message}`);
}

async function buildQuestionIndex() {
  const ayahs = new Map();
  let globalLine = 0;

  for (let pageNumber = 1; pageNumber <= PAGE_COUNT; pageNumber += 1) {
    const page = JSON.parse(
      await readFile(join(pagesDir, `p${pageNumber}.json`), "utf8"),
    );
    if (
      page.page !== pageNumber ||
      page.font !== "qcf-v1" ||
      page.layout !== MUSHAF_LAYOUT
    ) {
      fail(`page ${pageNumber} does not match the QPC V1 1405H contract`);
    }

    for (const line of page.lines ?? []) {
      if (line.type !== "ayah") continue;

      for (const word of line.words ?? []) {
        if (!Number.isInteger(word.surah) || !Number.isInteger(word.ayah)) {
          fail(`page ${pageNumber}, line ${line.n} contains an unaddressed word`);
        }
        if (word.role === "ornament") continue;

        const key = `${word.surah}:${word.ayah}`;
        const entry = ayahs.get(key) ?? {
          surah: word.surah,
          ayah: word.ayah,
          startPage: pageNumber,
          startLine: line.n,
          startGlobalLine: globalLine,
          endPage: pageNumber,
          endLine: line.n,
          endGlobalLine: globalLine,
          firstWordId: "",
          lastWordId: "",
          endMarkerId: "",
          markerCount: 0,
        };

        entry.endPage = pageNumber;
        entry.endLine = line.n;
        entry.endGlobalLine = globalLine;
        if (word.role === "ayah-end") {
          entry.markerCount += 1;
          entry.endMarkerId = word.wid;
        } else if (word.role === "letter") {
          if (!entry.firstWordId) entry.firstWordId = word.wid;
          entry.lastWordId = word.wid;
        } else {
          fail(`${key} contains unsupported role ${String(word.role)}`);
        }
        ayahs.set(key, entry);
      }

      globalLine += 1;
    }
  }

  if (ayahs.size !== EXPECTED_AYAH_COUNT) {
    fail(`expected ${EXPECTED_AYAH_COUNT} ayahs, found ${ayahs.size}`);
  }

  const ordered = [...ayahs.values()].sort(
    (left, right) => left.surah - right.surah || left.ayah - right.ayah,
  );
  for (const entry of ordered) {
    const key = `${entry.surah}:${entry.ayah}`;
    if (entry.markerCount !== 1) {
      fail(`${key} has ${entry.markerCount} semantic ayah endings`);
    }
    if (!entry.firstWordId || !entry.lastWordId || !entry.endMarkerId) {
      fail(`${key} is missing a word or marker anchor`);
    }
  }

  const entries = ordered.map((entry) => [
    entry.surah,
    entry.ayah,
    entry.startPage,
    entry.startLine,
    entry.startGlobalLine,
    entry.endPage,
    entry.endLine,
    entry.endGlobalLine,
    entry.firstWordId,
    entry.lastWordId,
    entry.endMarkerId,
  ]);
  const layoutHash = `sha256:${createHash("sha256")
    .update(JSON.stringify({ sourceVersion: SOURCE_VERSION, entries }))
    .digest("hex")}`;

  return {
    version: INDEX_VERSION,
    sourceVersion: SOURCE_VERSION,
    layout: MUSHAF_LAYOUT,
    layoutHash,
    pageCount: PAGE_COUNT,
    recitationLineCount: globalLine,
    entryCount: entries.length,
    entries,
  };
}

const asset = await buildQuestionIndex();
const serialized = `${JSON.stringify(asset)}\n`;
const mode = process.argv.includes("--write") ? "write" : "check";

if (mode === "write") {
  await writeFile(outputFile, serialized);
  console.log(
    `Wrote ${asset.entryCount} ayahs and ${asset.recitationLineCount} recitation lines to public/question-index.json`,
  );
} else {
  let existing;
  try {
    existing = await readFile(outputFile, "utf8");
  } catch {
    fail("public/question-index.json is missing; run npm run question-index");
  }
  if (existing !== serialized) {
    fail("generated asset is stale; run npm run question-index");
  }
  console.log(
    `Verified ${asset.entryCount} ayahs against ${asset.recitationLineCount} recitation lines`,
  );
}

