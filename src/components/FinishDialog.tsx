import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { CATEGORY_BY_ID, isImpressionCategory } from "../config";
import {
  computeScores,
  impressionScore,
  missingRequiredImpressionCategories,
} from "../lib/scoring";
import { useJudging } from "../state/store";
import { judgeDisplayName } from "../lib/judgeAssignments";
import type { AduRaaguInputMode } from "../lib/devicePreferences";
import type { CategoryId } from "../types";
import { MarkPicker, type MarkPickerHandle } from "./MarkPicker";

function FinishImpressionRow({
  category,
  label,
  awarded,
  max,
  step,
  marked,
  deducted,
  pending,
  invalid,
  inputMode,
  onChange,
  registerPicker,
  registerRow,
}: {
  category: CategoryId;
  label: string;
  awarded: number;
  max: number;
  step: number;
  marked: boolean;
  deducted: string;
  pending: boolean;
  invalid: boolean;
  inputMode: AduRaaguInputMode;
  onChange: (value: number) => void;
  registerPicker: (picker: MarkPickerHandle | null) => void;
  registerRow: (row: HTMLDivElement | null) => void;
}) {
  const errorId = `finish-${category}-error`;

  return (
    <div
      ref={registerRow}
      className={`finish-score-row cat-${category} ${
        pending ? "is-pending" : ""
      } ${invalid ? "is-invalid" : ""}`}
      role="row"
    >
      <div className="finish-criterion" role="cell">
        <span className="finish-criterion-dot" aria-hidden="true" />
        <span>
          <strong>{label}</strong>
          {pending && <small>{invalid ? "Mark required" : "Not entered"}</small>}
        </span>
      </div>
      <span className="finish-deducted t-num" role="cell">
        {deducted}
      </span>
      <div className="finish-score-value" role="cell">
        <MarkPicker
          ref={registerPicker}
          value={awarded}
          max={max}
          step={step}
          marked={marked}
          label={label}
          category={category}
          mode={inputMode}
          onChange={onChange}
          layer="dialog"
          invalid={invalid}
          describedBy={invalid ? errorId : undefined}
          dismissOnOutsidePress={!invalid}
        />
      </div>
      {invalid && (
        <p className="finish-mark-error" id={errorId} role="alert">
          Choose an Adu / Raagu mark to save.
        </p>
      )}
    </div>
  );
}

