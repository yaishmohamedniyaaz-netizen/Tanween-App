import type { CompetitionDivision, PreparedRecitation } from "../types";
import type { RecitationRecorderStatus } from "../hooks/useRecitationRecorder";
import { questionStartPage } from "../lib/reciterQuestions.ts";
import { ParticipantIdentity } from "./ParticipantIdentity";
import './PreparedRecordingRecovery.css';

function questionSummary(prepared: PreparedRecitation): string {
  const { question } = prepared;
  const startPage = questionStartPage(question);
  const choice =
    question.kind === "manual"
      ? "External question"
      : question.drawPosition
        ? `Number ${question.drawPosition}`
        : "Question";
  return startPage ? `${choice} · page ${startPage}` : choice;
}

function compactQuestionSummary(prepared: PreparedRecitation): string {
  const { question } = prepared;
  const startPage = questionStartPage(question);
  const choice =
    question.kind === "manual"
      ? "External"
      : question.drawPosition
        ? `Q ${question.drawPosition}`
        : "Question";
  return startPage ? `${choice} · p. ${startPage}` : choice;
}

export function PreparedSidebar({
  prepared,
  participantCount,
  division,
  onReady,
  onChangeQuestion,
  onChangeReciter,
  recording,
}: {
  prepared: PreparedRecitation;
  participantCount: number;
  division?: CompetitionDivision;
  onReady: () => void | Promise<void>;
  onChangeQuestion: () => void;
  onChangeReciter: () => void;
  recording?: {
    supported: boolean;
    enabled: boolean;
    status: RecitationRecorderStatus;
    error: string | null;
    onCancel: () => void;
    onEnabledChange: (enabled: boolean) => void;
    onBeginWithoutRecording: () => void;
  };
}) {
  const requestingMicrophone = recording?.status === "requesting" ||
    recording?.status === "armed";
  const retryingMicrophone = recording?.enabled && recording.status === "error";
  const canSkipRecording = recording?.enabled && (retryingMicrophone || requestingMicrophone);

  return (
    <section
      className="prepared-sidebar"
      aria-label="Ready to begin judging"
      data-recording-error={recording?.error ? "true" : undefined}
      data-recording-waiting={requestingMicrophone ? 'true' : undefined}
    >
      <div className="prepared-sidebar-details">
        <ParticipantIdentity
          participant={prepared.participant}
          participantCount={participantCount}
          division={division}
          density="lead"
          className="prepared-sidebar-participant"
        />
        <div className="prepared-sidebar-question">
          <span>Suvaalu</span>
          <strong className="prepared-sidebar-question-summary-full">
            {questionSummary(prepared)}
          </strong>
          <strong className="prepared-sidebar-question-summary-mobile">
            {compactQuestionSummary(prepared)}
          </strong>
        </div>
        {recording && (
          <div className="prepared-recording" data-enabled={recording.enabled || undefined}>
            <label className="prepared-recording-choice">
              <input
                type="checkbox"
                checked={recording.enabled}
                disabled={!recording.supported || requestingMicrophone}
                aria-label="Record this practice recitation"
                aria-describedby="prepared-recording-note"
                onChange={(event) => recording.onEnabledChange(event.target.checked)}
              />
              <span aria-hidden="true" className="prepared-recording-check" />
              <span>
                <strong>
                  <span className="prepared-recording-label-full">
                    Record this practice recitation
                  </span>
                  <span className="prepared-recording-label-compact" aria-hidden="true">
                    Record
                  </span>
                </strong>
                <small id="prepared-recording-note">
                  Saved only on this device for later replay.
                </small>
              </span>
            </label>
            {!recording.supported && (
              <p className="prepared-recording-message">
                This browser cannot make a local recording. Judging still works normally.
              </p>
            )}
            {recording.error && (
              <p className="prepared-recording-message is-error" role="alert">
                Recording couldn’t start.
              </p>
            )}
          </div>
        )}
      </div>
      <div className="prepared-sidebar-actions">
        <button
          type="button"
          className="btn-primary"
          disabled={requestingMicrophone}
          onClick={() => void onReady()}
        >
          {requestingMicrophone
            ? 'Starting microphone…'
            : retryingMicrophone
              ? "Try again"
              : "Begin judging"}
        </button>
        {canSkipRecording && (
          <button
            type="button"
            className="btn-ghost prepared-begin-without-recording"
            onClick={recording.onBeginWithoutRecording}
          >
            Begin without recording
          </button>
        )}
        <div className="prepared-sidebar-secondary">
          {canSkipRecording ? <>
            {requestingMicrophone && <button type="button" className="btn-ghost" onClick={recording.onCancel}>Cancel</button>}
          </> : <>
          <button
            type="button"
            className="btn-ghost"
            onClick={onChangeQuestion}
          >
            Change question
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={onChangeReciter}
          >
            Change reciter
          </button>
          </>}
        </div>
      </div>
    </section>
  );
}
