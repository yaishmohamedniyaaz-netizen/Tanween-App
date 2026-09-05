import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CATEGORY_BY_ID } from "../config.ts";
import {
  buildParticipantResultPreview,
  hasCompleteFinalizationIdentity,
  type PlacedResult,
} from "../lib/finalResults.ts";
import { mistakePrimaryGlyph } from "../lib/mistakeDisplay.ts";
import {
  muqarrarLabel,
  participantCategoryLabel,
} from "../lib/participants.ts";
import { participantNumberLabel } from "../lib/participantPresentation.ts";
import {
  buildParticipantQuestionEvidence,
  type EvidenceMistake,
  type ParticipantQuestionEvidence,
  type QuestionEvidenceStatus,
} from "../lib/questionEvidence.ts";
import type {
  ResultsReviewItem,
  ResultsReviewReason,
} from "../lib/resultsReview.ts";
import { computeCategoryScores } from "../lib/scoring.ts";
import type {
  CategoryId,
  SavedSession,
} from "../types.ts";
import { Icon } from "./Icon.tsx";
import { RecitationEvidenceSpan } from "./RecitationEvidenceSpan.tsx";
import { SessionRecordingPlayer } from "./SessionRecordingPlayer.tsx";
import type { ReplayWord } from "../lib/recitationReplay.ts";

const identityLabels = {
  number: "number",
  name: "name",
  ageGroup: "Age group",
  category: "Participant category",
  muqarrar: "Muqarrar start",
};

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

function stateLabel(item: ResultsReviewItem): string {
  if (item.state === "finalized") return "Finalized";
  if (item.state === "ready") return "Ready to finalize";
  return "Needs review";
}

function resultParticipantNumber(value: string, isSample: boolean): string {
  const sampleNumber = isSample && /^T\d+$/i.test(value.trim())
    ? value.trim().slice(1)
    : value;
  return participantNumberLabel(sampleNumber);
}

function unavailableEvidenceCopy(status: QuestionEvidenceStatus): {
  title: string;
  body: string;
} {
  if (status === "source-missing") {
    return {
      title: "Choose the judge sources first",
      body: "A single recorded Quran span can only be shown after every required category has a selected source.",
    };
  }
  if (status === "source-conflict") {
    return {
      title: "Recorded questions do not match",
      body: "The selected judge results point to different questions. Choose matching sources before relying on one primary recitation area.",
    };
  }
  if (status === "version-mismatch") {
    return {
      title: "Mushaf sources do not match",
      body: "The selected judge results were recorded against different Mushaf or question-index versions.",
    };
  }
  if (status === "manual-missing") {
    return {
      title: "External question has no saved range",
      body: "This recitation used a manually supplied question, so Tahqeeq cannot claim an exact Quran cutout.",
    };
  }
  return {
    title: "Exact range was not recorded",
    body: "This older result remains readable, but it predates exact recitation-span evidence.",
  };
}

function EvidenceMistakeRow({
  entry,
  range,
  evidenceStatus,
  locatableWordIds,
  active,
  onActivate,
  rowRef,
}: {
  entry: EvidenceMistake;
  range: ParticipantQuestionEvidence["range"];
  evidenceStatus: QuestionEvidenceStatus;
  locatableWordIds: Set<string> | null;
  active: boolean;
  onActivate: () => void;
  rowRef: (node: HTMLButtonElement | null) => void;
}) {
  const category = CATEGORY_BY_ID[entry.mistake.category];
  const unplaced = !entry.mistake.wordId ||
    entry.mistake.migrationStatus === "unresolved";
  const outsideRecordedQuestion = Boolean(
    !unplaced &&
    range &&
    evidenceStatus === "ready" &&
    locatableWordIds &&
    !locatableWordIds.has(entry.mistake.wordId!),
  );
  const locatable = Boolean(
    evidenceStatus === "ready" &&
    !unplaced &&
    locatableWordIds?.has(entry.mistake.wordId!),
  );
  return (
    <li className={`result-mistake-item cat-${entry.mistake.category}`}>
      <button
        ref={rowRef}
        type="button"
        className={`result-mistake-row ${active ? "is-active" : ""}`}
        disabled={!locatable}
        aria-pressed={locatable ? active : undefined}
        onClick={locatable ? onActivate : undefined}
      >
        <span className="result-mistake-glyph" dir="rtl">
          {entry.mistake.wordText || mistakePrimaryGlyph(entry.mistake)}
        </span>
        <span className="result-mistake-copy">
          <strong><i aria-hidden="true" />{category.label}</strong>
          <small>
            {entry.mistake.label}
            {unplaced
              ? " · Location unavailable"
              : outsideRecordedQuestion
                ? " · Outside recorded question"
                : ""}
          </small>
          <small>{entry.judgeName} · revision {entry.sessionRevision}</small>
          {entry.mistake.note?.trim() && <em>{entry.mistake.note.trim()}</em>}
        </span>
        <strong className="result-mistake-deduction">
          −<bdi>{entry.mistake.amount}</bdi>
        </strong>
      </button>
    </li>
  );
}