export function FinishDialog({
  onCancel,
  onConfirm,
  hasNextReciter,
  inputMode,
  recordingSummary,
  handoff,
}: {
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  hasNextReciter: boolean;
  inputMode: AduRaaguInputMode;
  recordingSummary?: string;
  handoff?: ReactNode;
}) {
  const { state, dispatch } = useJudging();
  const [saveAttemptCount, setSaveAttemptCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const savingRef = useRef(false);
  const savingRecordingSummaryRef = useRef<string | undefined>(undefined);
  const saveAttempted = saveAttemptCount > 0;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pickerRefs = useRef<Partial<Record<CategoryId, MarkPickerHandle | null>>>({});
  const rowRefs = useRef<Partial<Record<CategoryId, HTMLDivElement | null>>>({});
  const { byCategory, total, totalMax } = computeScores(state);
  const assignment = state.activeAssignment;
  const config = assignment?.config ?? state.config;
  const reviewCategories = assignment?.categories ?? [];
  const impressionCategories = (assignment?.categories ?? []).filter(
    (category) => isImpressionCategory(category) && config[category].enabled,
  );
  const missing = assignment
    ? missingRequiredImpressionCategories(
        assignment.config,
        state.impressions,
        assignment.categories,
      )
    : [];
  const firstMissing = missing[0];
  const remarks = [
    { label: "Notes", text: state.notes },
    ...impressionCategories.map((category) => ({
      label: `${CATEGORY_BY_ID[category].label} reason`,
      text: impressionScore(
        config,
        state.impressions,
        category,
        "entry-zero",
      ).note,
    })),
  ].filter((remark) => remark.text.trim().length > 0);
  const participantName = state.participant.name || "This reciter";
  const mistakeLabel = `${state.mistakes.length} mistake${
    state.mistakes.length === 1 ? "" : "s"
  }`;

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    headingRef.current?.focus({ preventScroll: true });
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    if (saveAttemptCount === 0 || !firstMissing) return;
    let scrollFrame = 0;
    const focusFrame = requestAnimationFrame(() => {
      pickerRefs.current[firstMissing]?.focusAndOpen();
      scrollFrame = requestAnimationFrame(() => {
        const body = bodyRef.current;
        const row = rowRefs.current[firstMissing];
        if (!body || !row) return;
        const bodyRect = body.getBoundingClientRect();
        const rowRect = row.getBoundingClientRect();
        if (rowRect.top < bodyRect.top || rowRect.bottom > bodyRect.bottom) {
          body.scrollTop = Math.max(0, body.scrollTop + rowRect.top - bodyRect.top);
        }
      });
    });
    return () => {
      cancelAnimationFrame(focusFrame);
      cancelAnimationFrame(scrollFrame);
    };
  }, [firstMissing, saveAttemptCount]);

  useLayoutEffect(() => {
    if (bodyRef.current) bodyRef.current.inert = saving;
    if (handoff) {
      dialogRef.current?.querySelector<HTMLElement>("#reciter-start-title")?.focus({ preventScroll: true });
    }
  }, [saving, Boolean(handoff)]);

  const closeDialog = () => {
    if (dialogRef.current?.open) dialogRef.current.close();
  };

  const cancel = () => {
    if (savingRef.current) return;
    closeDialog();
    onCancel();
  };

  const confirm = async () => {
    if (savingRef.current) return;
    if (missing.length > 0) {
      setSaveAttemptCount((attempts) => attempts + 1);
      return;
    }
    savingRef.current = true;
    savingRecordingSummaryRef.current = recordingSummary;
    setSaving(true);
    setSaveError("");
    try {
      await onConfirm();
    } catch {
      setSaveError("Could not save. Your marks are still here. Please try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const containFocus = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== "Tab") return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.getClientRects().length > 0 && !element.closest("[inert]"));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (!first || !last) {
      event.preventDefault();
      return;
    }

    if (event.shiftKey && (active === first || active === headingRef.current || active?.id === "reciter-start-title")) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className={`dialog finish-dialog ${handoff ? "is-queue-handoff" : ""}`}
      aria-labelledby={handoff ? "reciter-start-title" : "finish-title"}
      aria-busy={saving || undefined}
      onKeyDown={containFocus}
      onCancel={(event) => {
        event.preventDefault();
        cancel();
      }}
    >
      {handoff ?? <>
      <header className="finish-dialog-head">
        <div className="finish-heading-copy">
          <h2 className="dialog-title" id="finish-title" ref={headingRef} tabIndex={-1}>
            Review and save
          </h2>
          <p className="finish-participant">{participantName}</p>
          <div className="finish-context" aria-label="Recitation context">
            {state.activeQuestion && <span>Q · {state.activeQuestion.label}</span>}
            {assignment && <span>{judgeDisplayName(assignment)}</span>}
            <span>{mistakeLabel}</span>
            {(saving ? savingRecordingSummaryRef.current : recordingSummary) && (
              <span>{saving ? savingRecordingSummaryRef.current : recordingSummary}</span>
            )}
          </div>
        </div>
        <div className="finish-total" aria-label={`Score ${total} out of ${totalMax}`}>
          <span className="finish-total-value" aria-live="polite" aria-atomic="true">
            <strong className="t-num">{total}</strong>
            <span className="t-num">/ {totalMax}</span>
          </span>
          <small>Score</small>
        </div>
      </header>

      <div className="finish-dialog-body" ref={bodyRef}>
        <div className="finish-score-table" role="table" aria-label="Score by criterion">
          <div className="finish-score-head" role="row">
            <span role="columnheader">Criterion</span>
            <span role="columnheader">Deducted</span>
            <span role="columnheader">Score</span>
          </div>
          {reviewCategories.map((category) => {
            const definition = CATEGORY_BY_ID[category];
            const score = byCategory[category];
            const isImpression = isImpressionCategory(category);
            const isMissing = missing.includes(category);
            const isInvalid = saveAttempted && isMissing;
            const impression = isImpression
              ? impressionScore(
                  config,
                  state.impressions,
                  category,
                  "entry-zero",
                )
              : null;
            const deducted = isMissing || score.deducted === 0
              ? "—"
              : `−${score.deducted}`;

            if (isImpression && impression) {
              return (
                <FinishImpressionRow
                  key={category}
                  category={category}
                  label={definition.label}
                  awarded={impression.awarded}
                  max={score.start}
                  step={config[category].step}
                  marked={impression.marked}
                  deducted={deducted}
                  pending={isMissing}
                  invalid={isInvalid}
                  inputMode={inputMode}
                  registerPicker={(picker) => {
                    pickerRefs.current[category] = picker;
                  }}
                  registerRow={(row) => {
                    rowRefs.current[category] = row;
                  }}
                  onChange={(value) => {
                    dispatch({
                      type: "SET_IMPRESSION",
                      category,
                      awarded: value,
                    });
                    setSaveAttemptCount(0);
                  }}
                />
              );
            }

            return (
              <div key={category} className={`finish-score-row cat-${category}`} role="row">
                <div className="finish-criterion" role="cell">
                  <span className="finish-criterion-dot" aria-hidden="true" />
                  <span>
                    <strong>{definition.label}</strong>
                  </span>
                </div>
                <span className="finish-deducted t-num" role="cell">
                  {deducted}
                </span>
                <div className="finish-score-value" role="cell">
                  <span className="score-value-layout t-num">
                    <span className="score-value-number">{score.score}</span>
                    <span className="sc-of">/ {score.start}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {remarks.length > 0 && (
          <section className="finish-remarks" aria-labelledby="finish-remarks-title">
            <h3 id="finish-remarks-title">Remarks</h3>
            <dl>
              {remarks.map((remark) => (
                <div key={remark.label}>
                  <dt>{remark.label}</dt>
                  <dd>{remark.text}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        {saveError && <p className="finish-save-error" role="alert">{saveError}</p>}
      </div>

      <div className="dialog-actions finish-dialog-actions">
        <button type="button" className="btn-ghost" disabled={saving} onClick={cancel}>
          Keep judging
        </button>
        <button type="button" className="btn-primary" disabled={saving} onClick={() => void confirm()}>
          <span className="finish-save-label">{hasNextReciter ? "Save and select next reciter" : "Save recitation"}</span>
          {saving && <span className="finish-saving-status" role="status">Saving…</span>}
        </button>
      </div>
      </>}
    </dialog>
  );
}
