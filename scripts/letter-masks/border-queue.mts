/**
 * "Map on demand": which marked words still need owner-approved letter borders.
 *
 * Input: exported judge result packages and/or state backups (the JSON files
 * the app already exports). Output: the marked words that have no approved
 * border for today's letter rules, most-marked first. Nothing here changes a
 * record; it only reads them.
 *
 * Usage (from the repo root):
 *   node --experimental-strip-types scripts/letter-masks/border-queue.mts \
 *     results/*.json > border-queue.json
 */
import fs from "node:fs";
import path from "node:path";
import { TARGET_RULE_VERSION } from "../../src/lib/judgingUnits.ts";

export interface QueueWord {
  wid: string;
  page: number;
  text: string;
  /** Number of separate judge records that marked this word. */
  records: number;
  /** Total marks on this word, across all records. */
  marks: number;
  /** Letter targets that were marked, in first-seen order. */
  tids: string[];
}

type Approved = Map<number, { ruleVersion: string; words: Record<string, unknown> }>;

interface AnyMistake {
  tid?: string;
  wordId?: string;
  wordText?: string;
  page?: number;
  evidenceKind?: string;
}

interface AnySession {
  id?: string;
  revision?: number;
  mistakes?: AnyMistake[];
}

/** Judge records inside one exported file (judge result or state backup). */
export function sessionsOf(file: unknown): AnySession[] {
  if (!file || typeof file !== "object") return [];
  const value = file as { schema?: string; session?: AnySession; state?: { history?: AnySession[]; mistakes?: AnyMistake[] } };
  if (typeof value.schema !== "string") return [];
  if (value.schema.startsWith("judge-result-") && value.session) return [value.session];
  if (value.schema.startsWith("state-backup-") && value.state) {
    const live = value.state.mistakes?.length ? [{ id: "live-session", mistakes: value.state.mistakes }] : [];
    return [...(value.state.history ?? []), ...live];
  }
  return [];
}

/** Keep one copy of each record: the highest revision wins. */
function latestRecords(sessions: AnySession[]): AnySession[] {
  const byId = new Map<string, AnySession>();
  const anonymous: AnySession[] = [];
  for (const session of sessions) {
    if (!session.id) { anonymous.push(session); continue; }
    const seen = byId.get(session.id);
    if (!seen || (session.revision ?? 0) > (seen.revision ?? 0)) byId.set(session.id, session);
  }
  return [...byId.values(), ...anonymous];
}

function hasBorder(approved: Approved, page: number, wid: string): boolean {
  const data = approved.get(page);
  return !!data && data.ruleVersion === TARGET_RULE_VERSION && wid in data.words;
}

export function borderQueue(files: unknown[], approved: Approved = new Map()): QueueWord[] {
  const words = new Map<string, QueueWord & { seenIn: Set<AnySession> }>();
  for (const session of latestRecords(files.flatMap(sessionsOf))) {
    for (const mistake of session.mistakes ?? []) {
      if (mistake.evidenceKind === "phrase" || !mistake.tid || typeof mistake.page !== "number") continue;
      const wid = mistake.wordId ?? mistake.tid.split("@")[0];
      if (!wid || hasBorder(approved, mistake.page, wid)) continue;
      let word = words.get(wid);
      if (!word) {
        word = { wid, page: mistake.page, text: mistake.wordText ?? "", records: 0, marks: 0, tids: [], seenIn: new Set() };
        words.set(wid, word);
      }
      word.marks += 1;
      if (!word.seenIn.has(session)) { word.seenIn.add(session); word.records += 1; }
      if (!word.tids.includes(mistake.tid)) word.tids.push(mistake.tid);
      if (!word.text && mistake.wordText) word.text = mistake.wordText;
    }
  }
  return [...words.values()]
    .map(({ seenIn: _seenIn, ...word }) => word)
    .sort((a, b) => b.records - a.records || b.marks - a.marks || a.page - b.page || a.wid.localeCompare(b.wid, "en", { numeric: true }));
}

export function readApproved(dir: string): Approved {
  const approved: Approved = new Map();
  const indexPath = path.join(dir, "index.json");
  if (!fs.existsSync(indexPath)) return approved;
  for (const page of (JSON.parse(fs.readFileSync(indexPath, "utf8")).pages ?? []) as number[]) {
    approved.set(page, JSON.parse(fs.readFileSync(path.join(dir, `p${page}.json`), "utf8")));
  }
  return approved;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const inputs = process.argv.slice(2);
  if (!inputs.length) {
    console.error("usage: border-queue.mts <exported .json files...>");
    process.exit(1);
  }
  const files = inputs.map((file) => JSON.parse(fs.readFileSync(file, "utf8")));
  const queue = borderQueue(files, readApproved("public/letter-borders"));
  const pages = [...new Set(queue.map((word) => word.page))].sort((a, b) => a - b);
  console.log(JSON.stringify({ ruleVersion: TARGET_RULE_VERSION, pages, words: queue }, null, 1));
  console.error(`${queue.length} marked words without approved borders, on ${pages.length} pages`);
}
