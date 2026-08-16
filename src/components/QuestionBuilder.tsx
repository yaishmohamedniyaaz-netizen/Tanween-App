import { useEffect, useMemo, useState } from "react";
import surahIndex from "../data/surah-index.json";
import { uid } from "../lib/id.ts";
import {
  buildSampleQuestionDrafts,
  createQuestionDraft,
  firstAyahForPortion,
  questionDraftIssues,
  rangeIsWithinPortion,
  sampleQuestionCoverageComplete,
} from "../lib/questionDrafts.ts";
import {
  loadQuestionIndex,
  resolveQuestionRange,
  type AyahRef,
  type QuestionIndexLookup,
} from "../lib/questionBank.ts";
import { useJudging } from "../state/store.tsx";
import type { CompetitionQuestionDraft, QuestionMuqarrar } from "../types.ts";
import { Icon } from "./Icon.tsx";
import { QuestionMushafPreview } from "./QuestionMushafPreview.tsx";
import { SampleBadge } from "./SampleBadge.tsx";

const SURAHS = surahIndex as Array<{
  number: number;
  nameAr: string;
  firstPage: number;
}>;

function ayahLabel(value: AyahRef): string {
  return `${value.surah}:${value.ayah}`;
}

function draftRangeLabel(draft: CompetitionQuestionDraft): string {
  return `${ayahLabel(draft.startAyah)}–${ayahLabel(draft.endAyah)}`;
}

