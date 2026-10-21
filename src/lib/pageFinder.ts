/**
 * Page finder: one field for a page number, a surah (number, Latin or Arabic
 * name), or a juz. Spelling is forgiving: no accents, apostrophes or hyphens
 * needed, and the article is optional ("ala" finds Al-A'la, "yaseen" Ya-Sin).
 *
 * Latin surah names and their English meanings: quran-json 3.1.2
 * (Risan Bagja Pradana, CC BY 4.0, transliteration from Tanzil). Meanings are
 * searchable but not shown.
 */
import { juzByPage } from "../data/marginalia.ts";

export interface SurahEntry { number: number; nameAr: string; firstPage: number }

export const SURAH_LATIN: readonly string[] = ["Al-Fatihah", "Al-Baqarah", "Ali 'Imran", "An-Nisa", "Al-Ma'idah", "Al-An'am", "Al-A'raf", "Al-Anfal", "At-Tawbah", "Yunus", "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr", "An-Nahl", "Al-Isra", "Al-Kahf", "Maryam", "Taha", "Al-Anbya", "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan", "Ash-Shu'ara", "An-Naml", "Al-Qasas", "Al-'Ankabut", "Ar-Rum", "Luqman", "As-Sajdah", "Al-Ahzab", "Saba", "Fatir", "Ya-Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir", "Fussilat", "Ash-Shuraa", "Az-Zukhruf", "Ad-Dukhan", "Al-Jathiyah", "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf", "Adh-Dhariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman", "Al-Waqi'ah", "Al-Hadid", "Al-Mujadila", "Al-Hashr", "Al-Mumtahanah", "As-Saf", "Al-Jumu'ah", "Al-Munafiqun", "At-Taghabun", "At-Talaq", "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij", "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddaththir", "Al-Qiyamah", "Al-Insan", "Al-Mursalat", "An-Naba", "An-Nazi'at", "'Abasa", "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Inshiqaq", "Al-Buruj", "At-Tariq", "Al-A'la", "Al-Ghashiyah", "Al-Fajr", "Al-Balad", "Ash-Shams", "Al-Layl", "Ad-Duhaa", "Ash-Sharh", "At-Tin", "Al-'Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-'Adiyat", "Al-Qari'ah", "At-Takathur", "Al-'Asr", "Al-Humazah", "Al-Fil", "Quraysh", "Al-Ma'un", "Al-Kawthar", "Al-Kafirun", "An-Nasr", "Al-Masad", "Al-Ikhlas", "Al-Falaq", "An-Nas"];
const SURAH_MEANING: readonly string[] = ["The Opener", "The Cow", "Family of Imran", "The Women", "The Table Spread", "The Cattle", "The Heights", "The Spoils of War", "The Repentance", "Jonah", "Hud", "Joseph", "The Thunder", "Abraham", "The Rocky Tract", "The Bee", "The Night Journey", "The Cave", "Mary", "Ta-Ha", "The Prophets", "The Pilgrimage", "The Believers", "The Light", "The Criterion", "The Poets", "The Ant", "The Stories", "The Spider", "The Romans", "Luqman", "The Prostration", "The Combined Forces", "Sheba", "Originator", "Ya Sin", "Those who set the Ranks", "The Letter \"Saad\"", "The Troops", "The Forgiver", "Explained in Detail", "The Consultation", "The Ornaments of Gold", "The Smoke", "The Crouching", "The Wind-Curved Sandhills", "Muhammad", "The Victory", "The Rooms", "The Letter \"Qaf\"", "The Winnowing Winds", "The Mount", "The Star", "The Moon", "The Beneficent", "The Inevitable", "The Iron", "The Pleading Woman", "The Exile", "She that is to be examined", "The Ranks", "The Congregation, Friday", "The Hypocrites", "The Mutual Disillusion", "The Divorce", "The Prohibition", "The Sovereignty", "The Pen", "The Reality", "The Ascending Stairways", "Noah", "The Jinn", "The Enshrouded One", "The Cloaked One", "The Resurrection", "The Man", "The Emissaries", "The Tidings", "Those who drag forth", "He Frowned", "The Overthrowing", "The Cleaving", "The Defrauding", "The Sundering", "The Mansions of the Stars", "The Nightcommer", "The Most High", "The Overwhelming", "The Dawn", "The City", "The Sun", "The Night", "The Morning Hours", "The Relief", "The Fig", "The Clot", "The Power", "The Clear Proof", "The Earthquake", "The Courser", "The Calamity", "The Rivalry in world increase", "The Declining Day", "The Traducer", "The Elephant", "Quraysh", "The Small kindnesses", "The Abundance", "The Disbelievers", "The Divine Support", "The Palm Fiber", "The Sincerity", "The Daybreak", "Mankind"];

