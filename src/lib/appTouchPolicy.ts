/**
 * Tanween behaves like an installed app, not a web page: the browser must not
 * zoom the whole interface. Mushaf size is owned by the in-app size control.
 *
 * CSS `touch-action` (global.css) is the main guard. Safari also fires its own
 * non-standard gesture events for two-finger pinch; cancelling them covers
 * WebKit builds that still zoom despite `touch-action`.
 */
export function installAppTouchPolicy(target: Document = document): () => void {
  const block = (event: Event) => event.preventDefault();
  const names = ['gesturestart', 'gesturechange', 'gestureend'] as const;
  for (const name of names) target.addEventListener(name, block, { passive: false });
  return () => {
    for (const name of names) target.removeEventListener(name, block);
  };
}
