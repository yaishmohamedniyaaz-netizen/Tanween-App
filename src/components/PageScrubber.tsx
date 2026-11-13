import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import surahIndex from "../data/surah-index.json";
import { juzByPage } from "../data/marginalia.ts";
import { JUZ_START, SURAH_LATIN, surahOfPage } from "../lib/pageFinder";

/**
 * Page-number scrubbing, from the Quran reader app's page dial, adjusted for judging.
 *
 * Hold the page number (200 ms) or slide on it: a strip opens where the number is.
 * The whole strip is the Quran, page 1 at the right end and 604 at the left (the
 * Quran runs right to left), with a line where each juz starts (every 5th longer)
 * and the reciter's assigned pages as a shaded band. A popup over the finger says
 * the juz and the surah. Slide up, away from the strip: one page at a time (8 px a
 * page). Slide back down: the whole Quran again. The page behind follows, shortly
 * after the finger. Let go: that page.
 *
 * Judging changes from the reader: slide well below the strip and let go to go back
 * to the starting page (a scrub by accident mid-recitation is harmless); the
 * assigned pages are shown; a plain tap still opens the page finder.
 */
const N = 604, GAP = 8, UP = 48, DOWN = 44, HOLD_MS = 200, SLIDE_PX = 6, PEEK_MS = 90;

