import { useEffect, useState } from 'react';
import descriptor from '../data/fixedMushafPackage.json';
import { createFixedMushafLoader, type LoadedFixedPage } from '../lib/fixedMushafPackage.ts';
import type { FixedPageGeometry } from '../lib/fixedMushafGeometry.ts';
import type { MushafPage } from '../lib/page.ts';
import { readFixedAsset } from '../lib/fixedMushafStorage.ts';

export const fixedMushafLoader = createFixedMushafLoader(descriptor, readFixedAsset);

/** One owner for a visible page set; navigation releases the previous images. */
export function useFixedMushafPages(numbers: readonly number[]) {
  const key = numbers.join(':');
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    key: string;
    pages: ReadonlyMap<number, FixedPageGeometry> | null;
    semantic?: ReadonlyMap<number, MushafPage>;
    error: string | null;
  }>({ key: '', pages: null, error: null });
  useEffect(() => {
    const abort = new AbortController();
    const loaded: LoadedFixedPage[] = [];
    setState({ key, pages: null, error: null });
    void (async () => {
      const pages = new Map<number, FixedPageGeometry>();
      const semantic = new Map<number, MushafPage>();
      // Sequential admission bounds decoded work even if a spread is cancelled.
      for (const page of key ? key.split(':').map(Number) : []) {
        const result = await fixedMushafLoader.load(page, abort.signal);
        if (abort.signal.aborted) { result.dispose(); return; }
        loaded.push(result);
        pages.set(page, result.geometry);
        semantic.set(page, result.semantic);
      }
      if (!abort.signal.aborted) setState({ key, pages, semantic, error: null });
    })().catch(error => {
      loaded.splice(0).forEach(page => page.dispose());
      if (!abort.signal.aborted) {
        setState({ key, pages: null, error: error instanceof Error ? error.message : 'Mushaf page unavailable' });
      }
    });
    return () => { abort.abort(); loaded.splice(0).forEach(page => page.dispose()); };
  }, [key, attempt]);
  return {
    pages: state.key === key ? state.pages : null,
    semantic: state.key === key ? state.semantic : undefined,
    error: state.key === key ? state.error : null,
    retry: () => setAttempt(value => value + 1),
  };
}
