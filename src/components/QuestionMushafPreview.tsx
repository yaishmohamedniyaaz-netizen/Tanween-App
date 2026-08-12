import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { juzByPage, sajdahVerses } from "../data/marginalia.ts";
import surahIndex from "../data/surah-index.json";
import { loadPage, type MushafPage, type PageWord } from "../lib/page.ts";
import { loadQcfPageFont, qcfFontFamily } from "../lib/qcfFont.ts";
import type { AyahRef, QuestionRange } from "../lib/questionBank.ts";
import { Icon } from "./Icon.tsx";

const SURAH_INDEX = surahIndex as Array<{
  number: number;
  nameAr: string;
  firstPage: number;
}>;

const SAJDAH = new Set(sajdahVerses.map(({ surah, ayah }) => `${surah}:${ayah}`));
const ARABIC_DIGITS = ["\u0660", "\u0661", "\u0662", "\u0663", "\u0664", "\u0665", "\u0666", "\u0667", "\u0668", "\u0669"];

function toArabicNum(value: number): string {
  return String(value).split("").map((digit) => ARABIC_DIGITS[Number(digit)]).join("");
}

function surahsForPage(page: number) {
  const starting = SURAH_INDEX.filter((surah) => surah.firstPage === page);
  if (starting.length) return starting;
  const active = [...SURAH_INDEX].reverse().find((surah) => surah.firstPage <= page);
  return active ? [active] : [];
}

function SurahBand({ nameAr, style }: { nameAr: string; style: CSSProperties }) {
  return (
    <div className="surah-band" style={style}>
      <span className="surah-band-title">سُورَةُ {nameAr}</span>
    </div>
  );
}

function rangeWordIds(pageData: MushafPage, range: QuestionRange | null): Set<string> {
  if (!range || pageData.page < range.startPage || pageData.page > range.endPage) {
    return new Set();
  }
  const words = pageData.lines.flatMap((line) =>
    line.type === "ayah"
      ? line.words.filter((word) => word.role === "letter" || word.role === "ayah-end")
      : [],
  );
  let start = 0;
  let end = words.length - 1;
  if (pageData.page === range.startPage) {
    start = words.findIndex((word) => word.wid === range.startWordId);
  }
  if (pageData.page === range.endPage) {
    end = words.findIndex((word) => word.wid === range.endMarkerId);
  }
  if (start < 0 || end < start) return new Set();
  return new Set(words.slice(start, end + 1).map((word) => word.wid));
}

