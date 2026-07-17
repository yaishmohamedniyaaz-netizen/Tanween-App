import { useEffect, useState } from "react";
import { getSWState, subscribeSW, type SWState } from "../lib/sw-register";

export function useOfflineStatus(): SWState {
  const [state, setState] = useState<SWState>(getSWState);

  useEffect(() => {
    return subscribeSW(setState);
  }, []);

  return state;
}
