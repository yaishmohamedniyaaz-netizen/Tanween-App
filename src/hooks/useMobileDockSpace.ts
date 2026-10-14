import { useLayoutEffect, useRef, type RefObject } from 'react';

/** Measure chrome, never Quran content, to reserve space for enlarged text. */
export function useMobileDockSpace(root: RefObject<HTMLDivElement>, enabled: boolean, live: boolean) {
  const reservedSpace = useRef(0);
  useLayoutEffect(() => {
    const app = root.current;
    if (!app) return;
    if (!enabled) {
      reservedSpace.current = 0;
      app.style.removeProperty('--mobile-measured-dock-space');
      return;
    }
    const dock = app.querySelector<HTMLElement>(live ? '.mobile-judge-deck' : '.sidebar');
    if (!dock) return;
    // Beginning replaces the prepared controls with a shorter live dock on
    // narrow screens. Keep its space so the paper does not jump at that moment.
    let minimum = live ? reservedSpace.current : 0;
    let viewport = `${window.innerWidth}:${window.innerHeight}`;
    const measure = () => {
      const nextViewport = `${window.innerWidth}:${window.innerHeight}`;
      if (nextViewport !== viewport) {
        minimum = 0;
        viewport = nextViewport;
      }
      const height = Math.max(minimum, dock.getBoundingClientRect().height);
      reservedSpace.current = height;
      app.style.setProperty('--mobile-measured-dock-space', `${height}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(dock);
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, [root, enabled, live]);
}
