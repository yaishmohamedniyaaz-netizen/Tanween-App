import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from 'react-dom';
import surahIndex from "../data/surah-index.json";
import { MUSHAF_SURFACE_EVENT, openMushafSurface } from "../lib/mushafSurface";
import type { MushafLayout } from "../lib/devicePreferences";
import {
  moveMushafView,
  mushafPageRangeLabel,
} from "../lib/mushafSpread";
import { preloadPage } from "../lib/page";
import { Icon } from "./Icon";
import { preloadQcfPageFont } from "../lib/qcfFont";
import { pageFinderItems, SURAH_LATIN, surahOfPage, type PageFinderItem } from "../lib/pageFinder";

interface PageNavProps {
  page: number;
  visiblePages: readonly number[];
  layout: MushafLayout;
  compact: boolean;
  onChange: (page: number) => void;
  prefetchFonts?: boolean;
  calibrated?: boolean;
  /** The selected question's page, offered first while the field is empty. */
  questionPage?: number | null;
}

export function PageNav({
  page,
  visiblePages,
  layout,
  compact,
  onChange,
  prefetchFonts = true,
  calibrated = false,
  questionPage = null,
}: PageNavProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  useEffect(() => {
    const switchSurface = (event: Event) => {
      if ((event as CustomEvent).detail !== "pages") setPopoverOpen(false);
    };
    window.addEventListener(MUSHAF_SURFACE_EVENT, switchSurface);
    return () => window.removeEventListener(MUSHAF_SURFACE_EVENT, switchSurface);
  }, []);
  const [jumpInput, setJumpInput] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const items = useMemo(() => pageFinderItems(surahIndex, jumpInput, questionPage), [jumpInput, questionPage]);
  // The surahs on the open pages: those that start on them, or the one that runs through them.
  const openSurahs = useMemo(() => {
    const first = visiblePages[0] ?? page;
    const on = surahIndex.filter((surah) => visiblePages.includes(surah.firstPage)).map((surah) => surah.number);
    if (!on.length || surahIndex[on[0] - 1].firstPage > first) on.unshift(surahOfPage(surahIndex, first));
    return new Set(on);
  }, [page, visiblePages]);
  const popoverRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [popupStyle, setPopupStyle] = useState<CSSProperties>({ visibility: 'hidden' });
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
      if (!popoverRef.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node)) {
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
      jumpInputRef.current?.focus({ preventScroll: calibrated });
      jumpInputRef.current?.select();
      // Start the list at the open surah, in view.
      const list = listRef.current;
      const current = list?.querySelector<HTMLElement>("[aria-current='true']");
      // Only when it is below the fold, so the rows above it (the question page) stay in view.
      if (list && current && current.offsetTop + current.offsetHeight > list.clientHeight) {
        list.scrollTop = Math.max(0, current.offsetTop - list.clientHeight / 2 + current.offsetHeight / 2);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [popoverOpen, calibrated]);

  useLayoutEffect(() => {
    if (!popoverOpen || !calibrated) return;
    const viewport = window.visualViewport;
    let frame = 0;
    const place = () => {
      const anchor = pageBtnRef.current?.getBoundingClientRect();
      if (!anchor) return;
      const left = viewport?.offsetLeft ?? 0;
      const top = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      const menuWidth = Math.max(0, Math.min(320, width - 24));
      const menuHeight = Math.max(0, Math.min(360, height - 24));
      setPopupStyle({ position: 'fixed', visibility: 'visible', transform: 'none', bottom: 'auto',
        width: menuWidth, maxHeight: menuHeight,
        left: Math.max(left + 12, Math.min(anchor.x + anchor.width / 2 - menuWidth / 2, left + width - menuWidth - 12)),
        top: Math.max(top + 12, Math.min(anchor.y - menuHeight - 6, top + height - menuHeight - 12)) });
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(place); };
    place();
    viewport?.addEventListener('resize', schedule);
    viewport?.addEventListener('scroll', schedule);
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener('resize', schedule);
      viewport?.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [popoverOpen, calibrated]);
  // Rotation closes portrait entry rather than moving a focused input into
  // a different navigation surface underneath the native keyboard.
  useEffect(() => { setPopoverOpen(false); }, [calibrated]);
  const renderPopover = (node: ReactNode) => calibrated ? createPortal(node, document.body) : node;

  const goTo = (target: number) => {
    onChange(target);
    setPopoverOpen(false);
    setJumpInput("");
    setActiveIndex(0);
  };
  const handleJump = () => {
    const item = items[Math.min(activeIndex, items.length - 1)];
    if (item) goTo(item.page);
  };
  const onFinderKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setPopoverOpen(false);
      pageBtnRef.current?.focus();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    if (!items.length) return;
    const next = (activeIndex + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    setActiveIndex(next);
    listRef.current?.querySelector<HTMLElement>(`[data-index="${next}"]`)?.scrollIntoView({ block: "nearest" });
  };
  const itemLabel = (item: PageFinderItem) => {
    const name = SURAH_LATIN[item.surah - 1];
    if (item.kind === "page") return `Page ${item.page}, ${name}`;
    if (item.kind === "juz") return `Juz ${item.juz}, page ${item.page}`;
    if (item.kind === "question") return `Question page, page ${item.page}`;
    return `${name}, surah ${item.surah}, page ${item.page}${openSurahs.has(item.surah) ? ", open now" : ""}`;
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
          title="Go to a page, surah or juz"
          aria-label={`Pages ${rangeLabel}. Go to a page or surah.`}
          aria-expanded={popoverOpen}
          aria-haspopup="dialog"
          onClick={() => {
            if (!popoverOpen) openMushafSurface("pages");
            setPopoverOpen((current) => !current);
            setJumpInput("");
            setActiveIndex(0);
          }}
        >
          <span className="page-nav-ink">{rangeLabel.replace("\u2013", " - ")}</span>
        </button>

        {popoverOpen && renderPopover(
          <div ref={menuRef} className={`page-nav-popover page-finder${calibrated ? ' page-nav-popover-calibrated' : ''}`}
            role="dialog" aria-label="Go to a page or surah" style={calibrated ? popupStyle : undefined}>
            {/* One field: a page, a surah number or name (English or Arabic), or "juz 30". */}
            <form
              className="page-finder-field"
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                handleJump();
              }}
            >
              <Icon name="search" size={16} />
              <input
                ref={jumpInputRef}
                autoFocus={!calibrated}
                type="text"
                inputMode="search"
                enterKeyHint="go"
                autoComplete="off"
                spellCheck={false}
                aria-label="Page number, surah number or name, or juz"
                aria-controls="page-finder-list"
                aria-activedescendant={items.length ? `page-finder-item-${Math.min(activeIndex, items.length - 1)}` : undefined}
                value={jumpInput}
                onChange={(event) => { setJumpInput(event.target.value); setActiveIndex(0); }}
                onKeyDown={onFinderKeyDown}
                onFocus={(event) => event.currentTarget.select()}
                placeholder="Page or surah"
              />
            </form>
            <div ref={listRef} id="page-finder-list" className="page-nav-surah-list quiet-scroll" role="listbox" aria-label="Pages and surahs">
              {items.length === 0 && (
                <p className="page-finder-empty">No match. Type a page (1–604), a surah number or name, or “juz 30”.</p>
              )}
              {items.map((item, index) => {
                const surah = surahIndex[item.surah - 1];
                const current = item.kind === "surah" && !jumpInput && openSurahs.has(item.surah);
                const active = index === Math.min(activeIndex, items.length - 1) && (jumpInput !== "" || item.kind === "question");
                return (
                  <button
                    key={`${item.kind}:${item.page}:${item.surah}`}
                    id={`page-finder-item-${index}`}
                    data-index={index}
                    type="button"
                    role="option"
                    aria-selected={active}
                    aria-current={current || undefined}
                    aria-label={itemLabel(item)}
                    className={`page-nav-surah page-finder-${item.kind}${active ? " is-active" : ""}`}
                    onPointerEnter={() => scheduleIntentPrefetch(item.page)}
                    onPointerLeave={cancelIntentPrefetch}
                    onPointerDown={() => {
                      cancelIntentPrefetch();
                      prefetchTarget(item.page);
                    }}
                    onFocus={() => prefetchTarget(item.page)}
                    onClick={() => goTo(item.page)}
                  >
                    <span className="page-nav-surah-num t-num" aria-hidden="true">
                      {item.kind === "surah" ? item.surah : item.kind === "page" ? "→" : item.kind === "question" ? "⚑" : ""}
                    </span>
                    <span className="page-finder-title" aria-hidden="true">
                      {item.kind === "page" ? <>Page <span className="t-num">{item.page}</span></>
                        : item.kind === "juz" ? <>Juz <span className="t-num">{item.juz}</span></>
                        : item.kind === "question" ? "Question page"
                        : SURAH_LATIN[item.surah - 1]}
                    </span>
                    <span className="page-nav-surah-name" lang="ar" dir="rtl" aria-hidden="true">{surah?.nameAr}</span>
                    <span className="page-nav-surah-page t-num" aria-hidden="true">
                      {item.kind === "page" ? (active ? "Enter" : "") : `p. ${item.page}`}
                    </span>
                  </button>
                );
              })}
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
