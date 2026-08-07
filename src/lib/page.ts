import type { TokenRole } from "../types";
import staticPage604 from "../data/page604.json";
import { isNonRecitationWord } from "./tokenize";

export interface PageWord {
  wid: string; // stable word address: "<surah>.<ayah|b>.<index>"
  text: string;
  surah: number;
  ayah: number | null; // null === basmala
  role: TokenRole;
}

export type PageLine =
  | { n: number; type: "surah-header"; surah: number; nameAr: string }
  | { n: number; type: "basmala"; surah: number; words: PageWord[] }
  | { n: number; type: "ayah"; words: PageWord[] };

export interface MushafPage {
  page: number;
  special?: boolean;
  lines: PageLine[];
}

const pageCache = new Map<number, MushafPage>();

function castPage(data: any): MushafPage {
  return {
    page: data.page,
    special: data.special,
    lines: data.lines.map((l: any) => {
      if (l.type === "surah-header") {
        return {
          n: l.n,
          type: "surah-header",
          surah: l.surah as number,
          nameAr: (l as { nameAr?: string }).nameAr ?? "",
        };
      }
      const words = (l.words ?? []).map((w: any) => ({
        wid: w.wid,
        text: w.text,
        surah: w.surah,
        ayah: w.ayah ?? null,
        role:
          w.role === "letter" && isNonRecitationWord(w.text)
            ? "ornament"
            : (w.role as TokenRole),
      }));
      return l.type === "basmala"
        ? { n: l.n, type: "basmala", surah: l.surah as number, words }
        : { n: l.n, type: "ayah", words };
    }),
  };
}

// Page 604 ships bundled with the app — seed the cache so the default/last
// view never waits on a network round-trip.
pageCache.set(604, castPage(staticPage604));

export async function loadPage(page: number): Promise<MushafPage> {
  if (pageCache.has(page)) return pageCache.get(page)!;
  const res = await fetch(`/pages/p${page}.json`);
  if (!res.ok) throw new Error(`Failed to load page ${page}: ${res.status}`);
  const raw = await res.json();
  const parsed = castPage(raw);
  pageCache.set(page, parsed);
  return parsed;
}

export function preloadPage(page: number): void {
  if (pageCache.has(page)) return;
  loadPage(page).catch(() => {});
}

export function buildMushafPage(): MushafPage {
  return castPage(staticPage604);
}

/** Legacy stable id for a grapheme within a word. */
export function tokenId(wid: string, graphemeIndex: number): string {
  return `${wid}#${graphemeIndex}`;
}

/** Human-readable location for the mistake log. */
export function locationLabel(
  surah: number,
  ayah: number | null,
  unitIndex: number,
): string {
  const where = ayah === null ? "Basmala" : `${surah}:${ayah}`;
  return `${where} · letter ${unitIndex + 1}`;
}
