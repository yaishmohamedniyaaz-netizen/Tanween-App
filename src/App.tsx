import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Header } from "./components/Header";
import { Mushaf } from "./components/Mushaf";
import { ScorePanel } from "./components/ScorePanel";
import { MistakeLog } from "./components/MistakeLog";
import { NotesBox } from "./components/NotesBox";
import { ResultSheet } from "./components/ResultSheet";
import { HintBanner } from "./components/HintBanner";
import { RecordsView } from "./components/RecordsView";
import { StartDialog } from "./components/StartDialog";
import { CompetitionSetup } from "./components/CompetitionSetup";
import { CompetitionIdlePanel } from "./components/CompetitionIdlePanel";
import { FinishDialog } from "./components/FinishDialog";
import { JudgeRoleStrip } from "./components/JudgeRoleStrip";
import { useJudging } from "./state/store";
import surahIndex from "./data/surah-index.json";

const LS_PAGE_KEY = "tahqeeq:lastPage";
const LS_PAGE_ZOOM_KEY = "tahqeeq:pageZoom";
const LS_PAGE_LAYOUT_KEY = "tahqeeq:pageLayout";
const LS_JUDGE_RAIL_SIDE_KEY = "tahqeeq:judgeRailSide";

function PageNav({
  page,
  onChange,
}: {
  page: number;
  onChange: (page: number) => void;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [jumpInput, setJumpInput] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);
  const pageBtnRef = useRef<HTMLButtonElement>(null);
  const jumpInputRef = useRef<HTMLInputElement>(null);
  const lastWheelRef = useRef(0);

  useEffect(() => {
    if (!popoverOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!popoverRef.current?.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [popoverOpen]);

  useEffect(() => {
    if (!popoverOpen) return;
    const frame = requestAnimationFrame(() => {
      jumpInputRef.current?.focus();
      jumpInputRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [popoverOpen]);

  const handleJump = () => {
    const n = Number(jumpInput);
    if (!Number.isNaN(n) && n >= 1 && n <= 604) {
      onChange(n);
      setPopoverOpen(false);
      setJumpInput("");
    }
  };

  // Reading order is right-to-left: the next (higher-numbered) page sits to
  // the left of the current one, like turning pages forward in a mushaf.
  const goForward = useCallback(
    () => onChange(Math.min(604, page + 1)),
    [page, onChange],
  );
  const goBackward = useCallback(
    () => onChange(Math.max(1, page - 1)),
    [page, onChange],
  );

  // Scroll wheel over the page number flips pages — throttled so one wheel
  // "click" moves one page instead of skipping several.
  useEffect(() => {
    const el = pageBtnRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheelRef.current < 180) return;
      lastWheelRef.current = now;
      if (e.deltaY > 0) goForward();
      else if (e.deltaY < 0) goBackward();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [goForward, goBackward]);

  return (
    <div className="page-nav">
      <button
        type="button"
        className="page-nav-btn"
        aria-label="next page"
        onClick={goForward}
      >
        ‹
      </button>

      <div className="page-nav-center" ref={popoverRef}>
        <button
          ref={pageBtnRef}
          type="button"
          className="page-nav-page"
          title="Type a page number"
          onClick={() => {
            setPopoverOpen((v) => !v);
            setJumpInput(String(page));
          }}
        >
          {page}
        </button>

        {popoverOpen && (
          <div className="page-nav-popover">
            <div className="page-nav-popover-head">
              <span className="t-label">Jump to page</span>
              <form
                className="page-nav-jump-row"
                onSubmit={(e) => {
                  e.preventDefault();
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
                  onChange={(e) => setJumpInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setPopoverOpen(false);
                      pageBtnRef.current?.focus();
                    }
                  }}
                  onFocus={(e) => e.currentTarget.select()}
                  placeholder="1–604"
                />
                <button type="submit" className="btn-ghost">
                  Go
                </button>
              </form>
            </div>
            <div className="page-nav-surah-list">
              {surahIndex.map((s) => (
                <button
                  key={s.number}
                  type="button"
                  className="page-nav-surah"
                  onClick={() => {
                    onChange(s.firstPage);
                    setPopoverOpen(false);
                  }}
                >
                  <span className="page-nav-surah-num">{s.number}</span>
                  <span className="page-nav-surah-name">{s.nameAr}</span>
                  <span className="page-nav-surah-page t-num">p. {s.firstPage}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        className="page-nav-btn"
        aria-label="previous page"
        onClick={goBackward}
      >
        ›
      </button>
    </div>
  );
}

export function App() {
  const { state, dispatch } = useJudging();
  const [view, setView] = useState<"judge" | "records" | "setup">("judge");
  const [startOpen, setStartOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [pageZoom, setPageZoom] = useState(() => {
    const saved = Number(localStorage.getItem(LS_PAGE_ZOOM_KEY));
    return Number.isFinite(saved) && saved >= 45 && saved <= 100 ? saved : 100;
  });
  const [pageLayout, setPageLayout] = useState<"full" | "split">(() =>
    localStorage.getItem(LS_PAGE_LAYOUT_KEY) === "split" ? "split" : "full",
  );
  const [judgeRailSide, setJudgeRailSide] = useState<"left" | "right">(() =>
    localStorage.getItem(LS_JUDGE_RAIL_SIDE_KEY) === "left" ? "left" : "right",
  );
  const [page, setPage] = useState(() => {
    const saved = localStorage.getItem(LS_PAGE_KEY);
    if (saved) {
      const n = Number(saved);
      if (!Number.isNaN(n) && n >= 1 && n <= 604) return n;
    }
    return 604;
  });

  useEffect(() => {
    localStorage.setItem(LS_PAGE_KEY, String(page));
  }, [page]);

  const handlePageChange = useCallback(
    (p: number) => {
      const clamped = Math.max(1, Math.min(604, p));
      if (clamped !== page) setPage(clamped);
    },
    [page],
  );

  return (
    <div className="app">
      <Header
        view={view}
        onToggleView={() => setView((current) => (current === "judge" ? "records" : "judge"))}
        onOpenSetup={() => {
          setStartOpen(false);
          setView("setup");
        }}
        onChangeReciter={() => setFinishOpen(true)}
        pageZoom={pageZoom}
        pageLayout={pageLayout}
        judgeRailSide={judgeRailSide}
        onPageZoomPreview={setPageZoom}
        onPageLayoutPreview={setPageLayout}
        onPageZoomCommit={(zoom) => {
          setPageZoom(zoom);
          localStorage.setItem(LS_PAGE_ZOOM_KEY, String(zoom));
        }}
        onPageLayoutCommit={(layout) => {
          setPageLayout(layout);
          localStorage.setItem(LS_PAGE_LAYOUT_KEY, layout);
        }}
        onJudgeRailSideChange={(side) => {
          setJudgeRailSide(side);
          localStorage.setItem(LS_JUDGE_RAIL_SIDE_KEY, side);
        }}
      />
      {view === "judge" ? (
        <main className={`workspace rail-${judgeRailSide}`} key="judge">
          <div className="stage">
            <HintBanner />
            <div
              className="mushaf-shell"
              style={{ "--page-zoom": pageZoom / 100 } as CSSProperties}
            >
              <Mushaf
                page={page}
                pageLayout={pageLayout}
                onPageChange={handlePageChange}
                headerControls={
                  <PageNav page={page} onChange={handlePageChange} />
                }
              />
            </div>
          </div>
          <aside className="sidebar">
            {state.sessionActive ? (
              <>
                <JudgeRoleStrip onChange={() => setView("setup")} />
                <ScorePanel />
                <MistakeLog />
                <NotesBox />
                <button
                  type="button"
                  className="btn-primary next-btn"
                  onClick={() => setFinishOpen(true)}
                >
                  Done — next reciter
                </button>
              </>
            ) : (
              <CompetitionIdlePanel
                onPrepare={() => setView("setup")}
                onStartReciter={() => setStartOpen(true)}
              />
            )}
          </aside>
        </main>
      ) : view === "records" ? (
        <main className="records-main" key="records">
          <RecordsView onResumeSession={() => setView("judge")} />
        </main>
      ) : (
        <CompetitionSetup onBack={() => setView("judge")} />
      )}

      {startOpen &&
        view === "judge" &&
        state.competition.status === "live" &&
        !state.sessionActive && (
        <StartDialog
          onOpenSetup={() => {
            setStartOpen(false);
            setView("setup");
          }}
          onClose={() => setStartOpen(false)}
        />
      )}
      {finishOpen && state.sessionActive && (
        <FinishDialog
          onCancel={() => setFinishOpen(false)}
          onConfirm={() => {
            dispatch({ type: "FINISH_SESSION" });
            setFinishOpen(false);
            setStartOpen(false);
          }}
        />
      )}

      <ResultSheet />
    </div>
  );
}
