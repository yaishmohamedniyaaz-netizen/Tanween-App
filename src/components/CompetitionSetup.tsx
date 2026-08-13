import { Fragment, useMemo, useRef, useState } from "react";
import {
  CATEGORIES,
  DEFAULT_CONFIG,
  STEP_OPTIONS,
  startOptionsFor,
  TOTAL_MARKS,
  cloneScoreConfig,
  enabledCategories,
  enabledMarksTotal,
} from "../config";
import {
  competitionIdFor,
  competitionReadiness,
} from "../lib/competition";
import {
  MAX_JUDGE_SEATS,
  categoriesInOrder,
  categoryListLabel,
  createPanelPreset,
  judgeSeatFor,
  shortCategoryLabel,
  validateJudgePanel,
} from "../lib/judgeAssignments";
import {
  downloadParticipantTemplate,
  downloadSampleParticipantWorkbook,
  parseRosterFile,
  type RosterImportPreview,
} from "../lib/roster";
import { createSampleRoster } from "../lib/sampleCompetition";
import { useJudging } from "../state/store";
import type {
  CategoryId,
  CompetitionDivision,
  JudgePanelConfig,
  JudgePanelPreset,
  QuranPortion,
  ScoreConfig,
} from "../types";
import { Icon } from "./Icon";
import { QuestionBuilder } from "./QuestionBuilder";
import { SampleBadge } from "./SampleBadge";

type SetupTask =
  | "details"
  | "divisions"
  | "participants"
  | "panel"
  | "marks"
  | "questions"
  | "question-bank"
  | "review";

const TASKS: Array<{
  id: SetupTask;
  group: "Competition" | "Judging" | "Questions" | "Launch";
  label: string;
  hint: string;
}> = [
  { id: "details", group: "Competition", label: "Competition details", hint: "Name and edition" },
  { id: "divisions", group: "Competition", label: "Divisions and portions", hint: "Age groups and Quran ranges" },
  { id: "participants", group: "Competition", label: "Participants", hint: "Import and verify the roster" },
  { id: "marks", group: "Judging", label: "Marks and criteria", hint: "Criteria in use, marks and steps" },
  { id: "panel", group: "Judging", label: "Judging panel", hint: "Give every criterion an owner" },
  { id: "questions", group: "Questions", label: "Question rules", hint: "Ayah and printed-line policy" },
  { id: "question-bank", group: "Questions", label: "Draft questions", hint: "Build and preview passages" },
  { id: "review", group: "Launch", label: "Review and start", hint: "Check the official setup" },
];

function presets(judged: CategoryId[]): Array<{ id: JudgePanelPreset; title: string; detail: string }> {
  return [
    {
      id: "all",
      title: "One judge covers all",
      detail: `${judged.map(shortCategoryLabel).join(", ")} on this device`,
    },
    {
      id: "one-each",
      title: "One judge per criterion",
      detail: `${judged.length} judges with one responsibility each`,
    },
    {
      id: "custom",
      title: "Custom panel",
      detail: "Divide the criteria across the panel",
    },
  ];
}

function clonePanel(panel: JudgePanelConfig): JudgePanelConfig {
  return {
    ...panel,
    seats: panel.seats.map((seat) => ({ ...seat, categories: [...seat.categories] })),
  };
}

function cloneConfig(config: ScoreConfig): ScoreConfig {
  return cloneScoreConfig(config);
}

function portionLabel(portion: QuranPortion): string {
  if (portion.kind === "juz-range") {
    return portion.startJuz === portion.endJuz
      ? `Juz ${portion.startJuz}`
      : `Juz ${portion.startJuz}–${portion.endJuz}`;
  }
  if (portion.kind === "surah-range") {
    return portion.startSurah === portion.endSurah
      ? `Surah ${portion.startSurah}`
      : `Surah ${portion.startSurah}–${portion.endSurah}`;
  }
  return "Full Quran";
}

function statusText(
  complete: boolean,
  locked: boolean,
  task: SetupTask,
  competitionStatus: "draft" | "live" | "closed",
  draftCount = 0,
): string {
  if (locked) return "Locked";
  if (task === "question-bank") return draftCount ? `${draftCount} draft${draftCount === 1 ? "" : "s"}` : "Optional";
  if (competitionStatus === "live" && task === "review") return "Live";
  if (competitionStatus === "closed" && task === "review") return "Closed";
  return complete ? "Complete" : "Needs attention";
}

