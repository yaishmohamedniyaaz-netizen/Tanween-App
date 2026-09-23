/** Reviewed Arabic catalogue. Preserve exact shaping and diacritics when rendering. */
export const RECITATION_PHRASES = [
  { id: "istiadhah", name: "Istiʿādhah", group: "starting", words: ["أَعُوذُ", "بِاللَّهِ", "مِنَ", "الشَّيْطَانِ", "الرَّجِيمِ"] },
  { id: "bismillah", name: "Bismillah", group: "starting", words: ["بِسْمِ", "اللَّهِ", "الرَّحْمَٰنِ", "الرَّحِيمِ"] },
  { id: "closing", name: "Ṣadaqallāhul-ʿaẓīm", group: "ending", words: ["صَدَقَ", "اللَّهُ", "الْعَظِيمُ"] },
] as const;
