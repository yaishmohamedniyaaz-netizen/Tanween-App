import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  DECK_GENERATOR_VERSION,
  availablePositions,
  buildDeck,
  candidateFingerprint,
  deckCycle,
  deckExhausted,
  deckIsStale,
  deckScopeKey,
  latestDeckForScope,
  normalizeQuestionDeck,
  normalizeQuestionDrawRecord,
  questionAtPosition,
  spentPositions,
} from "../src/lib/questionDeck.ts";

const ids = (n) => Array.from({ length: n }, (_, i) => `q-${i + 1}`);

const cut = (over = {}) =>
  buildDeck({
    competitionId: "comp-1",
    divisionId: "div-1",
    muqarrar: "feshey-kolhu",
    questionIds: ids(20),
    seed: "seed-alpha",
    size: 20,
    frozenAt: 1000,
    ...over,
  });

const drawOf = (deck, position, participantId = "p-1") => ({
  version: 1,
  competitionId: deck.competitionId,
  scopeKey: deckScopeKey(deck.competitionId, deck.divisionId, deck.muqarrar),
  seed: deck.seed,
  position,
  questionId: questionAtPosition(deck, position),
  participantId,
  revealedAt: 2000,
});

test("the same seed cuts the same board every time", () => {
  assert.deepEqual(cut().tiles, cut().tiles);
});

test("a different seed cuts a different board", () => {
  assert.notDeepEqual(cut().tiles, cut({ seed: "seed-beta" }).tiles);
});

test("shuffling moves positions without inventing or losing questions", () => {
  const deck = cut();
  assert.deepEqual([...deck.tiles.map((t) => t.questionId)].sort(), [...ids(20)].sort());
  assert.deepEqual(
    deck.tiles.map((t) => t.position),
    Array.from({ length: 20 }, (_, i) => i + 1),
  );
});

test("positions really are shuffled, not left in pool order", () => {
  const deck = cut();
  const inOrder = deck.tiles.every((t, i) => t.questionId === `q-${i + 1}`);
  assert.equal(inOrder, false, "a board in pool order would leak the pool order");
});

test("a deck records what it needs to be reconstructed", () => {
  const deck = cut();
  assert.equal(deck.seed, "seed-alpha");
  assert.equal(deck.generatorVersion, DECK_GENERATOR_VERSION);
  assert.equal(deck.candidateFingerprint, candidateFingerprint(ids(20)));
  assert.equal(deck.frozenAt, 1000);
  assert.equal(deck.version, 2);
  assert.equal(deckCycle(deck), 1);
});

test("a completed board advances to a separately recorded cycle", () => {
  const first = cut({ seed: "cycle-1", cycle: 1 });
  const second = cut({ seed: "cycle-2", cycle: 2, frozenAt: 2000 });
  assert.equal(
    latestDeckForScope(
      [first, second],
      first.competitionId,
      first.divisionId,
      first.muqarrar,
    )?.seed,
    "cycle-2",
  );
  assert.equal(deckCycle(second), 2);
  assert.notDeepEqual(first.tiles, second.tiles);
});

test("legacy boards and draws gain cycle-one identity without changing evidence", () => {
  const deck = cut();
  const normalizedDeck = normalizeQuestionDeck({ ...deck, version: 1, cycle: undefined });
  assert.equal(normalizedDeck?.cycle, 1);
  assert.deepEqual(normalizedDeck?.tiles, deck.tiles);

  const legacy = drawOf(deck, 4);
  const normalizedDraw = normalizeQuestionDrawRecord(legacy);
  assert.equal(normalizedDraw?.version, 2);
  assert.equal(normalizedDraw?.cycle, 1);
  assert.match(normalizedDraw?.id ?? "", /^draw:/);
  assert.equal(normalizedDraw?.questionId, legacy.questionId);
});

test("a replacement draw links to the revealed draw instead of overwriting it", () => {
  const deck = cut();
  const first = normalizeQuestionDrawRecord({
    ...drawOf(deck, 4),
    version: 2,
    id: "draw-first",
  });
  const replacement = normalizeQuestionDrawRecord({
    ...drawOf(deck, 9),
    version: 2,
    id: "draw-replacement",
    revealedAt: 3000,
    replacesDrawId: "draw-first",
  });
  assert.equal(first?.position, 4);
  assert.equal(replacement?.position, 9);
  assert.equal(replacement?.replacesDrawId, "draw-first");
});

test("a smaller pool gives a shorter board, never padded blanks", () => {
  const deck = cut({ questionIds: ids(6) });
  assert.equal(deck.tiles.length, 6);
  assert.ok(deck.tiles.every((t) => t.questionId));
});

test("a larger pool is trimmed to the board size", () => {
  const deck = cut({ questionIds: ids(50), size: 20 });
  assert.equal(deck.tiles.length, 20);
  assert.equal(new Set(deck.tiles.map((t) => t.questionId)).size, 20);
});

test("the fingerprint ignores pool order but catches a changed pool", () => {
  assert.equal(candidateFingerprint(["a", "b"]), candidateFingerprint(["b", "a"]));
  assert.notEqual(candidateFingerprint(["a", "b"]), candidateFingerprint(["a", "c"]));
});

