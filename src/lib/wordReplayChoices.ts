import { currentReplayOccurrences, replayTargetMatches, sameReplayMedia, validateReplayRevision,
  type ReplayMediaIdentity, type ReplayRevision, type ReplayWord } from "./recitationReplay.ts";

/** Read-only candidates for the decoded recording part; never interpolate a word. */
export function wordReplayChoices(revisions: readonly ReplayRevision[], media: ReplayMediaIdentity | null,
  words: readonly ReplayWord[], wordId: string | null) {
  const word = words.find(w => w.wordId === wordId);
  if (!media || !word) return { kind: "none" as const, entries: [] as ReplayRevision[] };
  const current = currentReplayOccurrences(revisions).filter(entry => {
    try { validateReplayRevision(entry); } catch { return false; }
    return sameReplayMedia(entry.media, media);
  });
  const exact = current.filter(entry => replayTargetMatches(entry.target,
    { kind: "word", wordIds: [word.wordId], label: word.text }));
  if (exact.length) return { kind: "word" as const, entries: exact };
  const ayahIds = words.filter(w => w.surah === word.surah && w.ayah === word.ayah).map(w => w.wordId);
  const ayah = current.filter(entry => entry.status === "reviewed" && replayTargetMatches(entry.target,
    { kind: "ayah", wordIds: ayahIds, label: "Recorded ayah span" }));
  return { kind: ayah.length ? "ayah" as const : "none" as const, entries: ayah };
}

export function replayChoiceLabel(entry: ReplayRevision): string {
  if (entry.target.kind === "ayah") return "Play ayah";
  return entry.status === "reviewed" ? "Play word" : "Preview approximate word";
}