export function CompetitionSetup({ onBack }: { onBack: () => void }) {
  const { state, dispatch } = useJudging();
  const [activeTask, setActiveTask] = useState<SetupTask>(
    state.competition.isSample || state.competition.status !== "draft"
      ? "review"
      : "details",
  );
  const [identity, setIdentity] = useState({
    name: state.competition.name,
    edition: state.competition.edition,
  });
  const [panelDraft, setPanelDraft] = useState(() => clonePanel(state.panel));
  const [deviceJudgeId, setDeviceJudgeId] = useState(
    state.deviceJudgeId ?? state.panel.seats[0]?.id ?? "",
  );
  const [scoreDraft, setScoreDraft] = useState(() => cloneConfig(state.config));
  const [rosterPreview, setRosterPreview] = useState<RosterImportPreview | null>(null);
  const [rosterMessage, setRosterMessage] = useState("");
  const [rosterError, setRosterError] = useState("");
  const [templateBusy, setTemplateBusy] = useState(false);
  const [sampleWorkbookBusy, setSampleWorkbookBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const editable = state.competition.status === "draft" && !state.sessionActive;
  const readiness = useMemo(() => competitionReadiness(state), [state]);
  const judgedCategories = useMemo(() => enabledCategories(state.config), [state.config]);
  const draftCategories = useMemo(() => enabledCategories(scoreDraft), [scoreDraft]);
  const panelValidation = useMemo(
    () => validateJudgePanel(panelDraft, judgedCategories),
    [panelDraft, judgedCategories],
  );
  const panelDeviceValid = Boolean(judgeSeatFor(panelDraft, deviceJudgeId));
  const marksTotal = enabledMarksTotal(scoreDraft);
  const competitionDraftCount = state.questionDrafts.filter(
    (draft) => draft.competitionId === state.competition.id,
  ).length;

  const sectionComplete = (task: SetupTask): boolean => {
    if (task === "review") return readiness.ready;
    if (task === "question-bank") return true;
    const section = task === "details" ? "competition" : task;
    return !readiness.issues.some((issue) => issue.section === section);
  };

  const saveIdentity = () => {
    if (!editable) return;
    dispatch({
      type: "SET_COMPETITION",
      competition: {
        ...state.competition,
        id: competitionIdFor(identity.name, identity.edition),
        name: identity.name.trim(),
        edition: identity.edition.trim(),
      },
    });
  };

  const savePanel = () => {
    if (!editable || !panelValidation.valid || !panelDeviceValid) return;
    dispatch({ type: "SET_PANEL", panel: panelDraft, deviceJudgeId });
  };

  const saveMarks = () => {
    if (!editable || marksTotal !== TOTAL_MARKS) return;
    CATEGORIES.forEach((category) => {
      dispatch({
        type: "SET_CONFIG",
        category: category.id,
        enabled: scoreDraft[category.id].enabled,
        start: scoreDraft[category.id].start,
        step: scoreDraft[category.id].step,
      });
    });
  };

  // Switching a criterion off must never leave its marks in the total.
  const toggleCategory = (category: CategoryId, enabled: boolean) => {
    if (!editable) return;
    setScoreDraft((current) => ({
      ...current,
      [category]: {
        ...current[category],
        enabled,
        start: enabled ? (current[category].start || 10) : 0,
      },
    }));
  };

  const updateDivisions = (divisions: CompetitionDivision[]) => {
    if (!editable) return;
    dispatch({ type: "SET_DIVISIONS", divisions });
  };

  const addDivision = () => {
    const id = `division-${Date.now().toString(36)}`;
    updateDivisions([
      ...state.competition.divisions,
      {
        id,
        name: `Division ${state.competition.divisions.length + 1}`,
        ageGroup: "",
        category: "nubalaa",
        quranPortion: { kind: "full-quran" },
      },
    ]);
  };

  const patchDivision = (id: string, patch: Partial<CompetitionDivision>) => {
    updateDivisions(
      state.competition.divisions.map((division) =>
        division.id === id ? { ...division, ...patch } : division,
      ),
    );
  };

  const choosePreset = (preset: JudgePanelPreset) => {
    if (!editable) return;
    if (preset === "custom") {
      setPanelDraft((current) => ({ ...clonePanel(current), preset: "custom" }));
      return;
    }
    const next = createPanelPreset(preset, judgedCategories);
    setPanelDraft(next);
    setDeviceJudgeId(next.seats[0]?.id ?? "");
  };

  const assignCategory = (judgeSeatId: string, category: CategoryId) => {
    if (!editable) return;
    setPanelDraft((current) => ({
      ...current,
      preset: "custom",
      seats: current.seats.map((seat) => ({
        ...seat,
        categories: categoriesInOrder(
          seat.id === judgeSeatId
            ? [...seat.categories, category]
            : seat.categories.filter((item) => item !== category),
        ),
      })),
    }));
  };

  const addJudge = () => {
    if (!editable || panelDraft.seats.length >= MAX_JUDGE_SEATS) return;
    setPanelDraft((current) => ({
      ...current,
      preset: "custom",
      seats: [
        ...current.seats,
        {
          id: `judge-${current.seats.length + 1}`,
          label: `Judge ${current.seats.length + 1}`,
          name: "",
          categories: [],
        },
      ],
    }));
  };

  const removeJudge = (judgeSeatId: string) => {
    if (!editable || panelDraft.seats.length <= 1) return;
    setPanelDraft((current) => {
      const removed = current.seats.find((seat) => seat.id === judgeSeatId);
      const remaining = current.seats.filter((seat) => seat.id !== judgeSeatId);
      if (removed && remaining[0]) {
        remaining[0] = {
          ...remaining[0],
          categories: categoriesInOrder([
            ...remaining[0].categories,
            ...removed.categories,
          ]),
        };
      }
      const seats = remaining.map((seat, index) => ({ ...seat, label: `Judge ${index + 1}` }));
      if (deviceJudgeId === judgeSeatId) setDeviceJudgeId(seats[0]?.id ?? "");
      return { ...current, preset: "custom", seats };
    });
  };

  const onRosterFile = async (file?: File) => {
    if (!file || !editable) return;
    setRosterError("");
    setRosterMessage("");
    try {
      setRosterPreview(await parseRosterFile(file));
    } catch (error) {
      setRosterError(error instanceof Error ? error.message : "Could not read that file.");
    }
  };

  const downloadTemplate = async () => {
    if (templateBusy) return;
    setTemplateBusy(true);
    setRosterError("");
    try {
      await downloadParticipantTemplate();
    } catch {
      setRosterError("The participant template could not be prepared.");
    } finally {
      setTemplateBusy(false);
    }
  };

  const downloadSampleWorkbook = async () => {
    if (sampleWorkbookBusy) return;
    setSampleWorkbookBusy(true);
    setRosterError("");
    try {
      await downloadSampleParticipantWorkbook();
    } catch {
      setRosterError("The sample participant workbook could not be prepared.");
    } finally {
      setSampleWorkbookBusy(false);
    }
  };

  const resetLocalDrafts = (sample: boolean) => {
    const panel = createPanelPreset("all", enabledCategories(DEFAULT_CONFIG));
    setIdentity(sample
      ? { name: "Tahqeeq Test Competition", edition: "Sample 2026" }
      : { name: "", edition: "" });
    setPanelDraft(panel);
    setDeviceJudgeId(panel.seats[0]?.id ?? "judge-1");
    setScoreDraft(cloneConfig(DEFAULT_CONFIG));
    setRosterPreview(null);
  };

  const loadSampleCompetition = () => {
    const hasDraftData = Boolean(
      state.competition.name ||
      state.competition.divisions.length ||
      state.roster.length,
    );
    if (
      hasDraftData &&
      !window.confirm(
        "Replace the current draft with the Tahqeeq sample competition? Official records already saved in Records will remain unchanged.",
      )
    ) return;
    dispatch({ type: "LOAD_SAMPLE_COMPETITION" });
    resetLocalDrafts(true);
    setRosterMessage("Sample competition and fictional participant list loaded.");
    setActiveTask("review");
  };

  const removeSampleData = () => {
    if (
      !window.confirm(
        "Remove the sample competition, its fictional participants, and any sample results from this device? Official records will not be changed.",
      )
    ) return;
    dispatch({ type: "REMOVE_SAMPLE_DATA" });
    resetLocalDrafts(false);
    setRosterMessage("");
    setActiveTask("details");
  };

  const renderTask = () => {
    if (activeTask === "details") {
      return (
        <section className="setup-work-card" aria-labelledby="setup-details-title">
          <div className="setup-work-head">
            <span className="setup-step">Competition</span>
            <h2 id="setup-details-title">Competition details</h2>
            <p>This name and edition identify every matching judge result.</p>
          </div>
          <div className="competition-identity-fields">
            <label>
              <span>Name</span>
              <input
                type="text"
                value={identity.name}
                disabled={!editable}
                placeholder="Competition name"
                onChange={(event) => setIdentity((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <label>
              <span>Edition</span>
              <input
                type="text"
                value={identity.edition}
                disabled={!editable}
                placeholder="For example, 2026"
                onChange={(event) => setIdentity((current) => ({ ...current, edition: event.target.value }))}
              />
            </label>
          </div>
          {editable && (
            <div className="setup-work-actions">
              <button type="button" className="btn-primary" disabled={!identity.name.trim() || !identity.edition.trim()} onClick={saveIdentity}>
                Save details
              </button>
            </div>
          )}
        </section>
      );
    }

    if (activeTask === "divisions") {
      return (
        <section className="setup-work-card" aria-labelledby="setup-divisions-title">
          <div className="setup-work-head">
            <span className="setup-step">Competition</span>
            <h2 id="setup-divisions-title">Divisions and Quran portions</h2>
            <p>Each division combines an age group, recitation category and eligible Quran range.</p>
          </div>
          <div className="division-list">
            {state.competition.divisions.map((division, index) => (
              <article className="division-card" key={division.id}>
                <div className="division-card-head">
                  <strong>Division {index + 1}</strong>
                  {editable && (
                    <button type="button" className="btn-ghost" onClick={() => updateDivisions(state.competition.divisions.filter((item) => item.id !== division.id))}>
                      Remove
                    </button>
                  )}
                </div>
                <div className="division-fields">
                  <label>
                    <span>Division name</span>
                    <input value={division.name} disabled={!editable} onChange={(event) => patchDivision(division.id, { name: event.target.value })} />
                  </label>
                  <label>
                    <span>Age group</span>
                    <input value={division.ageGroup} disabled={!editable} placeholder="For example, Under 14" onChange={(event) => patchDivision(division.id, { ageGroup: event.target.value })} />
                  </label>
                  <label>
                    <span>Category</span>
                    <select value={division.category} disabled={!editable} onChange={(event) => patchDivision(division.id, { category: event.target.value as "baliagen" | "nubalaa" })}>
                      <option value="nubalaa">Hifz</option>
                      <option value="baliagen">Baliagen · Tarteel / reading</option>
                    </select>
                  </label>
                  <label>
                    <span>Quran portion</span>
                    <select
                      value={division.quranPortion.kind}
                      disabled={!editable}
                      onChange={(event) => {
                        const kind = event.target.value;
                        patchDivision(division.id, {
                          quranPortion:
                            kind === "juz-range"
                              ? { kind, startJuz: 1, endJuz: 30 }
                              : kind === "surah-range"
                                ? { kind, startSurah: 1, endSurah: 114 }
                                : { kind: "full-quran" },
                        });
                      }}
                    >
                      <option value="full-quran">Full Quran</option>
                      <option value="juz-range">Juz range</option>
                      <option value="surah-range">Surah range</option>
                    </select>
                  </label>
                  {division.quranPortion.kind === "juz-range" && (
                    <div className="portion-range-fields">
                      <label><span>From Juz</span><input type="number" min={1} max={30} value={division.quranPortion.startJuz} disabled={!editable} onChange={(event) => patchDivision(division.id, { quranPortion: { kind: "juz-range", startJuz: Number(event.target.value), endJuz: division.quranPortion.kind === "juz-range" ? division.quranPortion.endJuz : 30 } })} /></label>
                      <label><span>To Juz</span><input type="number" min={1} max={30} value={division.quranPortion.endJuz} disabled={!editable} onChange={(event) => patchDivision(division.id, { quranPortion: { kind: "juz-range", startJuz: division.quranPortion.kind === "juz-range" ? division.quranPortion.startJuz : 1, endJuz: Number(event.target.value) } })} /></label>
                    </div>
                  )}
                  {division.quranPortion.kind === "surah-range" && (
                    <div className="portion-range-fields">
                      <label><span>From Surah</span><input type="number" min={1} max={114} value={division.quranPortion.startSurah} disabled={!editable} onChange={(event) => patchDivision(division.id, { quranPortion: { kind: "surah-range", startSurah: Number(event.target.value), endSurah: division.quranPortion.kind === "surah-range" ? division.quranPortion.endSurah : 114 } })} /></label>
                      <label><span>To Surah</span><input type="number" min={1} max={114} value={division.quranPortion.endSurah} disabled={!editable} onChange={(event) => patchDivision(division.id, { quranPortion: { kind: "surah-range", startSurah: division.quranPortion.kind === "surah-range" ? division.quranPortion.startSurah : 1, endSurah: Number(event.target.value) } })} /></label>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
          {editable && (
            <button type="button" className="add-judge" onClick={addDivision}>
              <Icon name="plus" size={13} /> Add division
            </button>
          )}
          {!state.competition.divisions.length && <p className="setup-empty-note">Add the first division to continue.</p>}
        </section>
      );
    }

    if (activeTask === "participants") {
      return (
        <section className="setup-work-card" aria-labelledby="setup-participants-title">
          <div className="setup-work-head setup-work-head-row">
            <div>
              <span className="setup-step">Competition</span>
              <h2 id="setup-participants-title">Participants</h2>
              <p>Import the checked roster before the competition starts.</p>
            </div>
            <div className="setup-download-actions">
              <button type="button" className="btn-ghost" disabled={templateBusy} onClick={() => void downloadTemplate()}>
                <Icon name="download" size={15} /> {templateBusy ? "Preparing…" : "Blank template"}
              </button>
              <button type="button" className="btn-ghost" disabled={sampleWorkbookBusy} onClick={() => void downloadSampleWorkbook()}>
                <Icon name="download" size={15} /> {sampleWorkbookBusy ? "Preparing…" : "Sample roster"}
              </button>
            </div>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(event) => { void onRosterFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
          {editable && (
            <div className="file-drop" role="button" tabIndex={0} onClick={() => fileRef.current?.click()} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") fileRef.current?.click(); }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void onRosterFile(event.dataTransfer.files?.[0]); }}>
              <Icon name="upload" size={16} /> {state.roster.length ? `${state.roster.length} participants loaded — replace list` : "Upload the completed .xlsx or .csv roster"}
            </div>
          )}
          {state.roster.length > 0 && (
            <div className="roster-ready-summary">
              <strong>{state.roster.length}</strong>
              <span>participants ready</span>
              <small>{state.roster.filter((entry) => entry.judged).length} already finished</small>
            </div>
          )}
          {rosterPreview && (
            <div className="roster-import-preview" role="status">
              <div className="roster-import-summary">
                <span><strong>{rosterPreview.entries.length}</strong> ready</span>
                <span><strong>{rosterPreview.issues.filter((issue) => issue.level === "error").length}</strong> rejected</span>
                <span><strong>{rosterPreview.issues.filter((issue) => issue.level === "warning").length}</strong> warnings</span>
              </div>
              {rosterPreview.filename && <p className="roster-import-file">{rosterPreview.filename}</p>}
              {rosterPreview.issues.length > 0 && (
                <ul className="roster-import-issues">
                  {rosterPreview.issues.slice(0, 6).map((issue, index) => <li className={`is-${issue.level}`} key={`${issue.row}-${index}`}>Row {issue.row}: {issue.message}</li>)}
                </ul>
              )}
              <div className="roster-import-actions">
                <button type="button" className="btn-ghost" onClick={() => setRosterPreview(null)}>Cancel</button>
                <button type="button" className="btn-primary" disabled={!rosterPreview.entries.length} onClick={() => { dispatch({ type: "LOAD_ROSTER", entries: rosterPreview.entries }); setRosterMessage(`${rosterPreview.entries.length} participants loaded.`); setRosterPreview(null); }}>
                  {state.roster.length ? "Replace participant list" : "Use participant list"}
                </button>
              </div>
            </div>
          )}
          {rosterMessage && <p className="setup-note">{rosterMessage}</p>}
          {rosterError && <p className="setup-warn">{rosterError}</p>}
          {editable && state.roster.length > 0 && <button type="button" className="dialog-link" onClick={() => dispatch({ type: "CLEAR_ROSTER" })}>Remove participant list</button>}
          {editable && !state.roster.length && state.competition.isSample && (
            <button type="button" className="dialog-link" onClick={() => { dispatch({ type: "LOAD_ROSTER", entries: createSampleRoster() }); setRosterMessage("Sample participant list restored."); }}>
              Restore sample participant list
            </button>
          )}
        </section>
      );
    }

    if (activeTask === "panel") {
      const panelForDevice = state.competition.status === "live"
        ? state.competition.liveSnapshot?.panel ?? state.panel
        : panelDraft;
      return (
        <section className="setup-work-card" aria-labelledby="setup-panel-title">
          <div className="setup-work-head">
            <span className="setup-step">Judging</span>
            <h2 id="setup-panel-title">Judging panel</h2>
            <p>Each criterion in use has one scoring owner. Multiple owners for the same criterion remain undecided.</p>
          </div>
          {editable && (
            <div className="panel-presets">
              {presets(judgedCategories).map((preset) => <button key={preset.id} type="button" className={panelDraft.preset === preset.id ? "is-active" : ""} aria-pressed={panelDraft.preset === preset.id} onClick={() => choosePreset(preset.id)}><strong>{preset.title}</strong><span>{preset.detail}</span></button>)}
            </div>
          )}
          <div className="judge-rows">
            {panelForDevice.seats.map((seat) => (
              <div className={`judge-row ${editable && panelValidation.emptySeatIds.includes(seat.id) ? "has-error" : ""}`} key={seat.id}>
                <div className="judge-row-person">
                  <span>{seat.label}</span>
                  <input value={seat.name} disabled={!editable} placeholder="Name (optional)" onChange={(event) => setPanelDraft((current) => ({ ...current, seats: current.seats.map((item) => item.id === seat.id ? { ...item, name: event.target.value.slice(0, 80) } : item) }))} />
                </div>
                <div className="judge-category-set" role="group" aria-label={`${seat.label} categories`}>
                  {CATEGORIES.filter((category) => judgedCategories.includes(category.id)).map((category) => {
                    const selected = seat.categories.includes(category.id);
                    return <button key={category.id} type="button" disabled={!editable} className={`judge-category cat-${category.id} ${selected ? "is-active" : ""}`} aria-pressed={selected} onClick={() => assignCategory(seat.id, category.id)}><span aria-hidden="true" />{category.label.replace("Laḥn ", "")}</button>;
                  })}
                </div>
                {editable && panelDraft.seats.length > 1 && <button type="button" className="judge-remove" onClick={() => removeJudge(seat.id)}>Remove</button>}
              </div>
            ))}
          </div>
          {editable && panelDraft.seats.length < MAX_JUDGE_SEATS && <button type="button" className="add-judge" onClick={addJudge}><Icon name="plus" size={13} /> Add judge</button>}
          <div className="device-judge-block">
            <div><strong>This device is for</strong><span>The selected judge's tray and score are shown.</span></div>
            <div className="device-judge-options" role="radiogroup" aria-label="Judge using this device">
              {panelForDevice.seats.map((seat) => (
                <button key={seat.id} type="button" role="radio" disabled={state.sessionActive} aria-checked={(editable ? deviceJudgeId : state.deviceJudgeId) === seat.id} className={(editable ? deviceJudgeId : state.deviceJudgeId) === seat.id ? "is-active" : ""} onClick={() => { if (editable) setDeviceJudgeId(seat.id); else dispatch({ type: "SET_DEVICE_JUDGE", judgeSeatId: seat.id }); }}>
                  <span className="device-radio" aria-hidden="true" />
                  <span><strong>{seat.name.trim() || seat.label}</strong><small>{categoryListLabel(seat.categories) || "No category"}</small></span>
                </button>
              ))}
            </div>
          </div>
          {editable && !panelValidation.valid && <p className="setup-warn">{panelValidation.errors[0]}</p>}
          {editable && !panelDeviceValid && <p className="setup-warn">Choose which judge is using this device.</p>}
          {editable && <div className="setup-work-actions"><button type="button" className="btn-primary" disabled={!panelValidation.valid || !panelDeviceValid} onClick={savePanel}>Save judging panel</button></div>}
        </section>
      );
    }

    if (activeTask === "marks") {
      return (
        <section className="setup-work-card" aria-labelledby="setup-marks-title">
          <div className="setup-work-head"><span className="setup-step">Judging</span><h2 id="setup-marks-title">Marks and criteria</h2><p>Choose the criteria this competition judges, then divide {TOTAL_MARKS} marks between them. These values become immutable when the competition starts.</p></div>
          <div className="setup-grid setup-grid-criteria">
            <span className="t-label">Criterion</span><span className="t-label">In use</span><span className="t-label">Marks</span><span className="t-label">Step</span>
            {CATEGORIES.map((category) => {
              const inUse = scoreDraft[category.id].enabled;
              return (
                <Fragment key={category.id}>
                  <span className={`setup-cat cat-${category.id} ${inUse ? "" : "is-off"}`}>
                    <span className="sc-dot" aria-hidden="true" />
                    <span>
                      {category.label}
                      <small>{category.kind === "impression" ? "Marked once for the whole recitation" : "Pinpointed on the page"}</small>
                    </span>
                  </span>
                  {category.optional ? (
                    <label className="criterion-toggle">
                      <input type="checkbox" checked={inUse} disabled={!editable} onChange={(event) => toggleCategory(category.id, event.target.checked)} />
                      <span>{inUse ? "Judged" : "Not judged"}</span>
                    </label>
                  ) : (
                    <span className="criterion-required">Always judged</span>
                  )}
                  <select value={scoreDraft[category.id].start} disabled={!editable || !inUse} aria-label={`${category.label} marks`} onChange={(event) => setScoreDraft((current) => ({ ...current, [category.id]: { ...current[category.id], start: Number(event.target.value) } }))}>
                    {!inUse && <option value={0}>—</option>}
                    {startOptionsFor(category.id).map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                  <select value={scoreDraft[category.id].step} disabled={!editable || !inUse} aria-label={`${category.label} deduction step`} onChange={(event) => setScoreDraft((current) => ({ ...current, [category.id]: { ...current[category.id], step: Number(event.target.value) } }))}>{STEP_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select>
                </Fragment>
              );
            })}
            <span className="setup-total-label">Total</span><span />
            <span className={`setup-total t-num ${marksTotal !== TOTAL_MARKS ? "is-off" : ""}`}>{marksTotal} / {TOTAL_MARKS}</span><span />
          </div>
          {marksTotal !== TOTAL_MARKS && <p className="setup-warn">Allocations must total {TOTAL_MARKS} across the criteria in use.</p>}
          <p className="setup-note">Judged criteria: {draftCategories.map(shortCategoryLabel).join(", ")}. Changing them rebuilds the judging panel, so check the panel afterwards.</p>
          {editable && <div className="setup-work-actions"><button type="button" className="btn-primary" disabled={marksTotal !== TOTAL_MARKS} onClick={saveMarks}>Save mark rules</button></div>}
        </section>
      );
    }

    if (activeTask === "questions") {
      const policy = state.competition.questionPolicy;
      return (
        <section className="setup-work-card" aria-labelledby="setup-questions-title">
          <div className="setup-work-head"><span className="setup-step">Questions</span><h2 id="setup-questions-title">Question rules</h2><p>Every official question starts at an ayah and resolves against the fixed 1405H printed lines.</p></div>
          <div className="question-mode-options">
            <button type="button" disabled={!editable} className={policy.mode === "manual" ? "is-active" : ""} onClick={() => dispatch({ type: "SET_QUESTION_POLICY", policy: { ...policy, mode: "manual" } })}>
              <span className="question-mode-check" aria-hidden="true" />
              <span><strong>Manual questions</strong><small>Judges use questions prepared outside Tahqeeq for this foundation release.</small></span>
            </button>
            <button type="button" disabled title="Available after the reviewed question builder is implemented">
              <span className="question-mode-check" aria-hidden="true" />
              <span><strong>Tahqeeq question set</strong><small>Prepared tiles can be selected manually. Automatic draw and an approved frozen bank come later.</small></span>
            </button>
          </div>
          <div className="question-rule-grid">
            <label><span>Target printed lines</span><select value={policy.targetRecitationLines} disabled={!editable} onChange={(event) => dispatch({ type: "SET_QUESTION_POLICY", policy: { ...policy, targetRecitationLines: Number(event.target.value) } })}>{Array.from({ length: 11 }, (_, index) => index + 5).map((value) => <option key={value} value={value}>{value} lines</option>)}</select></label>
            <label><span>Final printed line</span><select value={policy.finalPrintedLineScoring} disabled={!editable} onChange={(event) => dispatch({ type: "SET_QUESTION_POLICY", policy: { ...policy, finalPrintedLineScoring: event.target.value as "include" | "exclude" } })}><option value="exclude">Do not deduct marks</option><option value="include">Include in marking</option></select></label>
          </div>
          <div className="ayah-rule-summary">
            <Icon name="check" size={16} />
            <span><strong>Fixed ending rule</strong> Start at the chosen ayah. Continue to the first complete ayah ending on or after line {policy.targetRecitationLines}.</span>
          </div>
          <p className="question-foundation-note">No AI, OCR or paid API is used. Continue to Draft questions to prepare and preview passages from all 604 local QPC V1 pages.</p>
        </section>
      );
    }

    if (activeTask === "question-bank") {
      return (
        <section className="setup-work-card question-builder-work-card" aria-labelledby="setup-question-builder-title">
          <div className="setup-work-head">
            <span className="setup-step">Questions</span>
            <h2 id="setup-question-builder-title">Draft questions</h2>
            <p>Prepare exact ayah-first passages on the real Mushaf. Drafts stay separate from official competition delivery.</p>
          </div>
          <QuestionBuilder editable={editable} />
        </section>
      );
    }

    return (
      <section className="setup-work-card setup-review-card" aria-labelledby="setup-review-title">
        <div className="setup-work-head"><span className="setup-step">Launch</span><h2 id="setup-review-title">Review and start {state.competition.isSample && <SampleBadge compact />}</h2><p>{state.competition.isSample ? "This is fictional test data. It stays separate from official exports." : "The competition is not official until this screen is confirmed."}</p></div>
        <div className="review-summary-list">
          <button type="button" onClick={() => setActiveTask("details")}><span>Competition</span><strong>{state.competition.name || "Not set"}</strong><small>{state.competition.edition || "Edition missing"}</small><em>Change</em></button>
          <button type="button" onClick={() => setActiveTask("divisions")}><span>Divisions</span><strong>{state.competition.divisions.length || "None"}</strong><small>{state.competition.divisions.map((division) => `${division.name || "Unnamed"} · ${portionLabel(division.quranPortion)}`).join("; ") || "Add a division"}</small><em>Change</em></button>
          <button type="button" onClick={() => setActiveTask("participants")}><span>Participants</span><strong>{state.roster.length || "None"}</strong><small>{state.roster.length ? "Validated roster loaded" : "Upload the participant roster"}</small><em>Change</em></button>
          <button type="button" onClick={() => setActiveTask("panel")}><span>Judging panel</span><strong>{state.panel.seats.length} judge{state.panel.seats.length === 1 ? "" : "s"}</strong><small>{state.panel.seats.map((seat) => `${seat.name || seat.label}: ${categoryListLabel(seat.categories)}`).join("; ")}</small><em>Change</em></button>
          <button type="button" onClick={() => setActiveTask("marks")}><span>Marks</span><strong>{enabledMarksTotal(state.config)} / {TOTAL_MARKS}</strong><small>{categoryListLabel(judgedCategories)}</small><em>Change</em></button>
          <button type="button" onClick={() => setActiveTask("questions")}><span>Questions</span><strong>{state.competition.questionPolicy.mode === "manual" ? "Manual questions" : "Tahqeeq set"}</strong><small>{state.competition.questionPolicy.targetRecitationLines} lines · final line {state.competition.questionPolicy.finalPrintedLineScoring === "exclude" ? "not marked" : "marked"}</small><em>Change</em></button>
          <button type="button" onClick={() => setActiveTask("question-bank")}><span>Draft questions</span><strong>{competitionDraftCount}</strong><small>{competitionDraftCount ? "Prepared locally for later review" : "Optional during manual-question competitions"}</small><em>Open</em></button>
        </div>
        {state.competition.status === "draft" && !readiness.ready && (
          <div className="readiness-issues" role="alert">
            <strong>{readiness.issues.length} item{readiness.issues.length === 1 ? "" : "s"} need attention</strong>
            <ul>{readiness.issues.map((issue, index) => <li key={`${issue.section}-${index}`}>{issue.message}</li>)}</ul>
          </div>
        )}
        {state.competition.status === "draft" && (
          <div className="official-start-block">
            <div><strong>{state.competition.isSample ? "Start test session" : "Start officially"}</strong><span>This freezes the roster, divisions, panel, marks, question rules and Mushaf data version.</span></div>
            <button type="button" className="btn-primary" disabled={!readiness.ready} onClick={() => { dispatch({ type: "START_COMPETITION" }); onBack(); }}>{state.competition.isSample ? "Start sample" : "Start competition"}</button>
          </div>
        )}
        {state.competition.status === "live" && (
          <div className="official-start-block is-live">
            <div><strong>Competition live</strong><span>Structural rules are locked. Finish any active reciter before closing.</span></div>
            <button type="button" className="btn-ghost" disabled={state.sessionActive} onClick={() => { if (window.confirm("Close this competition? Results remain available, but no new reciter can start.")) dispatch({ type: "CLOSE_COMPETITION" }); }}>Close competition</button>
          </div>
        )}
        {state.competition.status === "closed" && (
          <div className="official-start-block is-closed">
            <div><strong>Competition closed</strong><span>Its records remain available and unchanged.</span></div>
            <button type="button" className="btn-primary" onClick={() => { if (window.confirm("Create a new draft? Existing records will remain in Records.")) { dispatch({ type: "NEW_COMPETITION" }); setIdentity({ name: "", edition: "" }); setPanelDraft(createPanelPreset("all", enabledCategories(DEFAULT_CONFIG))); setScoreDraft(cloneConfig(state.config)); setActiveTask("details"); } }}>New competition</button>
          </div>
        )}
      </section>
    );
  };

  let lastGroup = "";
  return (
    <main className="competition-setup-page">
      <section className={`sample-control-bar ${state.competition.isSample ? "is-active" : ""}`} aria-label="Sample competition controls">
        <div>
          {state.competition.isSample && <SampleBadge />}
          <span>
            <strong>{state.competition.isSample ? "Safe test competition loaded" : "Need test data?"}</strong>
            <small>{state.competition.isSample ? "All names and phone numbers are fictional. Sample records stay out of official CSV exports." : "Load a ready-to-run competition with four divisions and eight fictional participants."}</small>
          </span>
        </div>
        {state.competition.isSample ? (
          <button type="button" className="btn-ghost" disabled={state.competition.status === "live" || state.sessionActive} onClick={removeSampleData} title={state.competition.status === "live" ? "Close the sample competition before removing it" : undefined}>Remove sample data</button>
        ) : (
          <button type="button" className="btn-ghost" disabled={state.competition.status === "live" || state.sessionActive} onClick={loadSampleCompetition}>Load sample competition</button>
        )}
      </section>
      <div className="competition-setup-layout">
        <aside className="setup-task-list" aria-label="Competition setup tasks">
          <div className="setup-task-intro"><span>Competition setup</span><h1>Prepare competition {state.competition.isSample && <SampleBadge compact />}</h1><p>Complete each required task, then review and start {state.competition.isSample ? "the test session" : "officially"}.</p></div>
          <nav>
            {TASKS.map((task) => {
              const showGroup = task.group !== lastGroup;
              lastGroup = task.group;
              const locked = state.competition.status !== "draft" && task.id !== "review";
              const complete =
                state.competition.status === "draft"
                  ? sectionComplete(task.id)
                  : true;
              return (
                <Fragment key={task.id}>
                  {showGroup && <span className="setup-task-group">{task.group}</span>}
                  <button type="button" className={`${activeTask === task.id ? "is-active" : ""} ${complete ? "is-complete" : "has-attention"} ${locked ? "is-locked" : ""}`} aria-current={activeTask === task.id ? "step" : undefined} onClick={() => setActiveTask(task.id)}>
                    <span className="setup-task-copy"><strong>{task.label}</strong><small>{task.hint}</small></span>
                    <span className="setup-task-status">{statusText(complete, locked, task.id, state.competition.status, competitionDraftCount)}</span>
                  </button>
                </Fragment>
              );
            })}
          </nav>
        </aside>
        <div className="setup-workspace">{renderTask()}</div>
      </div>
    </main>
  );
}
