import { useCallback, useEffect, useRef, useState } from "react";
import { Header } from "./components/Header";
import { Mushaf } from "./components/Mushaf";
import { ScorePanel } from "./components/ScorePanel";
import { MistakeLog } from "./components/MistakeLog";
import { NotesBox } from "./components/NotesBox";
import { ResultSheet } from "./components/ResultSheet";
import { HintBanner } from "./components/HintBanner";
import { RecordsView } from "./components/RecordsView";
import { StartDialog } from "./components/StartDialog";
import { SetupDialog } from "./components/SetupDialog";
import { useJudging } from "./state/store";
import surahIndex from "./data/surah-index.json";

const LS_PAGE_KEY = "tahqeeq:lastPage";

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

      <div className="page-nav-center">
        <button
          ref={pageBtnRef}
          type="button"
          className="page-nav-page"
          title="Scroll to flip pages"
          onClick={() => {
            setPopoverOpen((v) => !v);
            setJumpInput(String(page));
          }}
        >
          {page}
        </button>

        {popoverOpen && (
          <div className="page-nav-popover" ref={popoverRef}>
            <div className="page-nav-popover-head">
              <span className="t-label">Jump to page</span>
              <div className="page-nav-jump-row">
                <input
                  type="number"
                  min={1}
                  max={604}
                  value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleJump();
                  }}
                  placeholder="1–604"
                />
                <button type="button" className="btn-ghost" onClick={handleJump}>
                  Go
                </button>
              </div>
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
  const [view, setView] = useState<"judge" | "records">("judge");
  const [setupOpen, setSetupOpen] = useState(false);
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

  const needsStart = view === "judge" && !state.sessionActive;

  return (
    <div className="app">
      <Header
        view={view}
        onToggleView={() => setView((v) => (v === "judge" ? "records" : "judge"))}
        onOpenSetup={() => setSetupOpen(true)}
        onChangeReciter={() => dispatch({ type: "FINISH_SESSION" })}
      />
      {view === "judge" ? (
        <main className="workspace" key="judge">
          <div className="stage">
            <HintBanner />
            <div className="mushaf-shell">
              <PageNav page={page} onChange={handlePageChange} />
              <Mushaf page={page} onPageChange={handlePageChange} />
            </div>
          </div>
          <aside className="sidebar">
            <ScorePanel />
            <MistakeLog />
            <NotesBox />
            <button
              type="button"
              className="btn-primary next-btn"
              onClick={() => dispatch({ type: "FINISH_SESSION" })}
            >
              Done — next reciter
            </button>
          </aside>
        </main>
      ) : (
        <main className="records-main" key="records">
          <RecordsView />
        </main>
      )}

      {needsStart && !setupOpen && (
        <StartDialog onOpenSetup={() => setSetupOpen(true)} />
      )}
      {setupOpen && <SetupDialog onClose={() => setSetupOpen(false)} />}

      <ResultSheet />
    </div>
  );
}