export function QuestionMushafPreview({
  page,
  range,
  onPageChange,
  onAyahPick,
}: {
  page: number;
  range: QuestionRange | null;
  onPageChange: (page: number) => void;
  onAyahPick: (ayah: AyahRef) => void;
}) {
  const [pageData, setPageData] = useState<MushafPage | null>(null);
  const [fontReadyPage, setFontReadyPage] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [pageInput, setPageInput] = useState(String(page));

  useEffect(() => setPageInput(String(page)), [page]);
  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    Promise.all([
      loadPage(page),
      loadQcfPageFont(page).then(() => true).catch(() => false),
    ])
      .then(([data, fontLoaded]) => {
        if (cancelled) return;
        setPageData(data);
        setFontReadyPage(fontLoaded ? page : null);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  const selectedIds = useMemo(
    () => pageData ? rangeWordIds(pageData, range) : new Set<string>(),
    [pageData, range],
  );
  const qcfReady = pageData?.page === fontReadyPage;
  const pageSurahs = pageData ? surahsForPage(pageData.page) : [];
  const qcfLineStyle: CSSProperties = qcfReady && pageData
    ? { fontFamily: `"${qcfFontFamily(pageData.page)}"` }
    : { fontFamily: "var(--quran)" };

  const submitPage = (event: FormEvent) => {
    event.preventDefault();
    const next = Math.max(1, Math.min(604, Math.round(Number(pageInput) || page)));
    setPageInput(String(next));
    onPageChange(next);
  };

  const renderWord = (word: PageWord) => {
    const selected = selectedIds.has(word.wid);
    const isStart = range?.startWordId === word.wid;
    const isEnd = range?.endMarkerId === word.wid;
    const isCurrentStart =
      word.role === "ayah-end" &&
      word.ayah !== null &&
      range?.startAyah.surah === word.surah &&
      range.startAyah.ayah === word.ayah;
    const isSajdah =
      word.role === "ayah-end" &&
      word.ayah !== null &&
      SAJDAH.has(`${word.surah}:${word.ayah}`);
    const markerProps = word.role === "ayah-end" && word.ayah !== null
      ? {
          role: "button",
          tabIndex: 0,
          onClick: () => onAyahPick({ surah: word.surah, ayah: word.ayah! }),
          onKeyDown: (event: KeyboardEvent<HTMLSpanElement>) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onAyahPick({ surah: word.surah, ayah: word.ayah! });
            }
          },
          "aria-label": `Use ayah ${word.surah}:${word.ayah} as the question start`,
          "aria-pressed": isCurrentStart,
        }
      : {};
    return (
      <span
        key={word.wid}
        className={`m-word ${word.role === "ayah-end" ? "ayah-num question-ayah-pick" : ""} ${word.role === "ornament" ? "m-ornament" : ""} ${isSajdah ? "sajdah" : ""} ${selected ? "question-range-word" : ""} ${isStart ? "question-range-start" : ""} ${isEnd ? "question-range-end" : ""}`}
        data-wid={word.wid}
        {...markerProps}
      >
        {qcfReady && word.glyph ? word.glyph : word.text}
        {isSajdah && <span className="sajdah-mark" aria-label="Sajdah">۩</span>}
      </span>
    );
  };

  return (
    <section className="question-preview" aria-label="Question Mushaf preview">
      <div className="question-preview-toolbar">
        <div>
          <strong>1405H Mushaf preview</strong>
          <span>Tap an ayah marker to make that ayah the new starting point.</span>
        </div>
        <div className="question-preview-page-controls">
          <button type="button" className="question-preview-prev" aria-label="Previous Mushaf page" disabled={page <= 1} onClick={() => onPageChange(page - 1)}><Icon name="chevron" size={14} /></button>
          <form onSubmit={submitPage}>
            <label htmlFor="question-preview-page">Page</label>
            <input id="question-preview-page" inputMode="numeric" value={pageInput} onChange={(event) => setPageInput(event.target.value)} onBlur={() => setPageInput(String(page))} />
          </form>
          <button type="button" className="question-preview-next" aria-label="Next Mushaf page" disabled={page >= 604} onClick={() => onPageChange(page + 1)}><Icon name="chevron" size={14} /></button>
        </div>
      </div>

      {loadError ? (
        <div className="question-preview-state" role="alert">This Mushaf page could not be loaded. Choose another page and try again.</div>
      ) : !pageData || pageData.page !== page ? (
        <div className="question-preview-state"><span className="loading-spinner" /> Loading page {page}…</div>
      ) : (
        <div className="question-preview-canvas">
          <div className={`page page-solid-mushaf question-preview-page ${pageData.page <= 2 ? "page-opening-layout" : pageData.lines.length < 15 ? "page-short-layout" : ""}`} data-page={pageData.page} data-font-ready={qcfReady ? "true" : "false"}>
            <div className="page-marginalia">
              <span className="page-juz">Juz&apos; {juzByPage[pageData.page]}</span>
              <span className="question-preview-page-number">{pageData.page}</span>
              <span className="page-surahs" dir="rtl">{pageSurahs.map((surah) => surah.nameAr).join(" - ")}</span>
            </div>
            {juzByPage[pageData.page] > 0 && <div className="juz-label">الجزء {toArabicNum(juzByPage[pageData.page])}</div>}
            <div className="mushaf-lines">
              {pageData.lines.map((line) => {
                const lineStyle: CSSProperties = { gridRow: line.n };
                if (line.type === "surah-header") return <SurahBand key={line.n} nameAr={line.nameAr} style={lineStyle} />;
                if (line.type === "basmala") return <div key={line.n} className="m-line m-line-basmala" style={lineStyle}>{line.words.map(renderWord)}</div>;
                const containsRange = line.words.some((word) => selectedIds.has(word.wid));
                return <div key={line.n} data-mline={line.n} className={`m-line ${line.centered ? "m-line-center" : "m-line-ayah"} ${containsRange ? "question-range-line" : ""}`} style={{ ...lineStyle, ...qcfLineStyle }}>{line.words.map(renderWord)}</div>;
              })}
            </div>
          </div>
        </div>
      )}

      <div className="question-preview-legend">
        <span><i aria-hidden="true" /> Selected passage</span>
        {range && <button type="button" onClick={() => onPageChange(range.startPage)}>Return to start · page {range.startPage}</button>}
      </div>
    </section>
  );
}
