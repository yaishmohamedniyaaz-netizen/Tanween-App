import {
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
import { uid } from "../lib/id";
import { useJudging } from "../state/store";
import type { CategoryId, Mistake, TokenRole } from "../types";
import { DragMenu, type MenuAnchor } from "./DragMenu";
import { juzByPage, sajdahVerses } from "../data/marginalia";

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
const HIT_MIN_W = 20;
const HIT_PAD_Y = 5;
const MOVE_THRESHOLD = 6;
const BASE_FONT = 28;
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

function SurahBand({ nameAr }: { nameAr: string }) {
  const motif = (
    <svg viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.2">
      <circle cx="13" cy="13" r="8" />
      <circle cx="13" cy="13" r="3.2" />
      <path d="M13 1.5v5M13 19.5v5M1.5 13h5M19.5 13h5" strokeWidth="1" />
    </svg>
  );
  return (
    <div className="surah-band">
      <span className="surah-band-motif left" aria-hidden="true">
        {motif}
      </span>
      <span className="surah-band-title">سُورَةُ {nameAr}</span>
      <span className="surah-band-motif right" aria-hidden="true">
        {motif}
      </span>
    </div>
  );
}

interface MushafProps {
  page: number;
  onPageChange: (page: number) => void;
}

export function Mushaf({ page: currentPage, onPageChange }: MushafProps) {
  const { state, dispatch } = useJudging();
  const [pageData, setPageData] = useState<MushafPage | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [boxes, setBoxes] = useState<Hitbox[]>([]);
  const [fontPx, setFontPx] = useState(BASE_FONT);
  const [centered, setCentered] = useState<Set<number>>(new Set());
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

  const fontAdjustsRef = useRef(0);
  const settleKeyRef = useRef("");

  /* --- layout: fit the print's nowrap lines to the container, like paper.
     A line that would need an unnaturally wide inter-word gap to justify is
     centered with a normal fixed gap instead of being stretched. */
  const fitLines = useCallback(() => {
    const root = pageRef.current;
    if (!root || !pageData) return;
    // Special pages: all lines centered, skip auto-fit
    if (pageData.special) {
      const all = new Set<number>();
      pageData.lines.forEach((l) => all.add(l.n));
      setCentered(all);
      return;
    }
    const lineEls = root.querySelectorAll<HTMLElement>("[data-mline]");
    if (!lineEls.length) return;

    const settleKey = `${pageData.page}:${root.clientWidth}`;
    if (settleKey !== settleKeyRef.current) {
      settleKeyRef.current = settleKey;
      fontAdjustsRef.current = 0;
    }

    let widestRatio = 0;
    const centerNext = new Set<number>();
    const maxGap = MAX_GAP_EM * fontPx;

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

      if (words > 1) {
        const gapNeeded = (lineWidth - naturalWordsWidth) / (words - 1);
        if (gapNeeded > maxGap) centerNext.add(Number(el.dataset.mline));
      }
    });

    if (widestRatio > 0 && fontAdjustsRef.current < 8) {
      const ideal = Math.min(44, Math.max(17, (fontPx * 0.985) / widestRatio));
      if (Math.abs(ideal - fontPx) > 0.75) {
        fontAdjustsRef.current += 1;
        setFontPx(ideal);
        return; // re-run after the font settles
      }
    }

    setCentered((prev) => {
      if (prev.size === centerNext.size && [...centerNext].every((n) => prev.has(n)))
        return prev;
      return centerNext;
    });
  }, [fontPx, pageData]);

  /* --- hitboxes: tight ink rect + generous invisible target --- */
  const measure = useCallback(() => {
    const root = pageRef.current;
    if (!root) return;
    const rootRect = root.getBoundingClientRect();
    const words = root.querySelectorAll<HTMLElement>(".m-word");
    const next: Hitbox[] = [];
    words.forEach((wEl) => {
      const node = wEl.firstChild;
      if (!node || node.nodeType !== Node.TEXT_NODE) return;
      const text = node.textContent ?? "";
      const wid = wEl.dataset.wid!;
      const role = (wEl.dataset.role as TokenRole) ?? "letter";
      const surah = Number(wEl.dataset.surah);
      const ayahAttr = wEl.dataset.ayah;
      const ayah = ayahAttr === "b" ? null : Number(ayahAttr);
      const graphemes = graphemesOf(text, role);
      graphemes.forEach((g, gi) => {
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
        const x = l - rootRect.left;
        const y = t - rootRect.top;
        const w = r - l;
        const h = b - t;
        let hx = x;
        let hw = w;
        if (hw < HIT_MIN_W) {
          hx -= (HIT_MIN_W - hw) / 2;
          hw = HIT_MIN_W;
        }
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
          w,
          h,
          hx,
          hy: y - HIT_PAD_Y,
          hw,
          hh: h + HIT_PAD_Y * 2,
        });
      });
    });
    setBoxes(next);
  }, []);

  useLayoutEffect(() => {
    fitLines();
  }, [fitLines]);

  useLayoutEffect(() => {
    measure();
  }, [measure, fontPx, centered]);

  useEffect(() => {
    let ro: ResizeObserver | null = null;
    const refit = () => {
      fitLines();
      measure();
    };
    if (document.fonts?.ready) document.fonts.ready.then(refit);
    if (pageRef.current && "ResizeObserver" in window) {
      ro = new ResizeObserver(refit);
      ro.observe(pageRef.current);
    }
    window.addEventListener("resize", refit);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", refit);
    };
  }, [fitLines, measure]);

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
    const target = (e.target as HTMLElement).closest<HTMLElement>("[data-tid]");
    if (!target) {
      if (pinned) closeAll();
      return;
    }
    // Mouse/pen marking owns the pointer. On touch, leave the browser free to
    // begin a vertical page scroll; a stationary tap still opens the menu.
    if (e.pointerType !== "touch") e.preventDefault();
    const tid = target.dataset.tid!;
    const box = boxes.find((b) => b.tid === tid);
    if (!box) return;
    const rect = target.getBoundingClientRect();
    if (e.pointerType !== "touch") {
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
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
        className={`m-word ${w.role === "ayah-end" ? "ayah-num" : ""} ${isSajdah ? "sajdah" : ""}`}
        data-wid={w.wid}
        data-role={w.role}
        data-surah={w.surah}
        data-ayah={w.ayah === null ? "b" : String(w.ayah)}
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

  return (
    <div className="mushaf-scroll">
      <div
        className={`page ${pageData.special ? "page-special" : ""}`}
        ref={pageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={closeAll}
        onContextMenu={(e) => e.preventDefault()}
      >
        {juzByPage[currentPage] > 0 && (
          <div className="juz-label">الجزء {toArabicNum(juzByPage[currentPage])}</div>
        )}
        {pageData.lines.map((line) => {
          if (line.type === "surah-header") {
            return <SurahBand key={line.n} nameAr={line.nameAr} />;
          }
          if (line.type === "basmala") {
            return (
              <div
                key={line.n}
                className="m-line m-line-basmala"
                style={{ fontSize: fontPx * 0.78 }}
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
              style={{ fontSize: fontPx }}
            >
              {line.words.map(renderWord)}
            </div>
          );
        })}

        <div className="page-number">{pageData.page}</div>

        <div className="hit-layer">
          {boxes.map((b) => {
            const ms = byTid.get(b.tid);
            const dom = ms && ms.length ? dominant(ms) : null;
            const inkCls = [
              "glyph-ink",
              dom ? `marked cat-${dom}` : "",
              active?.tid === b.tid ? "armed" : "",
              flashTid === b.tid ? `flash ${dom ? "" : "cat-fasaha"}` : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <div key={b.tid}>
                <div
                  data-tid={b.tid}
                  className="hit"
                  style={{ left: b.hx, top: b.hy, width: b.hw, height: b.hh }}
                  role="button"
                  tabIndex={-1}
                  aria-label={
                    ms && ms.length
                      ? `${b.glyph}, ${ms.length} mark(s)`
                      : `mark ${b.glyph}`
                  }
                />
                <div
                  className={inkCls}
                  style={{ left: b.x, top: b.y, width: b.w, height: b.h }}
                >
                  {ms && ms.length > 1 && (
                    <span className="mark-count">{ms.length}</span>
                  )}
                </div>
              </div>
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
