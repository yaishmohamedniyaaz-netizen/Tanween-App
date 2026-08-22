import type { MuqarrarSide, QuestionDeck, QuestionDrawRecord } from "../types";
import { normalizeMuqarrarSide } from "./participants.ts";

/**
 * Bump when the shuffle or the scope key changes. A deck records the version
 * that produced it, so an old deck is never re-derived with new rules and
 * quietly comes out different.
 */
export const DECK_GENERATOR_VERSION = 1;

/**
 * Positions on a board. Twenty is the figure in the product foundation; a
 * division with fewer checked questions simply gets a shorter board.
 */
export const DRAW_BOARD_SIZE = 20;

/**
 * A deck belongs to one division *and* one muqarrar side. Questions are
 * approved for a side, so a single board per division could hand a reciter a
 * number they are not eligible for — which would be visible to the hall as a
 * re-draw and would defeat the point of the board.
 */
export function deckScopeKey(
  competitionId: string,
  divisionId: string,
  muqarrar: Exclude<MuqarrarSide, "">,
): string {
  return `${competitionId}␟${divisionId}␟${muqarrar}`;
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Identifies the exact pool a deck was cut from. Order-independent, so
 * reordering drafts in the builder does not read as a changed pool — only
 * adding, removing or renaming a question does.
 */
export function candidateFingerprint(questionIds: string[]): string {
  return fnv1a([...questionIds].sort().join("␞"));
}

/** Deterministic PRNG. Same seed, same board, on any device, forever. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedNumber(seed: string): number {
  return parseInt(fnv1a(seed), 36) >>> 0;
}

/**
 * Freezes a board: the questions are fixed, and only their positions are
 * shuffled. Positions are what the reciter points at; the question behind a
 * position never changes once the deck is cut.
 *
 * Pass fewer questions than `size` and the deck is simply that short — a
 * padded board would show numbers with nothing behind them.
 */
export function buildDeck(input: {
  competitionId: string;
  divisionId: string;
  muqarrar: Exclude<MuqarrarSide, "">;
  questionIds: string[];
  seed: string;
  size: number;
  frozenAt: number;
  cycle?: number;
}): QuestionDeck {
  const pool = [...input.questionIds];
  const random = mulberry32(seedNumber(input.seed));

  // Fisher-Yates, drawing from the seeded stream so the order is reproducible.
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const taken = pool.slice(0, Math.max(0, Math.min(input.size, pool.length)));

  return {
    version: 2,
    generatorVersion: DECK_GENERATOR_VERSION,
    competitionId: input.competitionId,
    divisionId: input.divisionId,
    muqarrar: input.muqarrar,
    seed: input.seed,
    cycle: Math.max(1, Math.floor(input.cycle ?? 1)),
    candidateFingerprint: candidateFingerprint(input.questionIds),
    frozenAt: input.frozenAt,
    tiles: taken.map((questionId, index) => ({
      position: index + 1,
      questionId,
    })),
  };
}

export function deckCycle(deck: Pick<QuestionDeck, "cycle">): number {
  return Math.max(1, Math.floor(Number(deck.cycle) || 1));
}

/** Makes persisted V1 boards explicit without ever re-cutting their tiles. */
export function normalizeQuestionDeck(
  value: Partial<QuestionDeck>,
): QuestionDeck | null {
  const normalizedMuqarrar = normalizeMuqarrarSide(value.muqarrar);
  if (
    (value.version !== 1 && value.version !== 2) ||
    !Number.isInteger(value.generatorVersion) ||
    !value.competitionId ||
    !value.divisionId ||
    !normalizedMuqarrar ||
    !value.seed ||
    !value.candidateFingerprint ||
    !Number.isFinite(value.frozenAt) ||
    !Array.isArray(value.tiles)
  ) {
    return null;
  }
  const tiles = value.tiles
    .filter(
      (tile) =>
        Number.isInteger(tile?.position) &&
        Number(tile.position) > 0 &&
        Boolean(tile?.questionId),
    )
    .map((tile) => ({
      position: Number(tile.position),
      questionId: String(tile.questionId),
    }));
  if (
    new Set(tiles.map((tile) => tile.position)).size !== tiles.length ||
    new Set(tiles.map((tile) => tile.questionId)).size !== tiles.length
  ) {
    return null;
  }
  return {
    version: 2,
    generatorVersion: Number(value.generatorVersion),
    competitionId: String(value.competitionId),
    divisionId: String(value.divisionId),
    muqarrar: normalizedMuqarrar,
    seed: String(value.seed),
    cycle: deckCycle(value),
    candidateFingerprint: String(value.candidateFingerprint),
    frozenAt: Number(value.frozenAt),
    tiles,
  };
}

/** Preserves legacy draw evidence while adding stable replacement links. */
export function normalizeQuestionDrawRecord(
  value: Partial<QuestionDrawRecord>,
): QuestionDrawRecord | null {
  if (
    (value.version !== 1 && value.version !== 2) ||
    !value.competitionId ||
    !value.scopeKey ||
    !value.seed ||
    !Number.isInteger(value.position) ||
    Number(value.position) < 1 ||
    !value.questionId ||
    !value.participantId ||
    !Number.isFinite(value.revealedAt)
  ) {
    return null;
  }
  const cycle = Math.max(1, Math.floor(Number(value.cycle) || 1));
  const id =
    String(value.id ?? "").trim() ||
    `draw:${value.seed}:${value.position}:${value.participantId}:${value.revealedAt}`;
  return {
    version: 2,
    id,
    competitionId: String(value.competitionId),
    scopeKey: String(value.scopeKey),
    seed: String(value.seed),
    cycle,
    position: Number(value.position),
    questionId: String(value.questionId),
    participantId: String(value.participantId),
    revealedAt: Number(value.revealedAt),
    ...(value.replacesDrawId
      ? { replacesDrawId: String(value.replacesDrawId) }
      : {}),
  };
}

export function latestDeckForScope(
  decks: QuestionDeck[],
  competitionId: string,
  divisionId: string,
  muqarrar: Exclude<MuqarrarSide, "">,
): QuestionDeck | null {
  const key = deckScopeKey(competitionId, divisionId, muqarrar);
  return (
    decks
      .filter(
        (deck) =>
          deckScopeKey(deck.competitionId, deck.divisionId, deck.muqarrar) === key,
      )
      .sort((left, right) => {
        const cycleDifference = deckCycle(right) - deckCycle(left);
        return cycleDifference || right.frozenAt - left.frozenAt;
      })[0] ?? null
  );
}

/**
 * True when the pool a deck was cut from has since changed. A frozen deck is
 * never silently re-cut — the organiser is told, because re-cutting mid-round
 * would change what an unrevealed number means.
 */
export function deckIsStale(deck: QuestionDeck, questionIds: string[]): boolean {
  return (
    deck.generatorVersion !== DECK_GENERATOR_VERSION ||
    deck.candidateFingerprint !== candidateFingerprint(questionIds)
  );
}

/** Positions already drawn in this deck. A drawn number is spent for the session. */
export function spentPositions(
  draws: QuestionDrawRecord[],
  deck: QuestionDeck,
): Set<number> {
  const key = deckScopeKey(deck.competitionId, deck.divisionId, deck.muqarrar);
  const spent = new Set<number>();
  for (const draw of draws) {
    if (draw.scopeKey === key && draw.seed === deck.seed) {
      spent.add(draw.position);
    }
  }
  return spent;
}

/** Positions still available to the next reciter. */
export function availablePositions(
  deck: QuestionDeck,
  draws: QuestionDrawRecord[],
): number[] {
  const spent = spentPositions(draws, deck);
  return deck.tiles
    .map((tile) => tile.position)
    .filter((position) => !spent.has(position));
}

/**
 * The question behind a position. Deliberately the only way to get it: the
 * board renders positions alone, and nothing resolves a question until the
 * organiser presses a number.
 */
export function questionAtPosition(
  deck: QuestionDeck,
  position: number,
): string | null {
  return deck.tiles.find((tile) => tile.position === position)?.questionId ?? null;
}

/**
 * Whether a deck can still serve a reciter. An exhausted deck must stop the
 * round rather than reuse a passage — a quiet repeat is exactly the unfairness
 * a frozen set exists to prevent.
 */
export function deckExhausted(
  deck: QuestionDeck,
  draws: QuestionDrawRecord[],
): boolean {
  return availablePositions(deck, draws).length === 0;
}
