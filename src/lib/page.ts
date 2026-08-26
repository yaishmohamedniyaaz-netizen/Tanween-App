import type { TokenRole } from "../types";
import staticPage604 from "../data/page604.json";
import { isNonRecitationWord } from "./tokenize";
import { MUSHAF_LAYOUT } from "./mushafContract";
import { mushafPageAssetUrl } from "./mushafAssets.ts";

export { MUSHAF_DATA_VERSION, MUSHAF_LAYOUT } from "./mushafContract";

export interface PageWord {
  wid: string; // stable word address: "<surah>.<ayah|b>.<index>"
  text: string; // semantic QPC Hafs text used by the connected letter rail
  glyph?: string; // page-specific KFGQPC V1 glyph used on the Mushaf
  surah: number;
  ayah: number | null; // null === basmala
  role: TokenRole;
}

export type PageLine =
  | {
      n: number;
      type: "surah-header";
      centered: true;
      surah: number;
      nameAr: string;
    }
  | {
      n: number;
      type: "basmala";
      centered: true;
      surah: number;
      words: PageWord[];
    }
  | { n: number; type: "ayah"; centered: boolean; words: PageWord[] };

export interface MushafPage {
  page: number;
  font: "qcf-v1";
  layout?: string;
  lines: PageLine[];
}

const pageCache = new Map<number, MushafPage>();

export function pageAssetUrl(page: number): string {
  return mushafPageAssetUrl(page);
}

function assertPageContract(data: any, expectedPage?: number): void {
  if (!data || typeof data !== "object") {
    throw new Error("Mushaf page response is not an object");
  }
  if (expectedPage !== undefined && data.page !== expectedPage) {
    throw new Error(
      `Mushaf page response mismatch: expected ${expectedPage}, received ${data.page}`,
    );
  }
  if (data.font !== "qcf-v1" || data.layout !== MUSHAF_LAYOUT) {
    throw new Error(
      `Unsupported Mushaf page contract: ${String(data.font)} / ${String(data.layout)}`,
    );
  }
  if (!Array.isArray(data.lines) || data.lines.length === 0) {
    throw new Error("Mushaf page has no layout lines");
  }
}

/** Validate a delivered page before it is admitted to an offline package. */
export function validateMushafPageAsset(data: unknown, expectedPage: number): void {
  assertPageContract(data, expectedPage);
}

function castPage(data: any, expectedPage?: number): MushafPage {
  assertPageContract(data, expectedPage);
  return {
    page: data.page,
    font: data.font,
    layout: data.layout,
    lines: data.lines.map((l: any) => {
      if (l.type === "surah-header") {
        return {
          n: l.n,
          type: "surah-header",
          centered: true,
          surah: l.surah as number,
          nameAr: (l as { nameAr?: string }).nameAr ?? "",
        };
      }
      const words = (l.words ?? []).map((w: any) => ({
        wid: w.wid,
        text: w.text,
        glyph: w.glyph,
        surah: w.surah,
        ayah: w.ayah ?? null,
        role:
          w.role === "letter" && isNonRecitationWord(w.text)
            ? "ornament"
            : (w.role as TokenRole),
      }));
      return l.type === "basmala"
        ? {
            n: l.n,
            type: "basmala",
            centered: true,
            surah: l.surah as number,
            words,
          }
        : {
            n: l.n,
            type: "ayah",
            centered: Boolean(l.centered),
            words,
          };
    }),
  };
}

// Page 604 ships bundled with the app — seed the cache so the default/last
// view never waits on a network round-trip.
pageCache.set(604, castPage(staticPage604));

export async function loadPage(page: number): Promise<MushafPage> {
  if (pageCache.has(page)) return pageCache.get(page)!;
  const res = await fetch(pageAssetUrl(page));
  if (!res.ok) throw new Error(`Failed to load page ${page}: ${res.status}`);
  const raw = await res.json();
  const parsed = castPage(raw, page);
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
