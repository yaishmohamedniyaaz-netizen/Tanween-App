import { useMemo, useState } from "react";
import { CATEGORY_BY_ID } from "../config.ts";
import {
  buildParticipantResultPreview,
  finalizeParticipantResult,
  placeFinalizedResults,
  type ParticipantResultCandidate,
} from "../lib/finalResults.ts";
import { downloadFinalResultsWorkbook } from "../lib/finalResultsWorkbook.ts";
import {
  muqarrarLabel,
  participantCategoryLabel,
} from "../lib/participants.ts";
import { participantNumberLabel } from "../lib/participantPresentation.ts";
import type {
  ResultsReviewItem,
  ResultsReviewReason,
} from "../lib/resultsReview.ts";
import { useJudging } from "../state/store.tsx";
import type { CategoryId, FinalizedResult } from "../types.ts";
import { Icon } from "./Icon.tsx";
import { ParticipantResultDetail } from "./ParticipantResultDetail.tsx";

type CandidateSelections = Record<
  string,
  Partial<Record<CategoryId, string>>
>;

interface Props {
  allItems: ResultsReviewItem[];
  visibleItems: ResultsReviewItem[];
  filteredEmpty: boolean;
  detailParticipantId: string | null;
  onOpenParticipant: (participantId: string) => void;
  onCloseParticipant: () => void;
  registerParticipantButton: (
    participantId: string,
    node: HTMLButtonElement | null,
  ) => void;
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

function resultParticipantNumber(value: string, isSample: boolean): string {
  const sampleNumber = isSample && /^T\d+$/i.test(value.trim())
    ? value.trim().slice(1)
    : value;
  return participantNumberLabel(sampleNumber);
}

export function FinalResultsPanel({
  allItems,
  visibleItems,
  filteredEmpty,
  detailParticipantId,
  onOpenParticipant,
  onCloseParticipant,
  registerParticipantButton,
  onClearFilters,
}: Props) {
  const { state, dispatch } = useJudging();
  const [selections, setSelections] = useState<CandidateSelections>({});
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
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

  const detailItem = detailParticipantId
    ? allItems.find(
        (item) => item.candidate.participant.id === detailParticipantId,
      ) ?? null
    : null;

  if (detailItem) {
    const candidate = detailItem.candidate;
    return (
      <section className="final-results-panel results-candidate-panel is-detail-open">
        <ParticipantResultDetail
          item={detailItem}
          placed={placedByParticipant.get(candidate.participant.id)}
          selected={selectedForCandidate(candidate, detailItem.activeFinal)}
          isSample={state.competition.isSample}
          onSelectSource={(category, sessionId) =>
            setSelection(candidate.participant.id, category, sessionId)
          }
          onFinalize={() => finalize(detailItem)}
          onBack={onCloseParticipant}
        />
      </section>
    );
  }

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
        <div className="results-review-workbench">
          <div className="result-ledger-scroll">
            <table className="result-ledger-table">
              <thead>
                <tr>
                  <th scope="col">Participant</th>
                  <th scope="col" className="result-ledger-numeric">Total</th>
                  <th scope="col" className="result-ledger-state-column">State</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => {
                  const candidate = item.candidate;
                  const previous = item.activeFinal;
                  const placed = placedByParticipant.get(candidate.participant.id);
                  const selected = selectedForCandidate(candidate, previous);
                  const preview = buildParticipantResultPreview(candidate, selected);
                  const total = placed?.total ?? preview?.total;
                  const totalMax = placed?.totalMax ?? preview?.totalMax;
                  const primaryReason = item.state === "needs-review" && item.reasons[0]
                    ? reasonText(item.reasons[0])
                    : "";
                  const participantNumber = resultParticipantNumber(
                    candidate.participant.number,
                    state.competition.isSample,
                  );
                  const participantContext = [
                    candidate.participant.ageGroup,
                    participantCategoryLabel(candidate.participant.category),
                    muqarrarLabel(candidate.participant.muqarrar),
                  ].filter(Boolean).join(" · ");
                  return (
                    <tr
                      className={`result-ledger-row is-${item.state}`}
                      key={candidate.participant.id}
                    >
                      <td className="result-ledger-participant">
                        <button
                          ref={(node) => registerParticipantButton(
                            candidate.participant.id,
                            node,
                          )}
                          type="button"
                          onClick={() => onOpenParticipant(candidate.participant.id)}
                        >
                          <strong>{candidate.participant.name || "Unnamed participant"}</strong>
                          <small>
                            <bdi className="result-ledger-participant-number">{participantNumber}</bdi>
                            {participantContext && <> · {participantContext}</>}
                          </small>
                        </button>
                      </td>
                      <td className="result-ledger-numeric result-ledger-total">
                        <strong><bdi>{total ?? "—"}</bdi></strong>
                        {totalMax !== undefined && <small>/<bdi>{totalMax}</bdi></small>}
                      </td>
                      <td className="result-ledger-state-column">
                        <span className={`result-ledger-state is-${item.state}`}>
                          {stateLabel(item)}
                        </span>
                        {primaryReason && <small>{primaryReason}</small>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
