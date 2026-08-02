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
import { loadPage, preloadPage, locationLabel, tokenId } from "../lib/page";
import type { PageWord, MushafPage } from "../lib/page";
import { graphemesOf } from "../lib/tokenize";
import {
  buildClusterGeometry,
  type ClusterMeasurement,
} from "../lib/clusterGeometry";
import { uid } from "../lib/id";
import { useJudging } from "../state/store";
import type { CategoryId, Mistake, TokenRole } from "../types";
import { DragMenu, type MenuAnchor } from "./DragMenu";
import { juzByPage, sajdahVerses } from "../data/marginalia";
import surahIndex from "../data/surah-index.json";

interface Hitbox {
  tid: string;
  wid: string;
  gi: number;
  glyph: string;
  role: TokenRole;
  surah: number;
  ayah: number | null;
  /* tight rect — the visible ink, hugging the glyph */
  x: number;
  y: number;
  w: number;
  h: number;
  /* generous rect — the invisible press target */
  hx: number;
  hy: number;
  hw: number;
  hh: number;
}

interface ActiveDrag {
  tid: string;
  anchor: MenuAnchor;
  meta: Hitbox;
}

const SEVERITY: Record<CategoryId, number> = { jali: 3, khafi: 2, fasaha: 1 };
const HIT_PAD_Y = 5;
const MOVE_THRESHOLD = 6;
const BASE_FONT = 30;
// Lines that would need a wider-than-this inter-word gap to justify are
// centered instead (real inter-word gap, print-like) rather than stretched.
const MAX_GAP_EM = 0.62;

const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
function toArabicNum(n: number): string {
  return String(n)
    .split("")
    .map((d) => ARABIC_DIGITS[parseInt(d, 10)])
    .join("");
}

/** The mushaf jump event — fired by the mistake log. */
export const JUMP_EVENT = "tahqeeq:jump";