test("a deck goes stale when its pool changes underneath it", () => {
  const deck = cut();
  assert.equal(deckIsStale(deck, ids(20)), false);
  assert.equal(deckIsStale(deck, ids(21)), true, "an added question must be noticed");
  assert.equal(deckIsStale(deck, ids(19)), true, "a removed question must be noticed");
});

test("a deck cut by an older generator is stale", () => {
  const deck = { ...cut(), generatorVersion: DECK_GENERATOR_VERSION - 1 };
  assert.equal(deckIsStale(deck, ids(20)), true);
});

test("divisions and muqarrar sides never share a board", () => {
  const a = deckScopeKey("comp-1", "div-1", "feshey-kolhu");
  assert.notEqual(a, deckScopeKey("comp-1", "div-1", "nimey-kolhu"));
  assert.notEqual(a, deckScopeKey("comp-1", "div-2", "feshey-kolhu"));
  assert.notEqual(a, deckScopeKey("comp-2", "div-1", "feshey-kolhu"));
});

test("a drawn number is spent for the rest of the session", () => {
  const deck = cut();
  const draws = [drawOf(deck, 7)];
  assert.deepEqual([...spentPositions(draws, deck)], [7]);
  assert.equal(availablePositions(deck, draws).includes(7), false);
  assert.equal(availablePositions(deck, draws).length, 19);
});

test("another division's draws do not spend this board", () => {
  const deck = cut();
  const other = cut({ divisionId: "div-2" });
  assert.equal(spentPositions([drawOf(other, 7)], deck).size, 0);
});

test("draws from a re-cut deck do not spend the new one", () => {
  const deck = cut();
  const recut = cut({ seed: "seed-beta" });
  assert.equal(spentPositions([drawOf(deck, 3)], recut).size, 0);
});

test("a position resolves to exactly one question", () => {
  const deck = cut();
  const q = questionAtPosition(deck, 5);
  assert.ok(q);
  assert.equal(questionAtPosition(deck, 5), q, "a position must never move");
});

test("a position outside the board resolves to nothing", () => {
  const deck = cut();
  assert.equal(questionAtPosition(deck, 0), null);
  assert.equal(questionAtPosition(deck, 21), null);
});

test("the board is exhausted only once every number is spent", () => {
  const deck = cut({ questionIds: ids(3), size: 3 });
  const draws = [drawOf(deck, 1), drawOf(deck, 2)];
  assert.equal(deckExhausted(deck, draws), false);
  assert.equal(deckExhausted(deck, [...draws, drawOf(deck, 3)]), true);
});

test("no two positions hold the same question", () => {
  const deck = cut();
  const questions = deck.tiles.map((t) => t.questionId);
  assert.equal(new Set(questions).size, questions.length);
});

test("an empty pool produces an empty, immediately exhausted board", () => {
  const deck = cut({ questionIds: [] });
  assert.deepEqual(deck.tiles, []);
  assert.equal(deckExhausted(deck, []), true);
});

test("the board renders positions and nothing that names a passage", () => {
  const source = readFileSync(
    new URL("../src/components/QuestionNumberScreen.tsx", import.meta.url),
    "utf8",
  );
  const board = source.slice(
    source.indexOf('<div className="draw-board"'),
    source.indexOf("</div>", source.indexOf('<div className="draw-board"')),
  );
  assert.ok(board.length > 0, "the draw board should exist");
  for (const leak of ["questionRangeLabel", "startPage", "endPage", "resolvedLines", "draft.note"]) {
    assert.doesNotMatch(
      board,
      new RegExp(leak),
      `the board must not render ${leak} — an unpressed number gives nothing away`,
    );
  }
  assert.match(board, /tile\.position/, "the board renders positions");
});

test("a position is only resolved to a question when one is pressed", () => {
  const source = readFileSync(
    new URL("../src/components/StartDialog.tsx", import.meta.url),
    "utf8",
  );
  const calls = source.match(/questionAtPosition\(/g) ?? [];
  assert.equal(calls.length, 1, "exactly one call site, inside the press handler");
  const handler = source.slice(source.indexOf("const drawPosition ="));
  assert.match(handler.slice(0, 400), /questionAtPosition\(deck, position\)/);
});

test("a missing judge assignment cannot reveal or spend a question", () => {
  const startSource = readFileSync(
    new URL("../src/components/StartDialog.tsx", import.meta.url),
    "utf8",
  );
  const questionSource = readFileSync(
    new URL("../src/components/QuestionNumberScreen.tsx", import.meta.url),
    "utf8",
  );
  const handler = startSource.slice(
    startSource.indexOf("const drawPosition ="),
    startSource.indexOf("const rosterGroups ="),
  );
  const assignmentGuard = handler.indexOf("!assignment");
  const recordDispatch = handler.indexOf('type: "RECORD_DRAW"');

  assert.ok(assignmentGuard >= 0, "the draw handler checks the assignment");
  assert.ok(
    assignmentGuard < recordDispatch,
    "the assignment is checked before RECORD_DRAW is dispatched",
  );
  assert.match(startSource, /selectionDisabled=\{!assignment\}/);
  assert.match(questionSource, /disabled=\{Boolean\(blockedReason\) \|\| \(spent && !mine\)\}/);
  assert.match(questionSource, /className="draw-external"\s+disabled=\{Boolean\(blockedReason\)\}/);
});