/** First page of each juz (1-based), from the Mushaf's own juz-by-page table. */
export const JUZ_START: readonly number[] = (() => {
  const starts: number[] = [];
  juzByPage.forEach((juz, page) => {
    if (page > 0 && starts[juz - 1] === undefined) starts[juz - 1] = page;
  });
  return starts;
})();

export type PageFinderItem =
  | { kind: "page"; page: number; surah: number }
  | { kind: "surah"; page: number; surah: number }
  | { kind: "juz"; page: number; surah: number; juz: number }
  | { kind: "question"; page: number; surah: number };

/** Surah number (1-114) whose text is on the given page at its start. */
export function surahOfPage(surahs: readonly SurahEntry[], page: number): number {
  let current = 1;
  for (const surah of surahs) if (surah.firstPage <= page) current = surah.number;
  return current;
}

/** Arabic: no vowel marks, one alif, alif maqsura as ya, ta marbuta as ha. */
export function normalizeArabic(text: string): string {
  return String(text)
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627")
    .replace(/\u0649/g, "\u064A")
    .replace(/\u0629/g, "\u0647")
    .replace(/\s+/g, " ")
    .trim();
}

/** Latin: lower case, no accents or apostrophes, article optional, doubled letters single, ee to i, oo/ou to u, final h dropped. */
export function latinKey(text: string, dropArticle = true): string {
  let key = String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[\u02BF\u02BE'\u2019\u2018`\u00B4]/g, "");
  if (dropArticle) key = key.replace(/^(al|a[nrstdzy]|ash|adh|ath)[\s-]+/, "").replace(/^the\s+/, "");
  key = key.replace(/[^a-z]/g, "").replace(/ee/g, "i").replace(/oo|ou/g, "u").replace(/(.)\1+/g, "$1");
  return key.length > 2 ? key.replace(/h$/, "") : key;
}

const SURAH_KEYS = SURAH_LATIN.map((name, index) => [
  latinKey(name), latinKey(name, false), latinKey(SURAH_MEANING[index]), latinKey(SURAH_MEANING[index], false),
]);
const ARABIC_DIGITS = "\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669";

export function pageFinderItems(
  surahs: readonly SurahEntry[],
  query: string,
  questionPage: number | null = null,
): PageFinderItem[] {
  const q = String(query || "").trim();
  const digits = q.replace(/[\u0660-\u0669]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)));
  const juzItem = (juz: number): PageFinderItem => ({ kind: "juz", juz, page: JUZ_START[juz - 1], surah: surahOfPage(surahs, JUZ_START[juz - 1]) });

  const juzMatch = digits.match(/^(?:juz|juzu|juzz|para|jz|j|\u062c\u0632\u0621|\u0627\u0644\u062c\u0632\u0621)\s*(\d{1,2})$/i);
  if (juzMatch) {
    const juz = Number(juzMatch[1]);
    return juz >= 1 && juz <= 30 ? [juzItem(juz)] : [];
  }

  const out: PageFinderItem[] = [];
  if (!q && questionPage) out.push({ kind: "question", page: questionPage, surah: surahOfPage(surahs, questionPage) });
  if (/^\d+$/.test(digits)) {
    const n = Number(digits);
    if (n >= 1 && n <= 604) out.push({ kind: "page", page: n, surah: surahOfPage(surahs, n) });
    if (n >= 1 && n <= 114) out.push({ kind: "surah", page: surahs[n - 1].firstPage, surah: n });
    if (n >= 1 && n <= 30) out.push(juzItem(n));
    return out;
  }
  if (/[a-z]/i.test(q)) {
    const key = latinKey(q);
    const keyWithArticle = latinKey(q, false);
    if (!key) return out;
    const rank = (candidate: string) => (candidate === key ? 0 : candidate.startsWith(key) ? 1 : key.length > 1 && candidate.includes(key) ? 2 : 9);
    const scored: Array<[number, number]> = [];
    SURAH_KEYS.forEach(([name, nameWithArticle, meaning, meaningWithArticle], index) => {
      // The article only counts when one was typed: "an" alone does not match every An- surah.
      const best = Math.min(
        rank(name),
        keyWithArticle !== key && nameWithArticle === keyWithArticle ? 0 : 9,
        rank(meaning) + 3,
        keyWithArticle !== key && meaningWithArticle.startsWith(keyWithArticle) ? 4 : 9,
      );
      if (best < 9) scored.push([best, index]);
    });
    scored.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    for (const [, index] of scored) out.push({ kind: "surah", page: surahs[index].firstPage, surah: index + 1 });
    return out;
  }
  const arabic = normalizeArabic(q);
  surahs.forEach((surah) => {
    const name = normalizeArabic(surah.nameAr);
    if (!arabic || name.includes(arabic) || normalizeArabic("\u0627\u0644" + surah.nameAr).includes(arabic)) {
      out.push({ kind: "surah", page: surah.firstPage, surah: surah.number });
    }
  });
  return out;
}