export function QuestionBuilder({ editable }: { editable: boolean }) {
  const { state, dispatch } = useJudging();
  const policy = state.competition.questionPolicy;
  const firstDivision = state.competition.divisions[0];
  const initialStart = firstDivision
    ? firstAyahForPortion(firstDivision.quranPortion)
    : { surah: 1, ayah: 1 };
  const [lookup, setLookup] = useState<QuestionIndexLookup | null>(null);
  const [loadError, setLoadError] = useState("");
  const [divisionId, setDivisionId] = useState(firstDivision?.id ?? "");
  const [startAyah, setStartAyah] = useState<AyahRef>(initialStart);
  const [previewPage, setPreviewPage] = useState(firstDivision ? SURAHS[initialStart.surah - 1]?.firstPage ?? 1 : 1);
  const [note, setNote] = useState("");
  const [muqarrar, setMuqarrar] = useState<QuestionMuqarrar>("both");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    loadQuestionIndex()
      .then((value) => {
        if (!cancelled) setLookup(value);
      })
      .catch(() => {
        if (!cancelled) setLoadError("The fixed Mushaf question index could not be loaded.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      !lookup ||
      !state.competition.isSample ||
      sampleQuestionCoverageComplete(state.questionDrafts, state.competition) ||
      state.competition.status !== "draft"
    ) {
      return;
    }
    dispatch({
      type: "INITIALIZE_SAMPLE_QUESTIONS",
      drafts: buildSampleQuestionDrafts(lookup, state.competition),
    });
  }, [dispatch, lookup, state.competition, state.questionDrafts]);

  const competitionDrafts = useMemo(
    () => state.questionDrafts.filter((draft) => draft.competitionId === state.competition.id),
    [state.competition.id, state.questionDrafts],
  );
  const selectedDivision = state.competition.divisions.find((division) => division.id === divisionId);
  const ayahCount = useMemo(
    () => lookup?.ayahs.filter((ayah) => ayah.surah === startAyah.surah).length ?? 1,
    [lookup, startAyah.surah],
  );
  const resolution = useMemo(
    () => lookup
      ? resolveQuestionRange(
          lookup,
          startAyah,
          policy.targetRecitationLines,
          policy.finalPrintedLineScoring,
        )
      : null,
    [lookup, policy.finalPrintedLineScoring, policy.targetRecitationLines, startAyah],
  );
  const eligible = Boolean(
    resolution?.ok &&
    selectedDivision &&
    rangeIsWithinPortion(resolution.range, selectedDivision.quranPortion),
  );
  const duplicate = resolution?.ok
    ? competitionDrafts.find(
        (draft) =>
          draft.id !== editingId &&
          draft.divisionId === divisionId &&
          draft.startAyah.surah === resolution.range.startAyah.surah &&
          draft.startAyah.ayah === resolution.range.startAyah.ayah &&
          draft.requestedLines === resolution.range.requestedLines,
      )
    : undefined;

  useEffect(() => {
    if (!lookup) return;
    const indexed = lookup.byKey.get(`${startAyah.surah}:${startAyah.ayah}`);
    if (indexed) setPreviewPage(indexed.startPage);
  }, [lookup, startAyah]);

  useEffect(() => {
    if (selectedDivision || !firstDivision) return;
    const nextStart = firstAyahForPortion(firstDivision.quranPortion);
    setDivisionId(firstDivision.id);
    setStartAyah(nextStart);
  }, [firstDivision, selectedDivision]);

  const chooseDivision = (nextDivisionId: string) => {
    const division = state.competition.divisions.find((item) => item.id === nextDivisionId);
    setDivisionId(nextDivisionId);
    setEditingId(null);
    setNote("");
    setMuqarrar("both");
    setMessage("");
    if (division) setStartAyah(firstAyahForPortion(division.quranPortion));
  };

  const chooseStart = (next: AyahRef) => {
    setStartAyah(next);
    setEditingId(null);
    setMessage("");
    const indexed = lookup?.byKey.get(`${next.surah}:${next.ayah}`);
    if (indexed) setPreviewPage(indexed.startPage);
  };

  const openDraft = (draft: CompetitionQuestionDraft) => {
    setEditingId(draft.id);
    setDivisionId(draft.divisionId);
    setStartAyah({ ...draft.startAyah });
    setPreviewPage(draft.startPage);
    setNote(draft.note);
    setMuqarrar(draft.muqarrar);
    setMessage("");
  };

  const newDraft = () => {
    const division = selectedDivision ?? firstDivision;
    const next = division ? firstAyahForPortion(division.quranPortion) : { surah: 1, ayah: 1 };
    setEditingId(null);
    setNote("");
    setMuqarrar("both");
    setMessage("");
    if (division) setDivisionId(division.id);
    setStartAyah(next);
  };

  const saveDraft = () => {
    if (!editable || !resolution?.ok || !selectedDivision || !eligible || duplicate) return;
    const previous = editingId
      ? competitionDrafts.find((draft) => draft.id === editingId)
      : undefined;
    const draft = createQuestionDraft({
      id: previous?.id ?? `question-${uid()}`,
      competition: state.competition,
      divisionId: selectedDivision.id,
      muqarrar,
      range: resolution.range,
      note,
      previous,
    });
    dispatch({ type: "UPSERT_QUESTION_DRAFT", draft });
    setEditingId(draft.id);
    setMessage(previous ? "Draft updated." : "Draft saved.");
  };

  const removeDraft = (draft: CompetitionQuestionDraft) => {
    if (!editable) return;
    if (!window.confirm(`Delete draft question ${draftRangeLabel(draft)}?`)) return;
    dispatch({ type: "REMOVE_QUESTION_DRAFT", id: draft.id });
    if (editingId === draft.id) newDraft();
  };

  const useUnavailableSample = () => {
    const fullDivision = state.competition.divisions.find((division) => division.quranPortion.kind === "full-quran");
    if (fullDivision) setDivisionId(fullDivision.id);
    setEditingId(null);
    setNote("Quran-end shortfall test");
    setStartAyah({ surah: 114, ayah: 6 });
    setPreviewPage(604);
    setMessage("");
  };

  if (loadError) {
    return <div className="question-builder-unavailable" role="alert"><strong>Draft builder unavailable</strong><span>{loadError} Manual competition questions remain available.</span></div>;
  }
  if (!lookup) {
    return <div className="question-builder-unavailable"><span className="loading-spinner" /><span>Preparing all 6,236 ayah boundaries…</span></div>;
  }

  const previewRange = resolution?.ok ? resolution.range : null;
  const unavailableReason = resolution && !resolution.ok
    ? resolution.reason === "insufficient-lines"
      ? `Only ${resolution.availableLines ?? 0} printed line${resolution.availableLines === 1 ? " remains" : "s remain"}. Tahqeeq will not silently shorten this question.`
      : "This ayah cannot be resolved against the fixed Mushaf index."
    : "";

  return (
    <div className="question-builder">
      <div className="question-builder-heading">
        <div>
          <span className="setup-step">Draft preparation</span>
          <h3>{editingId ? "Check draft question" : "Build a draft question"}</h3>
          <p>Choose a complete starting ayah. Tahqeeq finds the first complete ending ayah at or after the target line.</p>
        </div>
        <button type="button" className="btn-ghost" disabled={!editable} onClick={newDraft}><Icon name="plus" size={14} /> New draft</button>
      </div>

      <div className="question-builder-fields">
        <label>
          <span>Category</span>
          <select value={divisionId} disabled={!editable} onChange={(event) => chooseDivision(event.target.value)}>
            {state.competition.divisions.map((division) => <option key={division.id} value={division.id}>{division.name}</option>)}
          </select>
        </label>
        <label>
          <span>Starting surah</span>
          <select value={startAyah.surah} disabled={!editable} onChange={(event) => chooseStart({ surah: Number(event.target.value), ayah: 1 })}>
            {SURAHS.map((surah) => <option key={surah.number} value={surah.number}>{surah.number} · {surah.nameAr}</option>)}
          </select>
        </label>
        <label>
          <span>Starting ayah</span>
          <select value={Math.min(startAyah.ayah, ayahCount)} disabled={!editable} onChange={(event) => chooseStart({ surah: startAyah.surah, ayah: Number(event.target.value) })}>
            {Array.from({ length: ayahCount }, (_, index) => index + 1).map((ayah) => <option key={ayah} value={ayah}>{ayah}</option>)}
          </select>
        </label>
        <label>
          <span>Muqarrar start</span>
          <select value={muqarrar} disabled={!editable} onChange={(event) => setMuqarrar(event.target.value as QuestionMuqarrar)}>
            <option value="both">Either start</option>
            <option value="feshey-kolhu">Feshey kolhu · Starting side</option>
            <option value="nimey-kolhu">Nimey kolhu · Ending side</option>
          </select>
        </label>
        <label className="question-note-field">
          <span>Organizer note <em>Optional</em></span>
          <input value={note} disabled={!editable} maxLength={180} placeholder="For example: mutashabihat check" onChange={(event) => setNote(event.target.value)} />
        </label>
      </div>

      {state.competition.isSample && (
        <div className="question-sample-tests">
          <SampleBadge compact />
          <span>Test questions are loaded for every category and Muqarrar start.</span>
          <button type="button" onClick={useUnavailableSample}>Try Quran-end shortfall</button>
        </div>
      )}

      {resolution?.ok ? (
        <div className="question-resolution">
          <div><span>Starts</span><strong>{ayahLabel(resolution.range.startAyah)}</strong><small>Page {resolution.range.startPage} · line {resolution.range.startLine}</small></div>
          <div><span>Ends</span><strong>{ayahLabel(resolution.range.endAyah)}</strong><small>Page {resolution.range.endPage} · line {resolution.range.endLine}</small></div>
          <div><span>Requested</span><strong>{resolution.range.requestedLines}</strong><small>printed lines</small></div>
          <div className={resolution.range.extensionLines ? "has-warning" : ""}><span>Actual</span><strong>{resolution.range.resolvedLines}</strong><small>{resolution.range.extensionLines ? `extends by ${resolution.range.extensionLines}` : "exact target"}</small></div>
        </div>
      ) : (
        <div className="question-resolution-error" role="status"><strong>Cannot save this starting point</strong><span>{unavailableReason}</span></div>
      )}

      {resolution?.ok && !eligible && <div className="question-resolution-error" role="status"><strong>Outside the selected category</strong><span>The complete passage must remain inside that category’s configured Quran portion.</span></div>}
      {duplicate && <div className="question-resolution-error" role="status"><strong>Already saved</strong><span>This category already has a draft with the same starting ayah and line rule.</span></div>}

      <QuestionMushafPreview page={previewPage} range={previewRange} onPageChange={setPreviewPage} onAyahPick={chooseStart} />

      <div className="question-builder-actions">
        <span>{message || "Drafts can be assigned manually; they are not an approved frozen question bank."}</span>
        <button type="button" className="btn-primary" disabled={!editable || !resolution?.ok || !eligible || Boolean(duplicate)} onClick={saveDraft}>{editingId ? "Update draft" : "Save draft"}</button>
      </div>

      <section className="question-draft-list" aria-labelledby="question-drafts-title">
        <div className="question-draft-list-head">
          <div><h3 id="question-drafts-title">Saved drafts</h3><p>Use them as checked manual prompts; automatic draw and approval come later.</p></div>
          <strong>{competitionDrafts.length}</strong>
        </div>
        {!competitionDrafts.length ? (
          <div className="question-draft-empty">No drafts saved for this competition.</div>
        ) : competitionDrafts.map((draft) => {
          const issues = questionDraftIssues({ draft, competition: state.competition, policy, lookup });
          const division = state.competition.divisions.find((item) => item.id === draft.divisionId);
          return (
            <article key={draft.id} className={`question-draft-row ${editingId === draft.id ? "is-active" : ""} ${issues.length ? "needs-check" : ""}`}>
              <button type="button" className="question-draft-open" onClick={() => openDraft(draft)}>
                <span className="question-draft-state">{issues.length ? "Needs checking" : "Ready draft"}</span>
                <strong>{draftRangeLabel(draft)}</strong>
                <span>{division?.name ?? "Category removed"} · {draft.muqarrar === "both" ? "Either start" : draft.muqarrar === "feshey-kolhu" ? "Feshey kolhu" : "Nimey kolhu"} · {draft.resolvedLines} lines · pages {draft.startPage}{draft.endPage !== draft.startPage ? `–${draft.endPage}` : ""}</span>
                {draft.note && <small>{draft.note}</small>}
                {issues.length > 0 && <small>{issues[0]}</small>}
              </button>
              <button type="button" className="question-draft-delete" disabled={!editable} aria-label={`Delete draft ${draftRangeLabel(draft)}`} onClick={() => removeDraft(draft)}><Icon name="trash" size={14} /></button>
            </article>
          );
        })}
      </section>

      <p className="question-source-note">Fixed source: KFGQPC V1 1405H · {lookup.asset.entryCount.toLocaleString()} ayahs · question index verified against all 604 pages.</p>
    </div>
  );
}
