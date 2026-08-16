import { useEffect, useMemo, useState } from "react";
import { CATEGORY_BY_ID } from "../config";
import {
  buildParticipantResultPreview,
  finalizeParticipantResult,
  hasCompleteFinalizationIdentity,
  placeFinalizedResults,
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
  if (item.state === "ready") return "Ready to finalize";
  return "Needs review";
}

export function FinalResultsPanel({
  allItems,
  visibleItems,
  filteredEmpty,
  onClearFilters,
}: Props) {
  const { state, dispatch } = useJudging();
  const [selections, setSelections] = useState<CandidateSelections>({});
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [expandedParticipantId, setExpandedParticipantId] = useState<string | null>(null);
  const currentResults = useMemo(
    () => allItems.flatMap((item) =>
      item.state === "finalized" && item.activeFinal ? [item.activeFinal] : [],
    ),
    [allItems],
  );
  const placedByParticipant = useMemo(
    () => new Map(
      placeFinalizedResults(currentResults).map((result) => [
        result.participant.id,
        result,
      ]),
    ),
    [currentResults],
  );

  useEffect(() => {
    setExpandedParticipantId((current) => {
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

  const finalize = (item: ResultsReviewItem) => {
    const candidate = item.candidate;
    const previous = item.activeFinal;
    const revisionReason = previous
      ? window.prompt(
          `Reason for revision ${previous.revision + 1} of ${candidate.participant.name}'s final result:`,
          "",
        )
      : undefined;
    if (previous && !revisionReason?.trim()) return;
    const result = finalizeParticipantResult(
      candidate,
      selectedForCandidate(candidate, previous),
      previous,
      revisionReason ?? undefined,
    );
    if (result) dispatch({ type: "UPSERT_FINAL_RESULT", result });
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

  return (
    <section className="final-results-panel results-candidate-panel">
      {visibleItems.length === 0 ? (
        <div className="results-empty results-candidate-empty">
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
      ) : (
        <div className="final-result-list">
          {visibleItems.map((item) => {
            const candidate = item.candidate;
            const previous = item.activeFinal;
            const placed = placedByParticipant.get(candidate.participant.id);
            const selected = selectedForCandidate(candidate, previous);
            const preview = buildParticipantResultPreview(candidate, selected);
            const unresolved = candidate.categories.some(
              (category) => !selected[category],
            );
            const participantReady = hasCompleteFinalizationIdentity(
              candidate.participant,
            );
            const headingId = `result-candidate-${candidate.participant.id}`;
            const detailId = `${headingId}-detail`;
            const isExpanded = expandedParticipantId === candidate.participant.id;
            const displayedTotal = placed
              ? `${placed.total}/${placed.totalMax}`
              : preview
                ? `${preview.total}/${preview.totalMax}`
                : "—";
            return (
              <article
                className={`final-result-row is-${item.state}`}
                key={candidate.participant.id}
                aria-labelledby={headingId}
              >
                <button
                  type="button"
                  className="final-result-summary"
                  aria-expanded={isExpanded}
                  aria-controls={detailId}
                  onClick={() => setExpandedParticipantId(
                    isExpanded ? null : candidate.participant.id,
                  )}
                >
                  <div className="final-result-person">
                    <bdi className="final-result-number">
                      {candidate.participant.number || "—"}
                    </bdi>
                    <span>
                      <strong id={headingId}>
                        {candidate.participant.name || "Unnamed participant"}
                      </strong>
                      <small>
                        {[
                          candidate.participant.ageGroup,
                          participantCategoryLabel(candidate.participant.category),
                          muqarrarLabel(candidate.participant.muqarrar),
                        ].filter(Boolean).join(" · ")}
                      </small>
                    </span>
                  </div>
                  <div className="final-result-state">
                    <span className={`results-state-chip is-${item.state}`}>
                      <span className="results-state-icon" aria-hidden="true">
                        {item.state === "needs-review" ? "!" : <Icon name="check" size={12} />}
                      </span>
                      {stateLabel(item)}
                    </span>
                    <small>
                      {item.reasons.length
                        ? item.reasons.map(reasonText).join(" · ")
                        : item.state === "finalized"
                          ? `Revision ${item.activeFinal?.revision ?? 1} is current`
                          : "Every required judge source is present"}
                    </small>
                  </div>
                  <div className="final-result-overview">
                    <span className="final-score">
                      <small>{placed ? "Final total" : "Proposed total"}</small>
                      <strong><bdi>{displayedTotal}</bdi></strong>
                      {placed && <small>Place {placed.place} · revision {placed.revision}</small>}
                    </span>
                    <span className="final-result-timing">
                      <span>Last change</span>
                      <bdi>{item.lastChangedAt ? new Date(item.lastChangedAt).toLocaleDateString() : "—"}</bdi>
                    </span>
                    <span className="final-result-disclosure" aria-hidden="true">
                      <span>{isExpanded ? "Close" : "Review"}</span>
                      <Icon name="chevron" size={16} />
                    </span>
                  </div>
                </button>

                <div id={detailId} className="final-result-detail" hidden={!isExpanded}>
                  <div className="final-category-sources">
                    {candidate.categories.map((categoryId) => {
                      const category = CATEGORY_BY_ID[categoryId];
                      const options = candidate.byCategory[categoryId];
                      const value = selected[categoryId];
                      const selectedSource = options.find((option) => option.id === value);
                      const score = selectedSource
                        ? sourceScore(selectedSource, categoryId)
                        : null;
                      return (
                        <div className={`final-source-block cat-${categoryId}`} key={categoryId}>
                          <span className="final-source-label">{category.label}</span>
                          {options.length <= 1 ? (
                            <div className={options.length ? "final-source-value is-ready" : "final-source-value is-missing"}>
                              <strong>
                                {options.length && score
                                  ? <bdi>{score.score}/{score.start}</bdi>
                                  : "Missing result"}
                              </strong>
                              <small>
                                {options.length
                                  ? <>{sourceJudge(options[0])} · revision {options[0].revision ?? 1}</>
                                  : "Required before finalization"}
                              </small>
                            </div>
                          ) : (
                            <>
                              <select
                                value={value}
                                aria-label={`${category.label} source for ${candidate.participant.name}`}
                                onChange={(event) =>
                                  setSelection(
                                    candidate.participant.id,
                                    categoryId,
                                    event.target.value,
                                  )
                                }
                              >
                                <option value="">Choose result</option>
                                {options.map((session) => {
                                  const optionScore = sourceScore(session, categoryId);
                                  return (
                                    <option value={session.id} key={session.id}>
                                      {sourceJudge(session)} · revision {session.revision ?? 1} · {optionScore.score}/{optionScore.start}
                                    </option>
                                  );
                                })}
                              </select>
                              <small className="final-source-selection-meta">
                                {selectedSource && score
                                  ? <>Selected revision {selectedSource.revision ?? 1} · <bdi>{score.score}/{score.start}</bdi></>
                                  : "Compare judge, revision, and score before finalizing"}
                              </small>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="final-result-action">
                    <span className="final-result-action-note">
                      {item.state === "needs-review"
                        ? item.reasons.map(reasonText).join(" · ")
                        : item.state === "finalized"
                          ? `Current final result · revision ${item.activeFinal?.revision ?? 1}`
                          : "All required judge sources are ready for final review."}
                    </span>
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={unresolved || !participantReady}
                      onClick={() => finalize(item)}
                    >
                      {previous ? "Finalize revision" : "Finalize result"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <div className="results-candidate-toolbar">
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
