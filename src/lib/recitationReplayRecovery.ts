/** Persistence messages must never imply that an uncommitted draft was saved. */
export function replaySaveFailure(failure: unknown, savedSuggestions?: number): string {
  const quota = failure instanceof Error && failure.name === "QuotaExceededError";
  const reason = quota ? "This device has no space to save more timings."
    : failure instanceof Error ? failure.message : "Timing could not be saved.";
  if (savedSuggestions !== undefined) return `${savedSuggestions} suggestions saved before analysis stopped. Remaining suggestions were not saved. ${reason} Original audio is unchanged.`;
  return `${reason} Your timing edit was not saved; its boundaries are still here.`;
}
