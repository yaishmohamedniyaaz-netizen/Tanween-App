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
import type { ReadyFixedPage } from '../lib/readyFixedPages';
import { uid } from "../lib/id";
import {
  judgingTargetsOf,
  TARGET_RULE_VERSION,
  TARGET_SCHEMA_VERSION,
  TARGET_SOURCE_VERSION,
} from "../lib/judgingUnits";
import {
  loadPage,
  locationLabel,
  MUSHAF_DATA_VERSION,
  MUSHAF_LAYOUT,
  preloadPage,
} from "../lib/page";
import type { MushafPage, PageWord } from "../lib/page";
import {
  loadQcfPageFont,
  preloadQcfPageFont,
} from "../lib/qcfFont";
import { useJudging } from "../state/store";
import { enabledCategories, isPinpointCategory } from "../config";
import type {
  CategoryId,
  Mistake,
  RecitationRangeSnapshot,
  TokenRole,
} from "../types";
import { DragMenu, type MenuAnchor } from "./DragMenu";
import {
  useMushafRenderScale,
  useCompactMushafPages,
} from "./MushafViewport";
import type {
  MushafLayout,
  QuestionFocusMode,
} from "../lib/devicePreferences";
import {
  moveMushafView,
  pageIsVisible,
  visibleMushafPages,
} from "../lib/mushafSpread";
import { QUESTION_INDEX_VERSION } from "../lib/questionBank.ts";
import {
  rangeDisplayForPage,
  type RangeLineState,
  type RangePageDisplay,
} from "../lib/recitationRangeLayout.ts";
import { MushafPageSurface, MushafWord } from "./MushafPageSurface.tsx";
import { FixedMushafPageSurface } from "./FixedMushafPageSurface.tsx";
import { assertFixedPageMatches, type FixedPageGeometry } from "../lib/fixedMushafGeometry.ts";
import { wordTotalCircle, wordFindingCounts, type MarkerRect } from "../lib/wordFindingSummary";
import { invalidateMushafMetrics, measureMushafGlyph, mushafPageScale, pickMushafWord } from "../lib/mushafGeometry.ts";

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
  page: number;
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

/** The Mushaf jump event, fired by the mistake log. */
export const JUMP_EVENT = "tahqeeq:jump";

function dominant(mistakes: Mistake[]): CategoryId {
  return mistakes.reduce((current, mistake) =>
    SEVERITY[mistake.category] > SEVERITY[current.category]
      ? mistake
      : current,
  ).category;
}

export interface MushafProps {
  preparedFixedPage?: ReadyFixedPage | null;
  navigationPending?: boolean;
  navigationError?: string | null;
  retryNavigation?: () => void;
  /** Explicit integration preview; absence retains the existing renderer. */
  fixedPages?: ReadonlyMap<number, FixedPageGeometry>;
  fixedSemanticPages?: ReadonlyMap<number, MushafPage>;
  selectorTashkeel?: boolean;
  page: number;
  pageLayout: MushafLayout;
  questionFocusMode: QuestionFocusMode;
  questionRange: RecitationRangeSnapshot | null;
  tilawaWordFocus?: string | null;
  onPageChange: (page: number) => void;
  headerControls: (visiblePages: readonly number[], compact: boolean) => ReactNode;
}

