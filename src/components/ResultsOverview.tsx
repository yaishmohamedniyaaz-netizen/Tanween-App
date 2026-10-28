import { useMemo, useRef, useState } from "react";
import { buildCompetitionResults, type CompetitionResultRow, type ResultSelections } from "../lib/competitionResults.ts";
import { participantCategoryLabel } from "../lib/participants.ts";
import { useJudging } from "../state/store.tsx";
import { ParticipantReviewWorkspace } from "./ParticipantReviewWorkspace.tsx";
import "../styles/resultsOverview.css";
import { resultPageItems } from "../lib/reviewNavigation";
import type { MushafLayout } from "../lib/devicePreferences";
import { CATEGORY_BY_ID, enabledCategories, enabledMarksTotal } from "../config";
import { RESULT_STATUS_WORDS, resultStatus } from "../lib/resultStatus.ts";
import { Icon } from "./Icon";

type StatusFilter = "all" | "ready" | "check" | "awaiting" | "official" | "absent";

/** A number in a fixed-width box: whole part right-aligned, a ".5" slot after it, so digits line up down a column. */
function Num({ value, kind = "mark" }: { value: number | null | undefined; kind?: "mark" | "score" }) {
  if (value === null || value === undefined) {
    return <span className={`ro-n ro-n-${kind}`}><span className="ro-ni is-empty">—</span><span className="ro-nd" /></span>;
  }
  const [whole, fraction] = String(value).split(".");
  return <span className={`ro-n ro-n-${kind}`}><span className="ro-ni">{whole}</span><span className="ro-nd">{fraction ? `.${fraction}` : ""}</span></span>;
}

