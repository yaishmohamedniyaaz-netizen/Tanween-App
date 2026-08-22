import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  SEARCH_THRESHOLD,
  activeGroupFor,
  groupRosterByDivision,
  isWaiting,
  matchesParticipantSearch,
  queueOrder,
  shouldOfferSearch,
  visibleRosterGroups,
} from "../src/lib/rosterQueue.ts";
import {
  participantContextLabel,
  participantNumberLabel,
} from "../src/lib/participantPresentation.ts";

const divisions = [
  { id: "d-young", name: "Under 8", ageGroup: "Under 8", category: "baliagen", quranPortion: {} },
  { id: "d-hifz", name: "Under 14", ageGroup: "Under 14", category: "nubalaa", quranPortion: {} },
];

const entry = (id, over = {}) => ({
  id,
  number: id.toUpperCase(),
  name: `Reciter ${id}`,
  ageGroup: "Under 8",
  category: "baliagen",
  muqarrar: "feshey-kolhu",
  phone: "",
  institution: "Hiriya School",
  judged: false,
  ...over,
});

test("the roster splits into the blocks a session is actually run in", () => {
  const groups = groupRosterByDivision(
    [
      entry("a"),
      entry("b", { ageGroup: "Under 14", category: "nubalaa" }),
      entry("c"),
    ],
    divisions,
  );
  assert.equal(groups.length, 2);
  assert.equal(groups[0].division.id, "d-young");
  assert.deepEqual(groups[0].entries.map((e) => e.id), ["a", "c"]);
  assert.equal(groups[1].division.id, "d-hifz");
});

test("groups appear in the order the roster calls them", () => {
  const groups = groupRosterByDivision(
    [entry("a", { ageGroup: "Under 14", category: "nubalaa" }), entry("b")],
    divisions,
  );
  assert.deepEqual(groups.map((g) => g.division.id), ["d-hifz", "d-young"]);
});

test("each block counts what is done and what is left", () => {
  const [group] = groupRosterByDivision(
    [entry("a", { judged: true }), entry("b"), entry("c")],
    divisions,
  );
  assert.equal(group.judged, 1);
  assert.equal(group.waiting, 2);
  assert.equal(group.entries.length, 3);
});

test("participants matching no division are kept, not dropped", () => {
  const groups = groupRosterByDivision(
    [entry("a"), entry("x", { ageGroup: "Under 21", category: "baliagen" })],
    divisions,
  );
  assert.equal(groups.length, 2);
  const orphan = groups.find((g) => !g.division);
  assert.ok(orphan, "an unmatched participant still has to be judged");
  assert.deepEqual(orphan.entries.map((e) => e.id), ["x"]);
  assert.equal(
    groups.reduce((n, g) => n + g.entries.length, 0),
    2,
    "the roster total on screen must match the roster",
  );
});

test("the active block is the one holding the current reciter", () => {
  const groups = groupRosterByDivision(
    [entry("a"), entry("b", { ageGroup: "Under 14", category: "nubalaa" })],
    divisions,
  );
  assert.equal(activeGroupFor(groups, "b").division.id, "d-hifz");
});

test("with nobody selected the active block is the first still waiting", () => {
  const groups = groupRosterByDivision(
    [
      entry("a", { judged: true }),
      entry("b", { ageGroup: "Under 14", category: "nubalaa" }),
    ],
    divisions,
  );
  assert.equal(activeGroupFor(groups, undefined).division.id, "d-hifz");
});

test("a finished roster still reports a block rather than nothing", () => {
  const groups = groupRosterByDivision([entry("a", { judged: true })], divisions);
  assert.equal(activeGroupFor(groups, undefined).division.id, "d-young");
});

test("an empty roster has no active block", () => {
  assert.equal(activeGroupFor([], undefined), undefined);
});

test("search covers number, name and school", () => {
  const e = entry("a", { number: "T042", name: "Ahmed Rasheed", institution: "Hiriya School" });
  assert.ok(matchesParticipantSearch(e, "t042"));
  assert.ok(matchesParticipantSearch(e, "rasheed"));
  assert.ok(matchesParticipantSearch(e, "hiriya"));
  assert.ok(!matchesParticipantSearch(e, "zayan"));
});

test("an empty search matches everyone", () => {
  assert.ok(matchesParticipantSearch(entry("a"), ""));
  assert.ok(matchesParticipantSearch(entry("a"), "   "));
});

test("search ignores case and stray spacing", () => {
  const e = entry("a", { name: "Mariyam Aisha" });
  assert.ok(matchesParticipantSearch(e, "  MARIYAM "));
});