interface ContextShadeBox {
  id: string;
  page: number;
  ayahLabel: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export function Mushaf({
  preparedFixedPage,
  navigationPending = false,
  fixedPages,
  fixedSemanticPages,
  selectorTashkeel = false,
  page: currentPage,
  pageLayout,
  questionFocusMode,
  questionRange,
  tilawaWordFocus = null,
  onPageChange,
  headerControls,
}: MushafProps) {
  const { state, dispatch } = useJudging();
  const renderScale = useMushafRenderScale();
  const compact = useCompactMushafPages();
  const requestedPages = useMemo(
    () => visibleMushafPages(currentPage, pageLayout, compact),
    [compact, currentPage, pageLayout],
  );
  const requestKey = requestedPages.join(":");
  const assignedConfig = state.activeAssignment?.config ?? state.config;
  // Only pinpoint criteria are marked on the page. A judge who owns just a
  // whole-recitation criterion has nothing to press here.
  const allowedCategories = (
    state.activeAssignment?.categories ?? enabledCategories(assignedConfig)
  ).filter(isPinpointCategory);
  const judgingEnabled = state.sessionActive && allowedCategories.length > 0 && !navigationPending;
  const [loadedPageData, setPageData] = useState<MushafPage[]>([]);
  const [loadedFontReadyPages, setFontReadyPages] = useState<Set<number>>(() => new Set());
  const pageData = useMemo(() => preparedFixedPage
    ? [...preparedFixedPage.semantic.values()] : loadedPageData, [preparedFixedPage, loadedPageData]);
  const fontReadyPages = useMemo(() => preparedFixedPage
    ? new Set(preparedFixedPage.semantic.keys()) : loadedFontReadyPages, [preparedFixedPage, loadedFontReadyPages]);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const pageRefs = useRef(new Map<number, HTMLDivElement>());
  const [boxes, setBoxes] = useState<WordHitbox[]>([]);
  const [shadeBoxes, setShadeBoxes] = useState<ContextShadeBox[]>([]);
  const [boxesKey, setBoxesKey] = useState("");
  const [measureEpoch, setMeasureEpoch] = useState(0);
  const [flashTid, setFlashTid] = useState<string | null>(null);
  const [pendingFlash, setPendingFlash] = useState<{ tid: string; page: number } | null>(null);

  const compatibleQuestionRange = questionFocusMode !== "off" &&
      questionRange?.mushafLayout === MUSHAF_LAYOUT &&
      questionRange.sourceVersion === MUSHAF_DATA_VERSION &&
      questionRange.questionIndexVersion === QUESTION_INDEX_VERSION
    ? questionRange
    : null;
  const questionDisplays = useMemo(() => {
    if (!compatibleQuestionRange || !pageData.length) return null;
    const displays = new Map<number, RangePageDisplay>();
    for (const page of pageData) {
      const display = rangeDisplayForPage(page, compatibleQuestionRange);
      if (!display) return null;
      displays.set(page.page, display);
    }
    return displays;
  }, [compatibleQuestionRange, pageData]);

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

  // Every requested page and its page-specific font become visible in one
  // commit. The previous complete view remains intact during navigation.
  useEffect(() => {
    let cancelled = false;
    if (preparedFixedPage) return;
    setLoadError(false);
    Promise.all(
      requestedPages.map(async (page) => {
        const [data, fontLoaded] = await Promise.all([
          fixedSemanticPages ? Promise.resolve(fixedSemanticPages.get(page)!) : loadPage(page),
          fixedPages ? Promise.resolve(true) : loadQcfPageFont(page).then(() => true),
        ]);
        if (fixedPages) {
          const fixed = fixedPages.get(page);
          if (!fixed) throw new Error("Fixed page is not included in this preview");
          assertFixedPageMatches(fixed, data);
        }
        return { data, fontLoaded };
      }),
    )
      .then((readyPages) => {
        if (cancelled) return;
        setPageData(readyPages.map(({ data }) => data));
        setFontReadyPages(new Set(
          readyPages.filter(({ fontLoaded }) => fontLoaded).map(({ data }) => data.page),
        ));
        setLoadError(false);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [loadAttempt, requestKey, fixedPages, fixedSemanticPages, preparedFixedPage]);

  // Warm both neighboring views so the next pair swaps atomically from cache.
  useEffect(() => {
    if (fixedPages) return;
    const neighborAnchors = [
      moveMushafView(currentPage, pageLayout, -1, compact),
      moveMushafView(currentPage, pageLayout, 1, compact),
    ];
    for (const anchor of neighborAnchors) {
      for (const page of visibleMushafPages(anchor, pageLayout, compact)) {
        preloadPage(page);
        if (!fixedPages) preloadQcfPageFont(page);
      }
    }
  }, [compact, currentPage, pageLayout, fixedPages]);

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
        onPageChange(moveMushafView(currentPage, pageLayout, 1, compact));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onPageChange(moveMushafView(currentPage, pageLayout, -1, compact));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, compact, currentPage, onPageChange, pageLayout]);

  // QCF source words are single calligraphic glyphs. Measure one rectangle for
  // the whole kalimah; semantic letter units live only in the connected rail.
  const measure = useCallback(() => {
    const next: WordHitbox[] = [];
    const nextShadeBoxes: ContextShadeBox[] = [];
    const shadeEnabled = questionFocusMode === "shade" ||
      questionFocusMode === "shade-fade";
    for (const page of pageData) {
      const root = pageRefs.current.get(page.page);
      if (!root) continue;
      const rootRect = root.getBoundingClientRect();
      const scale = mushafPageScale(root);
      const linesRoot = root.querySelector<HTMLElement>(".mushaf-lines");
      const wordElements = root.querySelectorAll<HTMLElement>(
        '.m-word[data-role="letter"]',
      );

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
        const style = getComputedStyle(wordElement);
        const fontSize = parseFloat(style.fontSize);
        const metric = fixedPages ? null : measureMushafGlyph(wordElement.firstChild?.textContent ?? "", style.fontFamily, fontSize);
        const baseline = wordElement.querySelector(".m-word-baseline")?.getBoundingClientRect().top;
        const ink = metric && baseline !== undefined ? {
          // One reference pixel also covers antialiasing beyond font metrics.
          x: rect.left - rootRect.left + (metric.left * fontSize - 1) * scale,
          y: baseline - rootRect.top - (metric.ascent * fontSize + 1.25) * scale,
          w: ((metric.right - metric.left) * fontSize + 2) * scale,
          h: ((metric.ascent + metric.descent) * fontSize + 2.5) * scale,
        } : { x: rect.left - rootRect.left, y: rect.top - rootRect.top, w: rect.width, h: rect.height };

        next.push({
          page: page.page,
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
          ...ink,
          hx: ink.x - (fixedPages ? 0 : HIT_PAD_X),
          hy: ink.y - (fixedPages ? 0 : HIT_PAD_Y),
          hw: ink.w + (fixedPages ? 0 : HIT_PAD_X * 2),
          hh: ink.h + (fixedPages ? 0 : HIT_PAD_Y * 2),
        });
      });

      const questionDisplay = questionDisplays?.get(page.page);
      if (shadeEnabled && linesRoot && questionDisplay) {
        const linesRect = linesRoot.getBoundingClientRect();
        const elementsByWordId = new Map(
          [...root.querySelectorAll<HTMLElement>(".m-word[data-wid]")]
            .map((element) => [element.dataset.wid, element] as const)
            .filter((entry): entry is [string, HTMLElement] => Boolean(entry[0])),
        );
        for (const segment of questionDisplay.contextAyahSegments) {
          const rects = segment.wordIds
            .map((wordId) => elementsByWordId.get(wordId)?.getBoundingClientRect())
            .filter((rect): rect is DOMRect => Boolean(rect?.width && rect?.height));
          if (!rects.length) continue;
          if (fixedPages) {
            rects.forEach((rect, index) => nextShadeBoxes.push({
              id: `${segment.id}:${index}`, page: page.page,
              ayahLabel: `${segment.surah}:${segment.ayah ?? "b"}`,
              x: rect.left - linesRect.left + 1.5 * scale,
              y: rect.top - linesRect.top,
              w: Math.max(0, rect.width - 3 * scale), h: rect.height,
            }));
            continue;
          }
          const left = Math.min(...rects.map((rect) => rect.left));
          const right = Math.max(...rects.map((rect) => rect.right));
          const top = Math.min(...rects.map((rect) => rect.top));
          const bottom = Math.max(...rects.map((rect) => rect.bottom));
          nextShadeBoxes.push({
            id: segment.id,
            page: page.page,
            ayahLabel: `${segment.surah}:${segment.ayah ?? "b"}`,
            x: left - linesRect.left,
            y: top - linesRect.top,
            w: right - left,
            h: bottom - top,
          });
        }
      }
    }

    setBoxes(next);
    setShadeBoxes(nextShadeBoxes);
    setBoxesKey(pageData.map(({ page }) => page).join(":"));
  }, [pageData, questionDisplays, questionFocusMode, fixedPages]);

