import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CATEGORY_BY_ID } from "../config.ts";
import {
  MUSHAF_DATA_VERSION,
  MUSHAF_LAYOUT,
  loadPage,
  type MushafPage,
  type PageWord,
} from "../lib/page.ts";
import {
  QUESTION_INDEX_VERSION,
  loadQuestionIndex,
  recitationRangeMatchesQuestionIndex,
} from "../lib/questionBank.ts";
import type { EvidenceMistake } from "../lib/questionEvidence.ts";
import { loadQcfPageFont } from "../lib/qcfFont.ts";
import { wordIdsForEvidencePage } from "../lib/recitationEvidenceLayout.ts";
import { rangeDisplayForPage } from "../lib/recitationRangeLayout.ts";
import type { RecitationRangeSnapshot } from "../types.ts";
import { MushafPageSurface, MushafWord } from "./MushafPageSurface.tsx";

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
  const [activePageIndex, setActivePageIndex] = useState(0);
  const wordRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => setActivePageIndex(0), [range]);

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
    if (
      !activeMistakeKey ||
      !focusActiveWord ||
      loadState.status !== "ready"
    ) {
      return;
    }
    const activeMistake = mistakes.find((entry) => entry.key === activeMistakeKey);
    const pageIndex = activeMistake
      ? loadState.pages.findIndex((page) =>
          page.page === activeMistake.mistake.page ||
          page.lines.some((line) =>
            line.type !== "surah-header" &&
            line.words.some((word) => word.wid === activeMistake.mistake.wordId)
          )
        )
      : -1;
    if (pageIndex >= 0 && pageIndex !== activePageIndex) {
      setActivePageIndex(pageIndex);
    }
    requestAnimationFrame(() => {
      const target = wordRefs.current.get(activeMistakeKey);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.focus({ preventScroll: true });
    });
  }, [activeMistakeKey, activePageIndex, focusActiveWord, loadState, mistakes]);

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
      {loadState.pages.length > 1 && (
        <nav className="recitation-evidence-pager" aria-label="Recorded Quran pages">
          <button
            type="button"
            disabled={activePageIndex === 0}
            onClick={() => setActivePageIndex((current) => Math.max(0, current - 1))}
          >
            Previous
          </button>
          <span>
            Page <bdi>{loadState.pages[activePageIndex]?.page}</bdi> of {loadState.pages.length}
          </span>
          <button
            type="button"
            disabled={activePageIndex === loadState.pages.length - 1}
            onClick={() => setActivePageIndex((current) =>
              Math.min(loadState.pages.length - 1, current + 1)
            )}
          >
            Next
          </button>
        </nav>
      )}
      <div
        className={`recitation-evidence-pages mushaf-composition ${
          loadState.pages.length === 1
            ? "mushaf-single"
            : loadState.pages.length === 2
              ? "mushaf-spread"
              : "recitation-evidence-multi"
        }`}
        data-active-page={loadState.pages[activePageIndex]?.page}
      >
        {loadState.pages.map((page, pageIndex) => {
          const display = rangeDisplayForPage(page, range);
          if (!display) return null;
          const selectedIds = display.selectedWordIds;
          const qcfReady = loadState.fontPages.has(page.page);

          const renderWord = (word: PageWord) => {
            const inRange = word.role === "ornament" || selectedIds.has(word.wid);
            const wordMistakes = inRange ? mistakesByWord.get(word.wid) ?? [] : [];
            const firstMistake = wordMistakes[0];
            const isActive = Boolean(
              activeMistakeKey &&
              wordMistakes.some((entry) => entry.key === activeMistakeKey),
            );
            if (!firstMistake) {
              return (
                <MushafWord
                  key={word.wid}
                  word={word}
                  qcfReady={qcfReady}
                  className={inRange ? "" : "question-context-word evidence-context-word"}
                  aria-hidden={inRange ? undefined : true}
                />
              );
            }
            const categoryNames = [...new Set(
              wordMistakes.map(
                (entry) => CATEGORY_BY_ID[entry.mistake.category].label,
              ),
            )].join(", ");
            return (
              <MushafWord
                key={word.wid}
                word={word}
                qcfReady={qcfReady}
                className={`evidence-marked-word cat-${firstMistake.mistake.category} ${isActive ? "is-active" : ""}`}
              >
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
              </MushafWord>
            );
          };

          return (
            <MushafPageSurface
              key={page.page}
              data={page}
              qcfReady={qcfReady}
              className={`recitation-evidence-page ${pageIndex === activePageIndex ? "is-active" : ""}`}
              role="group"
              aria-label={`Recorded Quran page ${page.page}`}
              data-question-focus-mode="fade"
              lineClassName={(line) => {
                const state = display.lineStates.get(line.n);
                return state === "context"
                  ? "question-context-line evidence-context-line"
                  : state === "mixed"
                    ? "question-mixed-line"
                    : "";
              }}
              renderWord={(word) => renderWord(word)}
            />
          );
        })}
      </div>
      {loadState.fontPages.size !== loadState.pages.length && (
        <p className="recitation-font-note">
          Exact page font unavailable; showing verified Quran text fallback.
        </p>
      )}
    </div>
  );
}
