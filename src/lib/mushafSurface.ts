/** One transient editing surface owns input at a time. No scoring side effects. */
export const MUSHAF_SURFACE_EVENT = "tanween:mushaf-surface";
export type MushafSurface = "pages" | "phrases" | "guide" | "more" | "sheet" | "navigation";
export function openMushafSurface(surface: MushafSurface) {
  window.dispatchEvent(new CustomEvent(MUSHAF_SURFACE_EVENT, { detail: surface }));
}
