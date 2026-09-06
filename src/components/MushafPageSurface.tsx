import type {
  CSSProperties,
  HTMLAttributes,
  ReactNode,
  Ref,
} from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { juzByPage, sajdahVerses } from "../data/marginalia.ts";
import surahIndex from "../data/surah-index.json";
import type { MushafPage, PageLine, PageWord } from "../lib/page.ts";
import { qcfFontFamily } from "../lib/qcfFont.ts";
import { fitMushafLine, measureMushafGlyph, MUSHAF_REFERENCE_WIDTH, MUSHAF_REFERENCE_HEIGHT } from "../lib/mushafGeometry.ts";

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
      <i className="m-word-baseline" aria-hidden="true" />
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
  onGeometryChange?: () => void;
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
  onGeometryChange,
  ...pageProps
}: MushafPageSurfaceProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0);
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const update = () => setScale(frame.clientWidth / MUSHAF_REFERENCE_WIDTH);
    update();
    const observer = new ResizeObserver(entries => {
      setScale(entries[0].contentRect.width / MUSHAF_REFERENCE_WIDTH);
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const root = surfaceRef.current;
    if (!root || !qcfReady) return;
    const sizes: number[] = [];
    for (const line of root.querySelectorAll<HTMLElement>(".m-line-ayah")) {
      const words = [...line.querySelectorAll<HTMLElement>(".m-word")];
      const family = getComputedStyle(line).fontFamily;
      const metrics = words.map(word => measureMushafGlyph(word.firstChild?.textContent ?? "", family));
      if (metrics.some(metric => !metric)) continue;
      const fit = fitMushafLine(line.clientWidth, metrics as NonNullable<typeof metrics[number]>[]);
      if (!fit) continue;
      sizes.push(fit.fontSize);
      line.style.fontSize = `${fit.fontSize}px`;
      line.style.gap = `${fit.gap}px`;
      words.forEach((word, index) => {
        const metric = metrics[index]!;
        word.style.marginLeft = `${-metric.left * fit.fontSize}px`;
        word.style.marginRight = `${(metric.right - metric.advance) * fit.fontSize}px`;
      });
    }
    // Short centered lines retain natural word spacing at the page's text size.
    sizes.sort((a, b) => a - b);
    const centeredSize = sizes.length ? sizes[Math.floor(sizes.length / 2)] : 33;
    for (const line of root.querySelectorAll<HTMLElement>(".m-line-center")) {
      const family = getComputedStyle(line).fontFamily;
      const advance = [...line.querySelectorAll<HTMLElement>(".m-word")].reduce((sum, word) =>
        sum + (measureMushafGlyph(word.firstChild?.textContent ?? "", family)?.advance ?? 0), 0);
      line.style.fontSize = `${advance > 0 ? Math.min(centeredSize, line.clientWidth / advance) : centeredSize}px`;
    }
    onGeometryChange?.();
  }, [data, qcfReady, onGeometryChange, scale]);
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
    <div ref={frameRef} className={`mushaf-page-frame ${className}`.trim()} style={{ aspectRatio: "0.68" }}>
    <div
      {...pageProps}
      ref={node => {
        surfaceRef.current = node;
        if (typeof pageRef === "function") pageRef(node);
        else if (pageRef) (pageRef as { current: HTMLDivElement | null }).current = node;
      }}
      style={{ ...pageProps.style, width: MUSHAF_REFERENCE_WIDTH, height: MUSHAF_REFERENCE_HEIGHT,
        maxWidth: "none", padding: "12px 0 8px", transform: `scale(${scale || 1})`,
        transformOrigin: "top left", visibility: scale ? undefined : "hidden",
        "--surah-band-frame-inset": "4px", "--surah-band-title-size": "22px",
        "--surah-band-title-pad-x": "20px", "--mark-wash-pad-top": "0px", "--mark-wash-pad-bottom": "0px",
      } as CSSProperties}
      className={`page page-solid-mushaf ${layoutClass} ${className}`.trim()}
      data-page={data.page}
      data-font-ready={qcfReady ? "true" : "false"}
    >
      <div className="page-marginalia" style={{ minHeight: 28, paddingInline: 35, fontSize: 14 }}>
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
      <div className="mushaf-lines" style={{ padding: "7px 35px 5px" }}>
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
                style={{ ...gridStyle, fontSize: 26.5 }}
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
    </div>
  );
}
