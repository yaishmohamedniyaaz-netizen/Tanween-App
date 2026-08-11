import { Fragment, useMemo, useRef, useState } from "react";
import { CATEGORIES, START_OPTIONS, STEP_OPTIONS, TOTAL_MARKS } from "../config";
import {
  categoriesInOrder,
  createPanelPreset,
  judgeSeatFor,
  validateJudgePanel,
} from "../lib/judgeAssignments";
import { parseRosterFile } from "../lib/roster";
import { useJudging } from "../state/store";
import type {
  CategoryId,
  JudgePanelConfig,
  JudgePanelPreset,
  ScoreConfig,
} from "../types";
import { Icon } from "./Icon";

const PRESETS: Array<{
  id: JudgePanelPreset;
  title: string;
  detail: string;
}> = [
  {
    id: "all",
    title: "One judge covers all",
    detail: "Jali, Khafi and Fasaha on this device",
  },
  {
    id: "one-each",
    title: "One judge per category",
    detail: "Three judges with one clear responsibility each",
  },
  {
    id: "custom",
    title: "Custom panel",
    detail: "Divide the three categories across one to three judges",
  },
];

function clonePanel(panel: JudgePanelConfig): JudgePanelConfig {
  return {
    ...panel,
    seats: panel.seats.map((seat) => ({
      ...seat,
      categories: [...seat.categories],
    })),
  };
}

