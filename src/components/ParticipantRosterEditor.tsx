import { useEffect, useMemo, useRef, useState } from "react";
import {
  createBlankRosterDraftRow,
  createRosterDraftFromRoster,
  createRosterDraftFromRows,
  DEFAULT_PARTICIPANT_TEMPLATE_OPTIONS,
  downloadParticipantTemplate,
  fillEmptyRosterFields,
  importedCategoryGroups,
  mapImportedCategory,
  parseDelimitedRosterText,
  parseRosterFileToDraft,
  recordsFromRosterGrid,
  rosterDraftComparison,
  validateRosterDraft,
  type RosterColumnKey,
  type RosterDraftField,
  type ParticipantTemplateOptions,
} from "../lib/roster";
import { divisionLabel } from "../lib/participantPresentation";
import { normalizeMuqarrarSide } from "../lib/participants";
import { useJudging } from "../state/store";
import type { RosterDraft, RosterDraftRow } from "../types";
import { Icon } from "./Icon";

const COLUMN_OPTIONS: Array<{ value: RosterColumnKey; label: string }> = [
  { value: "ignore", label: "Ignore column" },
  { value: "number", label: "Participant number" },
  { value: "name", label: "Name" },
  { value: "division", label: "Category" },
  { value: "ageGroup", label: "Age group (older template)" },
  { value: "category", label: "Recitation type (older template)" },
  { value: "muqarrar", label: "Muqarrar start" },
  { value: "institution", label: "Institution" },
  { value: "phone", label: "Phone number" },
];

function draftWithUpdate(draft: RosterDraft, patch: Partial<RosterDraft>): RosterDraft {
  return { ...draft, ...patch, updatedAt: Date.now() };
}

const CATEGORY_REQUIRED_ID = "category-required";

