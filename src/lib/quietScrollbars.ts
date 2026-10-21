/**
 * Quiet scrollbars for lists inside the judging screens.
 *
 * The grip is hidden at rest. While the list scrolls it shows softly
 * (`.is-scrolling`), and it shows in full only when the pointer is on the
 * bar's own strip or drags it (`.is-grip`). Moving the pointer over the cards
 * never reveals it. The list's cut-off last card and edge shadow already show
 * that there is more below.
 *
 * Classes are used instead of `:hover`, because WebKit does not reliably
 * repaint `::-webkit-scrollbar` on hover (WebKit bug 267575). A custom
 * property is changed with each class change to force that repaint.
 */
export const QUIET_SCROLL_CLASS = "quiet-scroll";
const SCROLL_HIDE_MS = 900;

let installed = false;

export function installQuietScrollbars(doc: Document = document): void {
  if (installed) return;
  installed = true;
  const timers = new WeakMap<HTMLElement, number>();
  let repaint = 0;
  const bump = (list: HTMLElement) => list.style.setProperty("--quiet-scroll-paint", String(++repaint));

  doc.addEventListener("scroll", (event) => {
    const list = event.target;
    if (!(list instanceof HTMLElement) || !list.classList.contains(QUIET_SCROLL_CLASS)) return;
    window.clearTimeout(timers.get(list));
    // A shrinking disclosure can emit scroll events every animation frame.
    // Repaint the scrollbar when visibility changes, not on every scroll tick:
    // inherited custom-property writes invalidate every card in the list.
    if (!list.classList.contains("is-scrolling")) {
      list.classList.add("is-scrolling");
      bump(list);
    }
    timers.set(list, window.setTimeout(() => {
      list.classList.remove("is-scrolling");
      bump(list);
    }, SCROLL_HIDE_MS));
  }, true);

  let grip: HTMLElement | null = null;
  let dragging = false;
  const setGrip = (list: HTMLElement | null) => {
    if (grip === list) return;
    if (grip) { grip.classList.remove("is-grip"); bump(grip); }
    grip = list;
    if (list) { list.classList.add("is-grip"); bump(list); }
  };

  doc.addEventListener("pointermove", (event) => {
    if (dragging || event.pointerType === "touch") return;
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>(`.${QUIET_SCROLL_CLASS}`) : null;
    setGrip(target && isOnScrollbarStrip(target, event.clientX) ? target : null);
  }, { passive: true });
  doc.addEventListener("pointerdown", () => { if (grip) dragging = true; }, true);
  const release = () => { dragging = false; };
  doc.addEventListener("pointerup", release, true);
  doc.addEventListener("pointercancel", release, true);
}

/** True when x is over the vertical scrollbar of a list that can scroll. */
export function isOnScrollbarStrip(list: HTMLElement, clientX: number): boolean {
  if (list.scrollHeight <= list.clientHeight) return false;
  const style = getComputedStyle(list);
  const borderLeft = parseFloat(style.borderLeftWidth) || 0;
  const borderRight = parseFloat(style.borderRightWidth) || 0;
  // "scrollbar-gutter: stable both-edges" reserves the same width on the other side too
  const gutters = style.getPropertyValue("scrollbar-gutter").includes("both-edges") ? 2 : 1;
  const width = (list.offsetWidth - list.clientWidth - borderLeft - borderRight) / gutters;
  if (width <= 0) return false;
  const rect = list.getBoundingClientRect();
  return style.direction === "rtl"
    ? clientX >= rect.left + borderLeft && clientX <= rect.left + borderLeft + width
    : clientX <= rect.right - borderRight && clientX >= rect.right - borderRight - width;
}
