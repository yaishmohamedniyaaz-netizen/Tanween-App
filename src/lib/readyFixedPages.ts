import type { LoadedFixedPage } from './fixedMushafPackage.ts';

export interface ReadyFixedPage {
  page: number;
  pages: ReadonlyMap<number, LoadedFixedPage['geometry']>;
  semantic: ReadonlyMap<number, LoadedFixedPage['semantic']>;
}
export interface ReadyFixedSnapshot {
  requested: number | null;
  displayed: ReadyFixedPage | null;
  error: string | null;
}

/** One portrait reader owns at most three admitted pages, including decoding.
 * The rendered page stays pinned until React acknowledges its replacement.
 * A single worker also bounds work when an aborted decoder finishes late. */
export function createReadyFixedPages(load: (page: number, signal: AbortSignal) => Promise<LoadedFixedPage>) {
  const entries = new Map<number, { value: ReadyFixedPage; release: () => void }>();
  const pinned = new Set<number>();
  const failed = new Set<number>();
  const listeners = new Set<() => void>();
  let snapshot: ReadyFixedSnapshot = { requested: null, displayed: null, error: null };
  let active: { page: number; abort: AbortController } | null = null;
  let generation = 0;
  const publish = (next: ReadyFixedSnapshot) => { snapshot = next; listeners.forEach(fn => fn()); };
  const wanted = () => snapshot.requested === null ? [] :
    [snapshot.requested, snapshot.requested - 1, snapshot.requested + 1].filter(n => n >= 1 && n <= 604);
  const admit = (page: number) => {
    const entry = entries.get(page);
    if (!entry || snapshot.requested !== page) return;
    pinned.add(page);
    publish({ requested: page, displayed: entry.value, error: null });
  };
  const release = (page: number) => {
    const entry = entries.get(page);
    entries.delete(page);
    entry?.release();
  };
  const pump = () => {
    if (active) return;
    const desired = wanted();
    const next = desired.find(page => !entries.has(page) && !failed.has(page));
    if (next === undefined) return;
    if (entries.size >= 3) {
      const victim = [...entries.keys()].reverse().find(page => !pinned.has(page) && !desired.includes(page))
        ?? (next === snapshot.requested ? [...entries.keys()].reverse().find(page => !pinned.has(page)) : undefined);
      if (victim === undefined) return;
      release(victim);
    }
    const job = { page: next, abort: new AbortController() };
    const epoch = generation;
    active = job;
    void load(next, job.abort.signal).then(result => {
      if (epoch !== generation || job.abort.signal.aborted || !wanted().includes(next)) {
        result.dispose();
        return;
      }
      active = null;
      entries.set(next, { value: { page: next,
        pages: new Map([[next, result.geometry]]), semantic: new Map([[next, result.semantic]]) },
        release: () => result.dispose() });
      if (snapshot.requested === next) admit(next);
    }).catch(error => {
      if (epoch !== generation || job.abort.signal.aborted) return;
      failed.add(next);
      if (snapshot.requested === next) publish({ ...snapshot,
        error: error instanceof Error ? error.message : 'Mushaf page unavailable' });
    }).finally(() => {
      if (active === job) active = null;
      pump();
    });
  };
  return {
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    getSnapshot: () => snapshot,
    request(page: number) {
      if (!Number.isInteger(page) || page < 1 || page > 604) return;
      if (snapshot.requested === page) { pump(); return; }
      failed.clear();
      publish({ ...snapshot, requested: page, error: null });
      if (active && active.page !== page) active.abort.abort();
      admit(page);
      pump();
    },
    committed(page: number) {
      // Do not unpin a more recent admission during an older React commit.
      if (snapshot.displayed?.page !== page) return;
      pinned.clear(); pinned.add(page);
      for (const n of entries.keys()) if (!wanted().includes(n) && n !== page) release(n);
      pump();
    },
    retry() { failed.clear(); publish({ ...snapshot, error: null }); pump(); },
    clear() {
      generation++;
      active?.abort.abort();
      for (const n of entries.keys()) release(n);
      pinned.clear(); failed.clear();
      publish({ requested: null, displayed: null, error: null });
    },
    // A count of owned resources, not a claim about the browser's total memory.
    ownedPages: () => entries.size + (active ? 1 : 0),
  };
}
