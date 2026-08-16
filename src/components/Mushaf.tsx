import {
  Fragment,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { juzByPage, sajdahVerses } from "../data/marginalia";
import surahIndex from "../data/surah-index.json";
import { uid } from "../lib/id";
import {
  judgingTargetsOf,
  TARGET_RULE_VERSION,
  TARGET_SCHEMA_VERSION,
  TARGET_SOURCE_VERSION,
} from "../lib/judgingUnits";
import { loadPage, locationLabel, preloadPage } from "../lib/page";
import type { MushafPage, PageWord } from "../lib/page";
import {
  loadQcfPageFont,
  preloadQcfPageFont,
  qcfFontFamily,
} from "../lib/qcfFont";
import { useJudging } from "../state/store";
import { enabledCategories, isPinpointCategory } from "../config";
import type { CategoryId, Mistake, TokenRole } from "../types";
import { DragMenu, type MenuAnchor } from "./DragMenu";

interface UnitTarget {
  tid: string;
  legacyTids: string[];
  unitIndex: number;
  start: number;
  end: number;
  primaryGlyph: string;
  fullGlyph: string;
}

interface WordHitbox {
  wid: string;
  semanticText: string;
  units: UnitTarget[];
  role: TokenRole;
  surah: number;
  ayah: number | null;
  // Tight visible word rectangle.
  x: number;
  y: number;
  w: number;
  h: number;
  // Slightly larger invisible touch rectangle.
  hx: number;
  hy: number;
  hw: number;
  hh: number;
}

interface ActiveDrag {
  /** No target is implied by opening the tray. */
  tid: string | null;
  anchor: MenuAnchor;
  meta: WordHitbox;
}

const SEVERITY: Record<CategoryId, number> = {
  jali: 3,
  khafi: 2,
  fasaha: 1,
  "adu-raagu": 0,
};
const HIT_PAD_X = 3;
const HIT_PAD_Y = 5;
const MOVE_THRESHOLD = 6;

const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
function toArabicNum(n: number): string {
  return String(n)
    .split("")
    .map((digit) => ARABIC_DIGITS[Number(digit)])
    .join("");
}

/** The Mushaf jump event, fired by the mistake log. */
export const JUMP_EVENT = "tahqeeq:jump";

function dominant(mistakes: Mistake[]): CategoryId {
  return mistakes.reduce((current, mistake) =>
    SEVERITY[mistake.category] > SEVERITY[current.category]
      ? mistake
      : current,
  ).category;
}

const SURAH_INDEX = surahIndex as Array<{
  number: number;
  nameAr: string;
  firstPage: number;
}>;

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
}: {
  nameAr: string;
  style: CSSProperties;
}) {
  return (
    <div className="surah-band" style={style}>
      <span className="surah-band-title">سُورَةُ {nameAr}</span>
    </div>
  );
}

interface MushafProps {
  page: number;
  pageLayout: "full" | "split";
  onPageChange: (page: number) => void;
  headerControls: ReactNode;
}