export function ParticipantResultDetail({
  item,
  placed,
  selected,
  isSample,
  onSelectSource,
  onFinalize,
  onBack,
}: {
  item: ResultsReviewItem;
  placed?: PlacedResult;
  selected: Record<CategoryId, string>;
  isSample: boolean;
  onSelectSource: (category: CategoryId, sessionId: string) => void;
  onFinalize: () => void;
  onBack: () => void;
}) {
  const candidate = item.candidate;
  const preview = buildParticipantResultPreview(candidate, selected);
  const evidence = useMemo(
    () => buildParticipantQuestionEvidence(candidate, selected),
    [candidate, selected],
  );
  const [activeMistakeKey, setActiveMistakeKey] = useState<string | null>(null);
  const [focusActiveWord, setFocusActiveWord] = useState(false);
  const [locatableWordIds, setLocatableWordIds] = useState<Set<string> | null>(null);
  const [replayWords, setReplayWords] = useState<ReplayWord[]>([]);
  const [replaySelectedWord, setReplaySelectedWord] = useState<string | null>(null);
  const [replaySourceId, setReplaySourceId] = useState<string | null>(null);
  const [playbackWord, setPlaybackWord] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mistakeRefs = useRef(new Map<string, HTMLButtonElement>());

  const evidenceKey = [
    evidence.status,
    evidence.fingerprint ?? "none",
    ...evidence.selectedSessions.map(
      (session) => `${session.id}:${session.revision ?? 1}`,
    ),
  ].join("|");

  useEffect(() => {
    setActiveMistakeKey(null);
    setFocusActiveWord(false);
    setLocatableWordIds(null);
    setReplayWords([]); setReplaySelectedWord(null); setReplaySourceId(null); setPlaybackWord(null);
  }, [evidenceKey]);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [candidate.participant.id]);

  const recordLocatableWordIds = useCallback((wordIds: Set<string> | null) => {
    setLocatableWordIds(wordIds);
  }, []);

  const activateFromLog = (key: string) => {
    setFocusActiveWord(true);
    setActiveMistakeKey(key);
    const entry = evidence.mistakes.find((mistake) => mistake.key === key);
    if (entry?.mistake.wordId) {
      setReplaySelectedWord(entry.mistake.wordId);
      setReplaySourceId(entry.sessionId);
    }
  };

  const activateFromQuran = (key: string) => {
    setFocusActiveWord(false);
    setActiveMistakeKey(key);
    const entry = evidence.mistakes.find((mistake) => mistake.key === key);
    if (entry?.mistake.wordId) {
      setReplaySelectedWord(entry.mistake.wordId);
      setReplaySourceId(entry.sessionId);
    }
    window.requestAnimationFrame(() => {
      const target = mistakeRefs.current.get(key);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.focus({ preventScroll: true });
    });
  };

  const participant = candidate.participant;
  const participantNumber = resultParticipantNumber(participant.number, isSample);
  const total = placed?.total ?? preview?.total;
  const totalMax = placed?.totalMax ?? preview?.totalMax;
  const unresolved = candidate.categories.some((category) => !selected[category]);
  const participantReady = hasCompleteFinalizationIdentity(participant);
  const question = evidence.question;
  const range = evidence.range;
  const unavailable = unavailableEvidenceCopy(evidence.status);
  const replacementRecords = evidence.selectedSessions.flatMap((session) =>
    (session.question?.replacements ?? []).map((replacement) => ({
      key: `${session.id}:${replacement.id}`,
      replacement,
      judge: sourceJudge(session),
    }))
  );

  return (
    <article className="result-participant-detail" aria-labelledby="result-detail-title">
      <button type="button" className="result-detail-back" onClick={onBack}>
        <Icon name="back" size={15} /> Back to all participants
      </button>

      <header className="result-detail-header">
        <div className="result-detail-identity">
          <span>Participant <bdi>{participantNumber}</bdi></span>
          <h2 id="result-detail-title" ref={headingRef} tabIndex={-1}>
            {participant.name || "Unnamed participant"}
          </h2>
          <p>
            {[
              participant.ageGroup,
              participantCategoryLabel(participant.category),
              muqarrarLabel(participant.muqarrar),
              participant.institution,
            ].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="result-detail-score">
          <span className={`result-ledger-state is-${item.state}`}>
            {stateLabel(item)}
          </span>
          <strong>
            <bdi>{total ?? "—"}</bdi>
            {totalMax !== undefined && <small>/<bdi>{totalMax}</bdi></small>}
          </strong>
          {placed && <small>Place <bdi>{placed.place}</bdi></small>}
        </div>
      </header>

      {item.reasons.length > 0 && (
        <p className="result-detail-reasons">
          {item.reasons.map(reasonText).join(" · ")}
        </p>
      )}

      <section className="result-question-bar" aria-labelledby="result-question-heading">
        <div>
          <span id="result-question-heading">Recorded question</span>
          <strong>{question?.label || "Question evidence needs review"}</strong>
        </div>
        {range && (
          <dl>
            <div>
              <dt>{range.startPage === range.endPage ? "Page" : "Pages"}</dt>
              <dd>
                <bdi>{range.startPage}</bdi>
                {range.startPage !== range.endPage && <>–<bdi>{range.endPage}</bdi></>}
              </dd>
            </div>
            <div>
              <dt>Length</dt>
              <dd><bdi>{range.resolvedLines}</bdi> recitation lines</dd>
            </div>
          </dl>
        )}
      </section>

      <SessionRecordingPlayer
        key={`recording:${evidenceKey}`}
        sources={evidence.selectedSessions.map((session) => ({
          sessionId: session.id,
          label: `${sourceJudge(session)} · revision ${session.revision ?? 1}`,
        }))}
        replay={isSample && evidence.status === "ready" && evidence.fingerprint ? {
          questionFingerprint: evidence.fingerprint,
          words: replayWords,
          selectedWordId: replaySelectedWord,
          requestedSessionId: replaySourceId,
          onWordSelect: setReplaySelectedWord,
          onPlaybackWord: setPlaybackWord,
        } : undefined}
      />

      <div className="result-detail-main">
        <section className="result-quran-evidence" aria-labelledby="result-quran-heading">
          <div className="result-detail-section-head">
            <div>
              <span>Recitation evidence</span>
              <h3 id="result-quran-heading">Recorded Quran span</h3>
            </div>
            {evidence.status === "ready" && (
              <small>Selected judge sources agree</small>
            )}
          </div>
          {evidence.status === "ready" && range ? (
            <RecitationEvidenceSpan
              key={evidenceKey}
              range={range}
              mistakes={evidence.mistakes}
              activeMistakeKey={activeMistakeKey}
              focusActiveWord={focusActiveWord}
              onMistakeSelect={activateFromQuran}
              onWordIdsReady={recordLocatableWordIds}
              onReplayWordsReady={isSample ? setReplayWords : undefined}
              onReplayWordSelect={isSample ? setReplaySelectedWord : undefined}
              replayWordId={isSample ? playbackWord : null}
            />
          ) : (
            <div className="result-evidence-unavailable" role="status">
              <strong>{unavailable.title}</strong>
              <p>{unavailable.body}</p>
            </div>
          )}
        </section>

        <section className="result-mistake-log" aria-labelledby="result-mistakes-heading">
          <div className="result-detail-section-head">
            <div>
              <span>Mistake log</span>
              <h3 id="result-mistakes-heading">
                {evidence.mistakes.length} recorded
              </h3>
            </div>
            <small>Select an in-range row to locate it</small>
          </div>
          {evidence.mistakes.length ? (
            <ol>
              {evidence.mistakes.map((entry) => (
                <EvidenceMistakeRow
                  key={entry.key}
                  entry={entry}
                  range={range}
                  evidenceStatus={evidence.status}
                  locatableWordIds={locatableWordIds}
                  active={entry.key === activeMistakeKey}
                  rowRef={(node) => {
                    if (node) mistakeRefs.current.set(entry.key, node);
                    else mistakeRefs.current.delete(entry.key);
                  }}
                  onActivate={() => activateFromLog(entry.key)}
                />
              ))}
            </ol>
          ) : (
            <p className="result-mistake-empty">No pinpoint mistakes were recorded by the selected sources.</p>
          )}
        </section>
      </div>

      <section className="result-detail-reconciliation" aria-labelledby="result-sources-heading">
        <div className="result-detail-section-head">
          <div>
            <span>Result checks</span>
            <h3 id="result-sources-heading">Judge sources</h3>
          </div>
          <small>Changing a source can change the score and recorded question.</small>
        </div>
        <div className="result-source-list">
          {candidate.categories.map((categoryId) => {
            const category = CATEGORY_BY_ID[categoryId];
            const options = candidate.byCategory[categoryId];
            const value = selected[categoryId];
            const selectedSource = options.find((option) => option.id === value);
            const score = selectedSource
              ? sourceScore(selectedSource, categoryId)
              : null;
            return (
              <div className={`result-source-row cat-${categoryId}`} key={categoryId}>
                <span className="result-source-category">
                  <i aria-hidden="true" />
                  <strong>{category.label}</strong>
                </span>
                {options.length <= 1 ? (
                  <span className="result-source-reading">
                    <small>
                      {options.length
                        ? <>{sourceJudge(options[0])} · revision {options[0].revision ?? 1}</>
                        : "Required source missing"}
                    </small>
                    <strong>
                      {options.length && score
                        ? <><bdi>{score.score}</bdi>/<bdi>{score.start}</bdi></>
                        : "—"}
                    </strong>
                  </span>
                ) : (
                  <label className="result-source-choice">
                    <span>Selected result</span>
                    <select
                      value={value}
                      aria-label={`${category.label} source for ${participant.name}`}
                      onChange={(event) => onSelectSource(categoryId, event.target.value)}
                    >
                      <option value="">Choose judge result</option>
                      {options.map((session) => {
                        const optionScore = sourceScore(session, categoryId);
                        return (
                          <option value={session.id} key={session.id}>
                            {sourceJudge(session)} · revision {session.revision ?? 1} · {optionScore.score}/{optionScore.start}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                )}
              </div>
            );
          })}
        </div>
        <div className="result-detail-finalize">
          <p>
            {item.state === "finalized"
              ? `Current final result · revision ${item.activeFinal?.revision ?? 1}`
              : item.state === "ready"
                ? "All scoring sources are present. Exact recitation evidence is checked separately."
                : "Resolve the scoring-source issue before finalizing."}
          </p>
          <button
            type="button"
            className="btn-primary"
            disabled={unresolved || !participantReady}
            onClick={onFinalize}
          >
            {item.activeFinal ? "Finalize revision" : "Finalize result"}
          </button>
        </div>
      </section>

      {replacementRecords.length > 0 && (
        <details className="result-question-history">
          <summary>
            Pre-Ready replacement records · {replacementRecords.length}
          </summary>
          <ol>
            {replacementRecords.map(({ key, replacement, judge }) => (
              <li key={key}>
                <strong>Replacement recorded before judging</strong>
                <span>
                  {replacement.reason === "reciter-changed" ? "Reciter changed" : "Question changed"}
                  {" · "}{judge}{" · "}{new Date(replacement.replacedAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </article>
  );
}
