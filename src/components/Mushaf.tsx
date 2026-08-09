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
import { judgingUnitId, judgingUnitsOf } from "../lib/judgingUnits";
import { loadPage, locationLabel, preloadPage, tokenId } from "../lib/page";
import type { MushafPage, PageWord } from "../lib/page";
import {
  loadQcfPageFont,
  preloadQcfPageFont,
  qcfFontFamily,
} from "../lib/qcfFont";
import { useJudging } from "../state/store";
import type { CategoryId, Mistake, TokenRole } from "../types";
import { DragMenu, type MenuAnchor } from "./DragMenu";

interface UnitTarget {
  tid: string;
  legacyTids: string[];
  unitIndex: number;
  glyph: string;
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
  tid: string;
  anchor: MenuAnchor;
  meta: WordHitbox;
}

const SEVERITY: Record<CategoryId, number> = { jali: 3, khafi: 2, fasaha: 1 };
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
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) {
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
  }, [currentPage, onPageChange]);

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
      const units = judgingUnitsOf(semanticText, role);
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
          tid: judgingUnitId(wid, unitIndex),
          legacyTids: unit.legacyGraphemeIndices.map((index) =>
            tokenId(wid, index),
          ),
          unitIndex,
          glyph: unit.glyph,
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

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAll();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, closeAll]);

  const activeUnit = active?.meta.units.find((unit) => unit.tid === active.tid);

  const commit = useCallback(
    (category: CategoryId) => {
      if (!active || !pageData) return;
      const unit = active.meta.units.find((candidate) => candidate.tid === active.tid);
      if (!unit) return;
      const mistake: Mistake = {
        id: uid(),
        tid: unit.tid,
        surah: active.meta.surah,
        ayah: active.meta.ayah,
        page: pageData.page,
        glyph: unit.glyph,
        label: locationLabel(
          active.meta.surah,
          active.meta.ayah,
          unit.unitIndex,
        ),
        category,
        amount: state.config[category].step,
        ts: Date.now(),
      };
      dispatch({ type: "ADD_MISTAKE", mistake });
    },
    [active, dispatch, pageData, state.config],
  );

  const onPointerDown = (event: React.PointerEvent) => {
    if (startRef.current) return;
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
    const firstUnit = box.units[0];
    if (!firstUnit) return;

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
        tid: firstUnit.tid,
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
    setHovered(pill ? (pill.dataset.pill as CategoryId) : null);
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
    if (hovered) {
      commit(hovered);
      closeAll();
    } else if (start && !start.moved && Date.now() - start.t < 500) {
      setPinned(true);
    } else {
      closeAll();
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
        <div className="page mushaf-loading">
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
        className={`page page-solid-mushaf ${pageData.lines.length < 15 ? "page-short-layout" : ""} ${pageLayout === "split" ? "page-split" : ""}`}
        ref={pageRef}
        data-page={pageData.page}
        data-font-ready={qcfReady ? "true" : "false"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={closeAll}
        onContextMenu={(event) => event.preventDefault()}
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

        <div className="hit-layer">
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
                  tabIndex={-1}
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
        </div>
      </div>

      {active && activeUnit && (
        <DragMenu
          anchor={active.anchor}
          glyph={active.meta.semanticText}
          units={active.meta.units.map((unit) => ({
            tid: unit.tid,
            glyph: unit.glyph,
            selected: unit.tid === active.tid,
          }))}
          hovered={hovered}
          pinned={pinned}
          config={state.config}
          onPick={(category) => {
            commit(category);
            closeAll();
          }}
          onUnitPick={(tid) => {
            if (!active.meta.units.some((unit) => unit.tid === tid)) return;
            setActive((current) => (current ? { ...current, tid } : current));
          }}
          onClose={closeAll}
        />
      )}
    </div>
  );
}
