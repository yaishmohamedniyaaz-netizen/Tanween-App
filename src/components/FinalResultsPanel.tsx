import { useEffect, useMemo, useState } from "react";
import { CATEGORY_BY_ID } from "../config";
import {
  buildParticipantResultPreview,
  divisionRankGroup,
  finalizeParticipantResult,
  hasCompleteFinalizationIdentity,
  rankRowsByDivision,
  type ParticipantResultCandidate,
} from "../lib/finalResults";
import { downloadFinalResultsWorkbook } from "../lib/finalResultsWorkbook";
import {
  muqarrarLabel,
  participantCategoryLabel,
} from "../lib/participants";
import type {
  ResultsReviewItem,
  ResultsReviewReason,
} from "../lib/resultsReview";
import { computeCategoryScores } from "../lib/scoring";
import { useJudging } from "../state/store";
import type { CategoryId, FinalizedResult, SavedSession } from "../types";
import { Icon } from "./Icon";

type CandidateSelections = Record<
  string,
  Partial<Record<CategoryId, string>>
>;

interface Props {
  allItems: ResultsReviewItem[];
  visibleItems: ResultsReviewItem[];
  filteredEmpty: boolean;
  onClearFilters: () => void;
}

const identityLabels = {
  number: "number",
  name: "name",
  ageGroup: "Age group",
  category: "Participant category",
  muqarrar: "Muqarrar start",
};

function selectedSessionId(
  candidate: ParticipantResultCandidate,
  category: CategoryId,
  selections: CandidateSelections,
  previous?: FinalizedResult,
): string {
  const manual = selections[candidate.participant.id]?.[category];
  if (manual) return manual;
  const previousId = previous?.byCategory[category]?.sessionId;
  if (
    previousId &&
    candidate.byCategory[category].some((session) => session.id === previousId)
  ) {
    return previousId;
  }
  return candidate.byCategory[category].length === 1
    ? candidate.byCategory[category][0].id
    : "";
}

function sourceJudge(session: SavedSession): string {
  return session.assignment?.judgeName ||
    session.assignment?.judgeLabel ||
    "Judge 1";
}

function sourceScore(session: SavedSession, category: CategoryId) {
  return computeCategoryScores(
    session.config,
    session.mistakes,
    session.impressions ?? [],
  ).byCategory[category];
}

function categoryNames(categories: CategoryId[]): string {
  return categories.map((category) => CATEGORY_BY_ID[category].label).join(", ");
}

function reasonText(reason: ResultsReviewReason): string {
  if (reason.code === "participant-details-missing") {
    return `Missing ${reason.fields.map((field) => identityLabels[field]).join(", ")}`;
  }
  if (reason.code === "required-categories-missing") {
    return `Missing ${categoryNames(reason.categories)}`;
  }
  if (reason.code === "source-conflict") {
    return `Choose a source for ${categoryNames(reason.categories)}`;
  }
  if (reason.code === "final-source-missing") {
    return `Final source missing for ${categoryNames(reason.categories)}`;
  }
  if (reason.code === "final-source-revision-changed") {
    return `Source revision changed for ${categoryNames(reason.categories)}`;
  }
  return `Newer source available for ${categoryNames(reason.categories)}`;
}

function stateLabel(item: ResultsReviewItem): string {
  if (item.state === "finalized") return "Finalized";
  if (item.state === "ready") return "Ready";
  return "Needs review";
}

/** The mark shown in each criterion column: the finalized number once there is
 *  one, otherwise the currently selected source's. A criterion with no source
 *  chosen has no number to show, and says so rather than reading as zero. */
function rowMarks(
  item: ResultsReviewItem,
  selected: Record<CategoryId, string>,
): Partial<Record<CategoryId, { score: number; max: number }>> {
  const marks: Partial<Record<CategoryId, { score: number; max: number }>> = {};
  const active = item.state === "finalized" ? item.activeFinal : undefined;
  for (const category of item.candidate.categories) {
    const finalized = active?.byCategory[category];
    if (finalized) {
      marks[category] = { score: finalized.score, max: finalized.max };
      continue;
    }
    const session = item.candidate.byCategory[category].find(
      (option) => option.id === selected[category],
    );
    if (!session) continue;
    const score = sourceScore(session, category);
    marks[category] = { score: score.score, max: score.start };
  }
  return marks;
}

const formatMark = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

