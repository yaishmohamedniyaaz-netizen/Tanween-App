import type {
  CSSProperties,
  HTMLAttributes,
  ReactNode,
  Ref,
} from "react";
import { juzByPage, sajdahVerses } from "../data/marginalia.ts";
import surahIndex from "../data/surah-index.json";
import type { MushafPage, PageLine, PageWord } from "../lib/page.ts";
import { qcfFontFamily } from "../lib/qcfFont.ts";

const SURAH_INDEX = surahIndex as Array<{
  number: number;
  nameAr: string;
  firstPage: number;
}>;
const SAJDAH_VERSES = new Set(
  sajdahVerses.map(({ surah, ayah }) => `${surah}:${ayah}`),
);
const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

function toArabicNum(value: number): string {
  return String(value)
    .split("")
    .map((digit) => ARABIC_DIGITS[Number(digit)])
    .join("");
}

function surahsForPage(page: number) {
  const starting = SURAH_INDEX.filter((surah) => surah.firstPage === page);
  if (starting.length) return starting;
  const active = [...SURAH_INDEX]
    .reverse()
    .find((surah) => surah.firstPage <= page);
  return active ? [active] : [];
}

function SurahBand({
  nameAr,
  style,
  className = "",
}: {
  nameAr: string;
  style: CSSProperties;
  className?: string;
}) {
  return (
    <div className={`surah-band ${className}`.trim()} style={style}>
      <span className="surah-band-title">سُورَةُ {nameAr}</span>
    </div>
  );
}

export function MushafWord({
  word,
  qcfReady,
  className = "",
  children,
  ...spanProps
}: Omit<HTMLAttributes<HTMLSpanElement>, "className"> & {
  word: PageWord;
  qcfReady: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const isSajdah = word.role === "ayah-end" &&
    word.ayah !== null &&
    SAJDAH_VERSES.has(`${word.surah}:${word.ayah}`);
  const displayedText = qcfReady && word.glyph ? word.glyph : word.text;
  const ariaLabel = spanProps["aria-label"] ??
    (word.role === "letter" ? word.text : undefined);
  const ariaHidden = spanProps["aria-hidden"] ??
    (word.role !== "letter" ? true : undefined);

  return (
    <span
      {...spanProps}
      className={`m-word ${word.role === "ayah-end" ? "ayah-num" : ""} ${word.role === "ornament" ? "m-ornament" : ""} ${isSajdah ? "sajdah" : ""} ${className}`.trim()}
      data-wid={word.wid}
      data-semantic={word.text}
      data-role={word.role}
      data-surah={word.surah}
      data-ayah={word.ayah === null ? "b" : String(word.ayah)}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
    >
      {displayedText}
      {isSajdah && (
        <span className="sajdah-mark" aria-label="Sajdah">۩</span>
      )}
      {children}
    </span>
  );
}

interface MushafPageSurfaceProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children" | "className"
> {
  data: MushafPage;
  qcfReady: boolean;
  className?: string;
  pageRef?: Ref<HTMLDivElement>;
  beforeLines?: ReactNode;
  afterLines?: ReactNode;
  lineClassName?: (line: PageLine) => string;
  renderWord: (word: PageWord, line: PageLine) => ReactNode;
}

/**
 * The immutable printed-page surface shared by live judging and Results.
 * Interaction layers remain caller-owned, but page geometry has one home.
 */
export function MushafPageSurface({
  data,
  qcfReady,
  className = "",
  pageRef,
  beforeLines,
  afterLines,
  lineClassName,
  renderWord,
  ...pageProps
}: MushafPageSurfaceProps) {
  const pageSurahs = surahsForPage(data.page);
  const qcfLineStyle: CSSProperties = qcfReady
    ? { fontFamily: `"${qcfFontFamily(data.page)}"` }
    : { fontFamily: "var(--quran)" };
  const layoutClass = data.page <= 2
    ? "page-opening-layout"
    : data.lines.length < 15
      ? "page-short-layout"
      : "";

  return (
    <div
      {...pageProps}
      ref={pageRef}
      className={`page page-solid-mushaf ${layoutClass} ${className}`.trim()}
      data-page={data.page}
      data-font-ready={qcfReady ? "true" : "false"}
    >
      <div className="page-marginalia">
        <span className="page-juz">Juz&apos; {juzByPage[data.page]}</span>
        <span className="page-static-number t-num" aria-label={`Page ${data.page}`}>
          {data.page}
        </span>
        <span className="page-surahs" dir="rtl">
          {pageSurahs.map((surah) => surah.nameAr).join(" - ")}
        </span>
      </div>
      {juzByPage[data.page] > 0 && (
        <div className="juz-label">الجزء {toArabicNum(juzByPage[data.page])}</div>
      )}
      <div className="mushaf-lines">
        {beforeLines}
        {data.lines.map((line) => {
          const lineClass = lineClassName?.(line) ?? "";
          const gridStyle: CSSProperties = { gridRow: line.n };
          if (line.type === "surah-header") {
            return (
              <SurahBand
                key={line.n}
                nameAr={line.nameAr}
                style={gridStyle}
                className={lineClass}
              />
            );
          }
          if (line.type === "basmala") {
            return (
              <div
                key={line.n}
                className={`m-line m-line-basmala ${lineClass}`.trim()}
                style={gridStyle}
              >
                {line.words.map((word) => renderWord(word, line))}
              </div>
            );
          }
          return (
            <div
              key={line.n}
              data-mline={line.n}
              className={`m-line ${line.centered ? "m-line-center" : "m-line-ayah"} ${lineClass}`.trim()}
              style={{ ...gridStyle, ...qcfLineStyle }}
            >
              {line.words.map((word) => renderWord(word, line))}
            </div>
          );
        })}
      </div>
      {afterLines}
    </div>
  );
}
