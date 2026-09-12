import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { fixedMushafLoader } from './useFixedMushafPages';
import type { LoadedFixedPage } from '../lib/fixedMushafPackage';
import type { ReadyFixedPage } from '../lib/readyFixedPages';

/** Retain only the displayed set and its replacement. No speculative cache. */
export function useReadyFixedSpread(numbers: readonly number[]) {
  const key = numbers.join(':');
  const [attempt, setAttempt] = useState(0);
  const [shown, setShown] = useState<{ key: string; ready: ReadyFixedPage } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const generation = useRef(0);
  const queue = useRef(Promise.resolve());
  const owned = useRef(new Map<ReadyFixedPage, LoadedFixedPage[]>());

  useEffect(() => {
    const epoch = ++generation.current;
    const abort = new AbortController();
    setFailure(null);
    // Serialize replacements, including decoders which finish after cancellation.
    queue.current = queue.current.then(async () => {
      if (abort.signal.aborted || epoch !== generation.current) return;
      const loaded: LoadedFixedPage[] = [];
      try {
        for (const page of key.split(':').map(Number)) {
          const result = await fixedMushafLoader.load(page, abort.signal);
          loaded.push(result);
          if (abort.signal.aborted || epoch !== generation.current) return;
        }
        const pages = key.split(':').map(Number);
        const ready: ReadyFixedPage = { page: pages[0],
          pages: new Map(loaded.map((item, index) => [pages[index], item.geometry])),
          semantic: new Map(loaded.map((item, index) => [pages[index], item.semantic])) };
        owned.current.set(ready, loaded.splice(0));
        setShown({ key, ready });
      } catch (error) {
        if (!abort.signal.aborted && epoch === generation.current) {
          setFailure({ key, message: error instanceof Error ? error.message : 'Page unavailable' });
        }
      } finally { loaded.forEach(item => item.dispose()); }
    });
    return () => abort.abort();
  }, [key, attempt]);

  useLayoutEffect(() => {
    // React has installed the replacement before old image URLs are released.
    for (const [ready, pages] of owned.current) {
      if (ready === shown?.ready) continue;
      pages.forEach(page => page.dispose());
      owned.current.delete(ready);
    }
  }, [shown]);
  useEffect(() => () => {
    generation.current++;
    for (const pages of owned.current.values()) pages.forEach(page => page.dispose());
    owned.current.clear();
  }, []);
  return { ready: shown?.ready ?? null, pending: shown?.key !== key,
    error: failure?.key === key ? failure.message : null,
    retry: () => setAttempt(value => value + 1) };
}
