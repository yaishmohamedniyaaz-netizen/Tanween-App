import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CATEGORY_BY_ID,
  PINPOINT_CATEGORIES,
  enabledCategories,
} from "../config";
import { downloadJudgeRecordsWorkbook } from "../lib/judgeRecordsWorkbook";
import {
  CATEGORY_ORDER,
  categoryListLabel,
  judgeDisplayName,
} from "../lib/judgeAssignments";
import { mistakePrimaryGlyph } from "../lib/mistakeDisplay";
import { participantNumberLabel } from "../lib/participantPresentation";
import { participantCategoryLabel } from "../lib/participants";
import {
  loadQuestionIndex,
  recitationRangeMatchesQuestionIndex,
} from "../lib/questionBank.ts";
import {
  inspectImportedSessionQuestion,
  questionEvidenceExactKey,
} from "../lib/questionEvidence.ts";
import { participantDivision } from "../lib/reciterQuestions";
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
import { normalizeImportedSavedSession, useJudging } from "../state/store";
import type { ParticipantCategory, SavedSession } from "../types";
import { FinalResultsPanel } from "./FinalResultsPanel";
import { ResultsOverview } from "./ResultsOverview";
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
  // Default Results experience; explicit escape hatch for the legacy interface.
  const overviewEnabled = new URLSearchParams(window.location.search).get("resultsOverview") !== "0";
  const [activeTab, setActiveTab] = useState<ResultsTab>("review");
  const [historyScope, setHistoryScope] = useState<StoredResultsScope>("current");
  const [reviewQuery, setReviewQuery] = useState("");
  const [reviewState, setReviewState] = useState<"all" | ResultsReviewState>("all");
  const [reviewAgeGroup, setReviewAgeGroup] = useState("");
  const [reviewParticipantCategory, setReviewParticipantCategory] =
    useState<ParticipantCategory>("");
  const [reviewPage, setReviewPage] = useState(1);
  const [detailParticipantId, setDetailParticipantId] = useState<string | null>(null);
  const [analysisAgeGroup, setAnalysisAgeGroup] = useState("");
  const [analysisParticipantCategory, setAnalysisParticipantCategory] =
    useState<ParticipantCategory>("");
  const [selectedAnalysisTid, setSelectedAnalysisTid] = useState<string | null>(null);
  const [judgeSeat, setJudgeSeat] = useState("");
  const [section, setSection] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reopenSession, setReopenSession] = useState<SavedSession | null>(null);
  const [importPreview, setImportPreview] = useState<JudgeResultPackage | null>(null);
  const [importEvidenceWarning, setImportEvidenceWarning] = useState("");
  const [importError, setImportError] = useState("");
  const [recordsExporting, setRecordsExporting] = useState(false);
  const [recordsExportError, setRecordsExportError] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const reviewTabRef = useRef<HTMLButtonElement>(null);
  const analysisTabRef = useRef<HTMLButtonElement>(null);
  const participantButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const reviewScrollRef = useRef(0);
  const tabScroll = useRef<Record<ResultsTab, number>>({ review: 0, analysis: 0 });
  useEffect(() => {
    if (!overviewEnabled) return;
    const previous = document.documentElement.style.scrollbarGutter;
    document.documentElement.style.scrollbarGutter = "stable";
    return () => { document.documentElement.style.scrollbarGutter = previous; };
  }, [overviewEnabled]);
  const changeTab = (next: ResultsTab) => {
    if (next === activeTab) return;
    if (overviewEnabled) tabScroll.current[activeTab] = window.scrollY;
    setActiveTab(next);
    if (overviewEnabled) requestAnimationFrame(() => window.scrollTo({ top: tabScroll.current[next] }));
  };

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

  useEffect(() => {
    if (
      detailParticipantId &&
      !reviewItems.some(
        (item) => item.candidate.participant.id === detailParticipantId,
      )
    ) {
      setDetailParticipantId(null);
    }
  }, [detailParticipantId, reviewItems]);

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
  const analysisLocations = useMemo(() => {
    const locations = new Map<string, {
      tid: string;
      word: string;
      label: string;
      surah: number;
      ayah: number | null;
      page?: number;
      marks: number;
      reciters: Set<string>;
      entries: {
        id: string;
        participantName: string;
        participantNumber: string;
        isSample: boolean;
        judgeName: string;
        category: (typeof PINPOINT_CATEGORIES)[number];
        amount: number;
      }[];
    }>();

    sessions.forEach((session) => {
      session.mistakes.forEach((mistake) => {
        if (!PINPOINT_CATEGORIES.includes(mistake.category as (typeof PINPOINT_CATEGORIES)[number])) {
          return;
        }
        const current = locations.get(mistake.tid) ?? {
          tid: mistake.tid,
          word: mistake.wordText?.trim() || mistakePrimaryGlyph(mistake),
          label: mistake.label,
          surah: mistake.surah,
          ayah: mistake.ayah,
          page: mistake.page,
          marks: 0,
          reciters: new Set<string>(),
          entries: [],
        };
        current.marks += 1;
        current.reciters.add(session.participant.id);
        current.entries.push({
          id: `${session.id}:${mistake.id}`,
          participantName: session.participant.name,
          participantNumber: session.participant.number,
          isSample: Boolean(session.isSample),
          judgeName: session.assignment ? judgeDisplayName(session.assignment) : "Judge 1",
          category: mistake.category as (typeof PINPOINT_CATEGORIES)[number],
          amount: mistake.amount,
        });
        locations.set(mistake.tid, current);
      });
    });

    return [...locations.values()]
      .map((location) => ({
        ...location,
        reciterCount: location.reciters.size,
        entries: location.entries.sort((left, right) =>
          left.participantNumber.localeCompare(right.participantNumber, undefined, {
            numeric: true,
          }),
        ),
      }))
      .sort((left, right) =>
        right.marks - left.marks ||
        right.reciterCount - left.reciterCount ||
        left.label.localeCompare(right.label),
      );
  }, [sessions]);
  const selectedAnalysisLocation = analysisLocations.find(
    (location) => location.tid === selectedAnalysisTid,
  ) ?? analysisLocations[0] ?? null;
  const analysisReciterCount = useMemo(
    () => new Set(sessions.map((session) => session.participant.id)).size,
    [sessions],
  );

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

  const openParticipantDetail = (participantId: string) => {
    reviewScrollRef.current = window.scrollY;
    setDetailParticipantId(participantId);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0 }));
  };

  const closeParticipantDetail = () => {
    const participantId = detailParticipantId;
    setDetailParticipantId(null);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: reviewScrollRef.current });
      participantButtonRefs.current.get(participantId ?? "")?.focus({
        preventScroll: true,
      });
    });
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
    changeTab(nextTab);
    (nextTab === "review" ? reviewTabRef : analysisTabRef).current?.focus();
  };

  const readImport = async (file: File | undefined) => {
    if (!file) return;
    setImportError("");
    setImportPreview(null);
    setImportEvidenceWarning("");
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
        throw new Error("Practice and official judge results cannot be mixed.");
      }
      if (
        payload.session.competitionId != null &&
        payload.session.competitionId !== payload.competition.id
      ) {
        throw new Error("That result contains conflicting competition identity.");
      }
      if (
        payload.session.isSample !== undefined &&
        payload.session.isSample !== payload.competition.isSample
      ) {
        throw new Error("That result contains conflicting practice identity.");
      }
      const packageVersionId = payload.competition.versionId ??
        payload.session.competitionVersionId ?? null;
      const sessionVersionId = payload.session.competitionVersionId ?? null;
      const liveVersionId = state.competition.liveSnapshot?.versionId ?? null;
      if (
        payload.competition.versionId != null &&
        sessionVersionId != null &&
        payload.competition.versionId !== sessionVersionId
      ) {
        throw new Error("That result contains conflicting competition-version evidence.");
      }
      if (
        packageVersionId != null &&
        liveVersionId != null &&
        packageVersionId !== liveVersionId
      ) {
        throw new Error("That result belongs to a different frozen competition version.");
      }
      if (!state.roster.length) {
        throw new Error("Upload this competition's participant list before importing judge results.");
      }
      const rosterParticipant = state.roster.find(
        (entry) => entry.id === payload.session.participant.id,
      );
      if (!rosterParticipant) {
        throw new Error("That participant is not in this competition's participant list.");
      }
      const incomingParticipant = payload.session.participant;
      if (
        rosterParticipant.number !== incomingParticipant.number ||
        rosterParticipant.name !== incomingParticipant.name ||
        rosterParticipant.ageGroup !== incomingParticipant.ageGroup ||
        rosterParticipant.category !== incomingParticipant.category ||
        rosterParticipant.muqarrar !== incomingParticipant.muqarrar ||
        rosterParticipant.phone !== incomingParticipant.phone ||
        rosterParticipant.institution !== incomingParticipant.institution
      ) {
        throw new Error("That result's participant details do not match the current roster.");
      }
      const importQuestionContext = {
        competitionId: payload.session.competitionId ?? payload.competition.id,
        competitionVersionId: packageVersionId ?? undefined,
      };
      const questionInspection = inspectImportedSessionQuestion(
        payload.session,
        importQuestionContext,
      );
      if (!questionInspection.ok) {
        throw new Error(
           questionInspection.reason === "invalid-events"
             ? "That result contains invalid judging history."
             : questionInspection.reason === "question-conflict"
               ? "That result contains conflicting recorded-question evidence."
               : questionInspection.reason === "version-missing"
                 ? "That result's exact Quran evidence is missing its frozen competition version."
               : "That result contains invalid recorded-question evidence.",
        );
      }
      const normalizedQuestion = questionInspection.question;
      if (
        normalizedQuestion &&
        normalizedQuestion.participantId !== incomingParticipant.id
      ) {
        throw new Error("That result's recorded question belongs to another participant.");
      }
      const rosterDivision = participantDivision(
        rosterParticipant,
        state.competition.liveSnapshot?.divisions ?? state.competition.divisions,
      );
      if (
        normalizedQuestion &&
        (normalizedQuestion.divisionId !== rosterDivision?.id ||
          normalizedQuestion.muqarrar !== rosterParticipant.muqarrar)
      ) {
        throw new Error("That result's recorded question does not match the participant's division and muqarrar.");
      }
      if (normalizedQuestion?.version === 2 && normalizedQuestion.range) {
        const questionIndex = await loadQuestionIndex();
        if (!recitationRangeMatchesQuestionIndex(questionIndex, normalizedQuestion.range)) {
          throw new Error("That result's recorded Quran range does not match the active question index.");
        }
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
      if (normalizedQuestion) {
        const incomingEvidenceKey = questionEvidenceExactKey(
          importQuestionContext,
          normalizedQuestion,
        );
        const existingEvidenceKeys = state.history.flatMap((session) => {
          if (
            session.participant.id !== incomingParticipant.id ||
            !session.question
          ) {
            return [];
          }
          const key = questionEvidenceExactKey(session, session.question);
          return key ? [key] : [];
        });
        if (
          incomingEvidenceKey &&
          existingEvidenceKeys.some((key) => key !== incomingEvidenceKey)
        ) {
          setImportEvidenceWarning(
            "This source records a different question or Mushaf version. Add it for review; Tahqeeq will not choose one primary recitation area automatically.",
          );
        }
      }
      const canonicalParticipant = {
        id: rosterParticipant.id,
        number: rosterParticipant.number,
        name: rosterParticipant.name,
        ageGroup: rosterParticipant.ageGroup,
        category: rosterParticipant.category,
        muqarrar: rosterParticipant.muqarrar,
        phone: rosterParticipant.phone,
        institution: rosterParticipant.institution,
      };
      let normalizedSession: SavedSession;
      try {
        normalizedSession = normalizeImportedSavedSession({
          ...payload.session,
          competitionId: payload.competition.id,
          competitionVersionId: packageVersionId ?? undefined,
          isSample: payload.competition.isSample,
          participant: canonicalParticipant,
          ...(normalizedQuestion ? { question: normalizedQuestion } : {}),
        });
      } catch {
        throw new Error("That result contains invalid or inconsistent judging history.");
      }
      setImportPreview({
        ...payload,
        session: normalizedSession,
      });
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
      {sectionOptions.length > 1 && (
        <label className="records-filter">
          <span>Criteria judged</span>
          <select value={section} onChange={(event) => setSection(event.target.value)}>
            <option value="">All criteria sets</option>
            {sectionOptions.map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </label>
      )}
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
          <option value="mushaf-reading">Balaigen</option>
          <option value="memorisation">Nubalaa</option>
        </select>
      </label>
    </div>
  );

  const renderJudgeResults = () => {
    const currentScopeIsSample = state.competition.isSample;
    const storedOfficial = state.history.some((session) => !session.isSample);
    const storedSample = state.history.some((session) => session.isSample);
    const exportJudgeRecords = async (
      history: SavedSession[],
      scope: "official" | "sample" | "all",
      currentCompetition = false,
      allStored = false,
    ) => {
      if (!history.length || recordsExporting) return;
      setRecordsExportError("");
      setRecordsExporting(true);
      try {
        await downloadJudgeRecordsWorkbook(history, scope, {
          competition: currentCompetition ? state.competition : undefined,
          allStored,
        });
      } catch (error) {
        setRecordsExportError(
          error instanceof Error
            ? error.message
            : "The judge-record workbook could not be verified.",
        );
      } finally {
        setRecordsExporting(false);
      }
    };
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
                disabled={!historyInScope.length || recordsExporting}
                onClick={() => void exportJudgeRecords(
                    historyInScope,
                    currentScopeIsSample ? "sample" : "official",
                    true,
                  )}
                title="Export formatted judge records for the current competition"
              >
                <Icon name="download" size={15} />
                {recordsExporting
                  ? "Checking…"
                  : currentScopeIsSample
                    ? "Practice judge records (.xlsx)"
                    : "Judge records (.xlsx)"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={!storedOfficial || recordsExporting}
                  onClick={() => void exportJudgeRecords(state.history, "official", false, true)}
                >
                  <Icon name="download" size={15} /> All stored official (.xlsx)
                </button>
                {storedSample && (
                  <button
                    type="button"
                    className="btn-ghost"
                    disabled={recordsExporting}
                    onClick={() => void exportJudgeRecords(state.history, "sample", false, true)}
                  >
                    <Icon name="download" size={15} /> All stored practice (.xlsx)
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        {renderHistoryFilters()}
        {importError && <p className="import-error">{importError}</p>}
        {recordsExportError && <p className="import-error">{recordsExportError}</p>}
        {importPreview && (
          <div className="result-import-preview" role="status">
            <span>
              <strong>{importPreview.session.participant.name}</strong>
              <small>
                <bdi>{importPreview.session.participant.number}</bdi> · {importPreview.session.assignment
                  ? categoryListLabel(importPreview.session.assignment.categories)
                  : "Judge section"}
              </small>
              {importEvidenceWarning && <small>{importEvidenceWarning}</small>}
            </span>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setImportPreview(null);
                setImportEvidenceWarning("");
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                dispatch({ type: "IMPORT_SESSION", session: importPreview.session });
                setImportPreview(null);
                setImportEvidenceWarning("");
              }}
            >
              {importEvidenceWarning ? "Add for review" : "Add to records"}
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
                        {historyScope === "all" && saved.isSample && <SampleBadge compact />}
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
                  </div>
                  {isOpen && (
                    <div className="session-drill">
                      <div className="session-assignment">
                        <strong>{saved.assignment ? judgeDisplayName(saved.assignment) : "Judge 1"}</strong>
                        <span>{categoryListLabel(saved.assignment?.categories ?? CATEGORY_ORDER)}</span>
                        <small>Saved result · <bdi>{saved.total}/{saved.totalMax}</bdi></small>
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
                          disabled={state.sessionActive || (overviewEnabled && saved.assignment?.judgeSeatId !== state.deviceJudgeId)}
                          title={
                            state.sessionActive
                              ? "Finish the current reciter before reopening another result"
                              : overviewEnabled && saved.assignment?.judgeSeatId !== state.deviceJudgeId
                                ? "Only this result's judge can make corrections"
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
    <div className={`records results-workspace${overviewEnabled && activeTab === "review" ? " results-overview-shell" : ""}`}>
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
          onClick={() => changeTab("review")}
          onKeyDown={(event) => handleTabKeyDown(event, "review")}
        >
          Review
          {!overviewEnabled && reviewSummary.unresolved > 0 && (
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
          onClick={() => changeTab("analysis")}
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
        {overviewEnabled ? <>
          <ResultsOverview key={`${state.competition.id}:${state.competition.liveSnapshot?.versionId ?? "draft"}`} active={activeTab === "review"} />
          <details className="ro-source-tools"><summary>Judge records &amp; import</summary>{renderJudgeResults()}</details>
        </> : <>
        <section
          className={`results-review-section ${detailParticipantId ? "is-detail-open" : ""}`}
          aria-labelledby={detailParticipantId ? undefined : "results-review-heading"}
          aria-label={detailParticipantId ? "Participant result detail" : undefined}
        >
          {!detailParticipantId && <>
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
          <div className="results-ledger-controls">
            <div className="results-status-filters" role="group" aria-label="Filter participant results by status">
              <button
                type="button"
                className="results-status-filter is-total"
                aria-pressed={reviewState === "all"}
                onClick={() => setReviewFilter(() => setReviewState("all"))}
              >
                <span>All candidates</span>
                <strong>{reviewSummary.total}</strong>
              </button>
              <button
                type="button"
                className="results-status-filter is-needs-review"
                aria-pressed={reviewState === "needs-review"}
                onClick={() => setReviewFilter(() => setReviewState("needs-review"))}
              >
                <span>Needs review</span>
                <strong>{reviewSummary.needsReview}</strong>
              </button>
              <button
                type="button"
                className="results-status-filter is-ready"
                aria-pressed={reviewState === "ready"}
                onClick={() => setReviewFilter(() => setReviewState("ready"))}
              >
                <span>Ready</span>
                <strong>{reviewSummary.ready}</strong>
              </button>
              <button
                type="button"
                className="results-status-filter is-finalized"
                aria-pressed={reviewState === "finalized"}
                onClick={() => setReviewFilter(() => setReviewState("finalized"))}
              >
                <span>Finalized</span>
                <strong>{reviewSummary.finalized}</strong>
              </button>
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
                      <option value="mushaf-reading">Balaigen</option>
                      <option value="memorisation">Nubalaa</option>
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
          </div>
          </>}

          <FinalResultsPanel
            allItems={reviewItems}
            visibleItems={reviewPageData.items}
            filteredEmpty={reviewItems.length > 0 && filteredReviewItems.length === 0}
            detailParticipantId={detailParticipantId}
            onOpenParticipant={openParticipantDetail}
            onCloseParticipant={closeParticipantDetail}
            registerParticipantButton={(participantId, node) => {
              if (node) participantButtonRefs.current.set(participantId, node);
              else participantButtonRefs.current.delete(participantId);
            }}
            onClearFilters={clearReviewFilters}
          />

          {!detailParticipantId && reviewPageData.pageCount > 1 && (
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

        {!detailParticipantId && renderJudgeResults()}
        </>}
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
            <h2 className="results-section-title">Mistake overview</h2>
            <p>
              {stats.totalMistakes} mark{stats.totalMistakes === 1 ? "" : "s"}
              {" · "}{analysisLocations.length} location{analysisLocations.length === 1 ? "" : "s"}
              {" · "}{analysisReciterCount} reciter{analysisReciterCount === 1 ? "" : "s"}
            </p>
          </div>
          <details className="results-analysis-filter-disclosure">
            <summary>
              <span>Analysis filters</span>
              <small>{historyScope === "current" ? "Current competition" : "All stored competitions"}</small>
            </summary>
            {renderHistoryFilters()}
          </details>
        </div>
        <p className="results-analysis-scope-note">
          Descriptive evidence from <strong>{sessions.length}</strong> stored judge result{sessions.length === 1 ? "" : "s"}; this is not a normalized participant comparison.
        </p>

        <div className="analysis-ledger">
          <section className="analysis-ledger-list" aria-labelledby="analysis-ledger-heading">
            <div className="analysis-ledger-head">
              <h3 id="analysis-ledger-heading" className="results-panel-title">Marked locations</h3>
              <span>Sorted by marks, then reciters</span>
            </div>
            {analysisLocations.length === 0 ? (
              <p className="empty">No pinpointed mistakes have been recorded in this view.</p>
            ) : (
              <div className="analysis-location-table" aria-label="Marked Quran locations">
                <div className="analysis-location-columns" aria-hidden="true">
                  <span>Word</span>
                  <span>Location</span>
                  <span>Marks</span>
                  <span>Reciters</span>
                </div>
                <ol>
                  {analysisLocations.map((location) => (
                    <li key={location.tid}>
                      <button
                        type="button"
                        className="analysis-location-row"
                        aria-pressed={selectedAnalysisLocation?.tid === location.tid}
                        aria-label={`${location.word}, ${location.label}, ${location.marks} marks across ${location.reciterCount} reciters`}
                        onClick={() => setSelectedAnalysisTid(location.tid)}
                      >
                        <span className="analysis-location-word" dir="rtl">{location.word}</span>
                        <span className="analysis-location-label">{location.label}</span>
                        <strong>{location.marks}</strong>
                        <strong>{location.reciterCount}</strong>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>

          <aside className="analysis-evidence-panel" aria-live="polite">
            {selectedAnalysisLocation ? (
              <>
                <div className="analysis-evidence-head">
                  <div>
                    <span>Selected location</span>
                    <p>
                      Surah <bdi>{selectedAnalysisLocation.surah}</bdi>
                      {selectedAnalysisLocation.ayah === null
                        ? " · Basmala"
                        : <> · Ayah <bdi>{selectedAnalysisLocation.ayah}</bdi></>}
                      {selectedAnalysisLocation.page && <> · Page <bdi>{selectedAnalysisLocation.page}</bdi></>}
                    </p>
                  </div>
                  <span className="analysis-evidence-total">
                    <strong>{selectedAnalysisLocation.marks}</strong>
                    <small>{selectedAnalysisLocation.marks === 1 ? "mark" : "marks"}</small>
                  </span>
                </div>
                <div className="analysis-evidence-word" dir="rtl">{selectedAnalysisLocation.word}</div>
                <p className="analysis-evidence-location">{selectedAnalysisLocation.label}</p>
                <div className="analysis-evidence-list-head">
                  <h4>Recorded marks</h4>
                  <span>{selectedAnalysisLocation.reciterCount} reciter{selectedAnalysisLocation.reciterCount === 1 ? "" : "s"}</span>
                </div>
                <ul className="analysis-evidence-list">
                  {selectedAnalysisLocation.entries.map((entry) => (
                    <li key={entry.id} className={`cat-${entry.category}`}>
                      <bdi className="analysis-evidence-number">
                        {participantNumberLabel(
                          entry.isSample && /^T\d+$/i.test(entry.participantNumber.trim())
                            ? entry.participantNumber.trim().slice(1)
                            : entry.participantNumber,
                        )}
                      </bdi>
                      <span className="analysis-evidence-person">
                        <strong>{entry.participantName}</strong>
                        <small>{entry.judgeName}</small>
                      </span>
                      <span className="analysis-evidence-category">
                        <i aria-hidden="true" />
                        {CATEGORY_BY_ID[entry.category].label}
                      </span>
                      <strong className="analysis-evidence-deduction">−{entry.amount}</strong>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="empty">Select a marked location to see its evidence.</p>
            )}
          </aside>
        </div>
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
