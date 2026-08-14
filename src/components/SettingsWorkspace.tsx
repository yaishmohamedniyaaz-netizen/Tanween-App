import { useRef, useState } from "react";
import type { DevicePreferencesV1 } from "../lib/devicePreferences";
import {
  DEFAULT_DEVICE_PREFERENCES,
} from "../lib/devicePreferences";
import {
  downloadStateBackup,
  readStateBackupFile,
} from "../lib/resultPackages";
import { useJudging } from "../state/store";
import type { JudgingState } from "../types";
import { Icon } from "./Icon";

type SettingsSection = "appearance" | "workspace" | "data";

const SECTIONS: Array<{
  id: SettingsSection;
  title: string;
  hint: string;
}> = [
  { id: "appearance", title: "Appearance", hint: "Light or dark theme" },
  { id: "workspace", title: "Mushaf and judging workspace", hint: "Page view, scale and panel position" },
  { id: "data", title: "Data and recovery", hint: "Backup, restore and preference reset" },
];

function restoreSummary(state: JudgingState) {
  return {
    competition: state.competition.name || "Unnamed competition",
    edition: state.competition.edition || "No edition",
    participants: state.roster.length,
    records: state.history.length,
    status: state.competition.status,
  };
}

export function SettingsWorkspace({
  preferences,
  onChange,
  onReset,
  onBack,
}: {
  preferences: DevicePreferencesV1;
  onChange: (patch: Partial<DevicePreferencesV1>) => void;
  onReset: () => void;
  onBack: () => void;
}) {
  const { state, dispatch } = useJudging();
  const [section, setSection] = useState<SettingsSection | null>(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 779px)").matches
      ? null
      : "appearance",
  );
  const [restorePreview, setRestorePreview] = useState<JudgingState | null>(null);
  const [restoreError, setRestoreError] = useState("");
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const restoreRef = useRef<HTMLInputElement>(null);

  const chooseSection = (next: SettingsSection) => {
    setSection(next);
    setConfirmRestore(false);
    setConfirmReset(false);
  };

  const readRestore = async (file?: File) => {
    if (!file) return;
    setRestoreError("");
    setConfirmRestore(false);
    try {
      setRestorePreview(await readStateBackupFile(file));
    } catch (error) {
      setRestorePreview(null);
      setRestoreError(error instanceof Error ? error.message : "Could not read that backup file.");
    }
  };

  const summary = restorePreview ? restoreSummary(restorePreview) : null;

  return (
    <main className="settings-page">
      <header className="settings-page-head">
        <button type="button" className="btn-ghost" onClick={onBack}>
          <Icon name="back" size={15} /> Back to Mushaf
        </button>
        <div>
          <span>On this device</span>
          <h1>Settings</h1>
          <p>Personalize Tahqeeq without changing competition rules or official records.</p>
        </div>
        <span className="settings-save-state"><i aria-hidden="true" /> Saved automatically</span>
      </header>

      <div className={`settings-layout ${section ? "has-detail" : ""}`}>
        <nav className="settings-index" aria-label="Settings sections">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={section === item.id ? "is-active" : ""}
              aria-current={section === item.id ? "page" : undefined}
              onClick={() => chooseSection(item.id)}
            >
              <span><strong>{item.title}</strong><small>{item.hint}</small></span>
              <Icon name="chevron" size={15} />
            </button>
          ))}
        </nav>

        {section && (
          <section className="settings-detail" aria-labelledby={`settings-${section}-title`}>
            <button type="button" className="settings-detail-back" onClick={() => setSection(null)}>
              <Icon name="back" size={14} /> Settings
            </button>

            {section === "appearance" && (
              <>
                <div className="settings-section-head">
                  <span>Preferences</span>
                  <h2 id="settings-appearance-title">Appearance</h2>
                  <p>Choose the surface that is easiest to read in this room.</p>
                </div>
                <fieldset className="settings-fieldset">
                  <legend>Theme</legend>
                  <div className="settings-choice-grid">
                    {(["light", "dark"] as const).map((theme) => (
                      <button
                        key={theme}
                        type="button"
                        role="radio"
                        aria-checked={preferences.theme === theme}
                        className={preferences.theme === theme ? "is-active" : ""}
                        onClick={() => onChange({ theme })}
                      >
                        <span className={`theme-preview is-${theme}`} aria-hidden="true"><i /><i /><i /></span>
                        <span><strong>{theme === "light" ? "Light" : "Dark"}</strong><small>{theme === "light" ? "Clear paper-like surfaces" : "Reduced glare in dim rooms"}</small></span>
                        <i className="settings-choice-mark" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </fieldset>
              </>
            )}

            {section === "workspace" && (
              <>
                <div className="settings-section-head">
                  <span>Preferences</span>
                  <h2 id="settings-workspace-title">Mushaf and judging workspace</h2>
                  <p>These choices affect this judge device only.</p>
                </div>

                <fieldset className="settings-fieldset">
                  <legend>Page view</legend>
                  <div className="settings-segmented" role="radiogroup" aria-label="Mushaf page view">
                    <button type="button" role="radio" aria-checked={preferences.mushafLayout === "full"} className={preferences.mushafLayout === "full" ? "is-active" : ""} onClick={() => onChange({ mushafLayout: "full" })}>Full page</button>
                    <button type="button" role="radio" aria-checked={preferences.mushafLayout === "split"} className={preferences.mushafLayout === "split" ? "is-active" : ""} onClick={() => onChange({ mushafLayout: "split" })}>Split page</button>
                  </div>
                </fieldset>

                <fieldset className="settings-fieldset">
                  <legend>Page scale</legend>
                  <div className="settings-range-head"><span>Smaller overview</span><strong className="t-num">{preferences.mushafZoom}%</strong></div>
                  <input
                    type="range"
                    min={45}
                    max={100}
                    step={5}
                    value={preferences.mushafZoom}
                    aria-label="Mushaf page scale"
                    onChange={(event) => onChange({ mushafZoom: Number(event.target.value) })}
                  />
                  <div className="settings-range-scale" aria-hidden="true"><span>45%</span><span>100%</span></div>
                  <button type="button" className="settings-inline-action" disabled={preferences.mushafZoom === 100} onClick={() => onChange({ mushafZoom: 100 })}>Reset to 100%</button>
                </fieldset>

                <fieldset className="settings-fieldset">
                  <legend>Judge panel position</legend>
                  <p className="settings-field-hint">The Mushaf keeps its reading direction; this changes which side holds scoring controls.</p>
                  <div className="settings-segmented" role="radiogroup" aria-label="Judge panel position">
                    <button type="button" role="radio" aria-checked={preferences.judgeRailSide === "left"} className={preferences.judgeRailSide === "left" ? "is-active" : ""} onClick={() => onChange({ judgeRailSide: "left" })}>Left</button>
                    <button type="button" role="radio" aria-checked={preferences.judgeRailSide === "right"} className={preferences.judgeRailSide === "right" ? "is-active" : ""} onClick={() => onChange({ judgeRailSide: "right" })}>Right</button>
                  </div>
                </fieldset>
              </>
            )}

            {section === "data" && (
              <>
                <div className="settings-section-head">
                  <span>Local data</span>
                  <h2 id="settings-data-title">Data and recovery</h2>
                  <p>Create a complete local backup or inspect one before restoring it.</p>
                </div>

                <section className="settings-action-section">
                  <div><strong>Backup this device</strong><p>Includes competition setup, participants, drafts, judging records and local evidence.</p></div>
                  <button type="button" className="btn-primary" onClick={() => downloadStateBackup(state)}><Icon name="download" size={15} /> Download backup</button>
                </section>

                <section className="settings-action-section is-stacked">
                  <div><strong>Restore from backup</strong><p>Select a Tahqeeq JSON backup. Nothing is replaced until you review and confirm it.</p></div>
                  <input
                    ref={restoreRef}
                    type="file"
                    accept=".json,application/json"
                    className="settings-file-input"
                    onChange={(event) => {
                      void readRestore(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                  <button type="button" className="btn-ghost" disabled={state.sessionActive || Boolean(state.preparedRecitation) || state.competition.status === "live"} onClick={() => restoreRef.current?.click()}>
                    <Icon name="upload" size={15} /> Select backup file
                  </button>
                  {(state.sessionActive || state.preparedRecitation || state.competition.status === "live") && <small className="settings-lock-note">Close the active competition before restoring local data.</small>}
                  {restoreError && <p className="settings-error" role="alert">{restoreError}</p>}
                  {summary && restorePreview && (
                    <div className="restore-preview" role="status">
                      <div className="restore-preview-head"><span>Ready to review</span><strong>{summary.competition}</strong><small>{summary.edition} · {summary.status}</small></div>
                      <dl>
                        <div><dt>Participants</dt><dd>{summary.participants}</dd></div>
                        <div><dt>Saved sessions</dt><dd>{summary.records}</dd></div>
                      </dl>
                      {!confirmRestore ? (
                        <div className="restore-preview-actions"><button type="button" className="btn-ghost" onClick={() => setRestorePreview(null)}>Cancel</button><button type="button" className="btn-primary" onClick={() => setConfirmRestore(true)}>Continue to restore</button></div>
                      ) : (
                        <div className="settings-confirm" role="alert"><strong>Replace this device's current Tahqeeq data?</strong><p>A safety backup downloads first. Competition and judging data will then be replaced with the reviewed file.</p><div><button type="button" className="btn-ghost" onClick={() => setConfirmRestore(false)}>Keep current data</button><button type="button" className="btn-primary" onClick={() => { downloadStateBackup(state); dispatch({ type: "LOAD", state: restorePreview }); setRestorePreview(null); setConfirmRestore(false); }}>Restore reviewed backup</button></div></div>
                      )}
                    </div>
                  )}
                </section>

                <section className="settings-action-section">
                  <div><strong>Reset preferences</strong><p>Restores appearance and workspace choices. Competition data and records remain untouched.</p></div>
                  {!confirmReset ? <button type="button" className="btn-ghost" disabled={JSON.stringify(preferences) === JSON.stringify(DEFAULT_DEVICE_PREFERENCES)} onClick={() => setConfirmReset(true)}>Reset preferences</button> : <div className="settings-confirm is-inline" role="alert"><strong>Reset device preferences?</strong><div><button type="button" className="btn-ghost" onClick={() => setConfirmReset(false)}>Cancel</button><button type="button" className="btn-primary" onClick={() => { onReset(); setConfirmReset(false); }}>Reset</button></div></div>}
                </section>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
