import { useSyncExternalStore } from "react";
import {
  getOfflineMushafState,
  subscribeOfflineMushaf,
} from "../lib/offlineMushaf";

export function useOfflineMushaf() {
  return useSyncExternalStore(
    subscribeOfflineMushaf,
    getOfflineMushafState,
    getOfflineMushafState,
  );
}
