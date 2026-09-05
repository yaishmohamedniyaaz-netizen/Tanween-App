import fs from "node:fs";
import { judgingTargetsOf } from "../../src/lib/judgingUnits.ts";
const spans = new Set();
for (let page = 1; page <= 604; page++) {
  const data = JSON.parse(fs.readFileSync(new URL(`../../public/pages/p${page}.json`, import.meta.url), "utf8"));
  for (const line of data.lines) for (const word of line.words ?? []) {
    for (const target of judgingTargetsOf(word.text, word.role, word.wid)) spans.add(target.fullGlyph);
  }
}
fs.mkdirSync(new URL("../../outputs/", import.meta.url), { recursive: true });
fs.writeFileSync(new URL("../../outputs/tashkeel-targets.json", import.meta.url), JSON.stringify([...spans]));
console.log(`${spans.size} unique exact source spans prepared for browser fit check.`);
