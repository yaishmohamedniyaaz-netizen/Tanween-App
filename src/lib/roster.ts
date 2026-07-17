// Roster sheet parsing (.xlsx / .csv) via SheetJS.
// Note: files are judge-supplied competition rosters, not untrusted uploads.
// SheetJS is heavy (~400KB) — loaded on demand, only when a file is uploaded.
import type { RosterEntry } from "../types";

type Row = Record<string, unknown>;

const norm = (s: string) => s.trim().toLowerCase().replace(/[\s_.-]+/g, "");

function pick(row: Row, aliases: string[]): string {
  for (const key of Object.keys(row)) {
    if (aliases.includes(norm(key))) {
      const v = row[key];
      if (v === null || v === undefined) return "";
      return String(v).trim();
    }
  }
  return "";
}

/** Parse an uploaded roster file. Header row: Name (required) + optional
 *  Number / Island / Class (or Group). Throws with a friendly message. */
export async function parseRosterFile(file: File): Promise<RosterEntry[]> {
  const { read, utils } = await import("xlsx");
  // CSV: read as text so the browser decodes UTF-8 (SheetJS assumes cp1252
  // for raw CSV bytes, which mangles names like "Malé").
  const wb = /\.csv$/i.test(file.name)
    ? read(await file.text(), { type: "string" })
    : read(await file.arrayBuffer());
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error("The file has no sheets.");
  const rows = utils.sheet_to_json<Row>(sheet, { defval: "", raw: false });
  if (!rows.length) throw new Error("The sheet is empty.");

  const entries: RosterEntry[] = [];
  for (const row of rows) {
    const name = pick(row, ["name", "reciter", "participant", "fullname"]);
    if (!name) continue;
    const island = pick(row, ["island", "atoll"]);
    const klass = pick(row, ["class", "school", "group"]);
    entries.push({
      name,
      number: pick(row, ["number", "no", "num", "id", "#"]),
      group: [island, klass].filter(Boolean).join(" · "),
      judged: false,
    });
  }
  if (!entries.length) {
    throw new Error(
      'No names found — the sheet needs a "Name" column with a header row.',
    );
  }
  return entries;
}
