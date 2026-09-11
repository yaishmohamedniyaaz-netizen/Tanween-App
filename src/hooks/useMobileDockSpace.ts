import { useLayoutEffect, type RefObject } from 'react';

/** Measure chrome, never Quran content, to reserve space for enlarged text. */
export function useMobileDockSpace(root: RefObject<HTMLDivElement>, enabled: boolean, live: boolean) {
  useLayoutEffect(() => {
    const app = root.current;
    if (!enabled || !app) return;
    const dock = app.querySelector<HTMLElement>(live ? '.mobile-judge-deck' : '.sidebar');
    if (!dock) return;
    const measure = () => app.style.setProperty('--mobile-measured-dock-space', `${dock.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(dock);
    return () => { observer.disconnect(); app.style.removeProperty('--mobile-measured-dock-space'); };
  }, [root, enabled, live]);
}
