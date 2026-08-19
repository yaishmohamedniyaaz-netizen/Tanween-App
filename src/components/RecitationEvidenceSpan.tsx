import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { CATEGORY_BY_ID } from "../config.ts";
import surahIndex from "../data/surah-index.json";
import {
  MUSHAF_DATA_VERSION,
  MUSHAF_LAYOUT,
  loadPage,
  type MushafPage,
  type PageLine,
  type PageWord,
} from "../lib/page.ts";
import {
  QUESTION_INDEX_VERSION,
  loadQuestionIndex,
  recitationRangeMatchesQuestionIndex,
} from "../lib/questionBank.ts";
import type { EvidenceMistake } from "../lib/questionEvidence.ts";
import { loadQcfPageFont, qcfFontFamily } from "../lib/qcfFont.ts";
import {
  linesForEvidencePage,
  wordIdsForEvidencePage,
} from "../lib/recitationEvidenceLayout.ts";
import type { RecitationRangeSnapshot } from "../types.ts";

const SURAH_INDEX = surahIndex as Array<{
  number: number;
  nameAr: string;
  firstPage: number;
}>;

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      pages: MushafPage[];
      fontPages: Set<number>;
      selectedWordIds: Set<string>;
    };

function pageNumbers(range: RecitationRangeSnapshot): number[] {
  return Array.from(
    { length: range.endPage - range.startPage + 1 },
    (_, index) => range.startPage + index,
  );
}

function surahNamesForSegment(lines: PageLine[]): string {
  const numbers = new Set<number>();
  lines.forEach((line) => {
    if (line.type === "surah-header" || line.type === "basmala") {
      numbers.add(line.surah);
    } else {
      line.words.forEach((word) => numbers.add(word.surah));
    }
  });
  return [...numbers]
    .map((number) => SURAH_INDEX.find((surah) => surah.number === number)?.nameAr)
    .filter(Boolean)
    .join(" · ");
}

function SurahBand({ nameAr }: { nameAr: string }) {
  return (
    <div className="surah-band evidence-surah-band">
      <span className="surah-band-title">سُورَةُ {nameAr}</span>
    </div>
  );
}