export function ResultsOverview({ active = true, pageLayout = "full", onImport }: { active?: boolean; pageLayout?: MushafLayout; onImport?: () => void }) {
  const { state } = useJudging();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [division, setDivision] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selections, setSelections] = useState<ResultSelections>({});
  const listScroll = useRef(0);
  const returnId = useRef<string | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const scrollOwner = () => document.querySelector<HTMLElement>('.records-main');
  const restoreScroll = (top: number) => {
    const owner = scrollOwner();
    if (owner) owner.scrollTo({top, behavior: 'instant'});
    else window.scrollTo({top, behavior: 'instant'});
  };
  const model = useMemo(() => buildCompetitionResults(state, selections),
    [state.competition, state.roster, state.history, state.finalizedResults, state.config, selections]);
  const scoreConfig = state.competition.liveSnapshot?.scoreConfig ?? state.config;
  const categories = enabledCategories(scoreConfig);
  const totalMax = enabledMarksTotal(scoreConfig);
  const statuses = useMemo(() => new Map(model.rows.map(row => [row.participant.id, resultStatus(row, categories)])),
    [model.rows, categories.join("|")]);
  const filterOf = (row: CompetitionResultRow): StatusFilter => {
    const status = statuses.get(row.participant.id)!.status;
    return status === "partial" ? "awaiting" : status;
  };
  const counts = model.rows.reduce((acc, row) => { acc[filterOf(row)] += 1; return acc; },
    { all: 0, ready: 0, check: 0, awaiting: 0, official: 0, absent: 0 } as Record<StatusFilter, number>);
  counts.all = model.rows.length;
  const divisionKey = (age: string, category: string) => JSON.stringify([age, category]);
  const divisions = [...new Map(model.rows.map(({ participant: p }) => [
    divisionKey(p.ageGroup, p.category), `${p.ageGroup} · ${participantCategoryLabel(p.category)}`,
  ])).entries()];
  const filtered = model.rows.filter(r =>
    (!query.trim() || `${r.participant.number} ${r.participant.name}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) &&
    (filter === "all" || filterOf(r) === filter) &&
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
      restoreScroll(listScroll.current);
      buttons.current.get(anchor?.participant.id ?? "")?.focus({ preventScroll: true });
    });
  };
  const open = (id: string) => {
    listScroll.current = scrollOwner()?.scrollTop ?? window.scrollY;
    returnId.current = id; setSelectedId(id);
    requestAnimationFrame(() => restoreScroll(0));
  };

  if (selected) return <section className="results-overview" aria-label="Participant result">
    <h1 className="ro-sr-only">Results</h1>
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

  const readyOf = model.total - model.absent;
  const filters: Array<[StatusFilter, string]> = [
    ["all", "All"], ["ready", RESULT_STATUS_WORDS.ready], ["check", RESULT_STATUS_WORDS.check], ["awaiting", RESULT_STATUS_WORDS.awaiting],
    ...(counts.official ? [["official", RESULT_STATUS_WORDS.official] as [StatusFilter, string]] : []),
    ...(counts.absent ? [["absent", RESULT_STATUS_WORDS.absent] as [StatusFilter, string]] : []),
  ];
  const pick = (next: StatusFilter) => { setFilter(next); setPage(1); };

  return <section className="results-overview" aria-label="Competition participant results">
    <div className="ro-top">
      <h1>Results</h1>
      <div className="ro-progress">
        <p><strong className="t-num">{model.complete} of {readyOf}</strong> ready · on this device{!model.rosterFrozen && " · Setup roster"}</p>
        <span className="ro-bar" aria-hidden="true"><i style={{ width: `${readyOf ? Math.round(model.complete / readyOf * 1000) / 10 : 0}%` }} /></span>
      </div>
      {onImport && <button type="button" className="ro-ghost" disabled={state.sessionActive} onClick={onImport}>
        <Icon name="upload" size={16} />Import judge records</button>}
    </div>
    <div className="ro-tools">
      <div className="ro-filter" role="group" aria-label="Show">
        {filters.map(([id, label]) => <button key={id} type="button" aria-pressed={filter === id} onClick={() => pick(id)}>
          {label} <span className="t-num">{counts[id]}</span></button>)}
      </div>
      <label className="ro-search"><Icon name="search" size={16} /><span className="ro-sr-only">Find participant</span>
        <input type="search" placeholder="Find name or number" value={query} onChange={e => {setQuery(e.target.value);setPage(1);}} />
      </label>
      {divisions.length > 1 && <label className="ro-select"><span className="ro-sr-only">Division</span><select aria-label="Division" value={division} onChange={e => {setDivision(e.target.value);setPage(1);}}>
        <option value="">All divisions</option>{divisions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select></label>}
    </div>
    {model.excluded.length > 0 && <p className="ro-notice">{model.excluded.length} source record{model.excluded.length === 1 ? "" : "s"} could not be matched to this roster and competition version. Available in Judge records below.</p>}
    {visible.length ? <div className="ro-table-wrap"><table className="ro-table">
      <caption className="ro-sr-only">Participant scores from the displayed judge sources. Complete sources does not mean an approved result.</caption>
      <thead><tr>
        <th scope="col" className="ro-c-no">No.</th>
        <th scope="col" className="ro-c-name">Participant</th>
        <th scope="col" className="ro-c-status">Status</th>
        {categories.map(c => <th scope="col" key={c} className={`ro-c-num cat-${c}`}><span><i aria-hidden="true" />{CATEGORY_BY_ID[c].short}</span></th>)}
        <th scope="col" className="ro-c-score"><span>Score <small className="t-num">/ {totalMax}</small></span></th>
        <th scope="col" className="ro-c-go"><span className="ro-sr-only">Open</span></th>
      </tr></thead>
      <tbody>{visible.map(row => {
        const p = row.participant;
        const preview = row.absent ? null : row.view?.preview;
        const { status, detail } = statuses.get(p.id)!;
        return <tr key={p.id} className={row.absent ? "ro-absent" : ""} onClick={event => {
          if (!(event.target instanceof Element) || !event.target.closest("button")) open(p.id);
        }}>
          <td className="ro-c-no"><bdi className="ro-nbox">{p.number || "—"}</bdi></td>
          <td className="ro-c-name"><button type="button" className="ro-open" ref={el => {if(el) buttons.current.set(p.id, el); else buttons.current.delete(p.id);}}
            onClick={() => open(p.id)}>
            <strong>{p.name || "Unnamed participant"}</strong>
            <small>{p.ageGroup}{p.ageGroup && p.category && " · "}{participantCategoryLabel(p.category)}</small>
          </button></td>
          <td className="ro-c-status"><span className={`ro-status is-${status}`}>{RESULT_STATUS_WORDS[status]}</span>
            {detail && <small className="ro-status-detail">{detail}</small>}</td>
          {categories.map(c => <td key={c} className="ro-c-num"><Num value={preview?.byCategory[c]?.score} /></td>)}
          <td className="ro-c-score"><span className="ro-sr-only">{row.view?.matchesOfficial ? "Official score: " : "Source score: "}</span><Num value={preview?.total} kind="score" /></td>
          <td className="ro-c-go" aria-hidden="true"><Icon name="chevron" size={16} /></td>
        </tr>;
      })}</tbody>
    </table></div> : <div className="ro-empty"><h2>{model.total ? "No participants match" : "No participants yet"}</h2><p>{model.total ? "Try another name or clear the filters." : "The competition roster will appear here, including participants awaiting results."}</p>
      {model.total > 0 && <button className="btn-ghost" onClick={() => {setQuery("");setFilter("all");setDivision("");setPage(1);}}>Clear filters</button>}
    </div>}
    <footer className="ro-footer"><span aria-live="polite"><span className="t-num">{filtered.length}</span> participant{filtered.length === 1 ? "" : "s"}{pageCount > 1 && <> · page <span className="t-num">{currentPage}</span> of <span className="t-num">{pageCount}</span></>}</span>
      {pageCount > 1 && <nav aria-label="Participant pages">
        <button type="button" disabled={currentPage === 1} aria-label="Previous page" onClick={() => setPage(currentPage - 1)}><span className="ro-chev-prev"><Icon name="chevron" size={18} /></span></button>
        {resultPageItems(currentPage, pageCount).map((item,index) => item === "gap"
          ? <span key={`gap-${index}`} aria-hidden="true">…</span>
          : <button type="button" key={item} className="t-num" aria-label={`Page ${item}`} aria-current={item === currentPage ? "page" : undefined} onClick={() => setPage(item)}>{item}</button>)}
        <button type="button" disabled={currentPage === pageCount} aria-label="Next page" onClick={() => setPage(currentPage + 1)}><Icon name="chevron" size={18} /></button></nav>}
    </footer>
  </section>;
}