function dominant(ms: Mistake[]): CategoryId {
  return ms.reduce((acc, m) =>
    SEVERITY[m.category] > SEVERITY[acc.category] ? m : acc,
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
  const pageRef = useRef<HTMLDivElement>(null);
  const [boxes, setBoxes] = useState<Hitbox[]>([]);
  const [boxesPage, setBoxesPage] = useState<number | null>(null);
  const [fontPx, setFontPx] = useState(BASE_FONT);
  const [centered, setCentered] = useState<Set<number>>(new Set());
  const [layoutEpoch, setLayoutEpoch] = useState(0);
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
    for (const m of state.mistakes) {
      const arr = map.get(m.tid);
      if (arr) arr.push(m);
      else map.set(m.tid, [m]);
    }
    return map;
  }, [state.mistakes]);

  /* --- load page data ---
     Deliberately do NOT clear boxes/fontPx/centered here: the currently
     rendered page stays fully intact and interactive until the next page's
     data arrives, then everything swaps in one commit (fitLines/measure
     recompute automatically because pageData is in their dependency chain).
     This removes the shrink-then-jump flash that made navigation feel slow. */
  useEffect(() => {
    let cancelled = false;
    loadPage(currentPage)
      .then((data) => {
        if (!cancelled) setPageData(data);
      })
      .catch(() => {
        /* transient fetch failure — a retry will happen if the user navigates again */
      });
    return () => {
      cancelled = true;
    };
  }, [currentPage]);

  /* --- prefetch nearby pages, two in each direction, so quick wheel/arrow
     flipping rarely waits on the network --- */
  useEffect(() => {
    for (let d = 1; d <= 2; d++) {
      if (currentPage - d >= 1) preloadPage(currentPage - d);
      if (currentPage + d <= 604) preloadPage(currentPage + d);
    }
  }, [currentPage]);

  /* --- keyboard navigation --- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onPageChange(Math.min(604, currentPage + 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onPageChange(Math.max(1, currentPage - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentPage, onPageChange]);

  const fittedLayoutRef = useRef("");

  /* --- layout: fit the print's nowrap lines to the container, like paper.
     A line that would need an unnaturally wide inter-word gap to justify is
     centered with a normal fixed gap instead of being stretched. */
  const fitLines = useCallback((): boolean => {
    const root = pageRef.current;
    if (!root || !pageData) return false;
    const layoutKey = `${pageData.page}:${pageLayout}:${Math.round(root.clientWidth)}`;
    if (fittedLayoutRef.current === layoutKey) return false;
    fittedLayoutRef.current = layoutKey;

    const lineEls = root.querySelectorAll<HTMLElement>("[data-mline]");
    if (!lineEls.length) return false;

    let widestRatio = 0;
    const metrics: Array<{
      line: number;
      lineWidth: number;
      naturalWordsWidth: number;
      words: number;
    }> = [];

    lineEls.forEach((el) => {
      const lineWidth = el.clientWidth;
      if (!lineWidth) return;
      let naturalWordsWidth = 0;
      let words = 0;
      el.querySelectorAll<HTMLElement>(".m-word").forEach((w) => {
        naturalWordsWidth += w.offsetWidth;
        words += 1;
      });
      const natural =
        naturalWordsWidth + Math.max(0, words - 1) * fontPx * 0.32;
      const ratio = natural / lineWidth;
      widestRatio = Math.max(widestRatio, ratio);
      metrics.push({
        line: Number(el.dataset.mline),
        lineWidth,
        naturalWordsWidth,
        words,
      });
    });

    const minFont = 6;
    const maxFont = pageLayout === "split" ? 30 : 40;
    const ideal =
      widestRatio > 0
        ? Math.round(
            Math.min(
              maxFont,
              Math.max(minFont, (fontPx * 0.985) / widestRatio),
            ) * 4,
          ) / 4
        : fontPx;
    const scale = ideal / Math.max(fontPx, 1);
    const maxGap = MAX_GAP_EM * ideal;
    const centerNext = new Set<number>(
      pageData.special ? pageData.lines.map((line) => line.n) : [],
    );
    for (const metric of metrics) {
      if (!pageData.special && metric.words > 1) {
        const projectedWordsWidth = metric.naturalWordsWidth * scale;
        const gapNeeded =
          (metric.lineWidth - projectedWordsWidth) / (metric.words - 1);
        if (gapNeeded > maxGap) centerNext.add(metric.line);
      }
    }

    const fontChanged = Math.abs(ideal - fontPx) > 0.25;
    const centeredChanged =
      centered.size !== centerNext.size ||
      [...centerNext].some((n) => !centered.has(n));
    if (fontChanged) setFontPx(ideal);
    if (centeredChanged) setCentered(centerNext);
    return fontChanged || centeredChanged;
  }, [centered, fontPx, pageData, pageLayout]);

  /* --- hitboxes: contextual, disjoint ownership + clipped ink rect --- */
  const measure = useCallback(() => {
    const root = pageRef.current;
    if (!root) return;
    const rootRect = root.getBoundingClientRect();
    // Decorative ayah markers stay visible, but are never selectable targets.
    const words = root.querySelectorAll<HTMLElement>(
      '.m-word[data-role="letter"]',
    );
    const next: Hitbox[] = [];
    words.forEach((wEl) => {
      const node = wEl.firstChild;
      if (!node || node.nodeType !== Node.TEXT_NODE) return;
      const text = node.textContent ?? "";
      const wid = wEl.dataset.wid!;
      const role = (wEl.dataset.role as TokenRole) ?? "letter";
      if (role !== "letter") return;
      const surah = Number(wEl.dataset.surah);
      const ayahAttr = wEl.dataset.ayah;
      const ayah = ayahAttr === "b" ? null : Number(ayahAttr);
      const graphemes = graphemesOf(text, role);
      if (!graphemes.length) return;

      const wordRange = document.createRange();
      wordRange.setStart(node, 0);
      wordRange.setEnd(node, text.length);
      const wordRect = wordRange.getBoundingClientRect();
      if (!wordRect.width || !wordRect.height) return;

      const rtl = getComputedStyle(wEl).direction !== "ltr";
      const measurements: ClusterMeasurement[] = [];
      graphemes.forEach((g) => {
        const range = document.createRange();
        range.setStart(node, g.start);
        range.setEnd(node, g.end);
        const rects = range.getClientRects();
        if (!rects.length) return;
        let l = Infinity,
          t = Infinity,
          r = -Infinity,
          b = -Infinity;
        for (const rc of rects) {
          if (rc.width === 0 && rc.height === 0) continue;
          l = Math.min(l, rc.left);
          t = Math.min(t, rc.top);
          r = Math.max(r, rc.right);
          b = Math.max(b, rc.bottom);
        }
        if (l === Infinity) return;

        // Measuring the shaped prefix keeps joining and ligatures intact. Its
        // inline edge is the browser's contextual caret after this grapheme.
        const prefix = document.createRange();
        prefix.setStart(node, 0);
        prefix.setEnd(node, g.end);
        const prefixRect = prefix.getBoundingClientRect();
        measurements.push({
          rawLeft: l,
          rawTop: t,
          rawRight: r,
          rawBottom: b,
          boundaryAfter: prefixRect.width
            ? rtl
              ? prefixRect.left
              : prefixRect.right
            : null,
        });
      });

      if (measurements.length !== graphemes.length) return;
      const geometry = buildClusterGeometry(
        measurements,
        wordRect.left,
        wordRect.right,
        rtl,
      );
      graphemes.forEach((g, gi) => {
        const measured = geometry[gi];
        if (!measured) return;
        const x = measured.inkLeft - rootRect.left;
        const y = measured.inkTop - rootRect.top;
        const width = measured.inkRight - measured.inkLeft;
        const height = measured.inkBottom - measured.inkTop;
        const hx = measured.hitLeft - rootRect.left;
        const hw = measured.hitRight - measured.hitLeft;
        next.push({
          tid: tokenId(wid, gi),
          wid,
          gi,
          glyph: g.glyph,
          role: g.role,
          surah,
          ayah,
          x,
          y,
          w: width,
          h: height,
          hx,
          hy: y - HIT_PAD_Y,
          hw,
          hh: height + HIT_PAD_Y * 2,
        });
      });
    });
    setBoxes(next);
    setBoxesPage(Number(root.dataset.page));
  }, []);

  useLayoutEffect(() => {
    // One fitting pass per page width. Hitbox work is deliberately deferred so
    // the newly selected Quran page can paint before its interaction layer.
    fitLines();
  }, [fitLines, layoutEpoch]);

  useEffect(() => {
    let timer = 0;
    const frame = requestAnimationFrame(() => {
      timer = window.setTimeout(measure, 0);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (timer) window.clearTimeout(timer);
    };
  }, [centered, fontPx, layoutEpoch, measure, pageData?.page, pageLayout]);

  useEffect(() => {
    let cancelled = false;
    document.fonts
      ?.load(`${BASE_FONT}px "HafsUthmanic"`)
      .then(() => {
        if (cancelled) return;
        fittedLayoutRef.current = "";
        setLayoutEpoch((value) => value + 1);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;
    let lastWidth = Math.round(root.getBoundingClientRect().width);
    const handleWidth = () => {
      const nextWidth = Math.round(root.getBoundingClientRect().width);
      if (Math.abs(nextWidth - lastWidth) < 2) return;
      lastWidth = nextWidth;
      fittedLayoutRef.current = "";
      setLayoutEpoch((value) => value + 1);
    };
    const ro =
      "ResizeObserver" in window ? new ResizeObserver(handleWidth) : null;
    ro?.observe(root);
    window.addEventListener("resize", handleWidth);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", handleWidth);
    };
  }, [pageData?.page]);

  /* --- handle pending flash after page load --- */
  useEffect(() => {
    if (!pendingFlashTid || !boxes.length) return;
    const box = boxes.find((b) => b.tid === pendingFlashTid);
    if (!box) return;
    const el = pageRef.current?.querySelector<HTMLElement>(
      `[data-tid="${CSS.escape(pendingFlashTid)}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashTid(null);
    requestAnimationFrame(() => setFlashTid(pendingFlashTid));
    setPendingFlashTid(null);
  }, [pendingFlashTid, boxes]);

  /* --- jump-to-mark (from the mistake log) --- */
  useEffect(() => {
    const onJump = (e: Event) => {
      const detail = (e as CustomEvent<{ tid: string; page?: number }>).detail;
      if (!detail?.tid) return;
      const targetPage = detail.page ?? 604;
      if (targetPage !== currentPage) {
        setPendingFlashTid(detail.tid);
        onPageChange(targetPage);
        return;
      }
      const el = pageRef.current?.querySelector<HTMLElement>(
        `[data-tid="${CSS.escape(detail.tid)}"]`,
      );
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      setFlashTid(null);
      requestAnimationFrame(() => setFlashTid(detail.tid));
    };
    window.addEventListener(JUMP_EVENT, onJump);
    return () => window.removeEventListener(JUMP_EVENT, onJump);
  }, [currentPage, onPageChange]);

  useEffect(() => {
    if (!flashTid) return;
    const t = setTimeout(() => setFlashTid(null), 1300);
    return () => clearTimeout(t);
  }, [flashTid]);

  const closeAll = useCallback(() => {
    startRef.current = null;
    setActive(null);
    setHovered(null);
    setPinned(false);
  }, []);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, closeAll]);

  const commit = useCallback(
    (category: CategoryId) => {
      if (!active) return;
      const m = active.meta;
      const mistake: Mistake = {
        id: uid(),
        tid: m.tid,
        surah: m.surah,
        ayah: m.ayah,
        page: currentPage,
        glyph: m.glyph,
        label: locationLabel(m.surah, m.ayah, m.gi),
        category,
        amount: state.config[category].step,
        ts: Date.now(),
      };
      dispatch({ type: "ADD_MISTAKE", mistake });
    },
    [active, dispatch, state.config, currentPage],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (startRef.current) return;
    const root = pageRef.current;
    if (!root) return;
    const rootRect = root.getBoundingClientRect();
    const pointX = e.clientX - rootRect.left;
    const pointY = e.clientY - rootRect.top;
    const candidates = boxes.filter(
      (candidate) =>
        pointX >= candidate.hx &&
        pointX <= candidate.hx + candidate.hw &&
        pointY >= candidate.hy &&
        pointY <= candidate.hy + candidate.hh,
    );
    const box = candidates.reduce<Hitbox | null>((closest, candidate) => {
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
    // A press that starts on a letter owns the pointer on every input type.
    // Blank page areas still keep the page's normal vertical touch scrolling.
    e.preventDefault();
    const tid = box.tid;
    const target = root.querySelector<HTMLElement>(
      `.hit[data-tid="${CSS.escape(tid)}"]`,
    );
    if (!target) return;
    const rect = target.getBoundingClientRect();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      t: Date.now(),
      moved: false,
      pointerId: e.pointerId,
    };
    // Render the menu synchronously so hover detection works on fast drags.
    flushSync(() => {
      setHovered(null);
      setPinned(false);
      setActive({
        tid,
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

  const onPointerMove = (e: React.PointerEvent) => {
    if (!active || pinned) return;
    if (startRef.current && e.pointerId !== startRef.current.pointerId) return;
    const s = startRef.current;
    if (s) {
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (Math.hypot(dx, dy) > MOVE_THRESHOLD) s.moved = true;
    }
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const pill = el?.closest<HTMLElement>("[data-pill]");
    setHovered(pill ? (pill.dataset.pill as CategoryId) : null);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!active) return;
    if (startRef.current && e.pointerId !== startRef.current.pointerId) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const s = startRef.current;
    startRef.current = null;
    if (hovered) {
      commit(hovered);
      closeAll();
    } else if (s && !s.moved && Date.now() - s.t < 500) {
      setPinned(true);
    } else {
      closeAll();
    }
  };

  const sajdahSet = useMemo(() => {
    const set = new Set<string>();
    for (const { surah, ayah } of sajdahVerses) {
      set.add(`${surah}:${ayah}`);
    }
    return set;
  }, []);

  const renderWord = (w: PageWord) => {
    const isSajdah =
      w.role === "ayah-end" &&
      w.ayah !== null &&
      sajdahSet.has(`${w.surah}:${w.ayah}`);
    return (
      <span
        key={w.wid}
        className={`m-word ${w.role === "ayah-end" ? "ayah-num" : ""} ${w.role === "ornament" ? "m-ornament" : ""} ${isSajdah ? "sajdah" : ""}`}
        data-wid={w.wid}
        data-role={w.role}
        data-surah={w.surah}
        data-ayah={w.ayah === null ? "b" : String(w.ayah)}
        aria-hidden={w.role !== "letter" ? true : undefined}
      >
        {w.text}
        {isSajdah && <span className="sajdah-mark" aria-label="Sajdah">۩</span>}
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
  const lineStyle = (line: number): CSSProperties =>
    pageLayout === "split"
      ? {
          gridRow: ((line - 1) % 8) + 1,
          gridColumn: line <= 8 ? 2 : 1,
        }
      : { gridRow: line };

  return (
    <div className="mushaf-scroll">
      <div
        className={`page ${pageData.special ? "page-special" : ""} ${pageLayout === "split" ? "page-split" : ""}`}
        ref={pageRef}
        data-page={pageData.page}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={closeAll}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="page-marginalia">
          <span className="page-juz">Juz&apos; {juzByPage[pageData.page]}</span>
          {headerControls}
          <span className="page-surahs" dir="rtl">
            {pageSurahs.map((surah) => surah.nameAr).join(" - ")}
          </span>
        </div>
        {juzByPage[currentPage] > 0 && (
          <div className="juz-label">الجزء {toArabicNum(juzByPage[currentPage])}</div>
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
                style={{ ...lineStyle(line.n), fontSize: fontPx * 0.78 }}
              >
                {line.words.map(renderWord)}
              </div>
            );
          }
          const center = centered.has(line.n);
          return (
            <div
              key={line.n}
              data-mline={line.n}
              className={`m-line ${center ? "m-line-center" : "m-line-ayah"}`}
              style={{ ...lineStyle(line.n), fontSize: fontPx }}
            >
              {line.words.map(renderWord)}
            </div>
          );
        })}
        </div>

        <div className="hit-layer">
          {visibleBoxes.map((b) => {
            const ms = byTid.get(b.tid);
            const dom = ms && ms.length ? dominant(ms) : null;
            const inkCls = [
              "glyph-ink",
              dom ? `marked cat-${dom}` : "",
              active?.tid === b.tid
                ? `armed ${hovered ? `cat-${hovered}` : ""}`
                : "",
              flashTid === b.tid ? `flash ${dom ? "" : "cat-fasaha"}` : "",
            ]
              .filter(Boolean)
              .join(" ");
            const showInk = Boolean(dom || flashTid === b.tid);
            return (
              <Fragment key={b.tid}>
                <div
                  data-tid={b.tid}
                  className={`hit ${active?.tid === b.tid ? `armed ${hovered ? `cat-${hovered}` : ""}` : ""}`}
                  style={
                    {
                      left: b.hx,
                      top: b.hy,
                      width: b.hw,
                      height: b.hh,
                      "--ink-left": `${b.x - b.hx}px`,
                      "--ink-top": `${b.y - b.hy}px`,
                      "--ink-width": `${b.w}px`,
                      "--ink-height": `${b.h}px`,
                    } as CSSProperties
                  }
                  role="button"
                  tabIndex={-1}
                  aria-label={
                    ms && ms.length
                      ? `${b.glyph}, ${ms.length} mark(s)`
                      : `mark ${b.glyph}`
                  }
                />
                {showInk && (
                  <div
                    className={inkCls}
                    style={{ left: b.x, top: b.y, width: b.w, height: b.h }}
                  >
                    {ms && ms.length > 1 && (
                      <span className="mark-count">{ms.length}</span>
                    )}
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>

      {active && (
        <DragMenu
          anchor={active.anchor}
          glyph={active.meta.glyph}
          hovered={hovered}
          pinned={pinned}
          config={state.config}
          onPick={(id) => {
            commit(id);
            closeAll();
          }}
          onClose={closeAll}
        />
      )}
    </div>
  );
}