export function RecitationEvidenceSpan({
  range,
  mistakes,
  activeMistakeKey,
  focusActiveWord = false,
  onMistakeSelect,
  onWordIdsReady,
}: {
  range: RecitationRangeSnapshot;
  mistakes: EvidenceMistake[];
  activeMistakeKey: string | null;
  focusActiveWord?: boolean;
  onMistakeSelect: (key: string) => void;
  onWordIdsReady?: (wordIds: Set<string> | null) => void;
}) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const wordRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    let cancelled = false;
    setLoadState({ status: "loading" });
    onWordIdsReady?.(null);
    const pages = pageNumbers(range);
    Promise.all([
      loadQuestionIndex(),
      Promise.all(pages.map((page) => loadPage(page))),
      Promise.all(
        pages.map((page) =>
          loadQcfPageFont(page)
            .then(() => page)
            .catch(() => null),
        ),
      ),
    ])
      .then(([index, loadedPages, loadedFonts]) => {
        if (cancelled) return;
        if (
          range.mushafLayout !== MUSHAF_LAYOUT ||
          range.sourceVersion !== MUSHAF_DATA_VERSION ||
          range.questionIndexVersion !== QUESTION_INDEX_VERSION ||
          range.layoutHash !== index.asset.layoutHash ||
          !recitationRangeMatchesQuestionIndex(index, range)
        ) {
          setLoadState({
            status: "error",
            message: "The recorded Mushaf source does not match this renderer.",
          });
          return;
        }
        const pageWordIds = loadedPages.map((page) =>
          wordIdsForEvidencePage(page, range)
        );
        if (pageWordIds.some((wordIds) => wordIds === null)) {
          setLoadState({
            status: "error",
            message: "The recorded word boundaries could not be verified.",
          });
          return;
        }
        const selectedWordIds = new Set(
          pageWordIds.flatMap((wordIds) => [...(wordIds ?? [])]),
        );
        setLoadState({
          status: "ready",
          pages: loadedPages,
          fontPages: new Set(
            loadedFonts.filter((page): page is number => page !== null),
          ),
          selectedWordIds,
        });
        onWordIdsReady?.(selectedWordIds);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadState({
            status: "error",
            message: "The recorded Quran pages could not be loaded.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [onWordIdsReady, range]);

  const mistakesByWord = useMemo(() => {
    const values = new Map<string, EvidenceMistake[]>();
    mistakes.forEach((entry) => {
      const wordId = entry.mistake.wordId;
      if (!wordId || entry.mistake.migrationStatus === "unresolved") return;
      values.set(wordId, [...(values.get(wordId) ?? []), entry]);
    });
    return values;
  }, [mistakes]);

  useEffect(() => {
    if (!activeMistakeKey || !focusActiveWord) return;
    const target = wordRefs.current.get(activeMistakeKey);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.focus({ preventScroll: true });
  }, [activeMistakeKey, focusActiveWord]);

  if (loadState.status === "loading") {
    return (
      <div className="recitation-evidence-state" role="status">
        <span className="loading-spinner" /> Loading recorded Quran pages…
      </div>
    );
  }
  if (loadState.status === "error") {
    return (
      <div className="recitation-evidence-state is-error" role="alert">
        <strong>Exact recitation view unavailable</strong>
        <span>{loadState.message}</span>
      </div>
    );
  }

  return (
    <div className="recitation-evidence-span" aria-label="Recorded recitation span">
      {loadState.pages.map((page, pageIndex) => {
        const lines = linesForEvidencePage(page, range);
        const selectedIds = wordIdsForEvidencePage(page, range) ?? new Set<string>();
        const qcfReady = loadState.fontPages.has(page.page);
        const lineStyle: CSSProperties = qcfReady
          ? { fontFamily: `"${qcfFontFamily(page.page)}"` }
          : { fontFamily: "var(--quran)" };

        const renderWord = (word: PageWord) => {
          const inRange = word.role === "ornament" || selectedIds.has(word.wid);
          const wordMistakes = mistakesByWord.get(word.wid) ?? [];
          const firstMistake = wordMistakes[0];
          const isActive = Boolean(
            activeMistakeKey &&
            wordMistakes.some((entry) => entry.key === activeMistakeKey),
          );
          const content = qcfReady && word.glyph ? word.glyph : word.text;
          if (!inRange) {
            return (
              <span
                key={word.wid}
                className="m-word evidence-context-word"
                aria-hidden="true"
              >
                {content}
              </span>
            );
          }
          if (!firstMistake) {
            return (
              <span key={word.wid} className="m-word">
                <span aria-hidden="true">{content}</span>
                <span className="evidence-semantic-word">{word.text}</span>
              </span>
            );
          }
          const categoryNames = [...new Set(
            wordMistakes.map(
              (entry) => CATEGORY_BY_ID[entry.mistake.category].label,
            ),
          )].join(", ");
          return (
            <span
              key={word.wid}
              className={`m-word evidence-marked-word cat-${firstMistake.mistake.category} ${isActive ? "is-active" : ""}`}
            >
              <span aria-hidden="true">{content}</span>
              <button
                ref={(node) => {
                  wordMistakes.forEach((entry) => {
                    if (node) wordRefs.current.set(entry.key, node);
                    else wordRefs.current.delete(entry.key);
                  });
                }}
                type="button"
                className="evidence-marker-button"
                aria-label={`${word.text}. ${wordMistakes.length} recorded mistake${wordMistakes.length === 1 ? "" : "s"}: ${categoryNames}`}
                aria-pressed={isActive}
                onClick={() => onMistakeSelect(firstMistake.key)}
              />
              {wordMistakes.length > 1 && (
                <span className="evidence-mark-count" aria-hidden="true">
                  {wordMistakes.length}
                </span>
              )}
            </span>
          );
        };

        return (
          <section className="recitation-evidence-page" key={page.page}>
            {pageIndex > 0 && <div className="recitation-page-seam" aria-hidden="true" />}
            <header className="recitation-evidence-page-head">
              <span dir="rtl">{surahNamesForSegment(lines)}</span>
              <strong>Page <bdi>{page.page}</bdi></strong>
            </header>
            <div className="recitation-evidence-lines" dir="rtl">
              {lines.map((line) => {
                if (line.type === "surah-header") {
                  return <SurahBand key={line.n} nameAr={line.nameAr} />;
                }
                if (line.type === "basmala") {
                  return (
                    <div key={line.n} className="m-line m-line-basmala">
                      {line.words.map(renderWord)}
                    </div>
                  );
                }
                return (
                  <div
                    key={line.n}
                    data-mline={line.n}
                    className={`m-line ${line.centered ? "m-line-center" : "m-line-ayah"}`}
                    style={lineStyle}
                  >
                    {line.words.map(renderWord)}
                  </div>
                );
              })}
            </div>
            {!qcfReady && (
              <p className="recitation-font-note">
                Exact page font unavailable; showing verified Quran text fallback.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
