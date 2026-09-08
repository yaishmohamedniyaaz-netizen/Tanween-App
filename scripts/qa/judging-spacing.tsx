// Dev-only fixture on a separate origin. Never touches production storage.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "../../src/App";
import { JudgingProvider, useJudging } from "../../src/state/store";
import { createLiveCompetitionSnapshot } from "../../src/lib/competition";
import { createPanelPreset } from "../../src/lib/judgeAssignments";
import { enabledCategories } from "../../src/config";
import "../../src/styles/global.css";
import "../../src/styles/motion.css";
import "../../src/styles/settings.css";
import "../../src/styles/competition-setup-v2.css";

function Fixture() {
  const { state, dispatch } = useJudging();
  const [loaded, setLoaded] = useState(false);
  const safe = import.meta.env.DEV && location.hostname === "127.0.0.1"
    && location.port === "5204" && state.competition.isSample;
  if (loaded) return <App />;
  return <main style={{ padding: 24 }}><h1>Judging spacing QA</h1>
    <p>Isolated sample competition. Adu / Raagu has 20 available marks for double-digit half-mark checks.</p>
    <button disabled={!safe || state.sessionActive} onClick={() => {
      const config = { ...state.config, "adu-raagu": { ...state.config["adu-raagu"], start: 20 } };
      const panel = createPanelPreset("all", enabledCategories(config));
      const snapshot = createLiveCompetitionSnapshot({ competition: state.competition, panel, config, roster: state.roster });
      dispatch({ type: "LOAD", state: { ...state, config, panel, deviceJudgeId: panel.seats[0].id,
        competition: { ...state.competition, status: "live", liveSnapshot: snapshot } } });
      setLoaded(true);
    }}>Load spacing fixture</button>
    <button disabled={!safe} onClick={() => setLoaded(true)}>Continue existing spacing fixture</button>
  </main>;
}
createRoot(document.getElementById("root")!).render(<JudgingProvider><Fixture /></JudgingProvider>);
