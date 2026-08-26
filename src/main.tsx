import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { JudgingProvider } from "./state/store";
import { registerServiceWorker } from "./lib/sw-register";
import { initializePwaInstall } from "./lib/pwaInstall";
import { initializeOfflineMushaf } from "./lib/offlineMushaf";
import "./styles/motion.css";
import "./styles/global.css";
import "./styles/settings.css";
import "./styles/competition-setup-v2.css";

// Capture the browser's one-shot install event before React effects run.
initializePwaInstall();
initializeOfflineMushaf();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <JudgingProvider>
      <App />
    </JudgingProvider>
  </StrictMode>,
);

void registerServiceWorker();
