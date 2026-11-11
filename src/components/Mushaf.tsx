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
import { createPortal, flushSync } from "react-dom";
import { useMushafPageGesture } from '../hooks/useMushafPageGesture';
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
import { nextRecitedWords } from "../lib/recitedNeighbours.ts";
import { basmalaBarPage, loadLetterBorderGuesses, loadLetterBorders, underlineGeometry, type LetterBorderPage } from "../lib/letterBorders.ts";
import type { MushafPage, PageWord } from "../lib/page";
import {
  loadQcfPageFont,
  preloadQcfPageFont,
} from "../lib/qcfFont";
import { useJudging } from "../state/store";
import { enabledCategories, isPinpointCategory, PINPOINT_CATEGORIES } from "../config";
import {
  DEFAULT_MARKING_PREFERENCES,
  afterMark,
  categoryForKey,
  pressCriterion,
  releaseCriterion,
  resolvedBarSide,
  type MarkingPreferences,
  type Preselect,
} from "../lib/markingPreferences.ts";
import type { JudgeRailSide } from "../lib/devicePreferences";
import { CriterionBar } from "./CriterionBar";
import { clearCriterionChoice, publishCriterionChoice } from "../lib/criterionChoice";
import { MarkingSettings } from "./MarkingSettings";
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
  useMushafStageRef,
  useMushafPreviewViewport,
  MushafViewport,
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
import { printedBasmalaWords, useBasmalaStyle } from "../lib/printedBasmala.ts";
import { DkWordArt } from "./DigitalKhattPage.tsx";
import { cachedDkPage, usePageDrawing } from "../lib/digitalKhattPages.ts";
import { assertFixedPageMatches, type FixedPageGeometry } from "../lib/fixedMushafGeometry.ts";
import { WORD_TOTAL_FONT_PX, wordTotalCircle, wordFindingCounts, type MarkerRect } from "../lib/wordFindingSummary";
import { invalidateMushafMetrics, measureMushafGlyph, mushafPageScale, pickMushafWord } from "../lib/mushafGeometry.ts";

interface UnitTarget {
  tid: string;
  legacyTids: string[];
  unitIndex: number;
  start: number;
  end: number;
  primaryGlyph: string;
  fullGlyph: string;
  /** Written but never pronounced: shown faded in the letter tray. */
  silent?: boolean;
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
  /** Artwork region [x0, y0, x1, y1] of the word on a fixed 1405H page. */
  region?: readonly number[];
}

/** Drag and hold: how long the finger rests on another word before the tray moves to it. */
const DRAG_DWELL_MS = 220;

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
  /** Inert page artwork/annotations only: no input, navigation or evidence writes. */
  presentationOnly?: boolean;
  onPresentationReady?: (pages: readonly number[]) => void;
  onPresentationError?: (error: string | null, retry: () => void) => void;
  swipePreviews?: readonly ReadyFixedPage[];
  preparedFixedPage?: ReadyFixedPage | null;
  navigationPending?: boolean;
  navigationError?: string | null;
  retryNavigation?: () => void;
  /** Explicit integration preview; absence retains the existing renderer. */
  fixedPages?: ReadonlyMap<number, FixedPageGeometry>;
  fixedSemanticPages?: ReadonlyMap<number, MushafPage>;
  selectorTashkeel?: boolean;
  /** Criterion bar, keys and pen choices (device preference). */
  marking?: MarkingPreferences;
  onMarkingChange?: (patch: Partial<MarkingPreferences>) => void;
  judgeRailSide?: JudgeRailSide;
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

