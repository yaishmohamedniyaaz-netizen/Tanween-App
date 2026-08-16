import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { JudgingProvider } from "./state/store";
import { registerServiceWorker } from "./lib/sw-register";
import "./styles/motion.css";
import "./styles/global.css";
import "./styles/settings.css";
import "./styles/competition-setup-v2.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <JudgingProvider>
      <App />
    </JudgingProvider>
  </StrictMode>,
);

registerServiceWorker();