  // Wait until every page in the spread has applied its layout before reading
  // the shared stage. Otherwise the first page can retain pre-fit coordinates.
  const geometryChanged = useCallback(() => setMeasureEpoch(value => value + 1), []);

  useEffect(() => {
    let mounted = true;
    const fontsChanged = () => {
      if (!mounted) return;
      invalidateMushafMetrics();
      geometryChanged();
    };
    document.fonts.addEventListener("loadingdone", fontsChanged);
    void document.fonts.ready.then(fontsChanged);
    return () => { mounted = false; document.fonts.removeEventListener("loadingdone", fontsChanged); };
  }, [geometryChanged]);

  useLayoutEffect(() => {
    if (preparedFixedPage) { measure(); return; }
    const frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [fontReadyPages, measure, measureEpoch, requestKey, renderScale, preparedFixedPage]);

  useEffect(() => {
    const roots = [...pageRefs.current.values()];
    if (!roots.length) return;
    let lastSizes = roots.map(root => {
      const r = root.getBoundingClientRect();
      return [r.width, r.height];
    });
    const handleResize = () => {
      const sizes = roots.map(root => { const r = root.getBoundingClientRect(); return [r.width, r.height]; });
      if (sizes.every((size, i) => size.every((value, j) => Math.abs(value - lastSizes[i][j]) < 0.05))) return;
      lastSizes = sizes;
      setMeasureEpoch((value) => value + 1);
    };
    const observer =
      "ResizeObserver" in window ? new ResizeObserver(handleResize) : null;
    roots.forEach((root) => observer?.observe(root));
    window.addEventListener("resize", handleResize);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [requestKey, pageData]);

  const wordForTid = useCallback(
    (tid: string, page?: number) =>
      boxes.find((box) =>
        (page === undefined || box.page === page) && box.units.some(
          (unit) => unit.tid === tid || unit.legacyTids.includes(tid),
        ),
      ),
    [boxes],
  );

  const rootForPage = useCallback(
    (page: number) => pageRefs.current.get(page) ?? null,
    [],
  );

  const revealWord = useCallback((tid: string, page: number) => {
    const box = wordForTid(tid, page);
    if (!box) return false;
    const element = rootForPage(page)?.querySelector<HTMLElement>(
      `[data-word-hit="${CSS.escape(box.wid)}"]`,
    );
    element?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    setFlashTid(null);
    requestAnimationFrame(() => setFlashTid(tid));
    return true;
  }, [rootForPage, wordForTid]);

  useEffect(() => {
    if (!pendingFlash || !boxes.length) return;
    if (revealWord(pendingFlash.tid, pendingFlash.page)) {
      setPendingFlash(null);
    }
  }, [boxes, pendingFlash, revealWord]);

  useEffect(() => {
    const onJump = (event: Event) => {
      const detail = (event as CustomEvent<{ tid: string; page?: number }>).detail;
      if (!detail?.tid) return;
      const targetPage = detail.page ?? 604;
      const readyPages = pageData.map(({ page }) => page);
      if (!pageIsVisible(targetPage, readyPages)) {
        setPendingFlash({ tid: detail.tid, page: targetPage });
        onPageChange(targetPage);
        return;
      }
      revealWord(detail.tid, targetPage);
    };
    window.addEventListener(JUMP_EVENT, onJump);
    return () => window.removeEventListener(JUMP_EVENT, onJump);
  }, [onPageChange, pageData, revealWord]);

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
  useEffect(() => closeAll(), [closeAll, currentPage, pageLayout, renderScale]);
  useLayoutEffect(() => { if (navigationPending) closeAll(); }, [navigationPending, closeAll]);
  useEffect(() => {
    window.addEventListener('resize', closeAll);
    return () => window.removeEventListener('resize', closeAll);
  }, [closeAll]);

  useEffect(() => {
    if (!fixedPages || !active) return;
    const onScroll = (event: Event) => {
      // Scrolling inside the letter tray is its own interaction.
      if (event.target instanceof Element && event.target.closest("[role='dialog']")) return;
      closeAll();
    };
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [fixedPages, active, closeAll]);

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
      if (!active || !judgingEnabled) return;
      if (preparedFixedPage && (active.meta.page !== currentPage || boxesKey !== requestKey)) return;
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
        page: active.meta.page,
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
    [active, allowedCategories, dispatch, state.activeAssignment, state.config, judgingEnabled, preparedFixedPage, currentPage, boxesKey, requestKey],
  );

  const onPointerDown = (event: React.PointerEvent, page: number) => {
    if (!judgingEnabled) return;
    if (preparedFixedPage && boxesKey !== requestKey) return;
    if (fixedPages && requestKey !== pageData.map(data => data.page).join(":")) return;
    if (fixedPages && (!event.isPrimary || startRef.current)) { closeAll(); return; }
    if (startRef.current) return;
    // Navigation lives inside the page frame. Its pointer events must never
    // fall through to a kalimah underneath the popover.
    if ((event.target as HTMLElement).closest(".page-marginalia")) return;
    const root = rootForPage(page);
    if (!root) return;
    const rootRect = root.getBoundingClientRect();
    const pointX = event.clientX - rootRect.left;
    const pointY = event.clientY - rootRect.top;
    // The decoration extends the word's existing target. A tap on its top
    // edge must never select the Quran word on the preceding line.
    const numberedWord = boxes.find(box => {
      if (box.page !== page) return false;
      const marker = wordSummaries.get(`${box.page}:${box.wid}`)?.marker;
      return marker && pointX >= marker.x && pointX <= marker.x + marker.w &&
        pointY >= marker.y && pointY <= marker.y + marker.h;
    });
    const pageBoxes = boxes.filter(box => box.page === page);
    const box = numberedWord ?? (fixedPages
      ? pageBoxes.find(box => pointX >= box.x && pointX < box.x + box.w && pointY >= box.y && pointY < box.y + box.h)
      : pickMushafWord(pageBoxes, pointX, pointY));

    if (!box) {
      if (pinned) closeAll();
      return;
    }
    if (!box.units.length) return;

    // The word owns a one-finger gesture; pinch remains browser-controlled.
    if (event.cancelable) event.preventDefault();
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
    if (preparedFixedPage && boxesKey !== requestKey) return;
    if (fixedPages && requestKey !== pageData.map(data => data.page).join(":")) return;
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
    const returnFocus = pinned && active
      ? { wid: active.meta.wid, page: active.meta.page }
      : null;
    closeAll();
    if (returnFocus) {
      window.setTimeout(() => {
        rootForPage(returnFocus.page)
          ?.querySelector<HTMLElement>(
            `[data-word-hit="${CSS.escape(returnFocus.wid)}"]`,
          )
          ?.focus({ preventScroll: true });
      }, 0);
    }
  };

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
  const allowedCountKey = allowedCategories.join(":");
  const wordSummaries = useMemo(() => {
    const result = new Map<string, { counts: ReturnType<typeof wordFindingCounts>; total: number; marker: MarkerRect | null }>();
    for (const box of boxes) {
      const matches = box.units.flatMap(unit => [unit.tid, ...unit.legacyTids].flatMap(tid => byTid.get(tid) ?? []));
      const counts = wordFindingCounts(matches, state.activeAssignment?.judgeSeatId, allowedCountKey.split(":") as CategoryId[]);
      const total = counts.reduce((sum, item) => sum + item.count, 0);
      const marker = wordTotalCircle(box, total);
      result.set(`${box.page}:${box.wid}`, { counts, total, marker });
    }
    return result;
  }, [boxes, byTid, state.activeAssignment?.judgeSeatId, allowedCountKey]);
  const readyKey = pageData.map(({ page }) => page).join(":");
  const renderPage = (data: MushafPage) => {
    const fixed = fixedPages?.get(data.page);
    if (fixedPages && !fixed) return <div key={data.page} role="status">Loading matching page…</div>;
    const Surface = fixed ? FixedMushafPageSurface : MushafPageSurface;
    const qcfReady = fontReadyPages.has(data.page);
    const root = rootForPage(data.page);
    const pageScale = root ? mushafPageScale(root) : 1;
    const local = (value: number) => value / pageScale;
    const visibleBoxes = boxesKey === readyKey
      ? boxes.filter((box) => box.page === data.page)
      : [];
    const visibleShadeBoxes = boxesKey === readyKey
      ? shadeBoxes.filter((box) => box.page === data.page)
      : [];
    const pageRect = root?.getBoundingClientRect();
    const layerRect = root?.querySelector(".hit-layer")?.getBoundingClientRect();
    const pageClientLeft = pageRect && layerRect ? local(layerRect.left - pageRect.left) : 1;
    const pageClientTop = pageRect && layerRect ? local(layerRect.top - pageRect.top) : 1;
    const questionDisplay = questionDisplays?.get(data.page) ?? null;
    const lineClass = (lineState: RangeLineState | undefined) =>
      lineState === "context"
        ? "question-context-line"
        : lineState === "mixed"
          ? "question-mixed-line"
          : "";
    const renderWord = (word: PageWord, lineState?: RangeLineState) => {
      const isContextWord = Boolean(
        questionDisplay &&
        lineState === "mixed" &&
        !questionDisplay.selectedWordIds.has(word.wid),
      );
      const isTilawaWord = word.role === "letter" && word.wid === tilawaWordFocus;
      return (
        <MushafWord
          key={word.wid}
          word={word}
          qcfReady={fixed ? false : qcfReady}
          className={`${isContextWord ? "question-context-word" : ""} ${isTilawaWord ? "tilawa-word-active" : ""}`}
        >
        </MushafWord>
      );
    };

    return (
      <Surface
        fixed={fixed!}
        key={data.page}
        data={data}
        qcfReady={qcfReady}
        onGeometryChange={geometryChanged}
        pageRef={(node) => {
          if (node) pageRefs.current.set(data.page, node);
          else pageRefs.current.delete(data.page);
        }}
        data-judging-enabled={judgingEnabled ? "true" : "false"}
        data-question-focus-mode={questionDisplay ? questionFocusMode : "off"}
        onPointerDown={judgingEnabled ? (event) => onPointerDown(event, data.page) : undefined}
        onPointerMove={judgingEnabled ? onPointerMove : undefined}
        onPointerUp={judgingEnabled ? onPointerUp : undefined}
        onPointerCancel={judgingEnabled ? closeAll : undefined}
        onContextMenu={judgingEnabled ? (event) => event.preventDefault() : undefined}
        lineClassName={(line) => lineClass(questionDisplay?.lineStates.get(line.n))}
        renderWord={(word, line) => renderWord(
          word,
          questionDisplay?.lineStates.get(line.n),
        )}
        beforeLines={visibleShadeBoxes.map((box) => (
            <div
              key={box.id}
              className="question-context-band"
              data-context-ayah={box.ayahLabel}
              style={{
                left: local(box.x) - (fixed ? 0 : 3),
                top: local(box.y) - (fixed ? 0 : 2),
                width: local(box.w) + (fixed ? 0 : 6),
                height: local(box.h) + (fixed ? 0 : 4),
              }}
              aria-hidden="true"
            />
          ))}
        afterLines={judgingEnabled ? (
          <div className="hit-layer">
            {visibleBoxes.map((box) => {
              const localLeft = (value: number) => local(value) - pageClientLeft;
              const localTop = (value: number) => local(value) - pageClientTop;
              const mistakes = mistakesForWord(box);
              const summary = wordSummaries.get(`${box.page}:${box.wid}`);
              const category = mistakes.length ? dominant(mistakes) : null;
              const isActive = active?.meta.page === box.page && active.meta.wid === box.wid;
              const isFlashing = Boolean(
                flashTid && box.units.some(
                  (unit) => unit.tid === flashTid || unit.legacyTids.includes(flashTid),
                ),
              );
              const inkClasses = [
                "glyph-ink",
                category ? `marked cat-${category}` : "",
                isFlashing ? `flash ${category ? "" : "cat-fasaha"}` : "",
              ].filter(Boolean).join(" ");
              return (
                <Fragment key={`${box.page}:${box.wid}`}>
                  <div
                    data-word-hit={box.wid}
                    className={`hit word-hit ${isActive ? `armed ${hovered ? `cat-${hovered}` : ""}` : ""}`}
                    style={
                      {
                        left: localLeft(box.x),
                        top: localTop(box.y),
                        width: local(box.w),
                        height: local(box.h),
                        "--ink-left": "0px",
                        "--ink-top": "0px",
                        "--ink-width": `${local(box.w)}px`,
                        "--ink-height": `${local(box.h)}px`,
                      } as CSSProperties
                    }
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => openPinnedForBox(event, box)}
                    aria-label={
                      summary?.total
                        ? `${box.semanticText}, ${summary.total} of your mistakes. Open to review or mark another letter.`
                        : `Select word ${box.semanticText}`
                    }
                  />
                  {(mistakes.length > 0 || isFlashing) && (
                    <div
                      className={inkClasses}
                      style={{
                        left: localLeft(box.x),
                        top: localTop(box.y),
                        width: local(box.w),
                        height: local(box.h),
                      }}
                    />
                  )}
                  {summary?.marker && (
                    <span
                      className="word-total-marker"
                      data-word-total={box.wid}
                      aria-hidden="true"
                      style={{
                        left: localLeft(summary.marker.x), top: localTop(summary.marker.y),
                        width: local(summary.marker.w), height: local(summary.marker.h),
                        fontSize: local(9), lineHeight: `${local(summary.marker.h)}px`, borderRadius: "50%",
                      }}
                    >{summary.total}</span>
                  )}
                </Fragment>
              );
            })}
          </div>
        ) : null}
      />
    );
  };

  const renderedPages = pageData.length ? pageData : requestedPages;
  const renderedPageNumbers = pageData.length
    ? pageData.map(({ page }) => page)
    : requestedPages;

  return (
    <div className={`mushaf-scroll ${fixedPages ? "has-fixed-pages" : ""} ${renderedPages.length > 1 ? "is-spread" : "is-single"}`}>
      <div className="mushaf-shared-nav">
        {headerControls(renderedPageNumbers, compact)}
      </div>
      <div
        className={`mushaf-composition ${renderedPages.length > 1 ? "mushaf-spread" : "mushaf-single"}`}
        data-visible-pages={renderedPageNumbers.join(":")}
      >
        {pageData.length
          ? pageData.map(renderPage)
          : requestedPages.map((page) => (
              <div key={page} className="page mushaf-loading" data-page={page}>
                <div className="loading-spinner" />
              </div>
            ))}
      </div>

      {loadError && (
        <div className="mushaf-load-error" role="alert">
          <span>The requested page could not be opened.</span>
          <button type="button" className="btn-ghost" onClick={() => setLoadAttempt((value) => value + 1)}>
            Retry
          </button>
        </div>
      )}

      {judgingEnabled && active && (
        <DragMenu
          showTashkeel={selectorTashkeel}
          anchor={active.anchor}
          glyph={active.meta.semanticText}
          units={active.meta.units.map((unit) => ({
            tid: unit.tid,
            primaryGlyph: unit.primaryGlyph,
            fullGlyph: unit.fullGlyph,
            selected: unit.tid === active.tid,
            mistake: mistakesForUnit(unit).find((mistake) =>
              (mistake.judgeSeatId ?? state.activeAssignment?.judgeSeatId) === state.activeAssignment?.judgeSeatId &&
              allowedCategories.includes(mistake.category)),
          }))}
          targetSelected={Boolean(activeUnit)}
          hovered={hovered}
          onPreview={setHovered}
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
          onUndo={(id) => {
            const mistake = activeUnit && mistakesForUnit(activeUnit).find((item) => item.id === id);
            if (!state.sessionActive || !mistake ||
                (mistake.judgeSeatId ?? state.activeAssignment?.judgeSeatId) !== state.activeAssignment?.judgeSeatId ||
                !allowedCategories.includes(mistake.category)) return;
            dispatch({ type: "REMOVE_MISTAKE", id });
            closeTray();
          }}
        />
      )}
    </div>
  );
}
