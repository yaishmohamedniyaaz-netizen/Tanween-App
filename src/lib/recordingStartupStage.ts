export class RecordingStartupError extends Error {
  readonly stage: string;
  constructor(stage: string) {
    super(`Recording did not start: ${stage} took too long. Judging data is unchanged. You can continue without recording.`);
    this.stage = stage;
    this.name = 'RecordingStartupError';
  }
}

/** Bounds the caller's wait, not an underlying IndexedDB transaction. Callers
 * must retain session ownership and not retry a pending write concurrently. */
export function waitForRecordingStage<T>(
  task: Promise<T>, stage: string, timeoutMs = 15_000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    let settled = false;
    const finish = (error: unknown, value?: T, rejected = false) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (rejected || error) reject(error); else resolve(value as T);
    };
    const timer = setTimeout(() => finish(new RecordingStartupError(stage)), timeoutMs);
    task.then(value => {
      if (Date.now() >= deadline) finish(new RecordingStartupError(stage));
      else finish(null, value);
    }, error => finish(error, undefined, true));
  });
}

export type RecordingDiagnosticStage = 'microphone-request' | 'stream-received' |
  'storage-read' | 'storage-create' | 'segment-create' | 'recorder-start' |
  'recorder-started' | 'first-chunk' | 'first-chunk-saved' | 'failed';

/** Optional bounded memory-only diagnostics. No identities, device labels,
 * exception text, audio or persistent records. */
export function createRecordingDiagnostics(enabled: boolean) {
  const entries: Array<{stage: RecordingDiagnosticStage; at: number}> = [];
  const start = Date.now();
  return {
    record(stage: RecordingDiagnosticStage) {
      if (!enabled) return;
      entries.push({stage, at: Math.max(0, Date.now() - start)});
      if (entries.length > 40) entries.shift();
    },
    snapshot: () => entries.map(entry => ({...entry})),
  };
}
