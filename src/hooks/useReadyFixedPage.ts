import { useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { createReadyFixedPages } from '../lib/readyFixedPages';
import { fixedMushafLoader } from './useFixedMushafPages';

export function useReadyFixedPage(page: number, enabled: boolean) {
  const [owner] = useState(() => createReadyFixedPages((n, signal) => fixedMushafLoader.load(n, signal)));
  const snapshot = useSyncExternalStore(owner.subscribe, owner.getSnapshot);
  useLayoutEffect(() => {
    if (!enabled) return;
    owner.request(page);
  }, [owner, page, enabled]);
  useLayoutEffect(() => () => owner.clear(), [owner, enabled]);
  useLayoutEffect(() => {
    if (enabled && snapshot.displayed) owner.committed(snapshot.displayed.page);
  }, [owner, enabled, snapshot.displayed]);
  return { ready: enabled ? snapshot.displayed : null,
    pending: enabled && (snapshot.requested !== page || snapshot.displayed?.page !== page),
    error: enabled ? snapshot.error : null, retry: owner.retry };
}
