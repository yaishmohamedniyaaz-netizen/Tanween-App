import {
  Fragment,
  type ReactNode,
  useMemo,
  useRef,
  useState,
} from "react";
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
  createSampleJudgePanel,
  SAMPLE_COMPETITION_EDITION,
  SAMPLE_COMPETITION_NAME,
} from "../lib/sampleCompetition";
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
import { ParticipantRosterEditor } from "./ParticipantRosterEditor";

function SetupAccordionPanel({
  id,
  open,
  render,
}: {
  id: string;
  open: boolean;
  render: () => ReactNode;
}) {
  if (!open) return null;

  return (
    <div id={id} className="setup-checklist-panel-shell">
      <div className="setup-checklist-panel-clip">
        <div className="setup-checklist-panel">{render()}</div>
      </div>
    </div>
  );
}

export type SetupTask =
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
  { id: "divisions", group: "Competition", label: "Categories and portions", hint: "Age groups, recitation types and Quran ranges" },
  { id: "participants", group: "Competition", label: "Participants", hint: "Import and verify the roster" },
  { id: "marks", group: "Judging", label: "Marks and criteria", hint: "Criteria in use, marks and steps" },
  { id: "panel", group: "Judging", label: "Judging panel", hint: "Give every criterion an owner" },
  { id: "questions", group: "Questions", label: "Question rules", hint: "Ayah and printed-line policy" },
  { id: "question-bank", group: "Questions", label: "Draft questions", hint: "Build and preview passages" },
  { id: "review", group: "Launch", label: "Review and start", hint: "Check the competition setup" },
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

function cloneDivisions(divisions: CompetitionDivision[]): CompetitionDivision[] {
  return divisions.map((division) => ({
    ...division,
    quranPortion: { ...division.quranPortion },
  }));
}

function generatedCategoryName(division: Pick<CompetitionDivision, "ageGroup" | "category">): string {
  const age = division.ageGroup.trim();
  const recitation = division.category === "nubalaa" ? "Hifz" : "Baliagen";
  return age ? `${age} · ${recitation}` : recitation;
}

function categoryErrors(divisions: CompetitionDivision[]): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  const names = new Map<string, string>();
  const combinations = new Map<string, string>();
  divisions.forEach((division) => {
    const next: string[] = [];
    const age = division.ageGroup.trim();
    const name = division.name.trim();
    if (!age) next.push("Add an age group.");
    if (!name) next.push("Add a Category name.");
    if (division.quranPortion.kind === "juz-range" && (division.quranPortion.startJuz < 1 || division.quranPortion.endJuz > 30 || division.quranPortion.startJuz > division.quranPortion.endJuz)) next.push("Use a valid Juz range from 1 to 30.");
    if (division.quranPortion.kind === "surah-range" && (division.quranPortion.startSurah < 1 || division.quranPortion.endSurah > 114 || division.quranPortion.startSurah > division.quranPortion.endSurah)) next.push("Use a valid Surah range from 1 to 114.");
    const nameKey = name.toLocaleLowerCase();
    if (nameKey) {
      if (names.has(nameKey)) next.push("Category names must be unique.");
      else names.set(nameKey, division.id);
    }
    const combinationKey = `${age.toLocaleLowerCase()}::${division.category}`;
    if (age) {
      if (combinations.has(combinationKey)) next.push("This age group and recitation type already has a Category.");
      else combinations.set(combinationKey, division.id);
    }
    if (next.length) errors[division.id] = next;
  });
  return errors;
}