interface Strip { left: number; width: number; top: number }
interface Scrub {
  id: number; x0: number; y0: number; open: boolean; fine: boolean; cancel: boolean; moved: boolean;
  p0: number; p: number; fp: number; fx: number; timer: number; peek: number;
  strip: Strip | null;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const vibrate = (ms: number) => { try { navigator.vibrate?.(ms); } catch { /* not supported (iPhone) */ } };

export function usePageScrubber({ enabled, page, assigned, onPeek, onCommit }: {
  enabled: boolean;
  page: number;
  /** The reciter's assigned pages, shown as a band on the strip. */
  assigned: readonly [number, number] | null;
  /** The page behind follows the finger. */
  onPeek: (page: number) => void;
  /** Let go: this page (the start page when cancelled). */
  onCommit: (page: number) => void;
}) {
  const st = useRef<Scrub | null>(null);
  const eatClick = useRef(false);
  const [view, setView] = useState<{ p: number; p0: number; fine: boolean; cancel: boolean; x: number; strip: Strip; fp: number; fx: number; bump: number } | null>(null);
  const latest = useRef({ page, onPeek, onCommit });
  latest.current = { page, onPeek, onCommit };

  const xOf = useCallback((p: number, s: Scrub) => {
    const strip = s.strip!, xL = strip.left + 20, xR = strip.left + strip.width - 20;
    return s.fine ? s.fx - (p - s.fp) * GAP : xR - (p - 1) / (N - 1) * (xR - xL);
  }, []);

  const render = (s: Scrub, bump = false) => {
    const strip = s.strip!;
    setView(prev => ({ p: s.p, p0: s.p0, fine: s.fine, cancel: s.cancel, fp: s.fp, fx: s.fx,
      x: clamp(xOf(s.p, s), strip.left + 20, strip.left + strip.width - 20) - strip.left,
      strip, bump: bump ? (prev?.bump ?? 0) + 1 : prev?.bump ?? 0 }));
  };

  const open = (s: Scrub, target: HTMLElement) => {
    s.open = true; s.p = s.p0 = latest.current.page;
    try { target.setPointerCapture(s.id); } catch { /* already gone */ }
    const r = target.getBoundingClientRect(), width = Math.min(560, window.innerWidth - 24);
    s.strip = { left: (window.innerWidth - width) / 2, width, top: r.top + r.height / 2 - 22 };
    eatClick.current = true;
    vibrate(8); render(s);
  };

  const close = (commit: boolean) => {
    const s = st.current; st.current = null;
    if (!s) return;
    window.clearTimeout(s.timer); window.clearTimeout(s.peek);
    if (!s.open) return;
    latest.current.onCommit(commit && !s.cancel ? s.p : s.p0);
    setView(null);
    window.setTimeout(() => { eatClick.current = false; }, 400);
  };

  useEffect(() => () => { if (st.current) { window.clearTimeout(st.current.timer); window.clearTimeout(st.current.peek); } }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (!enabled || st.current || !event.isPrimary || event.button !== 0) return;
    const target = event.currentTarget;
    const s: Scrub = { id: event.pointerId, x0: event.clientX, y0: event.clientY, open: false, fine: false, cancel: false,
      moved: false, p0: page, p: page, fp: page, fx: 0, timer: 0, peek: 0, strip: null };
    s.timer = window.setTimeout(() => { if (st.current === s && !s.open) open(s, target); }, HOLD_MS);
    st.current = s;
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const s = st.current;
    if (!s || event.pointerId !== s.id) return;
    if (!s.open) {
      if (Math.abs(event.clientX - s.x0) > SLIDE_PX) { window.clearTimeout(s.timer); open(s, event.currentTarget); }
      else return;
    }
    const strip = s.strip!, xL = strip.left + 20, xR = strip.left + strip.width - 20;
    const cancel = event.clientY - s.y0 > DOWN;
    const fine = !cancel && s.y0 - event.clientY > UP;
    if (cancel !== s.cancel) {
      s.cancel = cancel; vibrate(6);
      if (cancel) s.fine = false;
      window.clearTimeout(s.peek);
      latest.current.onPeek(cancel ? s.p0 : s.p);
      render(s); if (cancel) return;
    }
    if (cancel) return;
    if (fine !== s.fine) {
      // Page by page is laid out around the page and the finger as they are now.
      s.fine = fine;
      if (fine) { s.fp = s.p; s.fx = clamp(event.clientX, xL, xR); }
      render(s);
    }
    if (!s.moved && !s.fine && Math.abs(event.clientX - s.x0) < 4) return;
    s.moved = true;
    const p = s.fine
      ? clamp(s.fp + Math.round((s.fx - event.clientX) / GAP), 1, N)
      : clamp(Math.round(1 + (xR - clamp(event.clientX, xL, xR)) / (xR - xL) * (N - 1)), 1, N);
    if (p !== s.p) {
      s.p = p; render(s, true); vibrate(4);
      window.clearTimeout(s.peek);
      s.peek = window.setTimeout(() => { if (st.current === s && !s.cancel) latest.current.onPeek(p); }, PEEK_MS);
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    if (st.current && event.pointerId === st.current.id) close(true);
  };
  const onPointerCancel = (event: ReactPointerEvent<HTMLElement>) => {
    // The system took the touch: stay where the judge started.
    if (st.current && event.pointerId === st.current.id) { st.current.cancel = true; close(false); }
  };
  /** A click that ends a scrub must not also open the page finder. */
  const swallowClick = () => {
    if (!eatClick.current) return false;
    eatClick.current = false; return true;
  };

  const strip = view && createPortal(<ScrubStrip view={view} assigned={assigned} />, document.body);
  return { handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel }, swallowClick, strip, scrubbing: view !== null };
}

function ScrubStrip({ view, assigned }: {
  view: { p: number; p0: number; fine: boolean; cancel: boolean; x: number; strip: Strip; fp: number; fx: number; bump: number };
  assigned: readonly [number, number] | null;
}) {
  const { strip } = view, xL = strip.left + 20, xR = strip.left + strip.width - 20;
  const xOf = (p: number) => (view.fine ? view.fx - (p - view.fp) * GAP : xR - (p - 1) / (N - 1) * (xR - xL)) - strip.left;
  const ticks: { p: number; len: number }[] = [];
  if (view.fine) {
    const span = Math.ceil(strip.width / 2 / GAP) + 2;
    for (let p = view.fp - span; p <= view.fp + span; p++) {
      if (p < 1 || p > N) continue;
      const x = xOf(p); if (x < 8 || x > strip.width - 8) continue;
      ticks.push({ p, len: JUZ_START.includes(p) ? 9 : p % 10 === 0 ? 7 : p % 5 === 0 ? 5 : 3 });
    }
  } else {
    JUZ_START.forEach((p, i) => ticks.push({ p, len: i % 5 === 4 || i === 0 ? 8 : 5 }));
    ticks.push({ p: N, len: 5 });
  }
  let band: { left: number; width: number } | null = null;
  if (assigned) {
    const a = clamp(xOf(assigned[1]), 6, strip.width - 6), b = clamp(xOf(assigned[0]), 6, strip.width - 6);
    const left = Math.min(a, b) - (view.fine ? GAP / 2 : 1), width = Math.abs(b - a) + (view.fine ? GAP : 2);
    if (width > 0) band = { left, width };
  }
  const surah = surahOfPage(surahIndex, view.p);
  const label = view.cancel ? `Let go to stay on page ${view.p0}` : `Juz ${juzByPage[view.p]} · ${SURAH_LATIN[surah - 1]}`;
  const popHalf = 90;
  const popLeft = clamp(view.x, popHalf, strip.width - popHalf);
  return (
    <div className={`page-scrub${view.fine ? " is-fine" : ""}${view.cancel ? " is-cancel" : ""}`} aria-hidden="true"
      style={{ left: strip.left, top: strip.top, width: strip.width }}>
      <div className="page-scrub-track">
        {band && <i className="page-scrub-band" style={{ left: band.left, width: band.width }} />}
        {ticks.map(t => (
          <i key={t.p} className={`page-scrub-tick${t.p === view.p ? " is-on" : ""}`} style={{ left: xOf(t.p), height: t.len }} />
        ))}
        {!view.cancel && <i className="page-scrub-thumb" style={{ left: view.x }} />}
        <span key={view.bump} className={`page-scrub-num t-num${view.bump ? " bump" : ""}`}>{view.cancel ? view.p0 : view.p}</span>
      </div>
      <div className="page-scrub-pop" style={{ left: popLeft }}>
        {label}
        {view.fine && !view.cancel && <small>One page at a time</small>}
        {!view.fine && !view.cancel && <small>Slide down to cancel</small>}
      </div>
    </div>
  );
}
