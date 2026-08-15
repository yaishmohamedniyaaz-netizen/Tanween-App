import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CATEGORIES,
  CATEGORY_BY_ID,
  PINPOINT_CATEGORIES,
  enabledCategories,
} from "../config";
import { downloadRecordsCSV } from "../lib/exportSession";
import {
  CATEGORY_ORDER,
  categoryListLabel,
  judgeDisplayName,
} from "../lib/judgeAssignments";
import { mistakePrimaryGlyph } from "../lib/mistakeDisplay";
import { participantCategoryLabel } from "../lib/participants";
import {
  RESULTS_REVIEW_PAGE_SIZE,
  buildResultsReviewItems,
  filterResultsReviewItems,
  paginateResultsReviewItems,
  selectStoredResultsHistory,
  sortResultsReviewItems,
  summarizeResultsReview,
  type ResultsReviewState,
  type StoredResultsScope,
} from "../lib/resultsReview";
import {
  downloadJudgeResultPackage,
  readJudgeResultFile,
  type JudgeResultPackage,
} from "../lib/resultPackages";
import { computeRecords } from "../lib/stats";
import { useJudging } from "../state/store";
import type { ParticipantCategory, SavedSession } from "../types";
import { FinalResultsPanel } from "./FinalResultsPanel";
import { Icon } from "./Icon";
import { JudgingHistory } from "./JudgingHistory";
import { ReopenSessionDialog } from "./ReopenSessionDialog";
import { SampleBadge } from "./SampleBadge";

type ResultsTab = "review" | "analysis";

const resultTabs: ResultsTab[] = ["review", "analysis"];
function lifecycleLabel(status: "draft" | "live" | "closed") {
  if (status === "live") return "Live";
  if (status === "closed") return "Closed";
  return "Draft";
}

function DataScopeControl({
  value,
  onChange,
}: {
  value: StoredResultsScope;
  onChange: (scope: StoredResultsScope) => void;
}) {
  return (
    <label className="records-filter results-scope-control">
      <span>Data scope</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as StoredResultsScope)}
      >
        <option value="current">Current competition</option>
        <option value="all">All stored competitions</option>
      </select>
    </label>
  );
}

