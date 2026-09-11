import { useLayoutEffect, useRef } from 'react';

/** Presentation of the existing dismissal deadline; never a second timer. */
export function MistakeExpiryLine({ at, duration }: { at: number; duration: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animation: Animation | undefined;
    const synchronize = () => {
      animation?.cancel();
      const remaining = Math.max(0, Math.min(duration, at + duration - Date.now()));
      element.style.transform = `scaleX(${remaining / duration})`;
      if (!reduced.matches && remaining > 0) {
        animation = element.animate([
          { transform: `scaleX(${remaining / duration})` }, { transform: 'scaleX(0)' },
        ], { duration: remaining, easing: 'linear', fill: 'forwards' });
      }
    };
    synchronize();
    document.addEventListener('visibilitychange', synchronize);
    reduced.addEventListener('change', synchronize);
    return () => {
      animation?.cancel();
      document.removeEventListener('visibilitychange', synchronize);
      reduced.removeEventListener('change', synchronize);
    };
  }, [at, duration]);
  return <span ref={ref} className="mobile-mistake-expiry" aria-hidden="true" />;
}
