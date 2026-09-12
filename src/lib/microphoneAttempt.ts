/** Capture ownership only: no recorder, scoring, persistence or DOM dependency.
 * Cancellation settles our caller, not the browser permission request. A late
 * stream is released, and another browser request cannot overlap it.
 */
export interface CaptureStream {
  getTracks(): Array<{ stop(): void }>;
}
export type CaptureResult<S> =
  | { kind: 'ready'; stream: S; attempt: number }
  | { kind: 'cancelled' | 'timeout' | 'busy'; attempt: number }
  | { kind: 'error'; error: unknown; attempt: number };

export function createMicrophoneAttempt<S extends CaptureStream>(options: {
  acquire: () => Promise<S>;
  timeoutMs?: number;
  now?: () => number;
  schedule?: (callback: () => void, delay: number) => unknown;
  unschedule?: (handle: unknown) => void;
}) {
  const now = options.now ?? Date.now;
  const schedule = options.schedule ?? ((fn, ms) => setTimeout(fn, ms));
  const unschedule = options.unschedule ?? (id => clearTimeout(id as ReturnType<typeof setTimeout>));
  let generation = 0;
  let outstanding = false;
  let active: { id: number; deadline: number; timer: unknown; resolve: (result: CaptureResult<S>) => void } | null = null;
  let held: { id: number; stream: S } | null = null;
  const stop = (stream: S) => stream.getTracks().forEach(track => { try { track.stop(); } catch { /* Release other tracks too. */ } });
  function settle(result: CaptureResult<S>) {
    if (!active || active.id !== result.attempt) return;
    const previous = active;
    active = null;
    unschedule(previous.timer);
    previous.resolve(result);
  }
  function checkDeadline() {
    if (active && now() >= active.deadline) {
      const id = active.id;
      generation++;
      settle({ kind: 'timeout', attempt: id });
    }
  }
  function cancel() {
    generation++;
    if (active) settle({ kind: 'cancelled', attempt: active.id });
    if (held) { const previous = held; held = null; stop(previous.stream); }
  }
  function request(): Promise<CaptureResult<S>> {
    if (outstanding || held) return Promise.resolve({ kind: 'busy', attempt: generation });
    const id = ++generation;
    let resolve!: (result: CaptureResult<S>) => void;
    const result = new Promise<CaptureResult<S>>(done => { resolve = done; });
    active = { id, deadline: now() + (options.timeoutMs ?? 20_000), timer: null, resolve };
    active.timer = schedule(checkDeadline, options.timeoutMs ?? 20_000);
    outstanding = true;
    // Invoke immediately in the original user-action stack, not a deferred task.
    let acquisition: Promise<S>;
    try { acquisition = options.acquire(); }
    catch (error) { acquisition = Promise.reject(error); }
    void acquisition.then(stream => {
      outstanding = false;
      checkDeadline();
      if (generation !== id || active?.id !== id) { stop(stream); return; }
      held = { id, stream };
      settle({ kind: 'ready', stream, attempt: id });
    }, error => {
      outstanding = false;
      checkDeadline();
      if (generation === id) settle({ kind: 'error', error, attempt: id });
    });
    return result;
  }
  return {
    request, cancel, checkDeadline,
    isCurrent: (id: number) => generation === id,
    isBrowserPending: () => outstanding,
    /** Transfer stream cleanup to the recorder only while the attempt is current. */
    take(id: number): S | null {
      if (generation !== id || held?.id !== id) return null;
      const stream = held.stream; held = null; return stream;
    },
  };
}