export function Mushaf(props: MushafProps) {
  const {
  presentationOnly = false,
  swipePreviews = [],
  preparedFixedPage,
  navigationPending = false,
  navigationError,
  fixedPages,
  fixedSemanticPages,
  selectorTashkeel = false,
  marking = DEFAULT_MARKING_PREFERENCES,
  onMarkingChange,
  judgeRailSide = "left",
  page: currentPage,
  pageLayout,
  questionFocusMode,
  questionRange,
  tilawaWordFocus = null,
  onPageChange,
  headerControls,
  } = props;
  const { state, dispatch } = useJudging();
  const renderScale = useMushafRenderScale();
  const compact = useCompactMushafPages();
  const stageRef = useMushafStageRef();
  const compositionRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [showPreviews, setShowPreviews] = useState(false);
  const previewViewport = useMushafPreviewViewport();
  // Prepare the inert neighbours when their decoded resources arrive, not in
  // the input handler. The layer remains clipped and invisible until dragging.
  useEffect(() => {
    if (!presentationOnly && swipePreviews.length > 1) setShowPreviews(true);
  }, [presentationOnly, swipePreviews.length]);
  const swipeLocked = useRef<() => boolean>(() => false);
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
  const showAnnotations = state.sessionActive && allowedCategories.length > 0 && !navigationPending;
  const judgingEnabled = showAnnotations && !presentationOnly;
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
  const [letterBorders, setLetterBorders] = useState<ReadonlyMap<number, LetterBorderPage>>(new Map());
  const [borderGuesses, setBorderGuesses] = useState<ReadonlyMap<number, LetterBorderPage>>(new Map());
  const basmalaStyle = useBasmalaStyle();
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
  // The open word, readable inside one drag before React re-renders.
  const activeRef = useRef<ActiveDrag | null>(null);
  activeRef.current = active;
  const [hovered, setHovered] = useState<CategoryId | null>(null);
  const [pinned, setPinned] = useState(false);
  // Category first: a slide that ends on a category before any letter keeps the
  // tray open with that category chosen; one tap on a letter then marks it.
  const [armed, setArmed] = useState<CategoryId | null>(null);
  // Criterion bar: a criterion chosen before (or while) the word is tapped.
  const barCategories = useMemo(
    () => PINPOINT_CATEGORIES.filter((category) => allowedCategories.includes(category)),
    [allowedCategories.join("|")], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const barEnabled = judgingEnabled && marking.order !== "word-first" && barCategories.length > 1;
  // With the bar on, the tray shows letters only unless the judge asks for both.
  const hideTrayCriteria = barEnabled && !marking.trayCriteria;
  const [preselect, setPreselectState] = useState<Preselect | null>(null);
  const preselectRef = useRef<Preselect | null>(null);
  const setPreselect = useCallback((next: Preselect | null) => {
    preselectRef.current = next;
    setPreselectState(next);
  }, []);
  const barPressRef = useRef<{ category: CategoryId; before: Preselect | null } | null>(null);
  const [barNudge, setBarNudge] = useState(0);
  const lastPointerTypeRef = useRef<string>("mouse");
  const penTapRef = useRef<{ tid: string; t: number; timer: number } | null>(null);
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

  // Approved letter borders (fixed 1405H pages only). Pages without them keep
  // the plain word highlight.
  const borderPagesKey = fixedPages ? pageData.map(({ page }) => page).join(":") : "";
  useEffect(() => {
    if (!borderPagesKey) return;
    let cancelled = false;
    Promise.all(borderPagesKey.split(":").map(Number).map(loadLetterBorders)).then((loaded) => {
      if (cancelled) return;
      setLetterBorders((previous) => {
        const next = new Map(previous);
        for (const data of loaded) if (data) next.set(data.page, data);
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [borderPagesKey]);
  // Prototype: learned guesses for words the owner has not approved.
  const guessesWanted = marking.guessedUnderlines !== "off";
  useEffect(() => {
    if (!borderPagesKey || !guessesWanted) return;
    let cancelled = false;
    Promise.all(borderPagesKey.split(":").map(Number).map(loadLetterBorderGuesses)).then((loaded) => {
      if (cancelled) return;
      setBorderGuesses((previous) => {
        const next = new Map(previous);
        for (const data of loaded) if (data) next.set(data.page, data);
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [borderPagesKey, guessesWanted]);
  // DigitalKhatt drawing: the mistaken letter itself is coloured, so no underline and no count circle.
  const dkMode = usePageDrawing() === "digitalkhatt" && Boolean(fixedPages);
  const underlineFor = (box: WordHitbox, tid: string) => dkMode ? null : box.wid.includes(".b.")
    // Surah Basmalas: bars for the chosen Basmala, always shown (owner-reviewed).
    ? underlineGeometry(basmalaBarPage(box.page, basmalaStyle), null, "off", box.wid, tid, box.region)
    : underlineGeometry(letterBorders.get(box.page), borderGuesses.get(box.page), marking.guessedUnderlines, box.wid, tid, box.region);

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
    if (presentationOnly) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || active || swipeLocked.current()) return;
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
  }, [active, compact, currentPage, onPageChange, pageLayout, presentationOnly]);

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
      const nextWordOf = nextRecitedWords(page);

      wordElements.forEach((wordElement) => {
        const semanticText = wordElement.dataset.semantic ?? "";
        const wid = wordElement.dataset.wid;
        if (!wid || !semanticText) return;
        const role = (wordElement.dataset.role as TokenRole) ?? "letter";
        const units = judgingTargetsOf(semanticText, role, wid, { nextWord: nextWordOf.get(wid) });
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
            silent: unit.silent,
          })),
          ...ink,
          hx: ink.x - (fixedPages ? 0 : HIT_PAD_X),
          hy: ink.y - (fixedPages ? 0 : HIT_PAD_Y),
          hw: ink.w + (fixedPages ? 0 : HIT_PAD_X * 2),
          hh: ink.h + (fixedPages ? 0 : HIT_PAD_Y * 2),
          region: fixedPages?.get(page.page)?.words.find((word) => word.wid === wid)?.region
            ?? (fixedPages && wid.includes(".b.") ? printedBasmalaWords(page, basmalaStyle).find((word) => word.wid === wid)?.region : undefined),
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
  }, [pageData, questionDisplays, questionFocusMode, fixedPages, basmalaStyle]);

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
    element?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      block: "center", inline: "center",
    });
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
    if (presentationOnly) return;
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
  }, [onPageChange, pageData, revealWord, presentationOnly]);

  useEffect(() => {
    if (!flashTid) return;
    const timer = window.setTimeout(() => setFlashTid(null), 1300);
    return () => window.clearTimeout(timer);
  }, [flashTid]);

  const closeAll = useCallback(() => {
    if (penTapRef.current) { window.clearTimeout(penTapRef.current.timer); penTapRef.current = null; }
    startRef.current = null;
    setActive(null);
    setHovered(null);
    setPinned(false);
    setArmed(null);
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
      if (!active || !judgingEnabled || swipeLocked.current()) return false;
      // A prepared desktop spread contains two markable pages. Reject stale
      // geometry, not the second page of the currently displayed spread.
      if (preparedFixedPage && (!requestedPages.includes(active.meta.page) ||
        !preparedFixedPage.semantic.has(active.meta.page) || boxesKey !== requestKey)) return false;
      if (!allowedCategories.includes(category)) return false;
      const selectedTid = tidOverride ?? active.tid;
      if (!selectedTid) return false;
      const unit = active.meta.units.find((candidate) => candidate.tid === selectedTid);
      if (!unit) return false;
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
      // Back to nothing chosen; a held choice stays until the hold ends.
      setPreselect(afterMark(preselectRef.current, category));
      return true;
    },
    [active, allowedCategories, dispatch, state.activeAssignment, state.config, judgingEnabled, preparedFixedPage, requestedPages, boxesKey, requestKey, setPreselect],
  );

  const onPointerDown = (event: React.PointerEvent, page: number) => {
    if (!judgingEnabled || swipeLocked.current()) return;
    // Pen only: fingers and palm never mark (the bar still takes fingers).
    if (marking.penOnly && event.pointerType === "touch") return;
    if (preparedFixedPage && boxesKey !== requestKey) return;
    if (fixedPages && requestKey !== pageData.map(data => data.page).join(":")) return;
    // A finger holding a bar button is the first touch; the word tap is then
    // not "primary" but still a single marking gesture.
    if (fixedPages && ((!event.isPrimary && !barPressRef.current) || startRef.current)) { closeAll(); return; }
    if (startRef.current) return;
    // Navigation lives inside the page frame. Its pointer events must never
    // fall through to a kalimah underneath the popover.
    if ((event.target as HTMLElement).closest(".page-marginalia")) return;
    const root = rootForPage(page);
    if (!root) return;
    const box = wordAtPoint(page, event.clientX, event.clientY);

    if (!box) {
      if (pinned) closeAll();
      return;
    }
    if (!box.units.length) return;
    // Nothing chosen: the word does not open and the island shakes. A word
    // that already has the judge's mark still opens, so undo stays one tap away.
    if (barEnabled && !preselectRef.current && !latestMarkedTid(box)) {
      if (pinned) closeAll();
      setBarNudge(Date.now());
      return;
    }

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
      setArmed(barEnabled ? preselectRef.current?.category ?? null : null);
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
    if (armed && !hovered && start?.moved && validFinalTid) {
      // A criterion chosen first: slide from the word to the letter and lift.
      commit(armed, validFinalTid);
      closeAll();
    } else if (hideTrayCriteria && !hovered && start?.moved && validFinalTid) {
      // Slid to a letter with no criterion yet: keep the tray open on it; the bar finishes.
      setActive((current) => (current ? { ...current, tid: validFinalTid } : current));
      setPinned(true);
    } else if (allowedCategories.length === 1 && start?.moved && validFinalTid) {
      commit(allowedCategories[0], validFinalTid);
      closeAll();
    } else if (hovered && active.tid && allowedCategories.includes(hovered)) {
      commit(hovered);
      closeAll();
    } else if (start && !start.moved && Date.now() - start.t < 500) {
      // A tap on a word that already has a mistake opens on its marked letter,
      // so the correction and Hold to undo are there at once.
      if (!active.tid) {
        const marked = latestMarkedTid(active.meta);
        if (marked) setActive((current) => (current ? { ...current, tid: marked } : current));
      }
      setPinned(true);
    } else if (!active.tid && start?.moved) {
      const pill = element?.closest<HTMLElement>("[data-pill]")?.dataset.pill as CategoryId | undefined;
      if (pill && allowedCategories.includes(pill)) {
        setArmed(pill);
        setPinned(true);
      } else closeAll();
    } else {
      closeAll();
    }
  };

  const openPinnedForBox = (
    event: React.KeyboardEvent<HTMLElement>,
    box: WordHitbox,
  ) => {
    if (!judgingEnabled || swipeLocked.current()) return;
    if (preparedFixedPage && boxesKey !== requestKey) return;
    if (fixedPages && requestKey !== pageData.map(data => data.page).join(":")) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    if (barEnabled && !preselectRef.current && !latestMarkedTid(box)) {
      setBarNudge(Date.now());
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setHovered(null);
    setArmed(barEnabled ? preselectRef.current?.category ?? null : null);
    setPinned(true);
    setActive({
      tid: latestMarkedTid(box),
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

  /* ---------- criterion bar ---------- */
  // A letter already chosen in an open tray is marked by the bar at once.
  const commitSelectedLetter = (category: CategoryId) => {
    if (!active?.tid || !pinned) return false;
    if (!commit(category)) return false;
    closeTray();
    return true;
  };
  const barPress = (category: CategoryId) => {
    if (!barEnabled) return;
    const { next, before } = pressCriterion(preselectRef.current, category, marking);
    barPressRef.current = { category, before };
    setPreselect(next);
    if (next?.held) commitSelectedLetter(category);
  };
  const barRelease = (category: CategoryId) => {
    const press = barPressRef.current;
    if (!press || press.category !== category) return;
    barPressRef.current = null;
    const next = releaseCriterion(preselectRef.current, press.before, category);
    setPreselect(next);
    if (next && !marking.holdToKeep) commitSelectedLetter(category);
  };
  const barHandlers = useRef({ barPress, barRelease });
  barHandlers.current = { barPress, barRelease };

  // An open tray follows the bar: choosing a criterion after the word arms it.
  useEffect(() => {
    if (!barEnabled || marking.order === "drag-hold") return;
    setArmed((current) => (active ? preselect?.category ?? null : current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselect?.category]);

  // The choice never outlives the session, the bar or the judge's criteria.
  useEffect(() => {
    if (!barEnabled || (preselect && !barCategories.includes(preselect.category))) {
      barPressRef.current = null;
      if (preselectRef.current) setPreselect(null);
    }
  }, [barEnabled, barCategories, preselect, setPreselect]);

  // Keys 1 · 2 · 3 press the visible bar buttons; holding a key holds it.
  useEffect(() => {
    if (!barEnabled || !marking.keys || marking.order !== "criterion-first") return;
    let heldKey: string | null = null;
    const editable = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      Boolean(target.closest("input, textarea, select, [contenteditable='true'], [role='slider']"));
    const onKeyDown = (event: KeyboardEvent) => {
      // Escape closes an open tray first; with no tray it clears the choice.
      if (event.key === "Escape" && !event.defaultPrevented && preselectRef.current && !heldKey &&
          !document.querySelector(".drag-menu")) {
        barPressRef.current = null;
        setPreselect(null);
        return;
      }
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || editable(event.target)) return;
      // Other dialogs own the keyboard; the letter tray does not.
      if (document.querySelector('[aria-modal="true"]:not(.drag-menu), dialog[open]')) return;
      const category = categoryForKey(event.key, barCategories);
      if (!category || heldKey) return;
      event.preventDefault();
      heldKey = event.key;
      barHandlers.current.barPress(category);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== heldKey) return;
      heldKey = null;
      const category = categoryForKey(event.key, barCategories);
      if (category) barHandlers.current.barRelease(category);
    };
    const onBlur = () => {
      if (!heldKey) return;
      const category = categoryForKey(heldKey, barCategories);
      heldKey = null;
      if (category) barHandlers.current.barRelease(category);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [barEnabled, marking.keys, marking.order, barCategories, setPreselect]);

  // The bar gets its own column beside the pages, so it never covers a line.
  const barSide = resolvedBarSide(marking.barSide, judgeRailSide);
  // Column = button + 12px each side (docs/CRITERION_ISLAND_RESEARCH.md).
  const islandShown = barEnabled && marking.look.place === "island";
  const barSpace = marking.look.shape === "rows"
    ? (marking.barSize === "large" ? 176 : 152)
    : (marking.barSize === "large" ? 112 : 96);
  useLayoutEffect(() => {
    const viewport = stageRef.current?.closest<HTMLElement>(".mushaf-viewport");
    if (!viewport) return;
    // A column that appears or goes while the pages fit the screen must not
    // leave the stage scrolled sideways.
    const settle = () => window.setTimeout(() => {
      const shell = viewport.querySelector<HTMLElement>('.mushaf-shell[data-fit-mode="true"]');
      if (shell) shell.scrollLeft = 0;
    }, 250);
    if (!islandShown) { settle(); return; }
    viewport.dataset.criterionBar = barSide;
    viewport.style.setProperty("--criterion-bar-space", `${barSpace}px`);
    settle();
    return () => {
      delete viewport.dataset.criterionBar;
      viewport.style.removeProperty("--criterion-bar-space");
    };
  }, [islandShown, barSide, barSpace, stageRef]);

  // The tray stays over the pages, clear of the bar's column.
  const trayClearance = () => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { left: 0, right: 0 };
    const width = document.documentElement.clientWidth;
    return barSide === "left"
      ? { left: Math.max(0, rect.left), right: 0 }
      : { left: 0, right: Math.max(0, width - rect.right) };
  };

  // The frame around the pages shows the chosen criterion's colour.
  useEffect(() => {
    const frame = compositionRef.current;
    if (!frame) return;
    if (barEnabled && preselect && marking.look.frame !== "off") {
      frame.dataset.criterionFrame = preselect.category;
      frame.dataset.frameLook = marking.look.frame;
      frame.dataset.khafi = marking.look.khafi;
    } else {
      delete frame.dataset.criterionFrame;
      delete frame.dataset.frameLook;
      delete frame.dataset.khafi;
    }
    return () => { delete frame.dataset.criterionFrame; delete frame.dataset.frameLook; delete frame.dataset.khafi; };
  }, [barEnabled, preselect, requestKey, marking.look.frame, marking.look.khafi]);

  /* ---------- drag and hold ---------- */
  // Drag a criterion from the island onto a word, slide to the letter, lift.
  const dragWord = (x: number, y: number) => {
    for (const page of requestedPages) {
      const box = wordAtPoint(page, x, y);
      if (box?.units.length) return box;
    }
    return undefined;
  };
  const dragUnitAt = (x: number, y: number) => {
    const tid = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-unit-tid]")?.dataset.unitTid;
    return tid && activeRef.current?.meta.units.some((unit) => unit.tid === tid) ? tid : null;
  };
  const openForDrag = (box: WordHitbox, category: CategoryId) => {
    const target = rootForPage(box.page)?.querySelector<HTMLElement>(`.hit[data-word-hit="${CSS.escape(box.wid)}"]`);
    if (!target) return;
    const rect = target.getBoundingClientRect();
    setHovered(null);
    setPinned(false);
    setArmed(category);
    const next: ActiveDrag = {
      tid: null,
      meta: box,
      anchor: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
    };
    activeRef.current = next;
    setActive(next);
  };
  const dragCategory = useRef<CategoryId | null>(null);
  const dragStart = (category: CategoryId) => {
    dragCategory.current = category;
    closeAll();
    setPreselect({ category, held: true, used: false });
  };
  // Passing over other words on the way up to the tray must not move it:
  // another word takes the tray only after the finger rests on it.
  const dragDwell = useRef<{ key: string; timer: number } | null>(null);
  const clearDwell = () => {
    if (dragDwell.current) window.clearTimeout(dragDwell.current.timer);
    dragDwell.current = null;
  };
  const dragMove = (x: number, y: number) => {
    const category = dragCategory.current;
    if (!category) return;
    const tid = dragUnitAt(x, y);
    if (tid) clearDwell();
    if (tid) {
      const current = activeRef.current;
      if (current && tid !== current.tid) {
        activeRef.current = { ...current, tid };
        setActive(activeRef.current);
      }
      return;
    }
    const box = dragWord(x, y);
    const current = activeRef.current;
    if (!box || (box.page === current?.meta.page && box.wid === current?.meta.wid)) { clearDwell(); return; }
    const key = `${box.page}:${box.wid}`;
    if (dragDwell.current?.key === key) return;
    clearDwell();
    dragDwell.current = {
      key,
      timer: window.setTimeout(() => {
        dragDwell.current = null;
        if (dragCategory.current) openForDrag(box, dragCategory.current);
      }, DRAG_DWELL_MS),
    };
  };
  const dragEnd = (x: number, y: number) => {
    const category = dragCategory.current;
    dragCategory.current = null;
    clearDwell();
    if (!category) return;
    const tid = x >= 0 ? dragUnitAt(x, y) : null;
    const box = x >= 0 ? dragWord(x, y) : undefined;
    const current = activeRef.current;
    if (tid && current) {
      // Lifted on a letter: mark it.
      commit(category, tid);
      closeAll();
      setPreselect(null);
    } else if (box) {
      // Lifted on a word: its tray stays open with the criterion; one tap marks.
      if (current && box.page === current.meta.page && box.wid === current.meta.wid) setActive({ ...current, tid: null });
      else openForDrag(box, category);
      setArmed(category);
      setPinned(true);
      setPreselect({ category, held: false, used: false });
    } else {
      // Lifted anywhere else: nothing is marked.
      closeAll();
      setPreselect(null);
    }
  };
  // The scorecard rows (and the island) reach these handlers through one bridge.
  useLayoutEffect(() => {
    publishCriterionChoice({
      active: barEnabled && marking.look.place === "scorecard",
      preselect,
      mode: marking.order === "drag-hold" ? "drag-hold" : "criterion-first",
      categories: barCategories,
      showKeys: marking.keys && marking.order === "criterion-first",
      look: marking.look,
      trayOpen: Boolean(active),
      nudge: barNudge,
    }, barEnabled ? {
      onPress: barPress, onRelease: barRelease,
      onDragStart: dragStart, onDragMove: dragMove, onDragEnd: dragEnd,
      onDragTap: () => setBarNudge(Date.now()),
    } : null);
  });
  useEffect(() => () => clearCriterionChoice(), []);

  // In drag mode the choice lives only as long as its tray.
  useEffect(() => {
    if (marking.order !== "drag-hold" || active || dragCategory.current) return;
    if (preselectRef.current) setPreselect(null);
  }, [active, marking.order, setPreselect]);

  // Pen tap and double tap need to know which kind of pointer chose a letter.
  useEffect(() => {
    const onDown = (event: PointerEvent) => { lastPointerTypeRef.current = event.pointerType; };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, []);
  const penDoubleTap = marking.penDoubleTap && barCategories.length > 1;
  /** Pen in the tray: tap = first criterion, double tap (within 350 ms) = second. */
  const penPickLetter = (tid: string) => {
    const now = Date.now();
    const pending = penTapRef.current;
    if (pending && pending.tid === tid && now - pending.t < 350) {
      window.clearTimeout(pending.timer);
      penTapRef.current = null;
      if (commit(barCategories[1], tid)) closeTray();
      return;
    }
    if (pending) window.clearTimeout(pending.timer);
    setActive((current) => (current ? { ...current, tid } : current));
    penTapRef.current = {
      tid,
      t: now,
      timer: window.setTimeout(() => {
        penTapRef.current = null;
        if (commit(barCategories[0], tid)) closeTray();
      }, 350),
    };
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
  /** The letter of this word that holds the judge's most recent mistake, if any. */
  function latestMarkedTid(box: WordHitbox): string | null {
    let best: { tid: string; ts: number } | null = null;
    for (const unit of box.units) {
      for (const mistake of mistakesForUnit(unit)) {
        if ((mistake.judgeSeatId ?? state.activeAssignment?.judgeSeatId) !== state.activeAssignment?.judgeSeatId) continue;
        if (!allowedCategories.includes(mistake.category)) continue;
        if (!best || mistake.ts > best.ts) best = { tid: unit.tid, ts: mistake.ts };
      }
    }
    return best?.tid ?? null;
  }
  /** Marked letter units and their strongest criterion, for colouring letters. */
  const letterMarksFor = (pageBoxes: readonly WordHitbox[]) => {
    const marks = new Map<string, CategoryId>();
    for (const box of pageBoxes) {
      for (const unit of box.units) {
        const unitMistakes = mistakesForUnit(unit);
        if (unitMistakes.length) marks.set(unit.tid, dominant(unitMistakes));
      }
    }
    return marks;
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
  // When every marked letter of a word has its underline, the underlines
  // already show where the mistakes are: the word's count circle is not needed.
  const lettersUnderlined = (box: WordHitbox) => {
    const marked = box.units.filter((unit) => mistakesForUnit(unit).length > 0);
    return marked.length > 0 && marked.every((unit) => underlineFor(box, unit.tid) !== null);
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
  useLayoutEffect(() => {
    if (!navigationPending && readyKey === requestKey && boxesKey === requestKey) {
      props.onPresentationReady?.(pageData.map(({ page }) => page));
    }
  }, [navigationPending, readyKey, boxes, boxesKey, requestKey, props.onPresentationReady]);

  // Shared by marking and page navigation, including the marker's extra area.
  function wordAtPoint(page: number, clientX: number, clientY: number) {
    const root = rootForPage(page);
    if (!root) return undefined;
    const rect = root.getBoundingClientRect();
    const x = clientX - rect.left, y = clientY - rect.top;
    const pageBoxes = boxes.filter(box => box.page === page);
    const numberedWord = pageBoxes.find(box => {
      const marker = wordSummaries.get(`${page}:${box.wid}`)?.marker;
      return marker && x >= marker.x && x <= marker.x + marker.w &&
        y >= marker.y && y <= marker.y + marker.h;
    });
    return numberedWord ?? (fixedPages
      ? pageBoxes.find(box => x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h)
      : pickMushafWord(pageBoxes, x, y));
  }

  const pageSwipe = useMushafPageGesture({
    host: stageRef, composition: compositionRef, preview: previewRef,
    showPreviews: setShowPreviews, enabled: Boolean(fixedPages) && !presentationOnly,
    ready: !navigationPending && readyKey === requestKey && boxesKey === requestKey,
    viewKey: requestKey,
    generation: `${requestKey}|${pageLayout}|${compact}|${renderScale}|${state.activeSessionId}|${state.preparedRecitation?.id}`,
    error: navigationError,
    classify(event) {
      // Preserve the complete geometric target, even if DOM hit-testing sees paper.
      if (requestedPages.some(page => wordAtPoint(page, event.clientX, event.clientY))) return 'word';
      if (active || startRef.current) return 'dismiss';
      return 'background';
    },
    cancelMarking: closeAll,
    target(direction) {
      const page = moveMushafView(currentPage, pageLayout, direction, compact);
      const key = visibleMushafPages(page, pageLayout, compact).join(':');
      return key === requestKey ? null : { page, key };
    },
    navigate: onPageChange,
    settled: geometryChanged,
  });
  useLayoutEffect(() => { swipeLocked.current = pageSwipe.isLocked; });

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
    const letterMarks = dkMode ? letterMarksFor(visibleBoxes) : undefined;
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
        letterMarks={letterMarks}
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
        afterLines={showAnnotations ? (
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
                // Outside the question: the page may fade this word, but its mark must stay visible.
                questionDisplay && !questionDisplay.selectedWordIds.has(box.wid) ? "outside-question" : "",
                isFlashing ? `flash ${category ? "" : "cat-fasaha"}` : "",
              ].filter(Boolean).join(" ");
              return (
                <Fragment key={`${box.page}:${box.wid}`}>
                  {!presentationOnly && <div
                    data-word-hit={box.wid}
                    className={`hit word-hit ${isActive ? `armed ${hovered || (armed && !barEnabled) ? `cat-${hovered ?? armed}` : ""}` : ""}`}
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
                  />}
                  {(mistakes.length > 0 || isFlashing) && (
                    <div
                      className={inkClasses}
                      style={{
                        left: localLeft(box.x),
                        top: localTop(box.y),
                        width: local(box.w),
                        height: local(box.h),
                      }}
                    >
                      {box.units.map((unit) => {
                        const unitMistakes = mistakesForUnit(unit);
                        if (!unitMistakes.length) return null;
                        const bar = underlineFor(box, unit.tid);
                        if (!bar) return null;
                        return (
                          <span
                            key={unit.tid}
                            className={`letter-bar cat-${dominant(unitMistakes)}`}
                            data-letter-bar={unit.tid}
                            aria-hidden="true"
                            style={{
                              left: local(bar.left * box.w),
                              width: local(bar.width * box.w),
                              height: local(bar.thickness * box.w),
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                  {summary?.marker && !dkMode && !lettersUnderlined(box) && (
                    <span
                      className="word-total-marker"
                      data-word-total={box.wid}
                      aria-hidden="true"
                      style={{
                        left: localLeft(summary.marker.x), top: localTop(summary.marker.y),
                        width: local(summary.marker.w), height: local(summary.marker.h),
                        fontSize: local(WORD_TOTAL_FONT_PX), lineHeight: `${local(summary.marker.h)}px`, borderRadius: "50%",
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
    <div data-presentation-ready={boxesKey === requestKey ? 'true' : 'false'}
      className={`mushaf-scroll ${fixedPages ? "has-fixed-pages" : ""} ${renderedPages.length > 1 ? "is-spread" : "is-single"}`}>
      <div className="mushaf-shared-nav">
        {!presentationOnly && headerControls(renderedPageNumbers, compact)}
      </div>
      <div
        ref={compositionRef}
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

      {showPreviews && !presentationOnly && stageRef.current && createPortal(
        <div ref={previewRef} className="mushaf-swipe-layer" aria-hidden="true"
          {...{ inert: '' }}>
          <div className="mushaf-swipe-track">
          <div className="mushaf-swipe-view" data-swipe-current="true" />
          {swipePreviews.filter(view => {
            const key = [...view.pages.keys()].join(':');
            return [-1, 1].some(direction => visibleMushafPages(
              moveMushafView(currentPage, pageLayout, direction as -1 | 1, compact),
              pageLayout, compact).join(':') === key && key !== requestKey);
          }).map(view => <div className="mushaf-swipe-view"
            data-swipe-view={[...view.pages.keys()].join(':')} key={[...view.pages.keys()].join(':')}>
            <MushafViewport {...previewViewport} contentKey={`preview:${view.page}`}
              mobileCalibrationPage={previewViewport.mobileCalibrationPage !== undefined ? view.page : undefined}>
              <Mushaf {...props} presentationOnly swipePreviews={undefined}
                onPresentationReady={pageSwipe.refreshPreview}
                page={view.page} preparedFixedPage={view} fixedPages={view.pages}
                fixedSemanticPages={view.semantic} navigationPending={false} navigationError={null}
                onPageChange={() => {}} />
            </MushafViewport>
          </div>)}
          </div>
        </div>, stageRef.current)}

      {loadError && (
        <div className="mushaf-load-error" role="alert">
          <span>The requested page could not be opened.</span>
          <button type="button" className="btn-ghost" onClick={() => setLoadAttempt((value) => value + 1)}>
            Retry
          </button>
        </div>
      )}

      {barEnabled && (
        <CriterionBar
          showButtons={islandShown}
          categories={barCategories}
          preselect={preselect}
          side={barSide}
          mode={marking.order === "drag-hold" ? "drag-hold" : "criterion-first"}
          look={marking.look}
          size={marking.barSize}
          space={barSpace}
          showKeys={marking.keys}
          nudge={barNudge}
          stageRef={stageRef}
          alignRef={compositionRef}
          trayOpen={Boolean(active)}
          settings={onMarkingChange
            ? <MarkingSettings value={marking} onChange={onMarkingChange} penCategories={barCategories} />
            : null}
        />
      )}

      {judgingEnabled && active && (
        <DragMenu
          wordArt={(() => {
            const dk = dkMode ? cachedDkPage(active.meta.page) : null;
            if (!dk) return undefined;
            return <DkWordArt dk={dk} wid={active.meta.wid} selectedTid={active.tid}
              marks={letterMarksFor([active.meta])} preview={hovered ?? armed} />;
          })()}
          showTashkeel={selectorTashkeel}
          keepClear={barEnabled ? trayClearance() : undefined}
          hideCategories={hideTrayCriteria}
          anchor={active.anchor}
          glyph={active.meta.semanticText}
          units={active.meta.units.map((unit) => ({
            tid: unit.tid,
            primaryGlyph: unit.primaryGlyph,
            fullGlyph: unit.fullGlyph,
            silent: unit.silent,
            selected: unit.tid === active.tid,
            mistake: mistakesForUnit(unit).find((mistake) =>
              (mistake.judgeSeatId ?? state.activeAssignment?.judgeSeatId) === state.activeAssignment?.judgeSeatId &&
              allowedCategories.includes(mistake.category)),
          }))}
          targetSelected={Boolean(activeUnit)}
          hovered={hovered}
          armed={armed}
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
            if (penDoubleTap && pinned && lastPointerTypeRef.current === "pen") {
              penPickLetter(tid);
              return;
            }
            setActive((current) => (current ? { ...current, tid } : current));
          }}
          onArmedPick={(tid) => {
            if (!armed || !active.meta.units.some((unit) => unit.tid === tid)) return;
            commit(armed, tid);
            closeTray();
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