export function FinalResultsPanel({
  allItems,
  visibleItems,
  filteredEmpty,
  onClearFilters,
}: Props) {
  const { state, dispatch } = useJudging();
  const [selections, setSelections] = useState<CandidateSelections>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);

  const currentResults = useMemo(
    () => allItems.flatMap((item) =>
      item.state === "finalized" && item.activeFinal ? [item.activeFinal] : [],
    ),
    [allItems],
  );

  /** One column per criterion this competition actually judged, in reading
   *  order — the same set, in the same order, that the workbook writes. */
  const columns = useMemo(() => {
    const judged = new Set<CategoryId>();
    for (const item of allItems) {
      for (const category of item.candidate.categories) judged.add(category);
    }
    return (Object.keys(CATEGORY_BY_ID) as CategoryId[]).filter((category) =>
      judged.has(category),
    );
  }, [allItems]);

  const totalMax = useMemo(
    () => columns.reduce((sum, category) => sum + (state.config[category]?.start ?? 0), 0),
    [columns, state.config],
  );

  useEffect(() => {
    setSelectedParticipantId((current) => {
      if (current && visibleItems.some(
        (item) => item.candidate.participant.id === current,
      )) return current;
      const priorityItem = visibleItems.find((item) => item.state === "needs-review") ??
        visibleItems[0];
      return priorityItem?.candidate.participant.id ?? null;
    });
  }, [visibleItems]);

  const setSelection = (
    participantId: string,
    category: CategoryId,
    sessionId: string,
  ) => {
    setSelections((current) => ({
      ...current,
      [participantId]: {
        ...current[participantId],
        [category]: sessionId,
      },
    }));
  };

  const selectedForCandidate = (
    candidate: ParticipantResultCandidate,
    previous?: FinalizedResult,
  ) => Object.fromEntries(
    candidate.categories.map((category) => [
      category,
      selectedSessionId(candidate, category, selections, previous),
    ]),
  ) as Record<CategoryId, string>;

  /** Every visible row, ranked inside its own division, with the marks and the
   *  total the row shows. A proposed total ranks alongside a finalized one, so
   *  a judge can see where a result would land before committing it. */
  const rows = useMemo(() => {
    const prepared = visibleItems.map((item) => {
      const selected = selectedForCandidate(item.candidate, item.activeFinal);
      const preview = buildParticipantResultPreview(item.candidate, selected);
      const placed = item.state === "finalized" ? item.activeFinal : undefined;
      const total = placed
        ? { total: placed.total, totalMax: placed.totalMax }
        : preview
          ? { total: preview.total, totalMax: preview.totalMax }
          : null;
      return {
        item,
        selected,
        marks: rowMarks(item, selected),
        total,
      };
    });
    return rankRowsByDivision(prepared, (row) => ({
      participant: row.item.candidate.participant,
      total: row.total?.total ?? null,
      totalMax: row.total?.totalMax ?? 1,
    }));
    // selections feed selectedForCandidate, so a source change re-ranks the table.
  }, [visibleItems, selections]);

  const divisions = useMemo(() => {
    const groups: Array<{ key: string; label: string; rows: typeof rows }> = [];
    for (const ranked of rows) {
      const participant = ranked.row.item.candidate.participant;
      const key = divisionRankGroup(participant);
      const last = groups[groups.length - 1];
      if (last?.key === key) {
        last.rows.push(ranked);
        continue;
      }
      groups.push({
        key,
        label: [
          participant.ageGroup || "No age group",
          participantCategoryLabel(participant.category),
        ].filter(Boolean).join(" · "),
        rows: [ranked],
      });
    }
    return groups;
  }, [rows]);

  const selectedRow = rows.find(
    (ranked) => ranked.row.item.candidate.participant.id === selectedParticipantId,
  )?.row;
  const selectedPlace = rows.find(
    (ranked) => ranked.row.item.candidate.participant.id === selectedParticipantId,
  )?.place ?? null;
  const selectedDivisionSize = selectedRow
    ? rows.filter((ranked) =>
        divisionRankGroup(ranked.row.item.candidate.participant) ===
          divisionRankGroup(selectedRow.item.candidate.participant),
      ).length
    : 0;

  const finalize = (item: ResultsReviewItem, revisionReason: string) => {
    const candidate = item.candidate;
    const previous = item.activeFinal;
    if (previous && !revisionReason.trim()) return;
    const result = finalizeParticipantResult(
      candidate,
      selectedForCandidate(candidate, previous),
      previous,
      revisionReason.trim() || undefined,
    );
    if (!result) return;
    dispatch({ type: "UPSERT_FINAL_RESULT", result });
    setReasons((current) => ({ ...current, [candidate.participant.id]: "" }));
  };

  const exportWorkbook = async () => {
    if (!currentResults.length || exporting) return;
    setExportError("");
    setExporting(true);
    try {
      await downloadFinalResultsWorkbook(currentResults, state.competition);
    } catch (error) {
      setExportError(
        error instanceof Error
          ? error.message
          : "The final-results workbook could not be verified.",
      );
    } finally {
      setExporting(false);
    }
  };

  if (visibleItems.length === 0) {
    return (
      <section className="final-results-panel is-empty">
        <div className="results-empty">
          <strong>
            {filteredEmpty ? "No results match these filters" : "No result candidates yet"}
          </strong>
          <span>
            {filteredEmpty
              ? "Clear the review filters to see the full candidate list."
              : "Judge sections appear here after a recitation is finished or imported."}
          </span>
          {filteredEmpty && (
            <button type="button" className="btn-ghost" onClick={onClearFilters}>
              Clear filters
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="final-results-panel">
      <div className="results-ledger">
        <table className="results-table">
          <thead>
            <tr>
              <th scope="col" className="col-place">Place</th>
              <th scope="col" className="col-number">No</th>
              <th scope="col" className="col-name">Name</th>
              {columns.map((category) => (
                <th scope="col" className="col-mark" key={category}>
                  {CATEGORY_BY_ID[category].label}
                  <small className="t-num">of {state.config[category]?.start ?? 0}</small>
                </th>
              ))}
              <th scope="col" className="col-total">Total<small className="t-num">of {totalMax}</small></th>
              <th scope="col" className="col-state">State</th>
            </tr>
          </thead>
          {divisions.map((division) => (
            <tbody key={division.key}>
              <tr className="results-division">
                <th scope="colgroup" colSpan={columns.length + 5}>
                  <span>{division.label}</span>
                  <small className="t-num">
                    {division.rows.length} {division.rows.length === 1 ? "candidate" : "candidates"}
                  </small>
                </th>
              </tr>
              {division.rows.map(({ row, place }) => {
                const participant = row.item.candidate.participant;
                const isSelected = participant.id === selectedParticipantId;
                return (
                  <tr
                    key={participant.id}
                    className={`results-row is-${row.item.state} ${isSelected ? "is-selected" : ""}`}
                    onClick={() => setSelectedParticipantId(participant.id)}
                  >
                    <td className="col-place t-num">{place ?? "—"}</td>
                    <td className="col-number t-num">
                      <bdi>{participant.number || "—"}</bdi>
                    </td>
                    <th scope="row" className="col-name">
                      <button
                        type="button"
                        aria-current={isSelected ? "true" : undefined}
                        onClick={() => setSelectedParticipantId(participant.id)}
                      >
                        {participant.name || "Unnamed participant"}
                      </button>
                    </th>
                    {columns.map((category) => {
                      const mark = row.marks[category];
                      const sources = row.item.candidate.byCategory[category] ?? [];
                      return (
                        <td className="col-mark t-num" key={category}>
                          {mark ? formatMark(mark.score) : "—"}
                          {sources.length > 1 && (
                            <span className={`results-choice cat-${category}`} title="Two judge results">
                              &nbsp;•
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="col-total t-num">
                      {row.total ? <strong>{formatMark(row.total.total)}</strong> : "—"}
                    </td>
                    <td className="col-state">
                      <span className={`results-state-chip is-${row.item.state}`}>
                        <span aria-hidden="true" />
                        {stateLabel(row.item)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>

      {selectedRow && (() => {
        const item = selectedRow.item;
        const candidate = item.candidate;
        const participant = candidate.participant;
        const previous = item.activeFinal;
        const preview = buildParticipantResultPreview(candidate, selectedRow.selected);
        const unresolved = candidate.categories.some(
          (category) => !selectedRow.selected[category],
        );
        const participantReady = hasCompleteFinalizationIdentity(participant);
        const reason = reasons[participant.id] ?? "";
        const reasonRequired = Boolean(previous);
        const finalized = item.state === "finalized" ? previous : undefined;
        const displayedTotal = selectedRow.total
          ? `${formatMark(selectedRow.total.total)}/${selectedRow.total.totalMax}`
          : "—";
        return (
          <aside className="results-record" aria-label={`Result record for ${participant.name}`}>
            <div className="results-record-head">
              <span className="t-label">
                {[
                  participant.number ? `Participant ${participant.number}` : null,
                  participant.ageGroup,
                  participantCategoryLabel(participant.category),
                ].filter(Boolean).join(" · ")}
              </span>
              <h3>{participant.name || "Unnamed participant"}</h3>
              <p>
                {[
                  muqarrarLabel(participant.muqarrar),
                  participant.institution,
                ].filter(Boolean).join(" · ") || "No further participant details"}
              </p>
            </div>

            <div className="results-record-group">
              <h4>Judge sources</h4>
              <div className="results-source-list">
                {candidate.categories.map((categoryId) => {
                  const category = CATEGORY_BY_ID[categoryId];
                  const options = candidate.byCategory[categoryId];
                  const value = selectedRow.selected[categoryId];
                  const chosen = options.find((option) => option.id === value);
                  const score = chosen ? sourceScore(chosen, categoryId) : null;
                  if (options.length <= 1) {
                    return (
                      <div className={`results-source cat-${categoryId}`} key={categoryId}>
                        <span className="results-source-name">{category.label}</span>
                        <span className="results-source-meta">
                          {chosen
                            ? `${sourceJudge(chosen)} · revision ${chosen.revision ?? 1}`
                            : "No judge result yet"}
                        </span>
                        <strong className="t-num">
                          {score ? <bdi>{formatMark(score.score)}/{score.start}</bdi> : "—"}
                        </strong>
                      </div>
                    );
                  }
                  return (
                    <div className={`results-source is-choice cat-${categoryId}`} key={categoryId}>
                      <span className="results-source-name">
                        {category.label}
                        <small>{options.length} judge results — choose one</small>
                      </span>
                      <div className="results-source-options" role="radiogroup" aria-label={`${category.label} source`}>
                        {options.map((session) => {
                          const optionScore = sourceScore(session, categoryId);
                          const active = session.id === value;
                          return (
                            <button
                              type="button"
                              role="radio"
                              aria-checked={active}
                              className={active ? "is-active" : ""}
                              key={session.id}
                              onClick={() => setSelection(participant.id, categoryId, session.id)}
                            >
                              <span>{sourceJudge(session)} · revision {session.revision ?? 1}</span>
                              <strong className="t-num">
                                <bdi>{formatMark(optionScore.score)}/{optionScore.start}</bdi>
                              </strong>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="results-record-group">
              <h4>
                <label htmlFor={`result-reason-${participant.id}`}>
                  Reason for this result
                </label>
              </h4>
              <textarea
                id={`result-reason-${participant.id}`}
                className="results-reason"
                rows={2}
                value={reason}
                placeholder={reasonRequired
                  ? "Why this result is being revised. Kept on the record and exported."
                  : "Optional. Kept on the record and exported."}
                onChange={(event) =>
                  setReasons((current) => ({
                    ...current,
                    [participant.id]: event.target.value,
                  }))}
              />
              <p className="results-record-note">
                {reasonRequired
                  ? `Required for revision ${(previous?.revision ?? 1) + 1}.`
                  : "Recorded with the first finalization."}
              </p>
            </div>

            <dl className="results-record-facts">
              <div>
                <dt>Standing in division</dt>
                <dd className="t-num">
                  {selectedPlace ? `${selectedPlace} of ${selectedDivisionSize}` : "Not yet ranked"}
                </dd>
              </div>
              <div>
                <dt>Verification manifest</dt>
                <dd className="t-num">{finalized?.manifest ?? "After finalizing"}</dd>
              </div>
            </dl>

            {item.reasons.length > 0 && (
              <p className="results-record-blocked" role="status">
                {item.reasons.map(reasonText).join(" · ")}
              </p>
            )}

            <div className="results-record-action">
              <span>
                <small>{finalized ? "Final total" : "Proposed total"}</small>
                <strong className="t-num"><bdi>{displayedTotal}</bdi></strong>
              </span>
              <button
                type="button"
                className="btn-primary"
                disabled={
                  unresolved ||
                  !participantReady ||
                  !preview ||
                  (reasonRequired && !reason.trim())
                }
                onClick={() => finalize(item, reason)}
              >
                {previous ? "Finalize revision" : "Finalize result"}
              </button>
            </div>
          </aside>
        );
      })()}

      <div className="results-export">
        <p>
          The workbook always includes every current, checked final result in this competition—not only the visible filter.
        </p>
        <button
          type="button"
          className="btn-ghost"
          disabled={!currentResults.length || exporting}
          onClick={exportWorkbook}
        >
          <Icon name="download" size={15} />
          {exporting
            ? "Checking…"
            : state.competition.isSample
              ? "Sample finalized results (.xlsx)"
              : "Finalized results (.xlsx)"}
        </button>
      </div>
      {exportError && <p className="import-error">{exportError}</p>}
    </section>
  );
}
