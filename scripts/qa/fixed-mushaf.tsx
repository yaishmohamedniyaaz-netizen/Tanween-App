/** Real judging components on an isolated local storage origin; not the product entry. */
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { JudgingProvider, useJudging } from "../../src/state/store";
import { Mushaf } from "../../src/components/Mushaf";
import { MushafViewport } from "../../src/components/MushafViewport";
import { FIXED_PAGE_ASPECT_RATIO } from "../../src/components/FixedMushafPageSurface";
import { PageNav } from "../../src/components/PageNav";
import { MistakeLog } from "../../src/components/MistakeLog";
import { legacyAssignment } from "../../src/lib/judgeAssignments";
import { seedLedgerEvents } from "../../src/lib/judgingLedger";
import { buildSessionPayload, downloadSessionJSON } from "../../src/lib/exportSession";
import { visibleMushafPages } from "../../src/lib/mushafSpread";
import { useFixedMushafPages } from "../../src/hooks/useFixedMushafPages";
import { createQuestionIndexLookup, resolveQuestionRange, QUESTION_INDEX_VERSION } from "../../src/lib/questionBank";
import { MUSHAF_LAYOUT } from "../../src/lib/page";
import type { RecitationRangeSnapshot } from "../../src/types";
import "../../src/styles/global.css";

const allowedLocal = location.hostname === "127.0.0.1" && ["5295", "5296"].includes(location.port);
if (!allowedLocal && location.origin !== "https://tahqeeq-mushaf-review-sep09.yaish.chatgpt.site") {
  throw new Error("This judging preview is restricted to its separate review site");
}

