import { useMemo, useRef, useState } from "react";
import { buildCompetitionResults, type ResultSelections } from "../lib/competitionResults.ts";
import { participantCategoryLabel } from "../lib/participants.ts";
import { useJudging } from "../state/store.tsx";
import { ParticipantReviewWorkspace } from "./ParticipantReviewWorkspace.tsx";
import "../styles/resultsOverview.css";
import { resultPageItems } from "../lib/reviewNavigation";
import type { MushafLayout } from "../lib/devicePreferences";

export function ResultsOverview({ active = true, pageLayout = "full" }: { active?: boolean; pageLayout?: MushafLayout }) {
  const { state } = useJudging();
  const [query, setQuery] = useState("");
  const [attention, setAttention] = useState(false);
  const [division, setDivision] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selections, setSelections] = useState<ResultSelections>({});
  const listScroll = useRef(0);
  const returnId = useRef<string | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const model = useMemo(() => buildCompetitionResults(state, selections),
    [state.competition, state.roster, state.history, state.finalizedResults, state.config, selections]);
  const divisionKey = (age: string, category: string) => JSON.stringify([age, category]);
  const divisions = [...new Map(model.rows.map(({ participant: p }) => [
    divisionKey(p.ageGroup, p.category), `${p.ageGroup} · ${participantCategoryLabel(p.category)}`,
  ])).entries()];
  const filtered = model.rows.filter(r =>
    (!query.trim() || `${r.participant.number} ${r.participant.name}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) &&
    (!attention || r.needsAttention) &&
    (!division || divisionKey(r.participant.ageGroup, r.participant.category) === division));
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * 10, currentPage * 10);
  const selected = model.rows.find(r => r.participant.id === selectedId);
  const selectedIndex = filtered.findIndex(r => r.participant.id === selectedId);
  const close = () => {
    // Previous/Next in the workspace must not lose the original list anchor.
    const anchor = filtered.find(r => r.participant.id === returnId.current)
      ?? filtered.find(r => r.participant.id === selectedId);
    if (anchor) setPage(Math.floor(filtered.indexOf(anchor) / 10) + 1);
    setSelectedId(null);
    requestAnimationFrame(() => {
      window.scrollTo({ top: listScroll.current });
      buttons.current.get(anchor?.participant.id ?? "")?.focus({ preventScroll: true });
    });
  };

  if (selected) return <section className="results-overview" aria-label="Participant result">
    {selected.item && selected.view ? <ParticipantReviewWorkspace
      key={selected.participant.id} item={selected.item} selected={selected.view.selected}
      isSample={state.competition.isSample} active={active} pageLayout={pageLayout} reasons={selected.reasons} onBack={close}
      onPrevious={selectedIndex > 0 ? () => setSelectedId(filtered[selectedIndex - 1].participant.id) : undefined}
      onNext={selectedIndex >= 0 && selectedIndex < filtered.length - 1 ? () => setSelectedId(filtered[selectedIndex + 1].participant.id) : undefined}
      onSelectSource={(category, id) => setSelections(current => ({ ...current,
        [selected.participant.id]: { ...current[selected.participant.id], [category]: id } }))}
    /> : <div className="ro-pending">
      <button className="btn-ghost" onClick={close}>Back to all participants</button>
      <nav aria-label="Participants in filtered results">
        <button className="btn-ghost" disabled={selectedIndex <= 0} onClick={() => setSelectedId(filtered[selectedIndex - 1].participant.id)}>Previous participant</button>
        <button className="btn-ghost" disabled={selectedIndex < 0 || selectedIndex >= filtered.length - 1} onClick={() => setSelectedId(filtered[selectedIndex + 1].participant.id)}>Next participant</button>
      </nav>
      <h2 tabIndex={-1} ref={el => el?.focus({ preventScroll: true })}>{selected.participant.name || "Unnamed participant"}</h2>
      <p>{selected.absent ? "Marked absent. Kept in the participant roster." : "No judge result has been received on this device."}</p>
      <p>No score or recording has been inferred.</p>
    </div>}
  </section>;

  return <section className="results-overview" aria-label="Competition participant results">
    <div className="ro-summary">
      <p><strong>{model.complete} of {model.total - model.absent}</strong> with complete sources
        {model.attention > 0 && <> · {model.attention} need attention</>}
        {model.absent > 0 && <> · {model.absent} absent</>}</p>
      <span>On this device{!model.rosterFrozen && " · Setup roster"}</span>
    </div>
    <div className="ro-tools">
      <label className="ro-search"><span className="ro-sr-only">Find participant</span>
        <input type="search" placeholder="Find name or number" value={query} onChange={e => {setQuery(e.target.value);setPage(1);}} />
      </label>
      <div className="ro-filter" role="group" aria-label="Result filter">
        <button aria-pressed={!attention} onClick={() => {setAttention(false);setPage(1);}}>All</button>
        <button aria-pressed={attention} onClick={() => {setAttention(true);setPage(1);}}>Needs attention</button>
      </div>
      {divisions.length > 1 && <label><span className="ro-sr-only">Division</span><select aria-label="Division" value={division} onChange={e => {setDivision(e.target.value);setPage(1);}}>
        <option value="">All divisions</option>{divisions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select></label>}
    </div>
    {model.excluded.length > 0 && <p className="ro-notice">{model.excluded.length} source record{model.excluded.length === 1 ? "" : "s"} could not be matched to this roster and competition version. Available in Judge records below.</p>}
    {visible.length ? <table className="ro-table">
      <caption className="ro-sr-only">Participant scores from the displayed judge sources. Complete sources does not mean an approved result.</caption>
      <thead><tr><th scope="col">Participant</th><th scope="col">Score</th><th scope="col">Criteria received</th><th scope="col">Result details</th></tr></thead>
      <tbody>{visible.map((row) => {
        const p = row.participant;
        const score = row.absent ? null : row.view?.preview;
        return <tr key={p.id} className={row.absent ? "ro-absent" : ""}>
          <td><button ref={el => {if(el) buttons.current.set(p.id, el); else buttons.current.delete(p.id);}}
            onClick={() => {listScroll.current = window.scrollY;returnId.current = p.id;setSelectedId(p.id);requestAnimationFrame(() => window.scrollTo({ top: 0 }));}}>
            <bdi className="ro-number">{p.number || "—"}</bdi><span><strong>{p.name || "Unnamed participant"}</strong>
              <small>{p.ageGroup}{p.ageGroup && p.category && " · "}{participantCategoryLabel(p.category)}</small></span>
          </button></td>
          <td className="ro-score"><span className="ro-sr-only">{row.view?.matchesOfficial ? "Official score: " : "Source score: "}</span><strong>{score?.total ?? "—"}</strong>{score && <small> / {score.totalMax}</small>}</td>
          <td className="ro-contributions">{row.received} / {row.required}<span className="ro-sr-only"> criteria received</span></td>
          <td className={`ro-reason${!row.absent && !row.reasons.length && !row.view?.official ? " ro-reason-empty" : ""}`}>{row.absent && <strong>Absent</strong>}
            {row.absent && !row.needsAttention ? <span>Retained in roster</span> : <span>{row.reasons[0] || (row.view?.matchesOfficial ? "Official result" : "")}</span>}
            {row.view?.official && !row.view.matchesOfficial && <small>Official: {row.view.official.total} / {row.view.official.totalMax}</small>}
          </td>
        </tr>;
      })}</tbody>
    </table> : <div className="ro-empty"><h2>{model.total ? "No participants match" : "No participants yet"}</h2><p>{model.total ? "Try another name or clear the filters." : "The competition roster will appear here, including participants awaiting results."}</p>
      {model.total > 0 && <button className="btn-ghost" onClick={() => {setQuery("");setAttention(false);setDivision("");setPage(1);}}>Clear filters</button>}
    </div>}
    <footer className="ro-footer"><span aria-live="polite">{filtered.length} participant{filtered.length === 1 ? "" : "s"}{pageCount > 1 && ` · Page ${currentPage} of ${pageCount}`}</span>
      {pageCount > 1 && <nav aria-label="Participant pages"><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
        {resultPageItems(currentPage, pageCount).map((item,index) => item === "gap"
          ? <span key={`gap-${index}`} aria-hidden="true">…</span>
          : <button key={item} aria-label={`Page ${item}`} aria-current={item === currentPage ? "page" : undefined} onClick={() => setPage(item)}>{item}</button>)}
        <button disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</button></nav>}
    </footer>
  </section>;
}