export function RecordsView({ onResumeSession }: { onResumeSession: () => void }) {
  const { state, dispatch } = useJudging();
  const [activeTab, setActiveTab] = useState<ResultsTab>("review");
  const [historyScope, setHistoryScope] = useState<StoredResultsScope>("current");
  const [reviewQuery, setReviewQuery] = useState("");
  const [reviewState, setReviewState] = useState<"all" | ResultsReviewState>("all");
  const [reviewAgeGroup, setReviewAgeGroup] = useState("");
  const [reviewParticipantCategory, setReviewParticipantCategory] =
    useState<ParticipantCategory>("");
  const [reviewPage, setReviewPage] = useState(1);
  const [analysisAgeGroup, setAnalysisAgeGroup] = useState("");
  const [analysisParticipantCategory, setAnalysisParticipantCategory] =
    useState<ParticipantCategory>("");
  const [judgeSeat, setJudgeSeat] = useState("");
  const [section, setSection] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reopenSession, setReopenSession] = useState<SavedSession | null>(null);
  const [importPreview, setImportPreview] = useState<JudgeResultPackage | null>(null);
  const [importError, setImportError] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const reviewTabRef = useRef<HTMLButtonElement>(null);
  const analysisTabRef = useRef<HTMLButtonElement>(null);

  const judgedCategories = useMemo(
    () => enabledCategories(
      state.competition.liveSnapshot?.scoreConfig ?? state.config,
    ),
    [state.competition.liveSnapshot, state.config],
  );
  const reviewItems = useMemo(
    () => buildResultsReviewItems(
      state.history,
      state.finalizedResults,
      state.competition.id,
      judgedCategories,
    ),
    [
      judgedCategories,
      state.competition.id,
      state.finalizedResults,
      state.history,
    ],
  );
  const reviewSummary = useMemo(
    () => summarizeResultsReview(reviewItems),
    [reviewItems],
  );
  const filteredReviewItems = useMemo(
    () => sortResultsReviewItems(filterResultsReviewItems(reviewItems, {
      query: reviewQuery,
      state: reviewState,
      ageGroup: reviewAgeGroup,
      participantCategory: reviewParticipantCategory,
    })),
    [
      reviewAgeGroup,
      reviewItems,
      reviewParticipantCategory,
      reviewQuery,
      reviewState,
    ],
  );
  const reviewPageData = useMemo(
    () => paginateResultsReviewItems(
      filteredReviewItems,
      reviewPage,
      RESULTS_REVIEW_PAGE_SIZE,
    ),
    [filteredReviewItems, reviewPage],
  );
  const reviewAgeGroups = useMemo(
    () => [...new Set(
      reviewItems
        .map((item) => item.candidate.participant.ageGroup.trim())
        .filter(Boolean),
    )].sort((left, right) => left.localeCompare(right)),
    [reviewItems],
  );
  const hasReviewFilters = Boolean(
    reviewQuery.trim() ||
    reviewState !== "all" ||
    reviewAgeGroup ||
    reviewParticipantCategory,
  );
  const reviewAdvancedFilterCount = Number(Boolean(reviewAgeGroup)) +
    Number(Boolean(reviewParticipantCategory));

  useEffect(() => {
    if (reviewPage !== reviewPageData.page) setReviewPage(reviewPageData.page);
  }, [reviewPage, reviewPageData.page]);

  const historyInScope = useMemo(
    () => selectStoredResultsHistory(
      state.history,
      state.competition.id,
      historyScope,
    ),
    [historyScope, state.competition.id, state.history],
  );
  const scopedHistory = useMemo(
    () => historyInScope.filter((session) => {
      const assignment = session.assignment;
      const seatMatches =
        !judgeSeat || (assignment?.judgeSeatId ?? "judge-1") === judgeSeat;
      const sectionKey = assignment?.categories.join("+") ?? "";
      return seatMatches && (!section || sectionKey === section);
    }),
    [historyInScope, judgeSeat, section],
  );
  const categoryHistory = useMemo(
    () => analysisParticipantCategory
      ? scopedHistory.filter(
          (session) =>
            session.participant.category === analysisParticipantCategory,
        )
      : scopedHistory,
    [analysisParticipantCategory, scopedHistory],
  );
  const stats = useMemo(
    () => computeRecords(categoryHistory, analysisAgeGroup || null),
    [analysisAgeGroup, categoryHistory],
  );
  const judgeOptions = useMemo(() => {
    const values = new Map<string, string>();
    historyInScope.forEach((session) => {
      const assignment = session.assignment;
      values.set(
        assignment?.judgeSeatId ?? "judge-1",
        assignment ? judgeDisplayName(assignment) : "Judge 1",
      );
    });
    return [...values.entries()];
  }, [historyInScope]);
  const sectionOptions = useMemo(() => {
    const values = new Map<string, string>();
    historyInScope.forEach((session) => {
      const categories = session.assignment?.categories ?? [];
      if (categories.length) {
        values.set(categories.join("+"), categoryListLabel(categories));
      }
    });
    return [...values.entries()];
  }, [historyInScope]);
  const sessions = categoryHistory.filter(
    (session) =>
      !analysisAgeGroup ||
      (session.participant.ageGroup?.trim() || "") === analysisAgeGroup,
  );
  const maxCatCount = Math.max(
    1,
    ...PINPOINT_CATEGORIES.map((id) => stats.byCategory[id].count),
  );
  const maxLocCount = Math.max(1, ...stats.topLocations.map((location) => location.count));

  useEffect(() => {
    if (analysisAgeGroup && !stats.ageGroups.includes(analysisAgeGroup)) {
      setAnalysisAgeGroup("");
    }
  }, [analysisAgeGroup, stats.ageGroups]);

  useEffect(() => {
    if (judgeSeat && !judgeOptions.some(([id]) => id === judgeSeat)) {
      setJudgeSeat("");
    }
    if (section && !sectionOptions.some(([id]) => id === section)) {
      setSection("");
    }
  }, [judgeOptions, judgeSeat, section, sectionOptions]);

  const setReviewFilter = (change: () => void) => {
    change();
    setReviewPage(1);
  };

  const clearReviewFilters = () => {
    setReviewQuery("");
    setReviewState("all");
    setReviewAgeGroup("");
    setReviewParticipantCategory("");
    setReviewPage(1);
  };

  const handleTabKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    current: ResultsTab,
  ) => {
    const currentIndex = resultTabs.indexOf(current);
    let targetIndex: number | null = null;
    if (event.key === "ArrowRight") targetIndex = (currentIndex + 1) % resultTabs.length;
    if (event.key === "ArrowLeft") {
      targetIndex = (currentIndex - 1 + resultTabs.length) % resultTabs.length;
    }
    if (event.key === "Home") targetIndex = 0;
    if (event.key === "End") targetIndex = resultTabs.length - 1;
    if (targetIndex === null) return;
    event.preventDefault();
    const nextTab = resultTabs[targetIndex];
    setActiveTab(nextTab);
    (nextTab === "review" ? reviewTabRef : analysisTabRef).current?.focus();
  };

  const readImport = async (file: File | undefined) => {
    if (!file) return;
    setImportError("");
    setImportPreview(null);
    try {
      if (state.sessionActive) {
        throw new Error("Finish the active reciter before importing a judge result.");
      }
      if (!state.competition.name || !state.competition.edition) {
        throw new Error("Set the competition name and edition before importing results.");
      }
      const payload = await readJudgeResultFile(file);
      if (payload.competition.id !== state.competition.id) {
        throw new Error("That result belongs to a different competition or edition.");
      }
      if (Boolean(payload.competition.isSample) !== state.competition.isSample) {
        throw new Error("Sample and official judge results cannot be mixed.");
      }
      if (!state.roster.length) {
        throw new Error("Upload this competition's participant list before importing judge results.");
      }
      if (!state.roster.some((entry) => entry.id === payload.session.participant.id)) {
        throw new Error("That participant is not in this competition's participant list.");
      }
      const incomingAssignment = payload.session.assignment;
      if (!incomingAssignment) {
        throw new Error("That judge result does not include a judge assignment.");
      }
      const expectedSeat = state.panel.seats.find(
        (seat) => seat.id === incomingAssignment.judgeSeatId,
      );
      if (
        !expectedSeat ||
        [...expectedSeat.categories].sort().join("|") !==
          [...incomingAssignment.categories].sort().join("|")
      ) {
        throw new Error("That judge result does not match this competition's panel assignments.");
      }
      if (JSON.stringify(payload.session.config) !== JSON.stringify(state.config)) {
        throw new Error("That judge result uses different scoring rules.");
      }
      setImportPreview(payload);
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : "Could not read that result file.",
      );
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };

  const renderHistoryFilters = () => (
    <div className="results-history-tools">
      <DataScopeControl value={historyScope} onChange={setHistoryScope} />
      <label className="records-filter">
        <span>Judge</span>
        <select value={judgeSeat} onChange={(event) => setJudgeSeat(event.target.value)}>
          <option value="">All judges</option>
          {judgeOptions.map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
      </label>
      <label className="records-filter">
        <span>Section</span>
        <select value={section} onChange={(event) => setSection(event.target.value)}>
          <option value="">All sections</option>
          {sectionOptions.map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
      </label>
      <label className="records-filter">
        <span>Age group</span>
        <select
          value={analysisAgeGroup}
          onChange={(event) => setAnalysisAgeGroup(event.target.value)}
        >
          <option value="">All age groups</option>
          {stats.ageGroups.map((group) => (
            <option key={group} value={group}>{group}</option>
          ))}
        </select>
      </label>
      <label className="records-filter">
        <span>Participant category</span>
        <select
          value={analysisParticipantCategory}
          onChange={(event) =>
            setAnalysisParticipantCategory(
              event.target.value as ParticipantCategory,
            )
          }
        >
          <option value="">All categories</option>
          <option value="baliagen">Baliagen</option>
          <option value="nubalaa">Hifz</option>
        </select>
      </label>
    </div>
  );

  const renderJudgeResults = () => {
    const currentScopeIsSample = state.competition.isSample;
    const storedOfficial = state.history.some((session) => !session.isSample);
    const storedSample = state.history.some((session) => session.isSample);
    return (
      <section className="panel results-judge-panel">
        <div className="panel-head results-section-head">
          <div>
            <h2 className="results-section-title">
              Judge results <span className="panel-count">{sessions.length}</span>
            </h2>
            <p className="panel-sub">
              Source records, corrections, and judging history used to assemble final results.
            </p>
          </div>
          <div className="panel-actions">
            <input
              ref={importRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(event) => readImport(event.target.files?.[0])}
            />
            <button
              type="button"
              className="btn-ghost"
              disabled={state.sessionActive}
              onClick={() => importRef.current?.click()}
              title="Import a result exported by another judge into the current competition"
            >
              <Icon name="download" size={15} /> Import judge result
            </button>
            {historyScope === "current" ? (
              <button
                type="button"
                className="btn-ghost"
                disabled={!historyInScope.length}
                onClick={() =>
                  downloadRecordsCSV(
                    historyInScope,
                    currentScopeIsSample ? "sample" : "official",
                  )
                }
                title="Export the current competition's judge results"
              >
                <Icon name="download" size={15} />
                {currentScopeIsSample
                  ? "Current sample results (.csv)"
                  : "Current competition results (.csv)"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={!storedOfficial}
                  onClick={() => downloadRecordsCSV(state.history, "official")}
                >
                  <Icon name="download" size={15} /> All stored official (.csv)
                </button>
                {storedSample && (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => downloadRecordsCSV(state.history, "sample")}
                  >
                    <Icon name="download" size={15} /> All stored sample (.csv)
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        {renderHistoryFilters()}
        {importError && <p className="import-error">{importError}</p>}
        {importPreview && (
          <div className="result-import-preview" role="status">
            <span>
              <strong>{importPreview.session.participant.name}</strong>
              <small>
                <bdi>{importPreview.session.participant.number}</bdi> · {importPreview.session.assignment
                  ? categoryListLabel(importPreview.session.assignment.categories)
                  : "Judge section"}
              </small>
            </span>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setImportPreview(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                dispatch({ type: "IMPORT_SESSION", session: importPreview.session });
                setImportPreview(null);
              }}
            >
              Add to records
            </button>
          </div>
        )}
        {sessions.length === 0 ? (
          <div className="results-empty">
            <strong>No judge results in this scope</strong>
            <span>
              {historyScope === "current" && state.history.length
                ? "Choose All stored competitions to inspect retained records, or finish/import a result for this competition."
                : "Finished and imported judge sections will appear here."}
            </span>
          </div>
        ) : (
          <ul className="session-list">
            {sessions.map((saved) => {
              const isOpen = expanded === saved.id;
              return (
                <li className="session-li" key={saved.id}>
                  <div
                    className={`session-item ${isOpen ? "is-open" : ""}`}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                    onClick={() => setExpanded(isOpen ? null : saved.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setExpanded(isOpen ? null : saved.id);
                      }
                    }}
                  >
                    <span className="session-chevron" aria-hidden="true">
                      <Icon name="chevron" size={16} />
                    </span>
                    <bdi className="session-no">{saved.participant.number || "—"}</bdi>
                    <span className="session-main">
                      <span className="session-name">
                        {saved.participant.name || "Unnamed reciter"}
                        {saved.isSample && <SampleBadge compact />}
                      </span>
                      <span className="session-meta">
                        {[
                          saved.participant.ageGroup,
                          participantCategoryLabel(saved.participant.category),
                          saved.participant.institution,
                        ].filter(Boolean).join(" · ")} · {new Date(saved.savedAt).toLocaleDateString()} · {saved.mistakes.length} mistakes · {saved.assignment ? judgeDisplayName(saved.assignment) : "Judge 1"}
                        {historyScope === "all" && (
                          <> · <bdi>{saved.competitionId || "Legacy record"}</bdi>{saved.competitionVersionId ? <> / <bdi>{saved.competitionVersionId}</bdi></> : ""}</>
                        )}
                      </span>
                    </span>
                    <bdi className="session-score">
                      {saved.total}<span className="session-max">/{saved.totalMax}</span>
                    </bdi>
                    <span className="session-status">Section</span>
                  </div>
                  {isOpen && (
                    <div className="session-drill">
                      <div className="session-assignment">
                        <strong>{saved.assignment ? judgeDisplayName(saved.assignment) : "Judge 1"}</strong>
                        <span>{categoryListLabel(saved.assignment?.categories ?? CATEGORY_ORDER)}</span>
                        <small>Judge-section result · <bdi>{saved.total}/{saved.totalMax}</bdi></small>
                      </div>
                      {saved.mistakes.length === 0 ? (
                        <p className="empty">No mistakes in this session.</p>
                      ) : (
                        <ul className="drill-list">
                          {saved.mistakes.map((mistake) => (
                            <li className={`drill-item cat-${mistake.category}`} key={mistake.id}>
                              <span className="drill-glyph">
                                {mistakePrimaryGlyph(mistake)}
                              </span>
                              <span className="drill-loc">{mistake.label}</span>
                              <span className="drill-chip">
                                {CATEGORY_BY_ID[mistake.category].label}
                              </span>
                              <bdi className="drill-amt">−{mistake.amount}</bdi>
                            </li>
                          ))}
                        </ul>
                      )}
                      {saved.notes?.trim() && (
                        <p className="drill-notes">{saved.notes}</p>
                      )}
                      <div className="session-history-head">
                        <span className="t-label">Judging history</span>
                        <button
                          type="button"
                          className="btn-ghost"
                          disabled={!state.competition.name || !state.competition.edition}
                          title={
                            state.competition.name && state.competition.edition
                              ? "Export this judge-owned result for consolidation"
                              : "Set the competition name and edition before exporting"
                          }
                          onClick={() => downloadJudgeResultPackage(saved, state.competition)}
                        >
                          Export judge result
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          disabled={state.sessionActive}
                          title={
                            state.sessionActive
                              ? "Finish the current reciter before reopening another result"
                              : "Reopen this result to make a recorded correction"
                          }
                          onClick={() => setReopenSession(saved)}
                        >
                          Reopen to correct
                        </button>
                      </div>
                      <JudgingHistory events={saved.events ?? []} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    );
  };

  const competitionName = state.competition.name.trim() || "No competition configured";
  const competitionEdition = state.competition.edition.trim();

  return (
    <div className="records results-workspace">
      <header className="results-page-head">
        <h1>Results</h1>
        <div className="results-competition-context" aria-label="Competition context">
          <strong>{competitionName}</strong>
          <span>
            {competitionEdition && <><bdi>{competitionEdition}</bdi> · </>}
            {lifecycleLabel(state.competition.status)}
          </span>
        </div>
      </header>

      <div className="results-tabs" role="tablist" aria-label="Results sections">
        <button
          ref={reviewTabRef}
          id="results-tab-review"
          type="button"
          role="tab"
          aria-selected={activeTab === "review"}
          aria-controls="results-panel-review"
          tabIndex={activeTab === "review" ? 0 : -1}
          onClick={() => setActiveTab("review")}
          onKeyDown={(event) => handleTabKeyDown(event, "review")}
        >
          Review
          {reviewSummary.unresolved > 0 && (
            <span className="results-tab-count">{reviewSummary.unresolved}</span>
          )}
        </button>
        <button
          ref={analysisTabRef}
          id="results-tab-analysis"
          type="button"
          role="tab"
          aria-selected={activeTab === "analysis"}
          aria-controls="results-panel-analysis"
          tabIndex={activeTab === "analysis" ? 0 : -1}
          onClick={() => setActiveTab("analysis")}
          onKeyDown={(event) => handleTabKeyDown(event, "analysis")}
        >
          Analysis
        </button>
      </div>

      <section
        id="results-panel-review"
        role="tabpanel"
        aria-labelledby="results-tab-review"
        hidden={activeTab !== "review"}
        className="results-tab-panel"
      >
        <div className="results-status-strip" role="group" aria-label="Filter participant results by status">
          <button
            type="button"
            className="results-status-card is-needs-review"
            aria-pressed={reviewState === "needs-review"}
            onClick={() => setReviewFilter(() => setReviewState("needs-review"))}
          >
            <span className="results-status-card-copy">
              <span>Needs review</span>
              <small>Resolve first</small>
            </span>
            <strong>{reviewSummary.needsReview}</strong>
          </button>
          <button
            type="button"
            className="results-status-card is-ready"
            aria-pressed={reviewState === "ready"}
            onClick={() => setReviewFilter(() => setReviewState("ready"))}
          >
            <span className="results-status-card-copy">
              <span>Ready</span>
              <small>Can finalize</small>
            </span>
            <strong>{reviewSummary.ready}</strong>
          </button>
          <button
            type="button"
            className="results-status-card is-finalized"
            aria-pressed={reviewState === "finalized"}
            onClick={() => setReviewFilter(() => setReviewState("finalized"))}
          >
            <span className="results-status-card-copy">
              <span>Finalized</span>
              <small>Current result</small>
            </span>
            <strong>{reviewSummary.finalized}</strong>
          </button>
          <button
            type="button"
            className="results-status-card is-total"
            aria-pressed={reviewState === "all"}
            onClick={() => setReviewFilter(() => setReviewState("all"))}
          >
            <span className="results-status-card-copy">
              <span>All candidates</span>
              <small>Complete queue</small>
            </span>
            <strong>{reviewSummary.total}</strong>
          </button>
        </div>

        <section className="results-review-section" aria-labelledby="results-review-heading">
          <div className="results-review-head">
            <div>
              <h2 id="results-review-heading" className="results-section-title">
                Participant review
              </h2>
              <p className="panel-sub">Unresolved participants appear first.</p>
            </div>
            <p className="results-visible-count" role="status" aria-live="polite">
              {filteredReviewItems.length} of {reviewItems.length} result candidates
              {reviewPageData.pageCount > 1 && ` · Page ${reviewPageData.page} of ${reviewPageData.pageCount}`}
            </p>
          </div>
          <div className="results-review-filters">
            <label className="results-search-filter">
              <span>Find participant</span>
              <input
                type="search"
                value={reviewQuery}
                placeholder="Name or number"
                onChange={(event) =>
                  setReviewFilter(() => setReviewQuery(event.target.value))
                }
              />
            </label>
            <details className="results-filter-disclosure">
              <summary>
                <span>More filters</span>
                {reviewAdvancedFilterCount > 0 && (
                  <strong>{reviewAdvancedFilterCount}</strong>
                )}
              </summary>
              <div className="results-advanced-filter-grid">
                <label className="records-filter">
                  <span>Age group</span>
                  <select
                    value={reviewAgeGroup}
                    onChange={(event) =>
                      setReviewFilter(() => setReviewAgeGroup(event.target.value))
                    }
                  >
                    <option value="">All age groups</option>
                    {reviewAgeGroups.map((group) => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </label>
                <label className="records-filter">
                  <span>Participant category</span>
                  <select
                    value={reviewParticipantCategory}
                    onChange={(event) =>
                      setReviewFilter(() => setReviewParticipantCategory(
                        event.target.value as ParticipantCategory,
                      ))
                    }
                  >
                    <option value="">All categories</option>
                    <option value="baliagen">Baliagen</option>
                    <option value="nubalaa">Hifz</option>
                  </select>
                </label>
                {hasReviewFilters && (
                  <button type="button" className="btn-ghost results-clear-filters" onClick={clearReviewFilters}>
                    Clear all filters
                  </button>
                )}
              </div>
            </details>
          </div>

          <FinalResultsPanel
            allItems={reviewItems}
            visibleItems={reviewPageData.items}
            filteredEmpty={reviewItems.length > 0 && filteredReviewItems.length === 0}
            onClearFilters={clearReviewFilters}
          />

          {reviewPageData.pageCount > 1 && (
            <nav className="results-pagination" aria-label="Participant review pages">
              <button
                type="button"
                className="btn-ghost"
                disabled={reviewPageData.page === 1}
                aria-label="Previous participant review page"
                onClick={() => setReviewPage((page) => Math.max(1, page - 1))}
              >
                Previous
              </button>
              <span>Page <bdi>{reviewPageData.page}</bdi> of <bdi>{reviewPageData.pageCount}</bdi></span>
              <button
                type="button"
                className="btn-ghost"
                disabled={reviewPageData.page === reviewPageData.pageCount}
                aria-label="Next participant review page"
                onClick={() => setReviewPage((page) => Math.min(reviewPageData.pageCount, page + 1))}
              >
                Next
              </button>
            </nav>
          )}
        </section>

        {renderJudgeResults()}
      </section>

      <section
        id="results-panel-analysis"
        role="tabpanel"
        aria-labelledby="results-tab-analysis"
        hidden={activeTab !== "analysis"}
        className="results-tab-panel"
      >
        <div className="results-analysis-intro">
          <div>
            <h2 className="results-section-title">Analysis</h2>
            <p>Raw counts and score summaries for the selected stored judge results.</p>
          </div>
          <details className="results-analysis-filter-disclosure">
            <summary>
              <span>Analysis filters</span>
              <small>{historyScope === "current" ? "Current competition" : "All stored competitions"}</small>
            </summary>
            {renderHistoryFilters()}
          </details>
        </div>

        <div className="metric-cards results-metrics">
          <div className="metric">
            <span className="metric-label">Judge results</span>
            <span className="metric-num">{stats.sessions}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Average score</span>
            <span className="metric-num">{stats.avgPercent}%</span>
          </div>
          <div className="metric">
            <span className="metric-label">Mistakes logged</span>
            <span className="metric-num">{stats.totalMistakes}</span>
          </div>
        </div>
        <p className="results-analysis-scope-note">
          Showing descriptive counts from <strong>{sessions.length}</strong> stored judge result{sessions.length === 1 ? "" : "s"}; these are not normalized participant comparisons.
        </p>

        <div className="records-grid">
          <section className="panel">
            <div className="panel-head">
              <h3 className="results-panel-title">Mistakes by category</h3>
            </div>
            <div className="cat-list">
              {CATEGORIES.filter((category) => category.kind === "pinpoint").map((category) => {
                const value = stats.byCategory[category.id];
                return (
                  <div className={`cat-row cat-${category.id}`} key={category.id}>
                    <div className="cat-row-top">
                      <span className="cat-dot" aria-hidden="true" />
                      <span className="cat-name">{category.label}</span>
                      <span className="cat-score">{value.count}</span>
                    </div>
                    <div className="cat-bar">
                      <span
                        className="cat-bar-fill"
                        style={{ width: `${(value.count / maxCatCount) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h3 className="results-panel-title">Most marked letters</h3>
            </div>
            {stats.topLetters.length === 0 ? (
              <p className="empty">No marks yet.</p>
            ) : (
              <div className="letter-chips">
                {stats.topLetters.map((letter) => (
                  <span className="letter-chip" key={letter.glyph}>
                    <span className="letter-chip-glyph">{letter.glyph}</span>
                    <span className="letter-chip-count">{letter.count}</span>
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="panel">
          <div className="panel-head">
            <h3 className="results-panel-title">Most repeated mistakes</h3>
            <span className="panel-sub">Same letter across reciters</span>
          </div>
          {stats.topLocations.length === 0 ? (
            <p className="empty">No marks yet.</p>
          ) : (
            <ol className="repeat-list">
              {stats.topLocations.map((location, index) => (
                <li className={`repeat-item cat-${location.topCategory}`} key={location.tid}>
                  <span className="repeat-rank" aria-hidden="true">{index + 1}</span>
                  <span className="repeat-glyph">{location.glyph}</span>
                  <span className="repeat-body">
                    <span className="repeat-loc">{location.label}</span>
                    <span className="repeat-chip">
                      {CATEGORY_BY_ID[location.topCategory].label}
                    </span>
                  </span>
                  <span className="repeat-bar">
                    <span
                      className="repeat-bar-fill"
                      style={{ width: `${(location.count / maxLocCount) * 100}%` }}
                    />
                  </span>
                  <span className="repeat-count">
                    <strong>{location.count}</strong>
                    <small>{location.count === 1 ? "mark" : "marks"}</small>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </section>

      {reopenSession && (
        <ReopenSessionDialog
          session={reopenSession}
          onCancel={() => setReopenSession(null)}
          onConfirm={(reason) => {
            dispatch({ type: "REOPEN_SESSION", id: reopenSession.id, reason });
            setReopenSession(null);
            onResumeSession();
          }}
        />
      )}
    </div>
  );
}