function Preview() {
  const { state, dispatch } = useJudging();
  const [page, setPage] = useState(Number(new URLSearchParams(location.search).get("page")) || 254);
  const [layout, setLayout] = useState<"full" | "spread">("full");
  const [zoom, setZoom] = useState(100);
  const [compact, setCompact] = useState(innerWidth < 901);
  const [sessionError, setError] = useState("");
  const pages = visibleMushafPages(page, layout, compact);
  const key = pages.join(":");
  const fixed = useFixedMushafPages(pages);
  const error = fixed.error || sessionError;
  const [range, setRange] = useState<RecitationRangeSnapshot | null>(state.activeQuestion?.range ?? null);
  useEffect(() => {
    const update = () => setCompact(innerWidth < 901);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  async function start(prepared = false) {
    try {
      const index = createQuestionIndexLookup(await (await fetch("/question-index.json")).json());
      const first = fixed.pages?.get(page)?.words.find(word => word.role === "letter");
      if (!first || first.ayah === null) throw new Error("Select a ready page first");
      const resolved = resolveQuestionRange(index, { surah: first.surah, ayah: first.ayah }, 3);
      if (!resolved.ok) throw new Error("Fixture range unavailable");
      const questionRange: RecitationRangeSnapshot = { version: 1, ...resolved.range, mushafLayout: MUSHAF_LAYOUT, questionIndexVersion: QUESTION_INDEX_VERSION };
      setRange(questionRange);
      const participant = { ...state.participant, id: "fixed-preview-participant", name: "Disposable judging preview", muqarrar: "starting-side" as const };
      const assignment = legacyAssignment(state.config), now = Date.now();
      const question = { version: 2 as const, id: "fixed-preview-question", kind: "prepared-draft" as const,
        ...(prepared ? { drawId: "fixed-preview-draw", drawPosition: 1, drawCycle: 1 } : {}),
        participantId: participant.id, divisionId: "fixture", muqarrar: participant.muqarrar,
        selectedAt: now, label: "Fixed Mushaf integration", sourceQuestionId: "fixture",
        startAyah: questionRange.startAyah, endAyah: questionRange.endAyah,
        requestedLines: questionRange.requestedLines, resolvedLines: questionRange.resolvedLines,
        startPage: questionRange.startPage, endPage: questionRange.endPage,
        sourceVersion: questionRange.sourceVersion, questionIndexVersion: QUESTION_INDEX_VERSION,
        layoutHash: questionRange.layoutHash, range: questionRange };
      dispatch({ type: "LOAD", state: { ...state, participant, sessionActive: !prepared,
        activeSessionId: prepared ? null : "fixed-preview", activeStartedAt: prepared ? null : now, activeAssignment: prepared ? null : assignment,
        activeQuestion: prepared ? null : question,
        preparedRecitation: prepared ? { version: 1, id: "fixed-prepared", participant, assignment, question, preparedAt: now } : null,
        mistakes: [], impressions: [], events: prepared ? [] : seedLedgerEvents({
          sessionId: "fixed-preview", participant, startedAt: now, mistakes: [], assignment, question }),
      } });
    } catch (reason) { setError(String(reason)); }
  }
  return <>
    <header className="fixed-qa-toolbar">
      <button onClick={() => start()}>Start test judging</button>
      <button onClick={() => start(true)}>Prepare test judging</button>
      <label>Test page <select aria-label="Test page" value={page} onChange={event => setPage(Number(event.target.value))}>
        {Array.from({ length: 604 }, (_, i) => i + 1).map(n => <option key={n}>{n}</option>)}
      </select></label>
      <label>View <select aria-label="View" value={layout} onChange={event => setLayout(event.target.value as "full" | "spread")}><option value="full">One page</option><option value="spread">Two pages</option></select></label>
      <label>Size <select aria-label="Size" value={zoom} onChange={event => setZoom(Number(event.target.value))}><option>100</option><option>125</option><option>150</option></select></label>
      <button onClick={() => downloadSessionJSON(state)}>Export test session</button>
      <output aria-label="Mistake count">{state.mistakes.length}</output>
    </header>
    {error && <div role="alert">{error} <button onClick={() => { setError(""); fixed.retry(); }}>Retry</button></div>}
    <main className="fixed-qa-workspace app view-judge">
      <div className="fixed-qa-book">
        {fixed.pages && !error ? <MushafViewport layout={compact ? "full" : layout} zoomPercent={zoom}
          contentKey={key} pageAspectRatio={FIXED_PAGE_ASPECT_RATIO} navigationBlockSize={38}
          forceStableStage forceCompactPages={compact}>
          <Mushaf fixedPages={fixed.pages} page={page} pageLayout={layout} questionRange={range}
            questionFocusMode="fade" onPageChange={setPage}
            headerControls={(visible, isCompact) => <><PageNav prefetchFonts={false} page={page} visiblePages={visible}
              layout={layout} compact={isCompact} onChange={setPage} />
              {range && !visible.includes(range.startPage) && <button className="question-return-bubble"
                onClick={() => setPage(range.startPage)}>Return to question</button>}</>} />
        </MushafViewport> : <p role="status">{error ? "Page unavailable" : "Loading page…"}</p>}
      </div>
      <aside><MistakeLog /></aside>
    </main>
    <details><summary>Test evidence</summary><pre id="fixed-evidence">{JSON.stringify({
      mistakes: state.mistakes, events: state.events, range, sessionActive: state.sessionActive,
      prepared: Boolean(state.preparedRecitation), payload: buildSessionPayload(state),
    })}</pre></details>
    <style>{`
      .fixed-qa-toolbar { display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:8px; }
      .fixed-qa-toolbar label { display:flex;gap:4px;align-items:center; }
      .fixed-qa-workspace.app { display:grid;grid-template-columns:minmax(0,1fr) 270px;height:calc(100dvh - 65px);min-height:400px;padding:4px;gap:8px; }
      .fixed-qa-book { min-width:0;min-height:0; }
      .fixed-qa-book .mushaf-viewport,.fixed-qa-book .mushaf-shell { height:100%; }
      .fixed-qa-workspace aside { overflow:auto; }
      #fixed-evidence { white-space:pre-wrap;overflow-wrap:anywhere; }
      @media(max-width:900px) { .fixed-qa-workspace.app { grid-template-columns:minmax(0,1fr);height:auto; } .fixed-qa-book { height:calc(100dvh - 125px);min-height:350px; } }
    `}</style>
  </>;
}
createRoot(document.getElementById("root")!).render(<JudgingProvider><Preview /></JudgingProvider>);
