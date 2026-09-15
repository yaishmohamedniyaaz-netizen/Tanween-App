/** Provisional CTC emission locations, not verified spoken-word boundaries. */
export interface HeardWord {
  text: string;
  startFrame: number;
  endFrame: number;
}
export interface ReferenceWord {
  text: string;
  wordIds: string[];
}
export interface ReplayReferenceAyah { surah: number; ayah: number; words: ReferenceWord[] }

/** Preserve excluded words and missing ayahs as context barriers. */
export function contiguousReplayReferences(verses: readonly ReplayReferenceAyah[]): ReferenceWord[][] {
  const spans: ReferenceWord[][] = [];
  let current: ReferenceWord[] = [];
  let previous: ReplayReferenceAyah | undefined;
  const flush = () => { if (current.length) spans.push(current); current = []; };
  for (const verse of verses) {
    if (previous && (verse.surah !== previous.surah || verse.ayah !== previous.ayah + 1)) flush();
    if (!verse.words.length) flush();
    for (const word of verse.words) {
      if (!word.wordIds.length || !word.text.trim()) flush();
      else current.push(word);
    }
    previous = verse;
  }
  flush();
  return spans;
}

/** Exact-context suggestions only, not verified audible onsets. */
export function matchReplayContext(heard: HeardWord[], references: readonly ReplayReferenceAyah[], frames: number, duration: number) {
  return matchReplayAnchors(heard, contiguousReplayReferences(references), frames, duration);
}
export interface ReplaySuggestion {
  wordIds: string[];
  startSeconds: number;
  endSeconds: number;
}

export function normalizeReplayText(text: string): string {
  return text.replace(/[\ufeff\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").trim();
}

export function greedyWordWindows(logprobs: Float32Array, frames: number, vocabSize: number,
  vocab: Record<string, string>, blankId = 1024): HeardWord[] {
  if (!Number.isInteger(frames) || frames <= 0 || !Number.isInteger(vocabSize) || vocabSize <= 1 ||
    logprobs.length !== frames * vocabSize) throw new Error("Invalid acoustic frame dimensions.");
  const words: HeardWord[] = [];
  let previous = -1;
  let current: HeardWord | null = null;
  const flush = () => {
    if (current?.text) words.push({ ...current, text: normalizeReplayText(current.text) });
    current = null;
  };
  for (let frame = 0; frame < frames; frame++) {
    let id = 0;
    for (let index = 1; index < vocabSize; index++) {
      if (logprobs[frame * vocabSize + index] > logprobs[frame * vocabSize + id]) id = index;
    }
    if (id === previous && id !== blankId) {
      if (current) current.endFrame = frame + 1;
    } else if (id !== blankId) {
      const token = vocab[String(id)] ?? "<unk>";
      if (token.includes("<")) {
        flush();
        words.push({ text: "<unmatched>", startFrame: frame, endFrame: frame + 1 });
      } else {
        if (token.startsWith("▁")) flush();
        const text = token.replaceAll("▁", " ").trim();
        if (text) {
          if (!current) current = { text: "", startFrame: frame, endFrame: frame + 1 };
          current.text += text;
          current.endFrame = frame + 1;
        }
      }
    }
    previous = id;
  }
  flush();
  return words;
}

/** Three-word exact contexts must resolve uniquely in the frozen passage.
 * No interpolation across missing words; repetitions remain separate occurrences.
 * Edge words are withheld because the analysis window may cut through speech.
 */
export function matchReplayAnchors(heard: HeardWord[], references: ReferenceWord[][],
  frames: number, durationSeconds: number): ReplaySuggestion[] {
  if (frames < 1 || durationSeconds <= 0 || !Number.isFinite(durationSeconds)) return [];
  const proposals: ReplaySuggestion[] = [];
  for (let h = 1; h < heard.length - 1; h++) {
    const possible = new Map<string, string[]>();
    for (let begin = Math.max(0, h - 2); begin <= h && begin + 2 < heard.length; begin++) {
      for (const verse of references) {
        for (let r = 0; r + 2 < verse.length; r++) {
          if ([0, 1, 2].every((offset) => normalizeReplayText(verse[r + offset].text) === heard[begin + offset].text)) {
            const ids = verse[r + h - begin].wordIds;
            if (ids.length) possible.set(ids.join("|"), ids);
          }
        }
      }
    }
    if (possible.size !== 1) continue;
    proposals.push({ wordIds: [...possible.values()][0],
      startSeconds: heard[h].startFrame / frames * durationSeconds,
      endSeconds: heard[h].endFrame / frames * durationSeconds });
  }
  return proposals;
}