export function CompetitionSetup({
  onBack,
  onOpenQuestionWorkspace,
}: {
  onBack: () => void;
  onOpenQuestionWorkspace: () => void;
}) {
  const { state, dispatch } = useJudging();
  const [activeTask, setActiveTask] = useState<SetupTask | null>(
    state.competition.isSample || state.competition.status !== "draft"
      ? "review"
      : "details",
  );
  const taskTriggerRefs = useRef<
    Partial<Record<SetupTask, HTMLButtonElement | null>>
  >({});
  const [identity, setIdentity] = useState({
    name: state.competition.name,
    edition: state.competition.edition,
  });
  const [panelDraft, setPanelDraft] = useState(() => clonePanel(state.panel));
  const [deviceJudgeId, setDeviceJudgeId] = useState(
    state.deviceJudgeId ?? state.panel.seats[0]?.id ?? "",
  );
  const [scoreDraft, setScoreDraft] = useState(() => cloneConfig(state.config));
  const [divisionDrafts, setDivisionDrafts] = useState(() => cloneDivisions(state.competition.divisions));
  const [editingDivisionId, setEditingDivisionId] = useState<string | null>(null);
  const [participantSettingsDraft, setParticipantSettingsDraft] = useState(() => ({
    ...state.competition.participantEntrySettings,
    institutions: [...state.competition.participantEntrySettings.institutions],
  }));
  const [questionPolicyDraft, setQuestionPolicyDraft] = useState(() => ({ ...state.competition.questionPolicy }));
  const [rosterMessage, setRosterMessage] = useState("");
  const [rosterEditorOpen, setRosterEditorOpen] = useState(false);
  const [institutionDraft, setInstitutionDraft] = useState("");

  const recitationInProgress =
    state.sessionActive || Boolean(state.preparedRecitation);
  const editable =
    state.competition.status === "draft" && !recitationInProgress;
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
  const divisionValidation = useMemo(() => categoryErrors(divisionDrafts), [divisionDrafts]);
  const divisionsValid = divisionDrafts.length > 0 && Object.keys(divisionValidation).length === 0;

  const returnToTaskTrigger = (task: SetupTask, focus: boolean) => {
    window.requestAnimationFrame(() => {
      const trigger = taskTriggerRefs.current[task];
      if (!trigger) return;
      if (focus) trigger.focus({ preventScroll: true });
      trigger.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  };

  const closeActiveTask = () => {
    const closingTask = activeTask;
    setActiveTask(null);
    if (closingTask) returnToTaskTrigger(closingTask, true);
  };

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
    closeActiveTask();
  };

  const savePanel = () => {
    if (!editable || !panelValidation.valid || !panelDeviceValid) return;
    dispatch({ type: "SET_PANEL", panel: panelDraft, deviceJudgeId });
    closeActiveTask();
  };

  const saveMarks = () => {
    if (!editable || marksTotal !== TOTAL_MARKS) return;
    dispatch({ type: "SET_SCORE_CONFIG", config: scoreDraft });
    closeActiveTask();
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

  const addDivision = () => {
    const id = `division-${Date.now().toString(36)}`;
    setDivisionDrafts((current) => [...current, {
      id,
      name: "Hifz",
      ageGroup: "",
      category: "nubalaa",
      quranPortion: { kind: "full-quran" },
    }]);
    setEditingDivisionId(id);
  };

  const patchDivision = (id: string, patch: Partial<CompetitionDivision>) => {
    setDivisionDrafts((current) => current.map((division) => {
      if (division.id !== id) return division;
      const updated = { ...division, ...patch };
      const previousGenerated = generatedCategoryName(division);
      if ((patch.ageGroup !== undefined || patch.category !== undefined) && (!division.name.trim() || division.name === previousGenerated)) updated.name = generatedCategoryName(updated);
      return updated;
    }));
  };

  const saveDivisions = () => {
    if (!editable || !divisionsValid) return;
    dispatch({ type: "SET_DIVISIONS", divisions: cloneDivisions(divisionDrafts) });
    setEditingDivisionId(null);
    closeActiveTask();
  };

  const updateParticipantEntrySettings = (
    patch: Partial<typeof state.competition.participantEntrySettings>,
  ) => {
    if (!editable) return;
    setParticipantSettingsDraft((current) => ({ ...current, ...patch }));
  };

  const addInstitutionChoice = () => {
    const institution = institutionDraft.trim();
    if (!institution) return;
    const exists = participantSettingsDraft.institutions.some(
      (choice) => choice.toLocaleLowerCase() === institution.toLocaleLowerCase(),
    );
    if (!exists) {
      updateParticipantEntrySettings({
        institutions: [
          ...participantSettingsDraft.institutions,
          institution,
        ],
      });
    }
    setInstitutionDraft("");
  };

  const saveParticipantSettings = () => {
    if (!editable) return;
    dispatch({
      type: "SET_COMPETITION",
      competition: {
        ...state.competition,
        participantEntrySettings: {
          ...participantSettingsDraft,
          institutions: [...participantSettingsDraft.institutions],
        },
      },
    });
    closeActiveTask();
  };

  const saveQuestionPolicy = () => {
    if (!editable) return;
    dispatch({ type: "SET_QUESTION_POLICY", policy: questionPolicyDraft });
    closeActiveTask();
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

  const resetTaskDraft = (task: SetupTask | null) => {
    if (task === "details") setIdentity({ name: state.competition.name, edition: state.competition.edition });
    if (task === "divisions") {
      setDivisionDrafts(cloneDivisions(state.competition.divisions));
      setEditingDivisionId(null);
    }
    if (task === "participants") {
      setParticipantSettingsDraft({
        ...state.competition.participantEntrySettings,
        institutions: [...state.competition.participantEntrySettings.institutions],
      });
      setInstitutionDraft("");
    }
    if (task === "marks") setScoreDraft(cloneConfig(state.config));
    if (task === "panel") {
      setPanelDraft(clonePanel(state.panel));
      setDeviceJudgeId(state.deviceJudgeId ?? state.panel.seats[0]?.id ?? "");
    }
    if (task === "questions") setQuestionPolicyDraft({ ...state.competition.questionPolicy });
  };

  const taskDirty = (task: SetupTask | null): boolean => {
    if (!task || !editable) return false;
    if (task === "details") return identity.name !== state.competition.name || identity.edition !== state.competition.edition;
    if (task === "divisions") return JSON.stringify(divisionDrafts) !== JSON.stringify(state.competition.divisions);
    if (task === "participants") return JSON.stringify(participantSettingsDraft) !== JSON.stringify(state.competition.participantEntrySettings);
    if (task === "marks") return JSON.stringify(scoreDraft) !== JSON.stringify(state.config);
    if (task === "panel") return JSON.stringify(panelDraft) !== JSON.stringify(state.panel) || deviceJudgeId !== (state.deviceJudgeId ?? "");
    if (task === "questions") return JSON.stringify(questionPolicyDraft) !== JSON.stringify(state.competition.questionPolicy);
    return false;
  };

  const requestTask = (next: SetupTask) => {
    if (activeTask === next) {
      if (taskDirty(activeTask) && !window.confirm("Discard the unsaved changes in this setup task?")) return;
      resetTaskDraft(activeTask);
      closeActiveTask();
      return;
    }
    if (taskDirty(activeTask) && !window.confirm("Discard the unsaved changes in the open setup task?")) return;
    resetTaskDraft(activeTask);
    resetTaskDraft(next);
    setActiveTask(next);
    returnToTaskTrigger(next, true);
  };

  const taskSummary = (task: SetupTask): string => {
    if (task === "details") return state.competition.name ? `${state.competition.name}${state.competition.edition ? ` · ${state.competition.edition}` : ""}` : "Name and edition";
    if (task === "divisions") return state.competition.divisions.length ? `${state.competition.divisions.length} ${state.competition.divisions.length === 1 ? "Category" : "Categories"}` : "No Categories";
    if (task === "participants") return state.roster.length ? `${state.roster.length} participants` : state.rosterDraft ? `${state.rosterDraft.rows.length} row draft` : "No participants";
    if (task === "marks") return `${enabledMarksTotal(state.config)} / ${TOTAL_MARKS}`;
    if (task === "panel") return `${state.panel.seats.length} judge${state.panel.seats.length === 1 ? "" : "s"}`;
    if (task === "questions") return `${state.competition.questionPolicy.mode === "manual" ? "Manual" : "Tahqeeq set"} · ${state.competition.questionPolicy.targetRecitationLines} lines`;
    if (task === "question-bank") return competitionDraftCount ? `${competitionDraftCount} draft${competitionDraftCount === 1 ? "" : "s"}` : "Optional · no drafts";
    if (state.competition.status === "live") return "Competition live";
    if (state.competition.status === "closed") return "Competition closed";
    return readiness.ready ? "Ready to start" : `${readiness.issues.length} item${readiness.issues.length === 1 ? "" : "s"} need attention`;
  };

  const resetLocalDrafts = (sample: boolean) => {
    const panel = sample
      ? createSampleJudgePanel(DEFAULT_CONFIG)
      : createPanelPreset("all", enabledCategories(DEFAULT_CONFIG));
    setIdentity(sample
      ? { name: SAMPLE_COMPETITION_NAME, edition: SAMPLE_COMPETITION_EDITION }
      : { name: "", edition: "" });
    setPanelDraft(panel);
    setDeviceJudgeId(panel.seats[0]?.id ?? "judge-1");
    setScoreDraft(cloneConfig(DEFAULT_CONFIG));
    setDivisionDrafts([]);
    setEditingDivisionId(null);
    setParticipantSettingsDraft({ institutions: [], defaultMuqarrar: "", defaultInstitution: "" });
    setRosterEditorOpen(false);
    setInstitutionDraft("");
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
        "Replace the current draft with the Tahqeeq practice competition? Official records already saved in Results will remain unchanged.",
      )
    ) return;
    dispatch({ type: "LOAD_SAMPLE_COMPETITION" });
    resetLocalDrafts(true);
    setRosterMessage("Practice competition and fictional participant list loaded.");
    setActiveTask("review");
  };

  const removeSampleData = () => {
    if (
      !window.confirm(
        "Remove the practice competition, its fictional participants, and its practice results from this device? Official records will not be changed.",
      )
    ) return;
    dispatch({ type: "REMOVE_SAMPLE_DATA" });
    resetLocalDrafts(false);
    setRosterMessage("");
    setActiveTask("details");
  };

  const renderTask = (task: SetupTask) => {
    if (task === "details") {
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
              <button type="button" className="btn-ghost" onClick={() => resetTaskDraft("details")}>Cancel</button>
              <button type="button" className="btn-primary" disabled={!identity.name.trim() || !identity.edition.trim() || !taskDirty("details")} onClick={saveIdentity}>
                Save details
              </button>
            </div>
          )}
        </section>
      );
    }

    if (task === "divisions") {
      return (
        <section className="setup-work-card" aria-labelledby="setup-divisions-title">
          <div className="setup-work-head">
            <span className="setup-step">Competition</span>
            <h2 id="setup-divisions-title">Categories and Quran portions</h2>
            <p>Each participant category combines an age group, recitation type and eligible Quran range.</p>
          </div>
          <div className="division-list category-summary-list">
            {divisionDrafts.map((division) => (
              <article className={`division-card category-summary-row ${editingDivisionId === division.id ? "is-editing" : ""} ${(divisionValidation[division.id] ?? []).length ? "has-error" : ""}`} key={division.id}>
                <div className="division-card-head">
                  <button type="button" className="category-summary-main" aria-expanded={editingDivisionId === division.id} onClick={() => setEditingDivisionId((current) => current === division.id ? null : division.id)}>
                    <span><strong>{division.name || generatedCategoryName(division)}</strong><small>{division.ageGroup || "Age group missing"} · {division.category === "nubalaa" ? "Hifz" : "Baliagen"} · {portionLabel(division.quranPortion)}</small></span>
                    <span className="category-row-state">{(divisionValidation[division.id] ?? []).length ? "Needs attention" : editingDivisionId === division.id ? "Editing" : "Edit"}</span>
                  </button>
                  {editable && (
                    <span className="category-summary-actions">
                      <button type="button" className="btn-ghost" onClick={() => { const id = `division-${Date.now().toString(36)}`; setDivisionDrafts((current) => [...current, { ...division, id, name: `${division.name} copy`, quranPortion: { ...division.quranPortion } }]); setEditingDivisionId(id); }}>Duplicate</button>
                      <button type="button" className="btn-ghost" onClick={() => { const participantCount = state.roster.filter((entry) => entry.ageGroup.trim().toLocaleLowerCase() === division.ageGroup.trim().toLocaleLowerCase() && entry.category === division.category).length; if (participantCount && !window.confirm(`Remove this Category? ${participantCount} participant${participantCount === 1 ? " is" : "s are"} assigned and must be reassigned before launch.`)) return; setDivisionDrafts((current) => current.filter((item) => item.id !== division.id)); setEditingDivisionId(null); }}>Remove</button>
                    </span>
                  )}
                </div>
                {editingDivisionId === division.id && <div className="division-fields category-editor-fields">
                  <label>
                    <span>Category name</span>
                    <input value={division.name} disabled={!editable} onChange={(event) => patchDivision(division.id, { name: event.target.value })} />
                  </label>
                  <label>
                    <span>Age group</span>
                    <input list="competition-age-groups" value={division.ageGroup} disabled={!editable} placeholder="Select or add an age group" onChange={(event) => patchDivision(division.id, { ageGroup: event.target.value })} />
                  </label>
                  <label>
                    <span>Recitation type</span>
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
                  {(divisionValidation[division.id] ?? []).length > 0 && <div className="category-editor-errors" role="alert"><strong>Check this Category</strong><ul>{divisionValidation[division.id].map((error) => <li key={error}>{error}</li>)}</ul></div>}
                </div>}
              </article>
            ))}
          </div>
          <datalist id="competition-age-groups">{[...new Set(divisionDrafts.map((division) => division.ageGroup.trim()).filter(Boolean))].map((ageGroup) => <option value={ageGroup} key={ageGroup} />)}</datalist>
          {editable && (
            <button type="button" className="add-judge" onClick={addDivision}>
              <Icon name="plus" size={13} /> Add Category
            </button>
          )}
          {!divisionDrafts.length && <p className="setup-empty-note">Add the first Category to continue.</p>}
          {editable && (
            <div className="setup-work-actions">
              <button type="button" className="btn-ghost" onClick={() => { setDivisionDrafts(cloneDivisions(state.competition.divisions)); setEditingDivisionId(null); }}>Cancel</button>
              <button type="button" className="btn-primary" disabled={!divisionsValid || JSON.stringify(divisionDrafts) === JSON.stringify(state.competition.divisions)} onClick={saveDivisions}>Save Categories</button>
            </div>
          )}
        </section>
      );
    }

    if (task === "participants") {
      return (
        <section className="setup-work-card" aria-labelledby="setup-participants-title">
          <div className="setup-work-head">
            <div>
              <span className="setup-step">Competition</span>
              <h2 id="setup-participants-title">Participants</h2>
              <p>Build, paste or upload one checked list, then review every row before it becomes official.</p>
            </div>
          </div>
          <div className="roster-setup-overview">
            <div className="roster-setup-count">
              <span>Applied roster</span>
              <strong>{state.roster.length}</strong>
              <small>{state.roster.length ? `${state.roster.filter((entry) => entry.judged).length} already finished` : "No participants applied yet"}</small>
            </div>
            <div className="roster-setup-mode">
              <span>Numbering</span>
              <strong>{state.competition.participantNumbering === "automatic" ? "Automatic" : "Supplied"}</strong>
              <small>{state.competition.participantNumbering === "automatic" ? "Clean numbers follow the final row order" : "Competition numbers are preserved"}</small>
            </div>
          </div>
          {editable && (
            <details className="participant-entry-settings participant-entry-disclosure">
              <summary><span><strong>Entry defaults</strong><small>{participantSettingsDraft.defaultMuqarrar ? `${participantSettingsDraft.defaultMuqarrar === "feshey-kolhu" ? "Feshey kolhu" : "Nimey kolhu"}${participantSettingsDraft.defaultInstitution ? ` · ${participantSettingsDraft.defaultInstitution}` : ""}` : participantSettingsDraft.defaultInstitution || "No defaults"}</small></span><span>Optional</span></summary>
              <div className="participant-entry-settings-head">
                <div>
                  <span>Entry helper</span>
                  <strong id="participant-entry-settings-title">Participant defaults</strong>
                  <small>New rows can inherit a starting side and institution while keeping every field editable.</small>
                </div>
                <div className="participant-default-side">
                  <span>Default Muqarrar start</span>
                  <div role="radiogroup" aria-label="Default Muqarrar start">
                    {([
                      ["", "No default"],
                      ["feshey-kolhu", "Feshey kolhu"],
                      ["nimey-kolhu", "Nimey kolhu"],
                    ] as const).map(([value, label]) => (
                      <button
                        type="button"
                        role="radio"
                        aria-checked={participantSettingsDraft.defaultMuqarrar === value}
                        className={participantSettingsDraft.defaultMuqarrar === value ? "is-active" : ""}
                        onClick={() => updateParticipantEntrySettings({ defaultMuqarrar: value })}
                        key={value || "none"}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="participant-institution-settings">
                <div className="participant-institution-controls">
                  <label>
                    <span>Institution choices</span>
                    <span className="participant-institution-add">
                      <input
                        value={institutionDraft}
                        placeholder="School, class or independent entry"
                        onChange={(event) => setInstitutionDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addInstitutionChoice();
                          }
                        }}
                      />
                      <button type="button" className="btn-ghost" disabled={!institutionDraft.trim()} onClick={addInstitutionChoice}>Add</button>
                    </span>
                  </label>
                  <label>
                    <span>Default institution</span>
                    <select
                      value={participantSettingsDraft.defaultInstitution}
                      onChange={(event) => updateParticipantEntrySettings({ defaultInstitution: event.target.value })}
                    >
                      <option value="">No default</option>
                      {participantSettingsDraft.institutions.map((institution) => (
                        <option value={institution} key={institution}>{institution}</option>
                      ))}
                    </select>
                  </label>
                </div>
                {participantSettingsDraft.institutions.length > 0 ? (
                  <div className="participant-institution-chips" aria-label="Saved institution choices">
                    {participantSettingsDraft.institutions.map((institution) => (
                      <span key={institution}>
                        {institution}
                        <button
                          type="button"
                          aria-label={`Remove ${institution}`}
                          onClick={() => updateParticipantEntrySettings({
                            institutions: participantSettingsDraft.institutions.filter((choice) => choice !== institution),
                            defaultInstitution: participantSettingsDraft.defaultInstitution === institution
                              ? ""
                              : participantSettingsDraft.defaultInstitution,
                          })}
                        >&times;</button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <small className="participant-institution-empty">Optional. Free-text institutions remain allowed in the participant list.</small>
                )}
              </div>
              <div className="setup-work-actions"><button type="button" className="btn-ghost" onClick={() => setParticipantSettingsDraft({ ...state.competition.participantEntrySettings, institutions: [...state.competition.participantEntrySettings.institutions] })}>Cancel</button><button type="button" className="btn-primary" disabled={JSON.stringify(participantSettingsDraft) === JSON.stringify(state.competition.participantEntrySettings)} onClick={saveParticipantSettings}>Save defaults</button></div>
            </details>
          )}
          {state.rosterDraft && (
            <div className="roster-draft-resume" role="status">
              <span><i aria-hidden="true" /><strong>Participant draft saved</strong><small>{state.rosterDraft.rows.length} row{state.rosterDraft.rows.length === 1 ? "" : "s"} waiting for review on this device.</small></span>
              <button type="button" className="btn-ghost" onClick={() => setRosterEditorOpen(true)}>Resume draft</button>
            </div>
          )}
          <div className="roster-setup-paths">
            <div><span>1</span><strong>Bring in the list</strong><small>Add names here, paste spreadsheet cells, or upload Excel/CSV.</small></div>
            <div><span>2</span><strong>Fix in one place</strong><small>Imported rows stay visible with exact fields highlighted.</small></div>
            <div><span>3</span><strong>Review before apply</strong><small>See additions, edits, removals and numbering before replacement.</small></div>
          </div>
          {editable && (
            <div className="roster-setup-primary">
              <button type="button" className="btn-primary" onClick={() => setRosterEditorOpen(true)}>
                {state.rosterDraft ? "Resume participant list" : state.roster.length ? "Open participant list" : "Create participant list"}
                <Icon name="chevron" size={15} />
              </button>
              <span>Drafts save automatically on this device.</span>
            </div>
          )}
          {!editable && (
            <div className="setup-note">The participant list was frozen when this competition started.</div>
          )}
          {rosterMessage && <p className="setup-note">{rosterMessage}</p>}
          {editable && state.roster.length > 0 && !state.rosterDraft && (
            <button type="button" className="dialog-link" onClick={() => {
              if (window.confirm("Remove the applied participant list? Competition records already saved will not change.")) dispatch({ type: "CLEAR_ROSTER" });
            }}>
              Remove applied participant list
            </button>
          )}
        </section>
      );
    }

    if (task === "panel") {
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
          {editable && <div className="setup-work-actions"><button type="button" className="btn-ghost" onClick={() => resetTaskDraft("panel")}>Cancel</button><button type="button" className="btn-primary" disabled={!panelValidation.valid || !panelDeviceValid || !taskDirty("panel")} onClick={savePanel}>Save judging panel</button></div>}
        </section>
      );
    }

    if (task === "marks") {
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
          {editable && <div className="setup-work-actions"><button type="button" className="btn-ghost" onClick={() => resetTaskDraft("marks")}>Cancel</button><button type="button" className="btn-primary" disabled={marksTotal !== TOTAL_MARKS || !taskDirty("marks")} onClick={saveMarks}>Save mark rules</button></div>}
        </section>
      );
    }

    if (task === "questions") {
      const policy = questionPolicyDraft;
      return (
        <section className="setup-work-card" aria-labelledby="setup-questions-title">
          <div className="setup-work-head"><span className="setup-step">Questions</span><h2 id="setup-questions-title">Question rules</h2><p>Every official question starts at an ayah and resolves against the fixed 1405H printed lines.</p></div>
          <div className="question-mode-options">
            <button type="button" disabled={!editable} className={policy.mode === "manual" ? "is-active" : ""} onClick={() => setQuestionPolicyDraft((current) => ({ ...current, mode: "manual" }))}>
              <span className="question-mode-check" aria-hidden="true" />
              <span><strong>Manual questions</strong><small>Judges use questions prepared outside Tahqeeq for this foundation release.</small></span>
            </button>
            <button type="button" disabled title="Available after the reviewed question builder is implemented">
              <span className="question-mode-check" aria-hidden="true" />
              <span><strong>Tahqeeq question set</strong><small>The 20-number draw is ready. Official use requires a separately reviewed and frozen set of at least 20 questions.</small></span>
            </button>
          </div>
          <div className="question-rule-grid">
            <label><span>Target printed lines</span><select value={policy.targetRecitationLines} disabled={!editable} onChange={(event) => setQuestionPolicyDraft((current) => ({ ...current, targetRecitationLines: Number(event.target.value) }))}>{Array.from({ length: 11 }, (_, index) => index + 5).map((value) => <option key={value} value={value}>{value} lines</option>)}</select></label>
            <label><span>Final printed line</span><select value={policy.finalPrintedLineScoring} disabled={!editable} onChange={(event) => setQuestionPolicyDraft((current) => ({ ...current, finalPrintedLineScoring: event.target.value as "include" | "exclude" }))}><option value="exclude">Do not deduct marks</option><option value="include">Include in marking</option></select></label>
          </div>
          <div className="ayah-rule-summary">
            <Icon name="check" size={16} />
            <span><strong>Fixed ending rule</strong> Start at the chosen ayah. Continue to the first complete ayah ending on or after line {policy.targetRecitationLines}.</span>
          </div>
          <p className="question-foundation-note">No AI, OCR or paid API is used. Continue to Draft questions to prepare and preview passages from all 604 local QPC V1 pages.</p>
          {editable && <div className="setup-work-actions"><button type="button" className="btn-ghost" onClick={() => setQuestionPolicyDraft({ ...state.competition.questionPolicy })}>Cancel</button><button type="button" className="btn-primary" disabled={JSON.stringify(questionPolicyDraft) === JSON.stringify(state.competition.questionPolicy)} onClick={saveQuestionPolicy}>Save question rules</button></div>}
        </section>
      );
    }

    if (task === "question-bank") {
      return (
        <section className="setup-work-card question-builder-launch-card" aria-labelledby="setup-question-builder-title">
          <div className="setup-work-head">
            <span className="setup-step">Questions</span>
            <h2 id="setup-question-builder-title">Draft questions</h2>
            <p>Prepare exact ayah-first passages on the real Mushaf. Drafts stay separate from official competition delivery.</p>
          </div>
          <div className="question-workspace-summary"><span><strong>{competitionDraftCount}</strong><small>prepared draft{competitionDraftCount === 1 ? "" : "s"}</small></span><span><strong>{state.competition.questionPolicy.mode === "manual" ? "Optional" : "Required"}</strong><small>{state.competition.questionPolicy.mode === "manual" ? "External questions remain allowed" : "Review before official use"}</small></span></div>
          <button type="button" className="btn-primary question-workspace-open" onClick={onOpenQuestionWorkspace}>Open question workspace <Icon name="chevron" size={15} /></button>
        </section>
      );
    }

    return (
      <section className="setup-work-card setup-review-card" aria-labelledby="setup-review-title">
        <div className="setup-work-head"><span className="setup-step">Launch</span><h2 id="setup-review-title">Review and start</h2><p>Confirm the competition, panel and question rules before judging begins.</p></div>
        <div className="review-summary-list">
          <button type="button" onClick={() => requestTask("details")}><span>Competition</span><strong>{state.competition.name || "Not set"}</strong><small>{state.competition.edition || "Edition missing"}</small><em>Change</em></button>
          <button type="button" onClick={() => requestTask("divisions")}><span>Categories</span><strong>{state.competition.divisions.length || "None"}</strong><small>{state.competition.divisions.map((division) => `${division.name || "Unnamed"} · ${portionLabel(division.quranPortion)}`).join("; ") || "Add a Category"}</small><em>Change</em></button>
          <button type="button" onClick={() => requestTask("participants")}><span>Participants</span><strong>{state.roster.length || "None"}</strong><small>{state.roster.length ? "Validated roster loaded" : "Upload the participant roster"}</small><em>Change</em></button>
          <button type="button" onClick={() => requestTask("panel")}><span>Judging panel</span><strong>{state.panel.seats.length} judge{state.panel.seats.length === 1 ? "" : "s"}</strong><small>{state.panel.seats.map((seat) => `${seat.name || seat.label}: ${categoryListLabel(seat.categories)}`).join("; ")}</small><em>Change</em></button>
          <button type="button" onClick={() => requestTask("marks")}><span>Marks</span><strong>{enabledMarksTotal(state.config)} / {TOTAL_MARKS}</strong><small>{categoryListLabel(judgedCategories)}</small><em>Change</em></button>
          <button type="button" onClick={() => requestTask("questions")}><span>Questions</span><strong>{state.competition.questionPolicy.mode === "manual" ? "Manual questions" : "Tahqeeq set"}</strong><small>{state.competition.questionPolicy.targetRecitationLines} lines · final line {state.competition.questionPolicy.finalPrintedLineScoring === "exclude" ? "not marked" : "marked"}</small><em>Change</em></button>
          <button type="button" onClick={() => requestTask("question-bank")}><span>Draft questions</span><strong>{competitionDraftCount}</strong><small>{competitionDraftCount ? "Prepared locally for later review" : "Optional during manual-question competitions"}</small><em>Open</em></button>
        </div>
        {state.competition.status === "draft" && !readiness.ready && (
          <div className="readiness-issues" role="alert">
            <strong>{readiness.issues.length} item{readiness.issues.length === 1 ? "" : "s"} need attention</strong>
            <ul>{readiness.issues.map((issue, index) => {
              const task: SetupTask = issue.section === "competition" ? "details" : issue.section;
              return <li key={`${issue.section}-${index}`}><button type="button" onClick={() => requestTask(task)}>{issue.message}<span>Open</span></button></li>;
            })}</ul>
          </div>
        )}
        {state.competition.status === "draft" && (
          <div className="official-start-block">
            <div><strong>{state.competition.isSample ? "Start practice competition" : "Start officially"}</strong><span>This freezes the roster, categories, panel, marks, question rules and Mushaf data version.</span></div>
            <button type="button" className="btn-primary" disabled={!readiness.ready} onClick={() => { dispatch({ type: "START_COMPETITION" }); onBack(); }}>Start competition</button>
          </div>
        )}
        {state.competition.status === "live" && (
          <div className="official-start-block is-live">
            <div><strong>Competition live</strong><span>Structural rules are locked. Finish or replace any prepared reciter before closing.</span></div>
            <button type="button" className="btn-ghost" disabled={recitationInProgress} onClick={() => { if (window.confirm("Close this competition? Results remain available, but no new reciter can start.")) dispatch({ type: "CLOSE_COMPETITION" }); }}>Close competition</button>
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

  if (rosterEditorOpen) {
    return (
      <ParticipantRosterEditor
        onBack={() => setRosterEditorOpen(false)}
        onApplied={(count) => {
          setRosterMessage(`${count} participants applied.`);
          setRosterEditorOpen(false);
        }}
      />
    );
  }

  const completedTaskCount = TASKS.filter((task) =>
    sectionComplete(task.id),
  ).length;
  const setupHeading =
    state.competition.status === "draft"
      ? "Prepare competition"
      : state.competition.name || "Competition setup";
  let lastGroup = "";
  return (
    <main className="competition-setup-page">
      <div className="setup-checklist-shell">
        <header className="setup-checklist-intro">
          {state.competition.status !== "draft" && <span>Setup</span>}
          <h1>{setupHeading}</h1>
          <div
            className="setup-progress"
            aria-label={`${completedTaskCount} of ${TASKS.length} setup tasks complete`}
          >
            <span
              style={{
                width: `${(completedTaskCount / TASKS.length) * 100}%`,
              }}
            />
            <small>{completedTaskCount} of {TASKS.length} ready</small>
          </div>
          <div className="setup-sample-utility" aria-label="Practice competition controls">
            {state.competition.isSample && (
              <span>Practice data · not official</span>
            )}
            {state.competition.isSample ? (
              <button
                type="button"
                className="btn-ghost"
                disabled={state.competition.status === "live" || state.sessionActive}
                onClick={removeSampleData}
                title={state.competition.status === "live" ? "Close the practice competition before removing it" : undefined}
              >
                Remove practice data
              </button>
            ) : (
              <button
                type="button"
                className="btn-ghost"
                disabled={state.competition.status === "live" || state.sessionActive}
                onClick={loadSampleCompetition}
              >
                Load practice competition
              </button>
            )}
          </div>
        </header>
        <div className="setup-checklist" aria-label="Competition setup tasks">
            {TASKS.map((task) => {
              const showGroup = task.group !== lastGroup;
              lastGroup = task.group;
              const locked = state.competition.status !== "draft" && task.id !== "review";
              const complete = sectionComplete(task.id);
              const summary = taskSummary(task.id);
              const context =
                task.id === "details" && state.competition.name
                  ? state.competition.name
                  : task.hint;
              const value = locked
                ? "Locked"
                : task.id === "details"
                  ? state.competition.edition || "Needs setup"
                  : summary;
              const stateLabel = statusText(
                complete,
                locked,
                task.id,
                state.competition.status,
                competitionDraftCount,
              );
              return (
                <Fragment key={task.id}>
                  {showGroup && <span className="setup-task-group">{task.group}</span>}
                  <section className={`setup-checklist-item ${activeTask === task.id ? "is-active" : ""} ${complete ? "is-complete" : "has-attention"} ${locked ? "is-locked" : ""}`}>
                    <button
                      ref={(node) => { taskTriggerRefs.current[task.id] = node; }}
                      type="button"
                      className="setup-checklist-trigger"
                      aria-label={`${task.label}, ${stateLabel}, ${value}`}
                      aria-expanded={activeTask === task.id}
                      aria-controls={`setup-task-panel-${task.id}`}
                      onClick={() => requestTask(task.id)}
                    >
                      <span className="setup-checklist-mark" aria-hidden="true">{complete ? <Icon name="check" size={14} /> : <i />}</span>
                      <span className="setup-task-copy"><strong>{task.label}</strong><small>{context}</small></span>
                      <span className="setup-task-value">{value}</span>
                      <span className="setup-checklist-chevron" aria-hidden="true"><Icon name="chevron" size={15} /></span>
                    </button>
                    <SetupAccordionPanel
                      id={`setup-task-panel-${task.id}`}
                      open={activeTask === task.id}
                      render={() => renderTask(task.id)}
                    />
                  </section>
                </Fragment>
              );
            })}
        </div>
      </div>
    </main>
  );
}
