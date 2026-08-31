export interface TilawaWordProgress {
  surah: number;
  ayah: number;
  word_index: number;
  total_words: number;
  matched_indices?: number[];
}

export interface TilawaVerseMatch {
  surah: number;
  ayah: number;
  confidence: number;
}

export interface TilawaPassageRange {
  startAyah: { surah: number; ayah: number };
  endAyah: { surah: number; ayah: number };
}

export interface TilawaCursorState<TVerse extends TilawaVerseMatch = TilawaVerseMatch> {
  candidate: TVerse | null;
  confirmedVerse: TVerse | null;
  confirmedWordIndex: number;
}

export interface TilawaCursorUpdate<TVerse extends TilawaVerseMatch = TilawaVerseMatch> {
  state: TilawaCursorState<TVerse>;
  confirmedVerse?: TVerse;
  confirmedProgress?: TilawaWordProgress;
}

const MIN_VERSE_CONFIDENCE = 0.72;
const HIGH_VERSE_CONFIDENCE = 0.88;
const MAX_WORD_ADVANCE = 2;

export function initialTilawaCursorState<
  TVerse extends TilawaVerseMatch = TilawaVerseMatch,
>(): TilawaCursorState<TVerse> {
  return {
    candidate: null,
    confirmedVerse: null,
    confirmedWordIndex: -1,
  };
}

function compareRef(
  left: { surah: number; ayah: number },
  right: { surah: number; ayah: number },
): number {
  if (left.surah !== right.surah) return left.surah - right.surah;
  return left.ayah - right.ayah;
}

function sameRef(
  left: { surah: number; ayah: number } | null,
  right: { surah: number; ayah: number },
): boolean {
  return Boolean(
    left && left.surah === right.surah && left.ayah === right.ayah,
  );
}

function isInsidePassage(
  ref: { surah: number; ayah: number },
  passage?: TilawaPassageRange | null,
): boolean {
  if (!passage) return true;
  return compareRef(ref, passage.startAyah) >= 0 &&
    compareRef(ref, passage.endAyah) <= 0;
}

function isImmediateContinuation(
  current: { surah: number; ayah: number },
  next: { surah: number; ayah: number },
): boolean {
  return (
    (next.surah === current.surah && next.ayah === current.ayah + 1) ||
    (next.surah === current.surah + 1 && next.ayah === 1)
  );
}

function validMatchedIndices(progress: TilawaWordProgress): number[] {
  const totalWords = Number.isInteger(progress.total_words)
    ? progress.total_words
    : 0;
  return [...new Set(progress.matched_indices ?? [])]
    .filter((index) => Number.isInteger(index) && index >= 0 && index < totalWords)
    .sort((left, right) => left - right);
}

export function observeTilawaVerse<
  TVerse extends TilawaVerseMatch,
>(
  state: TilawaCursorState<TVerse>,
  match: TVerse,
  passage?: TilawaPassageRange | null,
): TilawaCursorState<TVerse> {
  if (
    !Number.isFinite(match.confidence) ||
    match.confidence < MIN_VERSE_CONFIDENCE ||
    !isInsidePassage(match, passage)
  ) {
    return state;
  }

  if (
    state.confirmedVerse &&
    !sameRef(state.confirmedVerse, match) &&
    !isImmediateContinuation(state.confirmedVerse, match)
  ) {
    return state;
  }

  return { ...state, candidate: match };
}

export function observeTilawaProgress<
  TVerse extends TilawaVerseMatch,
>(
  state: TilawaCursorState<TVerse>,
  progress: TilawaWordProgress,
  passage?: TilawaPassageRange | null,
): TilawaCursorUpdate<TVerse> {
  const candidate = state.candidate;
  if (
    !candidate ||
    !sameRef(candidate, progress) ||
    !isInsidePassage(progress, passage) ||
    !Number.isInteger(progress.word_index) ||
    !Number.isInteger(progress.total_words) ||
    progress.word_index < 1 ||
    progress.total_words < 1 ||
    progress.word_index > progress.total_words
  ) {
    return { state };
  }

  const matched = validMatchedIndices(progress);
  if (matched.length === 0) return { state };

  const verseChanged = !sameRef(state.confirmedVerse, candidate);
  const previousWord = verseChanged ? -1 : state.confirmedWordIndex;
  const targetWord = progress.word_index - 1;
  if (targetWord <= previousWord) return { state };

  const startsNearExpectedWord = matched[0] <= previousWord + 2;
  const enoughInitialEvidence = candidate.confidence >= HIGH_VERSE_CONFIDENCE
    ? matched[0] <= 1
    : matched[0] <= 1 && matched.length >= 2;
  const enoughContinuingEvidence =
    startsNearExpectedWord &&
    (targetWord === previousWord + 1 || matched.length >= 2);

  if (
    (verseChanged && !enoughInitialEvidence) ||
    (!verseChanged && !enoughContinuingEvidence)
  ) {
    return { state };
  }

  const confirmedWordIndex = Math.min(
    targetWord,
    previousWord + MAX_WORD_ADVANCE,
  );
  const confirmedProgress: TilawaWordProgress = {
    ...progress,
    word_index: confirmedWordIndex + 1,
    matched_indices: matched.filter((index) => index <= confirmedWordIndex),
  };
  const nextState: TilawaCursorState<TVerse> = {
    candidate,
    confirmedVerse: candidate,
    confirmedWordIndex,
  };

  return {
    state: nextState,
    confirmedVerse: verseChanged ? candidate : undefined,
    confirmedProgress,
  };
}

// Tilawa's text tokens join "ba'da ma" in three ayahs where Tahqeeq's
// authoritative Mushaf data keeps the two printed words separate. Once that
// joined token is reached, the printed-word address is one position later.
const PRINTED_WORD_SPLITS = new Map<string, number>([
  ["2:181", 2],
  ["8:6", 3],
  ["13:37", 7],
]);

export function tilawaMushafWordId(
  progress: TilawaWordProgress,
): string | null {
  if (
    !Number.isInteger(progress.surah) ||
    !Number.isInteger(progress.ayah) ||
    !Number.isInteger(progress.word_index) ||
    progress.surah < 1 ||
    progress.ayah < 1 ||
    progress.word_index < 1
  ) {
    return null;
  }

  // word_index is a one-based progress count. Its preceding position is the
  // zero-based index of the latest word Tilawa heard.
  let printedIndex = progress.word_index - 1;

  // Except for Al-Fatihah and At-Tawbah, Tilawa includes the four Bismillah
  // words at the front of ayah 1. Tahqeeq stores those on the separate
  // "<surah>.b.<index>" Mushaf line.
  if (progress.ayah === 1 && progress.surah !== 1 && progress.surah !== 9) {
    if (printedIndex < 4) return `${progress.surah}.b.${printedIndex}`;
    printedIndex -= 4;
  }

  const splitAt = PRINTED_WORD_SPLITS.get(`${progress.surah}:${progress.ayah}`);
  if (splitAt !== undefined && printedIndex >= splitAt) printedIndex += 1;

  return `${progress.surah}.${progress.ayah}.${printedIndex}`;
}
