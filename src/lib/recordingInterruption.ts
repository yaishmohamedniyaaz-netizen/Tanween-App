/** Quiet speech and delayed chunks are not evidence of a lost microphone. */
export function watchRecordingInterruption(
  tracks: Array<EventTarget & { readonly readyState: string }>,
  foreground: EventTarget,
  onInterrupted: () => void,
) {
  let disposed = false;
  let reported = false;
  const check = () => {
    if (disposed || reported || !tracks.some(track => track.readyState === 'ended')) return;
    reported = true;
    onInterrupted();
  };
  for (const track of tracks) track.addEventListener('ended', check);
  foreground.addEventListener('visibilitychange', check);
  return {
    check,
    dispose() {
      disposed = true;
      for (const track of tracks) track.removeEventListener('ended', check);
      foreground.removeEventListener('visibilitychange', check);
    },
  };
}