/** Competition setup: judge ownership, mark allocations and participant roster. */
export function SetupDialog({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useJudging();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<number | null>(null);
  const [panel, setPanel] = useState(() => clonePanel(state.panel));
  const [scoreConfig, setScoreConfig] = useState<ScoreConfig>(() => ({
    jali: { ...state.config.jali },
    khafi: { ...state.config.khafi },
    fasaha: { ...state.config.fasaha },
  }));
  const [deviceJudgeId, setDeviceJudgeId] = useState(
    state.deviceJudgeId ?? state.panel.seats[0]?.id ?? "",
  );

  const allocTotal = CATEGORIES.reduce(
    (sum, category) => sum + scoreConfig[category.id].start,
    0,
  );
  const validation = useMemo(() => validateJudgePanel(panel), [panel]);
  const deviceJudgeValid = Boolean(judgeSeatFor(panel, deviceJudgeId));
  const canSave =
    state.sessionActive ||
    (allocTotal === TOTAL_MARKS && validation.valid && deviceJudgeValid);

  const choosePreset = (preset: JudgePanelPreset) => {
    if (state.sessionActive) return;
    if (preset === "custom") {
      setPanel((current) => ({ ...clonePanel(current), preset: "custom" }));
      return;
    }
    const next = createPanelPreset(preset);
    setPanel(next);
    setDeviceJudgeId(next.seats[0].id);
  };

  const addJudge = () => {
    if (state.sessionActive || panel.seats.length >= 3) return;
    setPanel((current) => {
      const existing = new Set(current.seats.map((seat) => seat.id));
      let number = 1;
      while (existing.has(`judge-${number}`)) number += 1;
      return {
        ...current,
        preset: "custom",
        seats: [
          ...current.seats,
          {
            id: `judge-${number}`,
            label: `Judge ${current.seats.length + 1}`,
            name: "",
            categories: [],
          },
        ].map((seat, index) => ({ ...seat, label: `Judge ${index + 1}` })),
      };
    });
  };

  const removeJudge = (judgeSeatId: string) => {
    if (state.sessionActive || panel.seats.length <= 1) return;
    setPanel((current) => {
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
      const seats = remaining.map((seat, index) => ({
        ...seat,
        label: `Judge ${index + 1}`,
      }));
      if (deviceJudgeId === judgeSeatId) setDeviceJudgeId(seats[0]?.id ?? "");
      return { ...current, preset: "custom", seats };
    });
  };

  const assignCategory = (judgeSeatId: string, category: CategoryId) => {
    if (state.sessionActive) return;
    setPanel((current) => ({
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

  const setJudgeName = (judgeSeatId: string, name: string) => {
    if (state.sessionActive) return;
    setPanel((current) => ({
      ...current,
      preset: current.preset === "all" || current.preset === "one-each"
        ? current.preset
        : "custom",
      seats: current.seats.map((seat) =>
        seat.id === judgeSeatId ? { ...seat, name: name.slice(0, 80) } : seat,
      ),
    }));
  };

  const saveAndClose = () => {
    if (!canSave) return;
    if (!state.sessionActive) {
      CATEGORIES.forEach((category) => {
        dispatch({
          type: "SET_CONFIG",
          category: category.id,
          start: scoreConfig[category.id].start,
          step: scoreConfig[category.id].step,
        });
      });
      dispatch({ type: "SET_PANEL", panel, deviceJudgeId });
    }
    onClose();
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const entries = await parseRosterFile(file);
      dispatch({ type: "LOAD_ROSTER", entries });
      setLoaded(entries.length);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not read that file.");
    }
  };

  return (
    <div
      className="dialog-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget && canSave) saveAndClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div
        className="dialog dialog-wide setup-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Competition setup"
      >
        <div className="setup-dialog-head">
          <div>
            <h2 className="dialog-title">Competition setup</h2>
            <p className="dialog-sub">Set each judge's responsibility once.</p>
          </div>
          {state.sessionActive && (
            <span className="setup-lock">Locked during this reciter</span>
          )}
        </div>

        <section className="setup-section" aria-labelledby="panel-setup-title">
          <div className="setup-section-head">
            <div>
              <span className="t-label" id="panel-setup-title">Judging panel</span>
              <p>Who handles Jali, Khafi and Fasaha?</p>
            </div>
          </div>

          <div className="panel-presets">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={panel.preset === preset.id ? "is-active" : ""}
                aria-pressed={panel.preset === preset.id}
                disabled={state.sessionActive}
                onClick={() => choosePreset(preset.id)}
              >
                <strong>{preset.title}</strong>
                <span>{preset.detail}</span>
              </button>
            ))}
          </div>

          <div className="judge-rows">
            {panel.seats.map((seat) => {
              const empty = validation.emptySeatIds.includes(seat.id);
              return (
                <div className={`judge-row ${empty ? "has-error" : ""}`} key={seat.id}>
                  <div className="judge-row-person">
                    <span>{seat.label}</span>
                    <input
                      type="text"
                      value={seat.name}
                      disabled={state.sessionActive}
                      aria-label={`${seat.label} name`}
                      placeholder="Name (optional)"
                      onChange={(event) => setJudgeName(seat.id, event.target.value)}
                    />
                  </div>
                  <div
                    className="judge-category-set"
                    role="group"
                    aria-label={`${seat.label} categories`}
                  >
                    {CATEGORIES.map((category) => {
                      const selected = seat.categories.includes(category.id);
                      return (
                        <button
                          key={category.id}
                          type="button"
                          className={`judge-category cat-${category.id} ${selected ? "is-active" : ""}`}
                          aria-pressed={selected}
                          disabled={state.sessionActive}
                          onClick={() => assignCategory(seat.id, category.id)}
                        >
                          <span aria-hidden="true" />
                          {category.label.replace(/^Laḥn\s/i, "")}
                        </button>
                      );
                    })}
                  </div>
                  {panel.seats.length > 1 && (
                    <button
                      type="button"
                      className="judge-remove"
                      disabled={state.sessionActive}
                      aria-label={`Remove ${seat.label}`}
                      onClick={() => removeJudge(seat.id)}
                    >
                      Remove
                    </button>
                  )}
                  {empty && <small>Assign at least one category.</small>}
                </div>
              );
            })}
          </div>

          {panel.seats.length < 3 && (
            <button
              type="button"
              className="add-judge"
              disabled={state.sessionActive}
              onClick={addJudge}
            >
              <Icon name="plus" size={13} /> Add judge
            </button>
          )}

          <div className="device-judge-block">
            <div>
              <strong>This device is for</strong>
              <span>The selected judge's tray and score will be shown.</span>
            </div>
            <div className="device-judge-options" role="radiogroup" aria-label="Judge using this device">
              {panel.seats.map((seat) => (
                <button
                  key={seat.id}
                  type="button"
                  role="radio"
                  aria-checked={deviceJudgeId === seat.id}
                  className={deviceJudgeId === seat.id ? "is-active" : ""}
                  disabled={state.sessionActive}
                  onClick={() => setDeviceJudgeId(seat.id)}
                >
                  <span className="device-radio" aria-hidden="true" />
                  <span>
                    <strong>{seat.name.trim() || seat.label}</strong>
                    <small>{categoriesInOrder(seat.categories).map((id) =>
                      id === "jali" ? "Jali" : id === "khafi" ? "Khafi" : "Fasaha"
                    ).join(" + ") || "No category"}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {!validation.valid && (
            <p className="setup-warn">{validation.errors[0]}</p>
          )}
          {!deviceJudgeValid && (
            <p className="setup-warn">Choose which judge is using this device.</p>
          )}
        </section>

        <section className="setup-section" aria-labelledby="marks-setup-title">
          <div className="setup-section-head">
            <div>
              <span className="t-label" id="marks-setup-title">Marks</span>
              <p>These rules are frozen when a reciter starts.</p>
            </div>
          </div>
          <div className="setup-grid">
            <span className="t-label">Category</span>
            <span className="t-label">Marks</span>
            <span className="t-label">Step</span>
            {CATEGORIES.map((category) => (
              <Fragment key={category.id}>
                <span className={`setup-cat cat-${category.id}`}>
                  <span className="sc-dot" aria-hidden="true" />
                  {category.label}
                </span>
                <select
                  value={scoreConfig[category.id].start}
                  disabled={state.sessionActive}
                  aria-label={`${category.label} marks`}
                  onChange={(event) =>
                    setScoreConfig((current) => ({
                      ...current,
                      [category.id]: {
                        ...current[category.id],
                        start: Number(event.target.value),
                      },
                    }))
                  }
                >
                  {START_OPTIONS.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
                <select
                  value={scoreConfig[category.id].step}
                  disabled={state.sessionActive}
                  aria-label={`${category.label} deduction step`}
                  onChange={(event) =>
                    setScoreConfig((current) => ({
                      ...current,
                      [category.id]: {
                        ...current[category.id],
                        step: Number(event.target.value),
                      },
                    }))
                  }
                >
                  {STEP_OPTIONS.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </Fragment>
            ))}
            <span className="setup-total-label">Total</span>
            <span className={`setup-total t-num ${allocTotal !== TOTAL_MARKS ? "is-off" : ""}`}>
              {allocTotal} / {TOTAL_MARKS}
            </span>
            <span />
          </div>
          {allocTotal !== TOTAL_MARKS && (
            <p className="setup-warn">
              Allocations must total {TOTAL_MARKS} — adjust by {allocTotal > TOTAL_MARKS ? "−" : "+"}
              {Math.abs(TOTAL_MARKS - allocTotal)}.
            </p>
          )}
        </section>

        <section className="setup-section setup-participants" aria-labelledby="participants-setup-title">
          <span className="t-label" id="participants-setup-title">Participants</span>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            hidden
            onChange={(event) => onFile(event.target.files?.[0])}
          />
          <div
            className="file-drop"
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") fileRef.current?.click();
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              onFile(event.dataTransfer.files?.[0]);
            }}
          >
            <Icon name="upload" size={16} />{" "}
            {state.roster.length
              ? `${state.roster.length} participants loaded — replace list`
              : "Upload .xlsx or .csv — Name, plus optional Number, Island or Class"}
          </div>
          {loaded !== null && <p className="setup-note">Loaded {loaded} participant{loaded === 1 ? "" : "s"}.</p>}
          {error && <p className="setup-warn">{error}</p>}
          {state.roster.length > 0 && (
            <button type="button" className="dialog-link" onClick={() => dispatch({ type: "CLEAR_ROSTER" })}>
              Remove list
            </button>
          )}
        </section>

        <div className="dialog-actions setup-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn-primary"
            disabled={!canSave}
            onClick={saveAndClose}
          >
            {state.sessionActive ? "Close" : "Save setup"}
          </button>
        </div>
      </div>
    </div>
  );
}
