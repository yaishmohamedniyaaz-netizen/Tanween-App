import { useSyncExternalStore } from "react";
import {
  getPwaInstallState,
  requestPwaInstall,
  subscribePwaInstall,
} from "../lib/pwaInstall";

export function usePwaInstall() {
  const state = useSyncExternalStore(
    subscribePwaInstall,
    getPwaInstallState,
    getPwaInstallState,
  );

  return { ...state, requestInstall: requestPwaInstall };
}
