export type PwaInstallOutcome = "accepted" | "dismissed" | "unavailable" | "failed";

export interface PwaInstallState {
  installAvailable: boolean;
  installing: boolean;
  standalone: boolean;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

type StandaloneNavigator = Navigator & { standalone?: boolean };

let initialized = false;
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let state: PwaInstallState = {
  installAvailable: false,
  installing: false,
  standalone: false,
};

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function updateState(patch: Partial<PwaInstallState>) {
  const next = { ...state, ...patch };
  if (
    next.installAvailable === state.installAvailable &&
    next.installing === state.installing &&
    next.standalone === state.standalone
  ) {
    return;
  }
  state = next;
  emit();
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as StandaloneNavigator).standalone === true;
}

export function initializePwaInstall(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  const standaloneMedia = window.matchMedia("(display-mode: standalone)");
  const syncStandalone = () => {
    const standalone = isStandaloneDisplay();
    if (standalone) deferredPrompt = null;
    updateState({
      standalone,
      installAvailable: standalone ? false : deferredPrompt !== null,
      installing: standalone ? false : state.installing,
    });
  };

  window.addEventListener("beforeinstallprompt", (event) => {
    const promptEvent = event as BeforeInstallPromptEvent;
    event.preventDefault();
    if (isStandaloneDisplay()) return;
    deferredPrompt = promptEvent;
    updateState({ installAvailable: true, installing: false });
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    updateState({ installAvailable: false, installing: false });
  });

  standaloneMedia.addEventListener("change", syncStandalone);
  syncStandalone();
}

export function getPwaInstallState(): PwaInstallState {
  return state;
}

export function subscribePwaInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function requestPwaInstall(): Promise<PwaInstallOutcome> {
  const promptEvent = deferredPrompt;
  if (!promptEvent || state.standalone || state.installing) return "unavailable";

  updateState({ installing: true });
  try {
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    deferredPrompt = null;
    updateState({ installAvailable: false, installing: false });
    return choice.outcome;
  } catch {
    deferredPrompt = null;
    updateState({ installAvailable: false, installing: false });
    return "failed";
  }
}