test("ordinary participant numbers keep a two-digit minimum without roster-width padding", () => {
  assert.equal(participantNumberLabel("1", 8), "01");
  assert.equal(participantNumberLabel("01", 8), "01");
  assert.equal(participantNumberLabel("1", 100), "01");
  assert.equal(participantNumberLabel("104", 8), "104");
});

test("legacy alphanumeric participant numbers are preserved as entered", () => {
  assert.equal(participantNumberLabel("T001", 120), "T001");
  assert.equal(participantNumberLabel("", 8), "—");
});

test("participant context does not repeat a category already in the division name", () => {
  const hifz = entry("a", {
    ageGroup: "Under 14",
    category: "nubalaa",
    institution: "Hiriya School",
  });
  assert.equal(
    participantContextLabel(hifz, {
      ...divisions[1],
      name: "Under 14 Hifz",
    }),
    "Hiriya School · Under 14 · Nubalaa · Fesheykolhu",
  );
  assert.equal(
    participantContextLabel(hifz, divisions[1]),
    "Hiriya School · Under 14 · Nubalaa · Fesheykolhu",
  );
});

test("search filters entries but keeps the real group status totals", () => {
  const groups = groupRosterByDivision(
    [
      entry("recommended"),
      entry("match", { name: "Matching Reciter" }),
      entry("away", { name: "Another Reciter", absent: true }),
      entry("done", { name: "Finished Reciter", judged: true }),
    ],
    divisions,
  );
  const [visible] = visibleRosterGroups(groups, "recommended", "matching");
  assert.deepEqual(visible.entries.map((item) => item.id), ["match"]);
  assert.equal(visible.matchCount, 1);
  assert.equal(visible.waiting, 2);
  assert.equal(visible.absent, 1);
  assert.equal(visible.judged, 1);
});

test("search appears only once the queue outgrows the screen", () => {
  const small = Array.from({ length: SEARCH_THRESHOLD }, (_, i) => entry(`s${i}`));
  assert.equal(shouldOfferSearch(small), false);
  assert.equal(shouldOfferSearch([...small, entry("extra")]), true);
});

test("the running-order context stays fixed while only the participant list scrolls", () => {
  const styles = readFileSync(
    new URL("../src/styles/global.css", import.meta.url),
    "utf8",
  );
  assert.match(
    styles,
    /\.reciter-queue-summary,\s*\.next-reciter-row,\s*\.reciter-selection-screen \.queue-search\s*\{[\s\S]*?flex: 0 0 auto/,
  );
  assert.match(
    styles,
    /\.reciter-selection-screen \.queue-scroll\s*\{[\s\S]*?flex: 1 1 auto;[\s\S]*?overflow-y: auto/,
  );
});

test("somebody marked away is no longer waiting", () => {
  assert.equal(isWaiting(entry("a")), true);
  assert.equal(isWaiting(entry("a", { absent: true })), false);
  assert.equal(isWaiting(entry("a", { judged: true })), false);
});

test("a block counts waiting, away and judged separately", () => {
  const [group] = groupRosterByDivision(
    [
      entry("a", { judged: true }),
      entry("b", { absent: true }),
      entry("c"),
      entry("d"),
    ],
    divisions,
  );
  assert.equal(group.judged, 1);
  assert.equal(group.absent, 1);
  assert.equal(group.waiting, 2);
  assert.equal(group.entries.length, 4, "nobody is dropped from the block");
});

test("a block with only absent people left is no longer waiting on anyone", () => {
  const [group] = groupRosterByDivision(
    [entry("a", { judged: true }), entry("b", { absent: true })],
    divisions,
  );
  assert.equal(group.waiting, 0, "an absent reciter must not block the round");
});

test("the queue puts waiting first, then away, then judged", () => {
  const ordered = queueOrder([
    entry("judged", { judged: true }),
    entry("away", { absent: true }),
    entry("waiting"),
  ]);
  assert.deepEqual(ordered.map((e) => e.id), ["waiting", "away", "judged"]);
});

test("ordering is stable inside each state", () => {
  const ordered = queueOrder([entry("a"), entry("b"), entry("c")]);
  assert.deepEqual(ordered.map((e) => e.id), ["a", "b", "c"]);
});

test("marking somebody away never removes them from their block", () => {
  const roster = [entry("a", { absent: true }), entry("b")];
  const [group] = groupRosterByDivision(roster, divisions);
  assert.ok(
    group.entries.some((e) => e.id === "a"),
    "a latecomer has to still be reachable",
  );
});

test("the next block becomes active once everyone here is judged or away", () => {
  const groups = groupRosterByDivision(
    [
      entry("a", { judged: true }),
      entry("b", { absent: true }),
      entry("c", { ageGroup: "Under 14", category: "nubalaa" }),
    ],
    divisions,
  );
  assert.equal(activeGroupFor(groups, undefined).division.id, "d-hifz");
});
