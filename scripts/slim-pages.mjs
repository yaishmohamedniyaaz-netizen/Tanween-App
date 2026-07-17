import { readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(import.meta.url);
const pagesDir = join(here, "..", "..", "public", "pages");
const dataPage604 = join(here, "..", "..", "src", "data", "page604.json");

async function stripFile(file) {
  const raw = await readFile(file, "utf8");
  const data = JSON.parse(raw);
  delete data.generatedAt;
  delete data.totalLines;
  await writeFile(file, JSON.stringify(data));
  return file;
}

async function main() {
  const files = await readdir(pagesDir);
  const pageFiles = files.filter((f) => f.startsWith("p") && f.endsWith(".json"));

  console.log(`Stripping ${pageFiles.length} page files...`);
  const results = await Promise.all(
    pageFiles.map((f) => stripFile(join(pagesDir, f)))
  );
  console.log(`  Stripped ${results.length} files`);

  console.log("Stripping page604.json...");
  await stripFile(dataPage604);
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
