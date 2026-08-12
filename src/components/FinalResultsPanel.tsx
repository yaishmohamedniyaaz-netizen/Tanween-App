import { useMemo, useState } from "react";
import { CATEGORIES } from "../config";
import {
  buildResultCandidates,
  finalizeParticipantResult,
  placeFinalizedResults,
  type ParticipantResultCandidate,
} from "../lib/finalResults";
import { downloadFinalResultsWorkbook } from "../lib/finalResultsWorkbook";
import {
  muqarrarLabel,
  participantCategoryLabel,
} from "../lib/participants";
import { useJudging } from "../state/store";
import type { CategoryId, FinalizedResult } from "../types";
import { Icon } from "./Icon";
import { SampleBadge } from "./SampleBadge";

type CandidateSelections = Record<
  string,
  Partial<Record<CategoryId, string>>
>;

function selectedSessionId(
  candidate: ParticipantResultCandidate,
  category: CategoryId,
  selections: CandidateSelections,
  previous?: FinalizedResult,
): string {
  const manual = selections[candidate.participant.id]?.[category];
  if (manual) return manual;
  const previousId = previous?.byCategory[category].sessionId;
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

function isCurrentFinal(
  candidate: ParticipantResultCandidate,
  result: FinalizedResult,
): boolean {
  return CATEGORIES.every(({ id }) => {
    const source = candidate.byCategory[id].find(
      (session) => session.id === result.byCategory[id].sessionId,
    );
    const hasNewAlternative = candidate.byCategory[id].some(
      (session) =>
        session.id !== result.byCategory[id].sessionId &&
        (session.importedAt ?? session.savedAt) > result.finalizedAt,
    );
    return Boolean(
      source &&
      (source.revision ?? 1) === result.byCategory[id].sessionRevision &&
      !hasNewAlternative,
    );
  });
}

export function FinalResultsPanel() {
  const { state, dispatch } = useJudging();
  const [selections, setSelections] = useState<CandidateSelections>({});
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const candidates = useMemo(
    () => buildResultCandidates(
      state.history.filter(
        (session) => session.competitionId === state.competition.id,
      ),
    ),
    [state.competition.id, state.history],
  );
  const previousByParticipant = useMemo(
    () => new Map(
      state.finalizedResults
        .filter(
          (result) =>
            !result.supersededAt &&
            result.competitionId === state.competition.id,
        )
        .map((result) => [result.participant.id, result]),
    ),
    [state.competition.id, state.finalizedResults],
  );
  const currentResults = useMemo(
    () => state.finalizedResults.filter((result) => {
      if (result.supersededAt) return false;
      if (result.competitionId !== state.competition.id) return false;
      const candidate = candidates.find(
        (item) => item.participant.id === result.participant.id,
      );
      return candidate ? isCurrentFinal(candidate, result) : false;
    }),
    [candidates, state.competition.id, state.finalizedResults],
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

  const finalize = (candidate: ParticipantResultCandidate) => {
    const previous = previousByParticipant.get(candidate.participant.id);
    const revisionReason = previous
      ? window.prompt(
          `Reason for revision ${previous.revision + 1} of ${candidate.participant.name}'s final result:`,
          "",
        )
      : undefined;
    if (previous && !revisionReason?.trim()) return;
    const selected = Object.fromEntries(
      CATEGORIES.map(({ id }) => [
        id,
        selectedSessionId(candidate, id, selections, previous),
      ]),
    ) as Record<CategoryId, string>;
    const result = finalizeParticipantResult(
      candidate,
      selected,
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
    <section className="panel final-results-panel">
      <div className="panel-head final-results-head">
        <div>
          <h2 className="panel-title">
            Final results
            <span className="panel-count">{currentResults.length}</span>
            {state.competition.isSample && <SampleBadge compact />}
          </h2>
          <p className="panel-sub">
            Combine the three judge sections, then export checked fixed totals.
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost"
          disabled={!currentResults.length || exporting}
          onClick={exportWorkbook}
        >
          <Icon name="download" size={15} />
          {exporting ? "Checking…" : state.competition.isSample ? "Sample results (.xlsx)" : "Final results (.xlsx)"}
        </button>
      </div>
      {exportError && <p className="import-error">{exportError}</p>}
      <div className="final-result-list">
        {candidates.map((candidate) => {
          const previous = previousByParticipant.get(candidate.participant.id);
          const placed = placedByParticipant.get(candidate.participant.id);
          const participantReady = Boolean(
            candidate.participant.number.trim() &&
            candidate.participant.name.trim() &&
            candidate.participant.ageGroup.trim() &&
            candidate.participant.category &&
            candidate.participant.muqarrar,
          );
          const unresolved = CATEGORIES.some(
            ({ id }) => !selectedSessionId(candidate, id, selections, previous),
          );
          const stale = Boolean(previous && !isCurrentFinal(candidate, previous));
          return (
            <article className="final-result-row" key={candidate.participant.id}>
              <div className="final-result-person">
                <span className="final-result-number">
                  {candidate.participant.number || "—"}
                </span>
                <span>
                  <strong>{candidate.participant.name}</strong>
                  <small>
                    {[
                      candidate.participant.ageGroup,
                      participantCategoryLabel(candidate.participant.category),
                      muqarrarLabel(candidate.participant.muqarrar),
                    ].filter(Boolean).join(" · ")}
                  </small>
                </span>
              </div>
              <div className="final-category-sources">
                {CATEGORIES.map((category) => {
                  const options = candidate.byCategory[category.id];
                  const value = selectedSessionId(
                    candidate,
                    category.id,
                    selections,
                    previous,
                  );
                  return (
                    <label key={category.id}>
                      <span>{category.label}</span>
                      {options.length <= 1 ? (
                        <strong className={options.length ? "is-ready" : "is-missing"}>
                          {options.length
                            ? options[0].assignment?.judgeName ||
                              options[0].assignment?.judgeLabel ||
                              "Judge 1"
                            : "Missing"}
                        </strong>
                      ) : (
                        <select
                          value={value}
                          aria-label={`${category.label} source for ${candidate.participant.name}`}
                          onChange={(event) =>
                            setSelection(
                              candidate.participant.id,
                              category.id,
                              event.target.value,
                            )
                          }
                        >
                          <option value="">Choose result</option>
                          {options.map((session) => (
                            <option value={session.id} key={session.id}>
                              {session.assignment?.judgeName ||
                                session.assignment?.judgeLabel ||
                                "Judge 1"} · revision {session.revision ?? 1}
                            </option>
                          ))}
                        </select>
                      )}
                    </label>
                  );
                })}
              </div>
              <div className="final-result-action">
                {placed && !stale ? (
                  <span className="final-score">
                    <strong>{placed.total}/{placed.totalMax}</strong>
                    <small>Place {placed.place} · revision {placed.revision}</small>
                  </span>
                ) : (
                  <span className={`final-status ${stale ? "is-stale" : ""}`}>
                    {stale
                      ? "Source changed"
                      : !participantReady
                        ? "Participant details missing"
                        : unresolved
                          ? "Needs judge result"
                          : "Ready"}
                  </span>
                )}
                <button
                  type="button"
                  className="btn-primary"
                  disabled={unresolved || !participantReady}
                  onClick={() => finalize(candidate)}
                >
                  {previous ? "Finalize revision" : "Finalize"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
