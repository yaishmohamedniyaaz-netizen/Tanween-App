import assert from "node:assert/strict";
import test from "node:test";
import { TARGET_RULE_VERSION } from "../src/lib/judgingUnits.ts";
import { borderQueue, readApproved, sessionsOf } from "./letter-masks/border-queue.mts";

const mark = (tid, page, extra = {}) => ({ tid, page, wordId: tid.split("@")[0], wordText: "w", ...extra });
const result = (session) => ({ app: "tahqeeq", schema: "judge-result-v2", session });

test("marked words are counted per record and per mark, most-marked first", () => {
  const queue = borderQueue([
    result({ id: "a", mistakes: [mark("2.5.3@r0", 2), mark("2.5.3@r3", 2), mark("3.1.0@r0", 50)] }),
    result({ id: "b", mistakes: [mark("3.1.0@r0", 50)] }),
  ]);
  assert.deepEqual(queue.map((w) => [w.wid, w.records, w.marks]), [["3.1.0", 2, 2], ["2.5.3", 1, 2]]);
  assert.deepEqual(queue[1].tids, ["2.5.3@r0", "2.5.3@r3"]);
});

test("the same record exported twice counts once, at its newest revision", () => {
  const queue = borderQueue([
    result({ id: "a", revision: 1, mistakes: [mark("4.1.0@r0", 77)] }),
    result({ id: "a", revision: 2, mistakes: [mark("4.1.1@r0", 77)] }),
  ]);
  assert.deepEqual(queue.map((w) => w.wid), ["4.1.1"]);
});

test("words with approved borders for today's rules are skipped; old-rule borders are not", () => {
  const files = [result({ id: "a", mistakes: [mark("2.5.3@r0", 2), mark("2.6.0@r0", 2)] })];
  const current = new Map([[2, { ruleVersion: TARGET_RULE_VERSION, words: { "2.5.3": {} } }]]);
  assert.deepEqual(borderQueue(files, current).map((w) => w.wid), ["2.6.0"]);
  const old = new Map([[2, { ruleVersion: "old", words: { "2.5.3": {} } }]]);
  assert.deepEqual(borderQueue(files, old).map((w) => w.wid), ["2.5.3", "2.6.0"]);
});

test("phrase evidence and marks without a page are ignored", () => {
  const queue = borderQueue([result({ id: "a", mistakes: [
    mark("phrase.bismillah.0@r0", 1, { evidenceKind: "phrase" }),
    { tid: "5.1.0@r0" },
  ] })]);
  assert.deepEqual(queue, []);
});

test("state backups give their saved records and the live session", () => {
  const backup = { schema: "state-backup-v2", state: {
    history: [{ id: "a", mistakes: [mark("6.1.0@r0", 128)] }],
    mistakes: [mark("6.1.1@r0", 128)],
  } };
  assert.equal(sessionsOf(backup).length, 2);
  assert.deepEqual(sessionsOf({ schema: "other" }), []);
  assert.deepEqual(borderQueue([backup]).map((w) => w.wid), ["6.1.0", "6.1.1"]);
});

test("the shipped approved borders load and use today's rules", () => {
  const approved = readApproved("public/letter-borders");
  assert.ok(approved.size > 0);
  for (const page of approved.values()) assert.equal(page.ruleVersion, TARGET_RULE_VERSION);
});