export function ParticipantRosterEditor({
  onBack,
  onApplied,
}: {
  onBack: () => void;
  onApplied: (count: number) => void;
}) {
  const { state, dispatch } = useJudging();
  const initialDraft = useRef<RosterDraft | null>(null);
  if (!initialDraft.current || initialDraft.current.competitionId !== state.competition.id) {
    initialDraft.current = createRosterDraftFromRoster({
      roster: state.roster,
      competitionId: state.competition.id,
      divisions: state.competition.divisions,
      numberingMode: state.competition.participantNumbering,
    });
  }
  const draft =
    state.rosterDraft?.competitionId === state.competition.id
      ? state.rosterDraft
      : initialDraft.current;
  const validation = useMemo(
    () => validateRosterDraft(draft, state.competition.divisions),
    [draft, state.competition.divisions],
  );
  const comparison = useMemo(
    () => rosterDraftComparison(state.roster, validation.entries),
    [state.roster, validation.entries],
  );
  const categoryGroups = useMemo(() => {
    const groups = new Map<string, {
      id: string;
      label: string;
      rows: typeof validation.rows;
    }>();
    for (const validatedRow of validation.rows) {
      const division = state.competition.divisions.find(
        (candidate) => candidate.id === validatedRow.row.divisionId,
      );
      const id = division?.id ?? CATEGORY_REQUIRED_ID;
      let group = groups.get(id);
      if (!group) {
        group = {
          id,
          label: division ? divisionLabel(division) : "Category required",
          rows: [],
        };
        groups.set(id, group);
      }
      group.rows.push(validatedRow);
    }
    const ordered = [...groups.values()];
    const required = ordered.find((group) => group.id === CATEGORY_REQUIRED_ID);
    return required
      ? [required, ...ordered.filter((group) => group.id !== CATEGORY_REQUIRED_ID)]
      : ordered;
  }, [state.competition.divisions, validation.rows]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteMapping, setPasteMapping] = useState<RosterColumnKey[]>([]);
  const [firstRowIsHeader, setFirstRowIsHeader] = useState(true);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateOptions, setTemplateOptions] = useState<ParticipantTemplateOptions>(
    () => ({ ...DEFAULT_PARTICIPANT_TEMPLATE_OPTIONS }),
  );
  const [reviewOpen, setReviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deleted, setDeleted] = useState<{ row: RosterDraftRow; index: number } | null>(null);
  const [bulkDivision, setBulkDivision] = useState("");
  const [bulkMuqarrar, setBulkMuqarrar] = useState<string>(
    state.competition.participantEntrySettings.defaultMuqarrar,
  );
  const [bulkInstitution, setBulkInstitution] = useState(
    state.competition.participantEntrySettings.defaultInstitution,
  );
  const [bulkScope, setBulkScope] = useState("all");
  const [importMappings, setImportMappings] = useState<Record<string, string>>({});
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    setExpandedCategoryIds((current) => {
      const next = new Set(current);
      for (const group of categoryGroups) {
        if (
          group.id === CATEGORY_REQUIRED_ID ||
          group.rows.some(({ issues }) => issues.some((issue) => issue.level === "error"))
        ) {
          next.add(group.id);
        }
      }
      if (!next.size && categoryGroups[0]) next.add(categoryGroups[0].id);
      const unchanged =
        next.size === current.size && [...next].every((id) => current.has(id));
      return unchanged ? current : next;
    });
  }, [categoryGroups]);

  const save = (next: RosterDraft) => {
    dispatch({ type: "SET_ROSTER_DRAFT", draft: draftWithUpdate(next, {}) });
  };

  const patchRow = (id: string, patch: Partial<RosterDraftRow>) => {
    save({
      ...draft,
      rows: draft.rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    });
  };

  const addRow = (divisionId = "") => {
    const next = createBlankRosterDraftRow(draft.rows.length, {
      divisionId: divisionId || bulkDivision,
      muqarrar: bulkMuqarrar || state.competition.participantEntrySettings.defaultMuqarrar,
      institution: bulkInstitution || state.competition.participantEntrySettings.defaultInstitution,
    });
    save({ ...draft, source: draft.rows.length ? draft.source : "manual", rows: [...draft.rows, next] });
    if (next.divisionId) {
      setExpandedCategoryIds((current) => new Set([...current, next.divisionId]));
    }
    setMessage("Participant row added.");
    requestAnimationFrame(() => {
      document.querySelector<HTMLInputElement>(`[data-roster-row="${next.id}"] input[name="name"]`)?.focus();
    });
  };

  const duplicateRow = (index: number) => {
    const source = draft.rows[index];
    const copy = {
      ...createBlankRosterDraftRow(draft.rows.length, {
        divisionId: source.divisionId,
        muqarrar: source.muqarrar,
        institution: source.institution,
      }),
    };
    const rows = [...draft.rows];
    rows.splice(index + 1, 0, copy);
    save({ ...draft, rows });
    requestAnimationFrame(() => {
      document.querySelector<HTMLInputElement>(`[data-roster-row="${copy.id}"] input[name="name"]`)?.focus();
    });
  };

  const moveRowWithinCategory = (
    categoryRows: typeof validation.rows,
    position: number,
    offset: -1 | 1,
  ) => {
    const targetPosition = position + offset;
    if (targetPosition < 0 || targetPosition >= categoryRows.length) return;
    const index = draft.rows.findIndex((row) => row.id === categoryRows[position].row.id);
    const target = draft.rows.findIndex(
      (row) => row.id === categoryRows[targetPosition].row.id,
    );
    if (index < 0 || target < 0) return;
    const rows = [...draft.rows];
    [rows[index], rows[target]] = [rows[target], rows[index]];
    save({ ...draft, rows });
  };

  const toggleCategory = (id: string) => {
    if (id === CATEGORY_REQUIRED_ID) return;
    setExpandedCategoryIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const removeRow = (index: number) => {
    const row = draft.rows[index];
    save({ ...draft, rows: draft.rows.filter((candidate) => candidate.id !== row.id) });
    setDeleted({ row, index });
  };

  const undoDelete = () => {
    if (!deleted) return;
    const rows = [...draft.rows];
    rows.splice(Math.min(deleted.index, rows.length), 0, deleted.row);
    save({ ...draft, rows });
    setDeleted(null);
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const next = await parseRosterFileToDraft(file, state.competition);
      save(next);
      setMessage(`${next.rows.length} spreadsheet row${next.rows.length === 1 ? "" : "s"} opened for review.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That spreadsheet could not be read.");
    } finally {
      setBusy(false);
    }
  };

  const parsedPaste = useMemo(() => parseDelimitedRosterText(pasteText), [pasteText]);
  const mapping =
    pasteMapping.length === parsedPaste.headers.length
      ? pasteMapping
      : parsedPaste.suggestedMapping;

  const openPaste = () => {
    setPasteText("");
    setPasteMapping([]);
    setFirstRowIsHeader(true);
    setPasteOpen(true);
  };

  const importPaste = () => {
    const records = recordsFromRosterGrid(parsedPaste, mapping, firstRowIsHeader);
    const next = createRosterDraftFromRows({
      rows: records,
      competitionId: state.competition.id,
      divisions: state.competition.divisions,
      numberingMode: draft.numberingMode,
      source: "paste",
    });
    save(next);
    setPasteOpen(false);
    setMessage(`${next.rows.length} pasted row${next.rows.length === 1 ? "" : "s"} opened for review.`);
  };

  const fillEmpty = () => {
    if (!bulkDivision && !bulkMuqarrar && !bulkInstitution.trim()) return;
    save(fillEmptyRosterFields(
      draft,
      {
        divisionId: bulkDivision,
        muqarrar: bulkMuqarrar,
        institution: bulkInstitution,
      },
      bulkScope === "all" ? undefined : bulkScope,
    ));
    setMessage("Empty cells filled. Existing values were not changed.");
  };

  const firstIssueFor = (rowId: string, field: RosterDraftField) =>
    validation.issues.find((issue) => issue.rowId === rowId && issue.field === field);

  const jumpToFirstError = () => {
    document.querySelector<HTMLElement>("[data-roster-field-error='true']")?.focus();
  };

  const downloadTemplate = async () => {
    setBusy(true);
    setError("");
    try {
      await downloadParticipantTemplate({
        ...state.competition,
        participantNumbering: draft.numberingMode,
      }, templateOptions);
      setTemplateOpen(false);
      setMessage("Participant template downloaded.");
    } catch {
      setError("The competition template could not be prepared.");
    } finally {
      setBusy(false);
    }
  };

  const applyRoster = () => {
    if (validation.errorCount) return;
    dispatch({
      type: "APPLY_ROSTER_DRAFT",
      entries: validation.entries,
      numberingMode: draft.numberingMode,
    });
    onApplied(validation.entries.length);
  };

  const discard = () => {
    if (!window.confirm("Discard the saved participant-list draft? The applied roster will not change.")) return;
    dispatch({ type: "CLEAR_ROSTER_DRAFT" });
    onBack();
  };

  const institutionOptions = Array.from(new Map(
    [
      ...state.competition.participantEntrySettings.institutions,
      ...draft.rows.map((row) => row.institution),
    ]
      .map((institution) => institution.trim())
      .filter(Boolean)
      .map((institution) => [institution.toLocaleLowerCase(), institution]),
  ).values()).sort((a, b) => a.localeCompare(b));
  const unresolvedCategories = useMemo(() => importedCategoryGroups(draft), [draft]);

  return (
    <main className="roster-editor-page">
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        hidden
        onChange={(event) => {
          void onFile(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
      <header className="roster-editor-header">
        <div className="roster-editor-title">
          <button type="button" className="roster-back" onClick={onBack} aria-label="Back to Competition setup">
            <Icon name="back" size={17} />
          </button>
          <div>
            <span>Competition · Participants</span>
            <h1>Participant list</h1>
            <p>{state.competition.name || "Untitled competition"} {state.competition.edition ? `· ${state.competition.edition}` : ""}</p>
          </div>
        </div>
        <div className="roster-editor-head-actions">
          <span className="roster-save-state"><i aria-hidden="true" /> Saved on this device</span>
          <button type="button" className="btn-ghost" onClick={discard}>Discard draft</button>
          <button
            type="button"
            className="btn-primary"
            disabled={validation.errorCount > 0}
            onClick={() => setReviewOpen(true)}
          >
            Review and apply
          </button>
        </div>
      </header>

      <section className="roster-editor-summary" aria-label="Participant list status">
        <div><strong>{draft.rows.length}</strong><span>Participants</span></div>
        <div className={validation.errorCount ? "is-error" : "is-ready"}><strong>{validation.errorCount}</strong><span>Errors</span></div>
        <div className={validation.warningCount ? "is-warning" : ""}><strong>{validation.warningCount}</strong><span>Warnings</span></div>
        <div className="roster-summary-source"><span>Source</span><strong>{draft.filename || (draft.source === "existing" ? "Current roster" : draft.source === "paste" ? "Pasted table" : "Entered in Tahqeeq")}</strong></div>
        {validation.errorCount > 0 && <button type="button" className="dialog-link" onClick={jumpToFirstError}>Jump to first error</button>}
      </section>

      <section className="roster-editor-toolbar" aria-label="Participant list tools">
        <div className="roster-numbering-control">
          <span>Participant numbers</span>
          <div role="radiogroup" aria-label="Participant numbering mode">
            <button type="button" role="radio" aria-checked={draft.numberingMode === "automatic"} className={draft.numberingMode === "automatic" ? "is-active" : ""} onClick={() => save({ ...draft, numberingMode: "automatic" })}>Automatic</button>
            <button type="button" role="radio" aria-checked={draft.numberingMode === "supplied"} className={draft.numberingMode === "supplied" ? "is-active" : ""} onClick={() => save({ ...draft, numberingMode: "supplied" })}>Supplied</button>
          </div>
          <small>{draft.numberingMode === "automatic" ? "Assigned from final row order: 01–99, then 100 onward." : "Keep the numbers supplied by the competition."}</small>
        </div>
        <div className="roster-source-actions">
          <button type="button" className="btn-ghost" onClick={() => addRow()}><Icon name="plus" size={14} /> Add participant</button>
          <button type="button" className="btn-ghost" onClick={openPaste}>Paste table</button>
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => fileRef.current?.click()}><Icon name="upload" size={14} /> Upload</button>
          <button type="button" className="btn-ghost" aria-haspopup="dialog" disabled={busy || !state.competition.divisions.length} onClick={() => setTemplateOpen(true)}><Icon name="download" size={14} /> Participant template</button>
        </div>
      </section>

      {message && <div className="roster-inline-message" role="status"><Icon name="check" size={15} /> {message}</div>}
      {error && <div className="roster-inline-message is-error" role="alert">{error}</div>}
      {draft.sourceWarnings.map((warning) => <div className="roster-inline-message is-warning" role="status" key={warning}>{warning}</div>)}

      {!draft.rows.length ? (
        <section className="roster-onboarding-empty">
          <div className="roster-empty-copy">
            <span>Start the list</span>
            <h2>Bring participants in the way you already work.</h2>
            <p>Enter a few names here, paste a table, or open the checked spreadsheet. Every row stays editable before it becomes official.</p>
          </div>
          <div className="roster-onboarding-options">
            <button type="button" onClick={() => addRow()}><span className="roster-option-icon"><Icon name="newUser" size={20} /></span><strong>Add in Tahqeeq</strong><small>Best for a short list or last-minute entry.</small></button>
            <button type="button" onClick={openPaste}><span className="roster-option-icon">⌘</span><strong>Paste a table</strong><small>Copy rows from Excel or Google Sheets.</small></button>
            <button type="button" onClick={() => fileRef.current?.click()}><span className="roster-option-icon"><Icon name="upload" size={20} /></span><strong>Upload spreadsheet</strong><small>Open an .xlsx, .xls or .csv file.</small></button>
          </div>
        </section>
      ) : (
        <>
          {unresolvedCategories.length > 0 && (
            <section className="roster-import-resolver" aria-labelledby="roster-import-resolver-title">
              <div className="roster-import-resolver-head">
                <div>
                  <span>Imported values</span>
                  <strong id="roster-import-resolver-title">Resolve categories once</strong>
                  <small>Map each imported label once and every matching row will update together.</small>
                </div>
                <b>{unresolvedCategories.reduce((count, group) => count + group.rowIds.length, 0)} rows</b>
              </div>
              <div className="roster-import-resolution-list">
                {unresolvedCategories.map((group) => (
                  <div key={group.key}>
                    <span><strong>{group.label}</strong><small>{group.rowIds.length} matching row{group.rowIds.length === 1 ? "" : "s"}</small></span>
                    <select
                      aria-label={`Map ${group.label} to category`}
                      value={importMappings[group.key] ?? ""}
                      onChange={(event) => setImportMappings((current) => ({ ...current, [group.key]: event.target.value }))}
                    >
                      <option value="">Choose category</option>
                      {state.competition.divisions.map((division) => <option value={division.id} key={division.id}>{divisionLabel(division)}</option>)}
                    </select>
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={!importMappings[group.key]}
                      onClick={() => {
                        const divisionId = importMappings[group.key];
                        if (!divisionId) return;
                        save(mapImportedCategory(draft, group.label, divisionId));
                        setExpandedCategoryIds((current) => new Set([...current, divisionId]));
                        setImportMappings((current) => {
                          const next = { ...current };
                          delete next[group.key];
                          return next;
                        });
                      }}
                    >
                      Map rows
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="roster-bulk-bar" aria-label="Participant entry defaults">
            <div><strong>Entry defaults</strong><span>New rows inherit these. Applying them only fills empty cells.</span></div>
            <select aria-label="Default category" value={bulkDivision} onChange={(event) => setBulkDivision(event.target.value)}><option value="">Category</option>{state.competition.divisions.map((division) => <option value={division.id} key={division.id}>{divisionLabel(division)}</option>)}</select>
            <select aria-label="Default Muqarrar start" value={bulkMuqarrar} onChange={(event) => setBulkMuqarrar(event.target.value)}><option value="">Muqarrar start</option><option value="feshey-kolhu">Feshey kolhu</option><option value="nimey-kolhu">Nimey kolhu</option></select>
            <input aria-label="Default institution" list="roster-institutions" value={bulkInstitution} placeholder="Institution" onChange={(event) => setBulkInstitution(event.target.value)} />
            <select aria-label="Apply defaults to" value={bulkScope} onChange={(event) => setBulkScope(event.target.value)}>
              <option value="all">All categories</option>
              {state.competition.divisions.map((division) => <option value={division.id} key={division.id}>Only {divisionLabel(division)}</option>)}
            </select>
            <button type="button" className="btn-ghost" disabled={!bulkDivision && !bulkMuqarrar && !bulkInstitution.trim()} onClick={fillEmpty}>Apply to empty fields</button>
          </section>

          <div className="roster-category-list-head">
            <div><strong>Categories</strong><span>Keep only the sections you need open.</span></div>
            <div>
              <button type="button" onClick={() => setExpandedCategoryIds(new Set(categoryGroups.map((group) => group.id)))}>Expand all</button>
              <button type="button" onClick={() => setExpandedCategoryIds(new Set(categoryGroups.filter((group) => group.id === CATEGORY_REQUIRED_ID).map((group) => group.id)))}>Collapse all</button>
            </div>
          </div>
          <section className={`roster-grid-wrap ${draft.numberingMode === "automatic" ? "is-automatic" : ""}`} aria-label="Participants by category">
            <div className="roster-grid-head" role="row">
              <span>{draft.numberingMode === "automatic" ? "No." : "Number"}</span><span>Name</span><span>Category</span><span>Muqarrar start</span><span>Institution</span><span>Phone</span><span>Row</span>
            </div>
            <div className="roster-grid-body" role="rowgroup">
              {categoryGroups.map((group) => {
                const errorCount = group.rows.reduce((count, { issues }) => count + issues.filter((issue) => issue.level === "error").length, 0);
                const warningCount = group.rows.reduce((count, { issues }) => count + issues.filter((issue) => issue.level === "warning").length, 0);
                const expanded = group.id === CATEGORY_REQUIRED_ID || expandedCategoryIds.has(group.id);
                const panelId = `roster-category-${group.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
                return (
                  <section className={`roster-category-group ${expanded ? "is-expanded" : ""} ${errorCount ? "has-errors" : ""}`} key={group.id}>
                    <div className="roster-category-header">
                      <h2>
                        <button type="button" className="roster-category-toggle" aria-expanded={expanded} aria-controls={panelId} onClick={() => toggleCategory(group.id)}>
                          <span className="roster-category-title"><Icon name="chevron" size={14} /><strong>{group.label}</strong></span>
                          <span className="roster-category-meta"><b>{group.rows.length}</b> participant{group.rows.length === 1 ? "" : "s"}{errorCount > 0 && <em>{errorCount} error{errorCount === 1 ? "" : "s"}</em>}{warningCount > 0 && <i>{warningCount} warning{warningCount === 1 ? "" : "s"}</i>}</span>
                        </button>
                      </h2>
                      {group.id !== CATEGORY_REQUIRED_ID && (
                        <button type="button" className="roster-category-add" onClick={() => addRow(group.id)}>
                          <Icon name="plus" size={13} /> Add participant
                        </button>
                      )}
                    </div>
                    {expanded && <div id={panelId} className="roster-category-rows">
              {group.rows.map(({ row, number }, categoryPosition) => {
                const index = draft.rows.findIndex((candidate) => candidate.id === row.id);
                const invalidMuqarrar = row.muqarrar && !normalizeMuqarrarSide(row.muqarrar);
                return (
                  <article className="roster-edit-row" role="row" data-roster-row={row.id} key={row.id}>
                    <div className="roster-edit-cell roster-number-cell" data-label={draft.numberingMode === "automatic" ? "Number" : "Participant number"}>
                      {draft.numberingMode === "automatic" ? <span className="roster-auto-number">{number}</span> : <input name="number" aria-label={`Participant ${index + 1} number`} aria-invalid={Boolean(firstIssueFor(row.id, "number"))} data-roster-field-error={firstIssueFor(row.id, "number")?.level === "error" || undefined} value={row.number} onChange={(event) => patchRow(row.id, { number: event.target.value })} />}
                      {firstIssueFor(row.id, "number") && <small>{firstIssueFor(row.id, "number")?.message}</small>}
                    </div>
                    <div className="roster-edit-cell" data-label="Name">
                      <input name="name" aria-label={`Participant ${index + 1} name`} aria-invalid={Boolean(firstIssueFor(row.id, "name"))} data-roster-field-error={firstIssueFor(row.id, "name")?.level === "error" || undefined} value={row.name} placeholder="Participant name" onChange={(event) => patchRow(row.id, { name: event.target.value })} />
                      {firstIssueFor(row.id, "name") && <small>{firstIssueFor(row.id, "name")?.message}</small>}
                    </div>
                    <div className="roster-edit-cell" data-label="Category">
                      <select aria-label={`Participant ${index + 1} category`} aria-invalid={Boolean(firstIssueFor(row.id, "divisionId"))} data-roster-field-error={firstIssueFor(row.id, "divisionId")?.level === "error" || undefined} value={row.divisionId} onChange={(event) => patchRow(row.id, { divisionId: event.target.value, importedCategory: undefined, legacyAgeGroup: undefined, legacyCategory: undefined })}>
                        <option value="">Choose category</option>
                        {state.competition.divisions.map((division) => <option value={division.id} key={division.id}>{divisionLabel(division)}</option>)}
                      </select>
                      {firstIssueFor(row.id, "divisionId") && <small>{firstIssueFor(row.id, "divisionId")?.message}</small>}
                    </div>
                    <div className="roster-edit-cell" data-label="Muqarrar start">
                      <div className="roster-side-choice" role="radiogroup" aria-label={`Participant ${index + 1} Muqarrar start`} aria-invalid={Boolean(firstIssueFor(row.id, "muqarrar"))}>
                        <button type="button" role="radio" aria-checked={row.muqarrar === "feshey-kolhu"} className={row.muqarrar === "feshey-kolhu" ? "is-active" : ""} data-roster-field-error={firstIssueFor(row.id, "muqarrar")?.level === "error" || undefined} onClick={() => patchRow(row.id, { muqarrar: "feshey-kolhu" })}>Feshey kolhu</button>
                        <button type="button" role="radio" aria-checked={row.muqarrar === "nimey-kolhu"} className={row.muqarrar === "nimey-kolhu" ? "is-active" : ""} onClick={() => patchRow(row.id, { muqarrar: "nimey-kolhu" })}>Nimey kolhu</button>
                      </div>
                      {invalidMuqarrar && <small>Imported value: {row.muqarrar}</small>}
                      {firstIssueFor(row.id, "muqarrar") && <small>{firstIssueFor(row.id, "muqarrar")?.message}</small>}
                    </div>
                    <div className="roster-edit-cell" data-label="Institution">
                      <input aria-label={`Participant ${index + 1} institution`} list="roster-institutions" value={row.institution} placeholder="Optional" onChange={(event) => patchRow(row.id, { institution: event.target.value })} />
                    </div>
                    <div className="roster-edit-cell" data-label="Phone">
                      <input aria-label={`Participant ${index + 1} phone`} inputMode="tel" value={row.phone} placeholder="Optional" onChange={(event) => patchRow(row.id, { phone: event.target.value })} />
                    </div>
                    <div className="roster-row-actions" data-label="Row actions">
                      <button type="button" disabled={categoryPosition === 0} onClick={() => moveRowWithinCategory(group.rows, categoryPosition, -1)} aria-label={`Move ${row.name || `participant ${index + 1}`} up in category`}>↑</button>
                      <button type="button" disabled={categoryPosition === group.rows.length - 1} onClick={() => moveRowWithinCategory(group.rows, categoryPosition, 1)} aria-label={`Move ${row.name || `participant ${index + 1}`} down in category`}>↓</button>
                      <button type="button" onClick={() => duplicateRow(index)} aria-label={`Add participant like ${row.name || `participant ${index + 1}`}`}><Icon name="plus" size={14} /></button>
                      <button type="button" className="is-danger" onClick={() => removeRow(index)} aria-label={`Delete ${row.name || `participant ${index + 1}`}`}><Icon name="trash" size={14} /></button>
                    </div>
                  </article>
                );
              })}
                    </div>}
                  </section>
                );
              })}
            </div>
          </section>
          <button type="button" className="roster-add-row" onClick={() => addRow()}><Icon name="plus" size={14} /> Add another participant</button>
        </>
      )}

      <datalist id="roster-institutions">{institutionOptions.map((institution) => <option value={institution} key={institution} />)}</datalist>

      <footer className="roster-editor-footer">
        <div><strong>{validation.errorCount ? `${validation.errorCount} error${validation.errorCount === 1 ? "" : "s"} to fix` : `${validation.entries.length} ready to apply`}</strong><span>{draft.numberingMode === "automatic" ? "Numbers will follow this row order." : "Supplied numbers will be preserved."}</span></div>
        <button type="button" className="btn-primary" disabled={validation.errorCount > 0} onClick={() => setReviewOpen(true)}>Review and apply</button>
      </footer>

      {deleted && <div className="roster-undo-toast" role="status"><span>Participant removed from draft.</span><button type="button" onClick={undoDelete}>Undo</button><button type="button" aria-label="Dismiss" onClick={() => setDeleted(null)}>×</button></div>}

      {templateOpen && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setTemplateOpen(false); }}>
          <section className="roster-dialog roster-template-dialog" role="dialog" aria-modal="true" aria-labelledby="roster-template-title">
            <div className="roster-dialog-head">
              <div><span>Excel template</span><h2 id="roster-template-title">Choose participant columns</h2><p>The competition fields needed for a clean import stay included.</p></div>
              <button type="button" onClick={() => setTemplateOpen(false)} aria-label="Close">×</button>
            </div>
            <div className="roster-template-fields">
              <div className="roster-template-required">
                <div><strong>Required</strong><small>{draft.numberingMode === "supplied" ? "Participant number, Name, Category, Muqarrar start" : "Name, Category, Muqarrar start"}</small></div>
                <span>Always included</span>
              </div>
              <fieldset>
                <legend>Optional columns</legend>
                <label className="roster-template-option">
                  <input type="checkbox" checked={templateOptions.includeInstitution} onChange={(event) => setTemplateOptions((current) => ({ ...current, includeInstitution: event.target.checked }))} />
                  <span><strong>Institution</strong><small>School, class or organisation</small></span>
                </label>
                <label className="roster-template-option">
                  <input type="checkbox" checked={templateOptions.includePhone} onChange={(event) => setTemplateOptions((current) => ({ ...current, includePhone: event.target.checked }))} />
                  <span><strong>Phone number</strong><small>Stored as text so leading zeroes remain</small></span>
                </label>
              </fieldset>
            </div>
            <div className="roster-template-format"><Icon name="download" size={17} /><div><strong>Excel workbook</strong><small>.xlsx with dropdowns and 100 prepared rows</small></div></div>
            <div className="roster-dialog-actions"><button type="button" className="btn-ghost" onClick={() => setTemplateOpen(false)}>Cancel</button><button type="button" className="btn-primary" disabled={busy} onClick={() => void downloadTemplate()}>{busy ? "Preparing…" : "Download Excel"}</button></div>
          </section>
        </div>
      )}

      {pasteOpen && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPasteOpen(false); }}>
          <section className="roster-dialog roster-paste-dialog" role="dialog" aria-modal="true" aria-labelledby="roster-paste-title">
            <div className="roster-dialog-head"><div><span>Spreadsheet shortcut</span><h2 id="roster-paste-title">Paste participant rows</h2><p>Copy cells from Excel or Google Sheets, then paste them below.</p></div><button type="button" onClick={() => setPasteOpen(false)} aria-label="Close">×</button></div>
            <textarea autoFocus value={pasteText} placeholder={'Name\tCategory\tMuqarrar start\tInstitution\tPhone Number'} onPaste={(event) => { if (!event.currentTarget.value) setFirstRowIsHeader(true); }} onChange={(event) => { setPasteText(event.target.value); setPasteMapping([]); }} />
            {parsedPaste.grid.length > 0 && (
              <div className="roster-paste-mapping">
                <div><strong>Match columns</strong><label><input type="checkbox" checked={firstRowIsHeader} onChange={(event) => setFirstRowIsHeader(event.target.checked)} /> First row contains headings</label></div>
                <div className="roster-mapping-grid">
                  {parsedPaste.headers.map((header, index) => <label key={`${header}-${index}`}><span>{header || `Column ${index + 1}`}</span><select value={mapping[index] ?? "ignore"} onChange={(event) => { const next = [...mapping]; next[index] = event.target.value as RosterColumnKey; setPasteMapping(next); }}>{COLUMN_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>)}
                </div>
              </div>
            )}
            <div className="roster-dialog-actions"><button type="button" className="btn-ghost" onClick={() => setPasteOpen(false)}>Cancel</button><button type="button" className="btn-primary" disabled={!pasteText.trim() || !mapping.includes("name")} onClick={importPaste}>Open {Math.max(0, parsedPaste.grid.length - (firstRowIsHeader ? 1 : 0))} rows</button></div>
          </section>
        </div>
      )}

      {reviewOpen && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setReviewOpen(false); }}>
          <section className="roster-dialog roster-review-dialog" role="dialog" aria-modal="true" aria-labelledby="roster-review-title">
            <div className="roster-dialog-head"><div><span>Final check</span><h2 id="roster-review-title">Apply participant list?</h2><p>This replaces the current draft roster. Competition records already saved are unchanged.</p></div><button type="button" onClick={() => setReviewOpen(false)} aria-label="Close">×</button></div>
            <div className="roster-compare-count"><div><span>Current</span><strong>{comparison.before}</strong></div><Icon name="chevron" size={18} /><div><span>New list</span><strong>{comparison.after}</strong></div></div>
            <div className="roster-compare-details"><span><strong>{comparison.added}</strong> added</span><span><strong>{comparison.edited}</strong> edited</span><span><strong>{comparison.removed}</strong> removed</span></div>
            <div className="roster-review-numbering"><span>Numbering</span><strong>{draft.numberingMode === "automatic" ? "Automatic from row order" : "Supplied numbers"}</strong></div>
            {validation.warningCount > 0 && <p className="roster-review-warning">{validation.warningCount} optional field warning{validation.warningCount === 1 ? "" : "s"} will remain. Required fields are complete.</p>}
            <div className="roster-dialog-actions"><button type="button" className="btn-ghost" onClick={() => setReviewOpen(false)}>Keep editing</button><button type="button" className="btn-primary" onClick={applyRoster}>Apply {validation.entries.length} participants</button></div>
          </section>
        </div>
      )}
    </main>
  );
}
