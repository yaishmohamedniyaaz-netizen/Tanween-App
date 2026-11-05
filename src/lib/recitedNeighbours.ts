import type { MushafPage, PageWord } from "./page.ts";

/**
 * For each recited word, the text of the word read straight after it on the
 * same page. An ayah-end marker or a surah header in between means no
 * neighbour: the reciter may pause there. (No Madinah page ends inside a
 * complete-idgham pair, so the page edge loses nothing.)
 */
export function nextRecitedWords(page: MushafPage): Map<string, string> {
  const tokens: PageWord[] = [];
  for (const line of page.lines) {
    if ("words" in line) tokens.push(...line.words);
    else tokens.push({ wid: "", text: "", surah: 0, ayah: null, role: "ayah-end" });
  }
  const next = new Map<string, string>();
  tokens.forEach((word, index) => {
    const following = tokens[index + 1];
    if (word.role === "letter" && following?.role === "letter") next.set(word.wid, following.text);
  });
  return next;
}
