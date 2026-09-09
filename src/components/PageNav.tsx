import { useCallback, useEffect, useRef, useState } from "react";
import surahIndex from "../data/surah-index.json";
import type { MushafLayout } from "../lib/devicePreferences";
import {
  moveMushafView,
  mushafPageRangeLabel,
} from "../lib/mushafSpread";
import { preloadPage } from "../lib/page";
import { preloadQcfPageFont } from "../lib/qcfFont";

interface PageNavProps {
  page: number;
  visiblePages: readonly number[];
  layout: MushafLayout;
  compact: boolean;
  onChange: (page: number) => void;
  prefetchFonts?: boolean;
}

export function PageNav({
  page,
  visiblePages,
  layout,
  compact,
  onChange,
  prefetchFonts = true,
}: PageNavProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [jumpInput, setJumpInput] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);
  const pageBtnRef = useRef<HTMLButtonElement>(null);
  const jumpInputRef = useRef<HTMLInputElement>(null);
  const lastWheelRef = useRef(0);
  const intentPrefetchTimerRef = useRef<number | null>(null);
  const rangeLabel = mushafPageRangeLabel(visiblePages);
  const prefetchTarget = useCallback((targetPage: number) => {
    if (!prefetchFonts) return;
    if (!Number.isInteger(targetPage) || targetPage < 1 || targetPage > 604) return;
    preloadPage(targetPage);
    preloadQcfPageFont(targetPage);
  }, [prefetchFonts]);
  const cancelIntentPrefetch = useCallback(() => {
    if (intentPrefetchTimerRef.current !== null) {
      window.clearTimeout(intentPrefetchTimerRef.current);
      intentPrefetchTimerRef.current = null;
    }
  }, []);
  const scheduleIntentPrefetch = useCallback((targetPage: number) => {
    cancelIntentPrefetch();
    intentPrefetchTimerRef.current = window.setTimeout(() => {
      intentPrefetchTimerRef.current = null;
      prefetchTarget(targetPage);
    }, 120);
  }, [cancelIntentPrefetch, prefetchTarget]);

  useEffect(() => cancelIntentPrefetch, [cancelIntentPrefetch]);

  useEffect(() => {
    if (!popoverOpen) return;
    const onDoc = (event: MouseEvent) => {
      if (!popoverRef.current?.contains(event.target as Node)) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [popoverOpen]);

  useEffect(() => {
    if (!popoverOpen) return;
    const targetPage = Number(jumpInput);
    if (!Number.isInteger(targetPage) || targetPage < 1 || targetPage > 604) return;
    const timer = window.setTimeout(() => prefetchTarget(targetPage), 180);
    return () => window.clearTimeout(timer);
  }, [jumpInput, popoverOpen, prefetchTarget]);

  useEffect(() => {
    if (!popoverOpen) return;
    const frame = requestAnimationFrame(() => {
      jumpInputRef.current?.focus();
      jumpInputRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [popoverOpen]);

  const handleJump = () => {
    const nextPage = Number(jumpInput);
    if (!Number.isNaN(nextPage) && nextPage >= 1 && nextPage <= 604) {
      onChange(nextPage);
      setPopoverOpen(false);
      setJumpInput("");
    }
  };

  const goForward = useCallback(
    () => onChange(moveMushafView(page, layout, 1, compact)),
    [compact, layout, onChange, page],
  );
  const goBackward = useCallback(
    () => onChange(moveMushafView(page, layout, -1, compact)),
    [compact, layout, onChange, page],
  );

  useEffect(() => {
    const element = pageBtnRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const now = Date.now();
      if (now - lastWheelRef.current < 180) return;
      lastWheelRef.current = now;
      if (event.deltaY > 0) goForward();
      else if (event.deltaY < 0) goBackward();
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [goBackward, goForward]);

  return (
    <div className="page-nav">
      <button
        type="button"
        className="page-nav-btn"
        aria-label={layout === "spread" && !compact ? "next two pages" : "next page"}
        onClick={goForward}
      >
        <span className="page-nav-ink" aria-hidden="true">‹</span>
      </button>

      <div className="page-nav-center" ref={popoverRef}>
        <button
          ref={pageBtnRef}
          type="button"
          className="page-nav-page"
          title="Type a page number"
          aria-label={`Pages ${rangeLabel}. Jump to page.`}
          onClick={() => {
            setPopoverOpen((current) => !current);
            setJumpInput(String(page));
          }}
        >
          <span className="page-nav-ink">{rangeLabel}</span>
        </button>

        {popoverOpen && (
          <div className="page-nav-popover">
            <div className="page-nav-popover-head">
              <span className="t-label">Jump to page</span>
              <form
                className="page-nav-jump-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleJump();
                }}
              >
                <input
                  ref={jumpInputRef}
                  autoFocus
                  type="number"
                  inputMode="numeric"
                  enterKeyHint="go"
                  min={1}
                  max={604}
                  value={jumpInput}
                  onChange={(event) => setJumpInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setPopoverOpen(false);
                      pageBtnRef.current?.focus();
                    }
                  }}
                  onFocus={(event) => event.currentTarget.select()}
                  placeholder="1–604"
                />
                <button type="submit" className="btn-ghost">Go</button>
              </form>
            </div>
            <div className="page-nav-surah-list">
              {surahIndex.map((surah) => (
                <button
                  key={surah.number}
                  type="button"
                  className="page-nav-surah"
                  onPointerEnter={() => scheduleIntentPrefetch(surah.firstPage)}
                  onPointerLeave={cancelIntentPrefetch}
                  onPointerDown={() => {
                    cancelIntentPrefetch();
                    prefetchTarget(surah.firstPage);
                  }}
                  onFocus={() => prefetchTarget(surah.firstPage)}
                  onClick={() => {
                    onChange(surah.firstPage);
                    setPopoverOpen(false);
                  }}
                >
                  <span className="page-nav-surah-num">{surah.number}</span>
                  <span className="page-nav-surah-name">{surah.nameAr}</span>
                  <span className="page-nav-surah-page t-num">p. {surah.firstPage}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        className="page-nav-btn"
        aria-label={layout === "spread" && !compact ? "previous two pages" : "previous page"}
        onClick={goBackward}
      >
        <span className="page-nav-ink" aria-hidden="true">›</span>
      </button>
    </div>
  );
}
