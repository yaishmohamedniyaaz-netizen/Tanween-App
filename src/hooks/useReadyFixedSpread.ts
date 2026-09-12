import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { fixedMushafLoader } from './useFixedMushafPages';
import { createReadyFixedSpreads } from '../lib/readyFixedSpreads';

export function useReadyFixedSpread(numbers: readonly number[]) {
  const [owner] = useState(() => createReadyFixedSpreads((page, signal) => fixedMushafLoader.load(page, signal)));
  const snapshot = useSyncExternalStore(owner.subscribe, owner.getSnapshot);
  const key = numbers.join(':');
  useEffect(() => { owner.request(key.split(':').map(Number)); }, [owner, key]);
  useLayoutEffect(() => { if (snapshot.displayed) owner.committed(snapshot.displayed); }, [owner, snapshot.displayed]);
  useEffect(() => () => owner.clear(), [owner]);
  return { ready: snapshot.displayed,
    pending: !snapshot.displayed || [...snapshot.displayed.pages.keys()].join(':') !== key,
    error: snapshot.requested === key ? snapshot.error : null, retry: owner.retry };
}