export function Mushaf({
  page: currentPage,
  pageLayout,
  onPageChange,
  headerControls,
}: MushafProps) {
  const { state, dispatch } = useJudging();
  const assignedConfig = state.activeAssignment?.config ?? state.config;
  // Only pinpoint criteria are marked on the page. A judge who owns just a
  // whole-recitation criterion has nothing to press here.
  const allowedCategories = (
    state.activeAssignment?.categories ?? enabledCategories(assignedConfig)
  ).filter(isPinpointCategory);
  const judgingEnabled = state.sessionActive && allowedCategories.length > 0;
  const [pageData, setPageData] = useState<MushafPage | null>(null);
  const [fontReadyPage, setFontReadyPage] = useState<number | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [boxes, setBoxes] = useState<WordHitbox[]>([]);
  const [boxesPage, setBoxesPage] = useState<number | null>(null);
  const [measureEpoch, setMeasureEpoch] = useState(0);
  const [flashTid, setFlashTid] = useState<string | null>(null);
  const [pendingFlashTid, setPendingFlashTid] = useState<string | null>(null);

  const [active, setActive] = useState<ActiveDrag | null>(null);
  const [hovered, setHovered] = useState<CategoryId | null>(null);
  const [pinned, setPinned] = useState(false);
  const startRef = useRef<{
    x: number;
    y: number;
    t: number;
    moved: boolean;
    pointerId: number;
  } | null>(null);

  const byTid = useMemo(() => {
    const map = new Map<string, Mistake[]>();
    for (const mistake of state.mistakes) {
      const existing = map.get(mistake.tid);
      if (existing) existing.push(mistake);
      else map.set(mistake.tid, [mistake]);
    }
    return map;
  }, [state.mistakes]);

  // Page data and its matching QCF font become visible in the same commit.
  // The previous page remains intact while both are loading.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadPage(currentPage),
      loadQcfPageFont(currentPage)
        .then(() => true)
        .catch(() => false),
    ]).then(([data, fontLoaded]) => {
      if (cancelled) return;
      setFontReadyPage(fontLoaded ? currentPage : null);
      setPageData(data);
    });
    return () => {
      cancelled = true;
    };
  }, [currentPage]);

  // Warm both the page JSON and its small page-specific font.
  useEffect(() => {
    for (let distance = 1; distance <= 2; distance += 1) {
      const previous = currentPage - distance;
      const next = currentPage + distance;
      if (previous >= 1) {
        preloadPage(previous);
        preloadQcfPageFont(previous);
      }
      if (next <= 604) {
        preloadPage(next);
        preloadQcfPageFont(next);
      }
    }
  }, [currentPage]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || active) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          "input, textarea, select, button, [role='button'], [role='dialog'], [contenteditable='true']",
        )
      ) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onPageChange(Math.min(604, currentPage + 1));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onPageChange(Math.max(1, currentPage - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, currentPage, onPageChange]);

  // QCF source words are single calligraphic glyphs. Measure one rectangle for
  // the whole kalimah; semantic letter units live only in the connected rail.
  const measure = useCallback(() => {
    const root = pageRef.current;
    if (!root) return;
    const rootRect = root.getBoundingClientRect();
    const wordElements = root.querySelectorAll<HTMLElement>(
      '.m-word[data-role="letter"]',
    );
    const next: WordHitbox[] = [];

    wordElements.forEach((wordElement) => {
      const semanticText = wordElement.dataset.semantic ?? "";
      const wid = wordElement.dataset.wid;
      if (!wid || !semanticText) return;
      const role = (wordElement.dataset.role as TokenRole) ?? "letter";
      const units = judgingTargetsOf(semanticText, role, wid);
      if (!units.length) return;

      const rect = wordElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const surah = Number(wordElement.dataset.surah);
      const ayahValue = wordElement.dataset.ayah;
      const ayah = ayahValue === "b" ? null : Number(ayahValue);
      const x = rect.left - rootRect.left;
      const y = rect.top - rootRect.top;

      next.push({
        wid,
        semanticText,
        role,
        surah,
        ayah,
        units: units.map((unit, unitIndex) => ({
          tid: unit.tid,
          legacyTids: unit.aliases,
          unitIndex,
          start: unit.start,
          end: unit.end,
          primaryGlyph: unit.primaryGlyph,
          fullGlyph: unit.fullGlyph,
        })),
        x,
        y,
        w: rect.width,
        h: rect.height,
        hx: x - HIT_PAD_X,
        hy: y - HIT_PAD_Y,
        hw: rect.width + HIT_PAD_X * 2,
        hh: rect.height + HIT_PAD_Y * 2,
      });
    });

    setBoxes(next);
    setBoxesPage(Number(root.dataset.page));
  }, []);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [fontReadyPage, measure, measureEpoch, pageData?.page, pageLayout]);

  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;
    let lastWidth = Math.round(root.getBoundingClientRect().width);
    const handleResize = () => {
      const width = Math.round(root.getBoundingClientRect().width);
      if (Math.abs(width - lastWidth) < 2) return;
      lastWidth = width;
      setMeasureEpoch((value) => value + 1);
    };
    const observer =
      "ResizeObserver" in window ? new ResizeObserver(handleResize) : null;
    observer?.observe(root);
    window.addEventListener("resize", handleResize);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [pageData?.page]);

  const wordForTid = useCallback(
    (tid: string) =>
      boxes.find((box) =>
        box.units.some(
          (unit) => unit.tid === tid || unit.legacyTids.includes(tid),
        ),
      ),
    [boxes],
  );

  useEffect(() => {
    if (!pendingFlashTid || !boxes.length) return;
    const box = wordForTid(pendingFlashTid);
    if (!box) return;
    const element = pageRef.current?.querySelector<HTMLElement>(
      `[data-word-hit="${CSS.escape(box.wid)}"]`,
    );
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashTid(null);
    requestAnimationFrame(() => setFlashTid(pendingFlashTid));
    setPendingFlashTid(null);
  }, [boxes, pendingFlashTid, wordForTid]);

  useEffect(() => {
    const onJump = (event: Event) => {
      const detail = (event as CustomEvent<{ tid: string; page?: number }>).detail;
      if (!detail?.tid) return;
      const targetPage = detail.page ?? 604;
      if (targetPage !== pageData?.page) {
        setPendingFlashTid(detail.tid);
        onPageChange(targetPage);
        return;
      }
      const box = wordForTid(detail.tid);
      if (!box) return;
      const element = pageRef.current?.querySelector<HTMLElement>(
        `[data-word-hit="${CSS.escape(box.wid)}"]`,
      );
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      setFlashTid(null);
      requestAnimationFrame(() => setFlashTid(detail.tid));
    };
    window.addEventListener(JUMP_EVENT, onJump);
    return () => window.removeEventListener(JUMP_EVENT, onJump);
  }, [onPageChange, pageData?.page, wordForTid]);

  useEffect(() => {
    if (!flashTid) return;
    const timer = window.setTimeout(() => setFlashTid(null), 1300);
    return () => window.clearTimeout(timer);
  }, [flashTid]);

  const closeAll = useCallback(() => {
    startRef.current = null;
    setActive(null);
    setHovered(null);
    setPinned(false);
  }, []);

  // A tray never survives navigation or a structural page-layout change.
  useEffect(() => closeAll(), [closeAll, currentPage, pageLayout]);

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (!event.defaultPrevented && event.key === "Escape") closeAll();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, closeAll]);

  const activeUnit = active?.tid
    ? active.meta.units.find((unit) => unit.tid === active.tid)
    : null;
  const commit = useCallback(
    (category: CategoryId, tidOverride?: string | null) => {
      if (!active || !pageData) return;
      if (!allowedCategories.includes(category)) return;
      const selectedTid = tidOverride ?? active.tid;
      if (!selectedTid) return;
      const unit = active.meta.units.find((candidate) => candidate.tid === selectedTid);
      if (!unit) return;
      const mistake: Mistake = {
        id: uid(),
        tid: unit.tid,
        targetVersion: TARGET_SCHEMA_VERSION,
        sourceVersion: TARGET_SOURCE_VERSION,
        ruleVersion: TARGET_RULE_VERSION,
        wordId: active.meta.wid,
        wordText: active.meta.semanticText,
        sourceStart: unit.start,
        sourceEnd: unit.end,
        primaryGlyph: unit.primaryGlyph,
        fullGlyph: unit.fullGlyph,
        surah: active.meta.surah,
        ayah: active.meta.ayah,
        page: pageData.page,
        glyph: unit.fullGlyph,
        label: locationLabel(
          active.meta.surah,
          active.meta.ayah,
          unit.unitIndex,
        ),
        category,
        judgeSeatId: state.activeAssignment?.judgeSeatId,
        amount: (state.activeAssignment?.config ?? state.config)[category].step,
        ts: Date.now(),
      };
      dispatch({ type: "ADD_MISTAKE", mistake });
    },
    [active, allowedCategories, dispatch, pageData, state.activeAssignment, state.config],
  );

  const onPointerDown = (event: React.PointerEvent) => {
    if (!judgingEnabled) return;
    if (startRef.current) return;
    // Navigation lives inside the page frame. Its pointer events must never
    // fall through to a kalimah underneath the popover.
    if ((event.target as HTMLElement).closest(".page-marginalia")) return;
    const root = pageRef.current;
    if (!root) return;
    const rootRect = root.getBoundingClientRect();
    const pointX = event.clientX - rootRect.left;
    const pointY = event.clientY - rootRect.top;
    const candidates = boxes.filter(
      (box) =>
        pointX >= box.hx &&
        pointX <= box.hx + box.hw &&
        pointY >= box.hy &&
        pointY <= box.hy + box.hh,
    );
    const box = candidates.reduce<WordHitbox | null>((closest, candidate) => {
      const score =
        ((pointX - (candidate.hx + candidate.hw / 2)) /
          Math.max(candidate.hw, 4)) **
          2 +
        ((pointY - (candidate.hy + candidate.hh / 2)) /
          Math.max(candidate.hh, 4)) **
          2;
      if (!closest) return candidate;
      const closestScore =
        ((pointX - (closest.hx + closest.hw / 2)) /
          Math.max(closest.hw, 4)) **
          2 +
        ((pointY - (closest.hy + closest.hh / 2)) /
          Math.max(closest.hh, 4)) **
          2;
      return score < closestScore ? candidate : closest;
    }, null);

    if (!box) {
      if (pinned) closeAll();
      return;
    }
    if (!box.units.length) return;

    event.preventDefault();
    const target = root.querySelector<HTMLElement>(
      `.hit[data-word-hit="${CSS.escape(box.wid)}"]`,
    );
    if (!target) return;
    const rect = target.getBoundingClientRect();
    try {
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is optional on older mobile browsers.
    }
    startRef.current = {
      x: event.clientX,
      y: event.clientY,
      t: Date.now(),
      moved: false,
      pointerId: event.pointerId,
    };
    flushSync(() => {
      setHovered(null);
      setPinned(false);
      setActive({
        tid: null,
        meta: box,
        anchor: {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        },
      });
    });
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!active || pinned) return;
    if (startRef.current && event.pointerId !== startRef.current.pointerId) return;
    const start = startRef.current;
    if (start) {
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.hypot(dx, dy) > MOVE_THRESHOLD) start.moved = true;
    }

    const element = document.elementFromPoint(event.clientX, event.clientY);
    const unitTarget = element?.closest<HTMLElement>("[data-unit-tid]");
    const nextTid = unitTarget?.dataset.unitTid;
    if (
      nextTid &&
      nextTid !== active.tid &&
      active.meta.units.some((unit) => unit.tid === nextTid)
    ) {
      setActive((current) => (current ? { ...current, tid: nextTid } : current));
    }
    const pill = element?.closest<HTMLElement>("[data-pill]");
    setHovered(
      pill && (nextTid || active.tid)
        ? (pill.dataset.pill as CategoryId)
        : null,
    );
  };

  const onPointerUp = (event: React.PointerEvent) => {
    if (!active) return;
    if (startRef.current && event.pointerId !== startRef.current.pointerId) return;
    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture is optional on older mobile browsers.
    }
    const start = startRef.current;
    startRef.current = null;
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const finalUnit = element?.closest<HTMLElement>("[data-unit-tid]");
    const finalTid = finalUnit?.dataset.unitTid;
    const validFinalTid = finalTid && active.meta.units.some((unit) => unit.tid === finalTid)
      ? finalTid
      : null;
    if (allowedCategories.length === 1 && start?.moved && validFinalTid) {
      commit(allowedCategories[0], validFinalTid);
      closeAll();
    } else if (hovered && active.tid && allowedCategories.includes(hovered)) {
      commit(hovered);
      closeAll();
    } else if (start && !start.moved && Date.now() - start.t < 500) {
      setPinned(true);
    } else {
      closeAll();
    }
  };

  const openPinnedForBox = (
    event: React.KeyboardEvent<HTMLElement>,
    box: WordHitbox,
  ) => {
    if (!judgingEnabled) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setHovered(null);
    setPinned(true);
    setActive({
      tid: null,
      meta: box,
      anchor: {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      },
    });
  };

  const closeTray = () => {
    const returnFocusWid = pinned ? active?.meta.wid : null;
    closeAll();
    if (returnFocusWid) {
      window.setTimeout(() => {
        pageRef.current
          ?.querySelector<HTMLElement>(
            `[data-word-hit="${CSS.escape(returnFocusWid)}"]`,
          )
          ?.focus({ preventScroll: true });
      }, 0);
    }
  };

  const sajdahSet = useMemo(() => {
    const set = new Set<string>();
    for (const { surah, ayah } of sajdahVerses) set.add(`${surah}:${ayah}`);
    return set;
  }, []);

  const qcfReady = pageData?.page === fontReadyPage;
  const renderWord = (word: PageWord) => {
    const isSajdah =
      word.role === "ayah-end" &&
      word.ayah !== null &&
      sajdahSet.has(`${word.surah}:${word.ayah}`);
    const displayedText = qcfReady && word.glyph ? word.glyph : word.text;
    return (
      <span
        key={word.wid}
        className={`m-word ${word.role === "ayah-end" ? "ayah-num" : ""} ${word.role === "ornament" ? "m-ornament" : ""} ${isSajdah ? "sajdah" : ""}`}
        data-wid={word.wid}
        data-semantic={word.text}
        data-role={word.role}
        data-surah={word.surah}
        data-ayah={word.ayah === null ? "b" : String(word.ayah)}
        aria-label={word.role === "letter" ? word.text : undefined}
        aria-hidden={word.role !== "letter" ? true : undefined}
      >
        {displayedText}
        {isSajdah && (
          <span className="sajdah-mark" aria-label="Sajdah">
            ۩
          </span>
        )}
      </span>
    );
  };

  if (!pageData) {
    return (
      <div className="mushaf-scroll">
        <div className={`page mushaf-loading ${pageLayout === "split" ? "page-split" : ""}`}>
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  const pageSurahs = surahsForPage(pageData.page);
  const visibleBoxes = boxesPage === pageData.page ? boxes : [];
  const mistakesForUnit = (unit: UnitTarget): Mistake[] => {
    const seen = new Set<string>();
    const matches: Mistake[] = [];
    for (const id of [unit.tid, ...unit.legacyTids]) {
      for (const mistake of byTid.get(id) ?? []) {
        if (seen.has(mistake.id)) continue;
        seen.add(mistake.id);
        matches.push(mistake);
      }
    }
    return matches;
  };
  const mistakesForWord = (box: WordHitbox): Mistake[] => {
    const seen = new Set<string>();
    const matches: Mistake[] = [];
    for (const unit of box.units) {
      for (const mistake of mistakesForUnit(unit)) {
        if (seen.has(mistake.id)) continue;
        seen.add(mistake.id);
        matches.push(mistake);
      }
    }
    return matches;
  };
  const lineStyle = (line: number): CSSProperties =>
    pageLayout === "split"
      ? {
          gridRow: ((line - 1) % 8) + 1,
          gridColumn: line <= 8 ? 2 : 1,
        }
      : { gridRow: line };
  const qcfLineStyle: CSSProperties = qcfReady
    ? { fontFamily: `"${qcfFontFamily(pageData.page)}"` }
    : { fontFamily: "var(--quran)" };

  return (
    <div className="mushaf-scroll">
      <div
        className={`page page-solid-mushaf ${pageData.page <= 2 ? "page-opening-layout" : pageData.lines.length < 15 ? "page-short-layout" : ""} ${pageLayout === "split" ? "page-split" : ""}`}
        ref={pageRef}
        data-page={pageData.page}
        data-font-ready={qcfReady ? "true" : "false"}
        data-judging-enabled={judgingEnabled ? "true" : "false"}
        onPointerDown={judgingEnabled ? onPointerDown : undefined}
        onPointerMove={judgingEnabled ? onPointerMove : undefined}
        onPointerUp={judgingEnabled ? onPointerUp : undefined}
        onPointerCancel={judgingEnabled ? closeAll : undefined}
        onContextMenu={judgingEnabled ? (event) => event.preventDefault() : undefined}
      >
        <div className="page-marginalia">
          <span className="page-juz">Juz&apos; {juzByPage[pageData.page]}</span>
          {headerControls}
          <span className="page-surahs" dir="rtl">
            {pageSurahs.map((surah) => surah.nameAr).join(" - ")}
          </span>
        </div>
        {juzByPage[pageData.page] > 0 && (
          <div className="juz-label">
            الجزء {toArabicNum(juzByPage[pageData.page])}
          </div>
        )}
        <div className="mushaf-lines">
          {pageData.lines.map((line) => {
            if (line.type === "surah-header") {
              return (
                <SurahBand
                  key={line.n}
                  nameAr={line.nameAr}
                  style={lineStyle(line.n)}
                />
              );
            }
            if (line.type === "basmala") {
              return (
                <div
                  key={line.n}
                  className="m-line m-line-basmala"
                  style={lineStyle(line.n)}
                >
                  {line.words.map(renderWord)}
                </div>
              );
            }
            return (
              <div
                key={line.n}
                data-mline={line.n}
                className={`m-line ${line.centered ? "m-line-center" : "m-line-ayah"}`}
                style={{ ...lineStyle(line.n), ...qcfLineStyle }}
              >
                {line.words.map(renderWord)}
              </div>
            );
          })}
        </div>

        {judgingEnabled && <div className="hit-layer">
          {visibleBoxes.map((box) => {
            const mistakes = mistakesForWord(box);
            const category = mistakes.length ? dominant(mistakes) : null;
            const isActive = active?.meta.wid === box.wid;
            const isFlashing = Boolean(
              flashTid &&
                box.units.some(
                  (unit) =>
                    unit.tid === flashTid || unit.legacyTids.includes(flashTid),
                ),
            );
            const inkClasses = [
              "glyph-ink",
              category ? `marked cat-${category}` : "",
              isFlashing ? `flash ${category ? "" : "cat-fasaha"}` : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <Fragment key={box.wid}>
                <div
                  data-word-hit={box.wid}
                  className={`hit word-hit ${isActive ? `armed ${hovered ? `cat-${hovered}` : ""}` : ""}`}
                  style={
                    {
                      left: box.hx,
                      top: box.hy,
                      width: box.hw,
                      height: box.hh,
                      "--ink-left": `${box.x - box.hx}px`,
                      "--ink-top": `${box.y - box.hy}px`,
                      "--ink-width": `${box.w}px`,
                      "--ink-height": `${box.h}px`,
                    } as CSSProperties
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => openPinnedForBox(event, box)}
                  aria-label={
                    mistakes.length
                      ? `${box.semanticText}, ${mistakes.length} mark(s)`
                      : `Select word ${box.semanticText}`
                  }
                />
                {(mistakes.length > 0 || isFlashing) && (
                  <div
                    className={inkClasses}
                    style={{
                      left: box.x,
                      top: box.y,
                      width: box.w,
                      height: box.h,
                    }}
                  >
                    {mistakes.length > 1 && (
                      <span className="mark-count">{mistakes.length}</span>
                    )}
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>}
      </div>

      {judgingEnabled && active && (
        <DragMenu
          anchor={active.anchor}
          glyph={active.meta.semanticText}
          units={active.meta.units.map((unit) => ({
            tid: unit.tid,
            primaryGlyph: unit.primaryGlyph,
            fullGlyph: unit.fullGlyph,
            selected: unit.tid === active.tid,
          }))}
          targetSelected={Boolean(activeUnit)}
          hovered={hovered}
          pinned={pinned}
          config={state.activeAssignment?.config ?? state.config}
          allowedCategories={allowedCategories}
          onPick={(category) => {
            commit(category);
            closeTray();
          }}
          onUnitPick={(tid) => {
            if (!active.meta.units.some((unit) => unit.tid === tid)) return;
            setActive((current) => (current ? { ...current, tid } : current));
          }}
          onClose={closeTray}
        />
      )}
    </div>
  );
}
