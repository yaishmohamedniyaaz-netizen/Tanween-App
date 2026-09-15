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
import type { ReplayWord } from "../lib/recitationReplay.ts";
import { fixedMushafReviewEnabled } from "../lib/fixedMushafReview";
import { fixedMushafLoader, useFixedMushafPages } from "../hooks/useFixedMushafPages";
import { FixedMushafPageSurface } from "./FixedMushafPageSurface";
import { useFixedCompactPages } from "./ConnectedFixedMushaf";
import { evidencePageWindow } from "../lib/reviewNavigation";

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
  onReplayWordsReady,
  onReplayWordSelect,
  replayWordId = null,
  selectedWordId = null,
  wordReplayMode = false,
  paginated = false,
  spread = false,
  locationRequest = 0,
}: {
  range: RecitationRangeSnapshot;
  mistakes: EvidenceMistake[];
  activeMistakeKey: string | null;
  focusActiveWord?: boolean;
  onMistakeSelect: (key: string) => void;
  onWordIdsReady?: (wordIds: Set<string> | null) => void;
  onReplayWordsReady?: (words: ReplayWord[]) => void;
  onReplayWordSelect?: (wordId: string) => void;
  replayWordId?: string | null;
  selectedWordId?: string | null;
  wordReplayMode?: boolean;
  paginated?: boolean;
  spread?: boolean;
  locationRequest?: number;
}) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [fixedReview] = useState(fixedMushafReviewEnabled);
  const compact = useFixedCompactPages();
  const rangePages = pageNumbers(range);
  const pageWindow = evidencePageWindow(activePageIndex, rangePages.length,
    paginated ? spread && (!fixedReview || !compact) : !compact && rangePages.length === 2);
  const visibleFixedPages = fixedReview && loadState.status === "ready"
    ? rangePages.slice(pageWindow.start, pageWindow.end)
    : [];
  const fixed = useFixedMushafPages(visibleFixedPages);
  const wordRefs = useRef(new Map<string, HTMLButtonElement>());
  const focusedRequest = useRef<string | null>(null);

  useEffect(() => setActivePageIndex(0), [range]);

  useEffect(() => {
    let cancelled = false;
    const abort = new AbortController();
    setLoadState({ status: "loading" });
    onWordIdsReady?.(null);
    onReplayWordsReady?.([]);
    const pages = pageNumbers(range);
    Promise.all([
      loadQuestionIndex(),
      Promise.all(pages.map((page) => fixedReview ? fixedMushafLoader.text(page, abort.signal) : loadPage(page))),
      Promise.all(
        pages.map((page) =>
          (fixedReview ? Promise.resolve() : loadQcfPageFont(page))
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
        onReplayWordsReady?.(loadedPages.flatMap((page) => page.lines.flatMap((line) =>
          line.type === "surah-header" ? [] : line.words.filter((word) =>
            word.role === "letter" && selectedWordIds.has(word.wid)).map((word) => ({
              wordId: word.wid, text: word.text, surah: word.surah, ayah: word.ayah,
              ...(word.glyph ? { presentation: { page: page.page, glyph: word.glyph } } : {}),
            })))));
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
      abort.abort();
    };
  }, [onWordIdsReady, onReplayWordsReady, range, fixedReview]);

  useEffect(() => {
    if (!replayWordId || loadState.status !== "ready") return;
    const index = loadState.pages.findIndex((page) => page.lines.some((line) =>
      line.type !== "surah-header" && line.words.some((word) => word.wid === replayWordId)));
    if (index >= 0) setActivePageIndex(index);
  }, [replayWordId, loadState]);

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
    if (pageIndex >= 0) {
      setActivePageIndex(pageIndex);
    }
  }, [activeMistakeKey, focusActiveWord, loadState, mistakes, locationRequest]);

  useEffect(() => {
    if (!activeMistakeKey || !focusActiveWord || loadState.status !== "ready") return;
    const requestKey = `${activeMistakeKey}:${locationRequest}`;
    if (focusedRequest.current === requestKey) return;
    const frame = requestAnimationFrame(() => {
      const target = wordRefs.current.get(activeMistakeKey);
      if (!target || !target.getClientRects().length) return;
      focusedRequest.current = requestKey;
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeMistakeKey, activePageIndex, focusActiveWord, loadState, mistakes, fixed.pages, locationRequest]);

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
    <div className={`recitation-evidence-span ${fixedReview ? "fixed-evidence-span" : ""}${paginated ? " is-paginated" : ""}`} aria-label="Recorded recitation span">
      {loadState.pages.length > pageWindow.size && (
        <nav className="recitation-evidence-pager" aria-label="Recorded Quran pages">
          <button
            type="button"
            disabled={pageWindow.start === 0}
            onClick={() => setActivePageIndex(Math.max(0, pageWindow.start - pageWindow.size))}
          >
            Previous
          </button>
          <span>
            Page <bdi>{loadState.pages[pageWindow.start]?.page}{pageWindow.end - pageWindow.start > 1 ? `–${loadState.pages[pageWindow.end - 1]?.page}` : ""}</bdi> · {pageWindow.start + 1} of {loadState.pages.length}
          </span>
          <button
            type="button"
            disabled={pageWindow.end === loadState.pages.length}
            onClick={() => setActivePageIndex(Math.min(loadState.pages.length - 1, pageWindow.end))}
          >
            Next
          </button>
        </nav>
      )}
      {fixedReview && !fixed.pages && <div className="recitation-evidence-state" role={fixed.error ? "alert" : "status"}>
        {fixed.error || "Loading recorded Mushaf…"}
        {fixed.error && <button type="button" onClick={fixed.retry}>Retry</button>}
      </div>}
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
          if (paginated && (pageIndex < pageWindow.start || pageIndex >= pageWindow.end)) return null;
          const geometry = fixedReview ? fixed.pages?.get(page.page) : undefined;
          if (fixedReview && !geometry) return null;
          const display = rangeDisplayForPage(page, range);
          if (!display) return null;
          const selectedIds = display.selectedWordIds;
          const qcfReady = !fixedReview && loadState.fontPages.has(page.page);

          const renderWord = (word: PageWord) => {
            const inRange = word.role === "ornament" || selectedIds.has(word.wid);
            const wordMistakes = inRange ? mistakesByWord.get(word.wid) ?? [] : [];
            const firstMistake = wordMistakes[0];
            const isActive = Boolean(
              selectedWordId === word.wid || (activeMistakeKey &&
              wordMistakes.some((entry) => entry.key === activeMistakeKey)),
            );
            if (!firstMistake) {
              const replayable = Boolean(onReplayWordSelect && inRange && word.role === "letter");
              return (
                <MushafWord
                  key={word.wid}
                  word={word}
                  qcfReady={qcfReady}
                  className={`${inRange ? "" : "question-context-word evidence-context-word"} ${replayable ? "evidence-replay-word" : ""} ${replayable && isActive ? "is-active" : ""} ${replayWordId === word.wid ? "is-replay-focus" : ""}`}
                  aria-hidden={inRange ? undefined : true}
                >
                  {replayable && <button type="button" className="evidence-replay-button"
                    aria-label={`${wordReplayMode ? "Replay from" : "Inspect word"} ${word.text}`} aria-pressed={selectedWordId === word.wid} onClick={() => onReplayWordSelect?.(word.wid)} />}
                </MushafWord>
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
                className={`evidence-marked-word cat-${firstMistake.mistake.category} ${isActive ? "is-active" : ""} ${replayWordId === word.wid ? "is-replay-focus" : ""}`}
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
                  aria-label={`${wordReplayMode ? "Replay from " : ""}${word.text}. ${wordMistakes.length} recorded mistake${wordMistakes.length === 1 ? "" : "s"}: ${categoryNames}`}
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

          const surfaceProps = {
              data: page,
              qcfReady,
              className: `recitation-evidence-page ${paginated || pageIndex === activePageIndex ? "is-active" : ""}`,
              role: "group" as const,
              "aria-label": `Recorded Quran page ${page.page}`,
              "data-question-focus-mode": "fade",
              lineClassName: (line: MushafPage["lines"][number]) => {
                const state = display.lineStates.get(line.n);
                return state === "context" ? "question-context-line evidence-context-line"
                  : state === "mixed" ? "question-mixed-line" : "";
              },
              renderWord: (word: PageWord) => renderWord(word),
          };
          return geometry
            ? <FixedMushafPageSurface key={page.page} {...surfaceProps} fixed={geometry} />
            : <MushafPageSurface key={page.page} {...surfaceProps} />;
        })}
      </div>
      {!fixedReview && loadState.fontPages.size !== loadState.pages.length && (
        <p className="recitation-font-note">
          Exact page font unavailable; showing verified Quran text fallback.
        </p>
      )}
    </div>
  );
}
