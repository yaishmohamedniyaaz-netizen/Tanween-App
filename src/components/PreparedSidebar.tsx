import type { CompetitionDivision, PreparedRecitation } from "../types";
import type { RecitationRecorderStatus } from "../hooks/useRecitationRecorder";
import { questionStartPage } from "../lib/reciterQuestions.ts";
import { ParticipantIdentity } from "./ParticipantIdentity";

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
    onEnabledChange: (enabled: boolean) => void;
    onBeginWithoutRecording: () => void;
  };
}) {
  const requestingMicrophone = recording?.status === "requesting" ||
    recording?.status === "armed";
  const retryingMicrophone = recording?.enabled && recording.status === "error";

  return (
    <section className="prepared-sidebar" aria-label="Ready to begin judging">
      <ParticipantIdentity
        participant={prepared.participant}
        participantCount={participantCount}
        division={division}
        density="lead"
        className="prepared-sidebar-participant"
      />
      <div className="prepared-sidebar-question">
        <span>Suvaalu</span>
        <strong>{questionSummary(prepared)}</strong>
      </div>
      {recording && (
        <div className="prepared-recording" data-enabled={recording.enabled || undefined}>
          <label className="prepared-recording-choice">
            <input
              type="checkbox"
              checked={recording.enabled}
              disabled={!recording.supported || requestingMicrophone}
              aria-describedby="prepared-recording-note"
              onChange={(event) => recording.onEnabledChange(event.target.checked)}
            />
            <span aria-hidden="true" className="prepared-recording-check" />
            <span>
              <strong>Record this practice recitation</strong>
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
              {recording.error}
            </p>
          )}
        </div>
      )}
      <button
        type="button"
        className="btn-primary"
        disabled={requestingMicrophone}
        onClick={() => void onReady()}
      >
        {requestingMicrophone
          ? "Waiting for microphone…"
          : retryingMicrophone
            ? "Try microphone and begin"
            : "Begin judging"}
      </button>
      {retryingMicrophone && (
        <button
          type="button"
          className="btn-ghost prepared-begin-without-recording"
          onClick={recording.onBeginWithoutRecording}
        >
          Begin without recording
        </button>
      )}
      <div className="prepared-sidebar-secondary">
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
      </div>
    </section>
  );
}
