import { useLayoutEffect, useRef, type RefObject } from 'react';
import { createMushafPageGesture, type SwipeDirection } from '../lib/mushafPageGesture';

interface Options {
  host: RefObject<HTMLDivElement>;
  composition: RefObject<HTMLDivElement>;
  enabled: boolean;
  ready: boolean;
  viewKey: string;
  generation: string;
  error?: string | null;
  classify(event: PointerEvent): 'word' | 'background' | 'dismiss' | 'control';
  cancelMarking(): void;
  target(direction: SwipeDirection): { page: number; key: string } | null;
  navigate(page: number): void;
  settled(): void;
}

const CONTROL = 'button, input, textarea, select, a, [role="button"], [role="dialog"], [role="menu"], [contenteditable="true"], .mushaf-shared-nav';

/** One stage owner. Motion is composited without a React render on every move. */
export function useMushafPageGesture(options: Options) {
  const latest = useRef(options);
  const gesture = useRef(createMushafPageGesture());
  const contacts = useRef(new Set<number>());
  const animation = useRef<Animation | null>(null);
  const pending = useRef<{ key: string; direction: SwipeDirection } | null>(null);
  const frame = useRef(0);
  const offset = useRef(0);
  const captured = useRef<number | null>(null);
  const clickGuard = useRef<{ id: number; until: number } | null>(null);
  const cancelRef = useRef<() => void>(() => {});
  const animateRef = useRef<(from: number, duration: number) => void>(() => {});
  const updatePanModeRef = useRef<() => void>(() => {});

  useLayoutEffect(() => { latest.current = options; });

  useLayoutEffect(() => {
    const host = options.host.current ?? options.composition.current?.closest<HTMLDivElement>('.mushaf-shell');
    if (!host || !options.enabled) return;
    const controller = gesture.current;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const setState = (state: string) => { host.dataset.pageSwipeState = state; };
    const resetMotion = () => {
      cancelAnimationFrame(frame.current); frame.current = 0;
      animation.current?.cancel(); animation.current = null;
      const layer = latest.current.composition.current;
      if (layer) { layer.style.removeProperty('transform'); layer.style.removeProperty('will-change'); }
      offset.current = 0;
    };
    const releaseCapture = () => {
      const id = captured.current; captured.current = null;
      if (id !== null && host.hasPointerCapture(id)) host.releasePointerCapture(id);
    };
    const animate = (from: number, duration: number) => {
      resetMotion();
      const layer = latest.current.composition.current;
      if (!layer || motion.matches || !from) { setState('idle'); return; }
      setState('settling');
      layer.style.willChange = 'transform';
      const effect = layer.animate([
        { transform: `translate3d(${from}px,0,0)` },
        { transform: 'translate3d(0,0,0)' },
      ], { duration, easing: 'cubic-bezier(0.25,1,0.5,1)' });
      animation.current = effect;
      void effect.finished.then(() => {
        if (animation.current !== effect) return;
        resetMotion(); setState('idle'); latest.current.settled();
      }, () => {});
    };
    animateRef.current = animate;
    const cancel = () => {
      controller.cancel(); releaseCapture(); pending.current = null;
      resetMotion(); setState('idle');
    };
    cancelRef.current = cancel;
    const updatePanMode = () => {
      // A temporary slide may extend scrollWidth. It is not user zoom/overflow.
      // Resize and view changes cancel motion before asking for a new policy.
      if (controller.active() || animation.current) return;
      const pan = host.scrollWidth > host.clientWidth + 2 || (window.visualViewport?.scale ?? 1) > 1.01;
      host.dataset.pageSwipeMode = pan ? 'pan' : 'swipe';
      if (pan) cancel();
    };
    updatePanModeRef.current = updatePanMode;
    const onDown = (event: PointerEvent) => {
      // Keep a new physical gesture independent of a previous compatibility click.
      clickGuard.current = null;
      contacts.current.add(event.pointerId);
      const target = event.target instanceof Element ? event.target : null;
      const inside = target && host.contains(target);
      if (contacts.current.size > 1) {
        cancel(); latest.current.cancelMarking();
        if (inside) event.stopPropagation();
        return;
      }
      if (!inside) { cancel(); return; }
      // Do not hijack controls or any part of their larger touch target.
      if (target.closest(CONTROL) && !target.closest('[data-word-hit]')) { cancel(); return; }
      if (!['touch', 'pen'].includes(event.pointerType)) return;
      if (animation.current || pending.current || !latest.current.ready) { event.stopPropagation(); return; }
      const kind = latest.current.classify(event);
      if (kind === 'dismiss') { latest.current.cancelMarking(); event.stopPropagation(); return; }
      if (document.querySelector('[aria-modal="true"], dialog[open], [role="menu"]')) return;
      if (kind === 'control' || kind === 'word') return;
      updatePanMode();
      if (host.dataset.pageSwipeMode === 'pan') return;
      if (!controller.begin({ pointerId: event.pointerId, pointerType: event.pointerType,
        button: event.button, isPrimary: event.isPrimary, clientX: event.clientX, clientY: event.clientY,
        width: host.clientWidth, generation: latest.current.generation })) return;
      setState('candidate');
      // A background start never reaches the marking handler, even under capture.
      event.stopPropagation();
    };
    const onMove = (event: PointerEvent) => {
      if (!controller.owns(event.pointerId)) return;
      event.stopPropagation();
      const result = controller.move(event, latest.current.generation);
      if (!result?.horizontal) return;
      if (!latest.current.ready) { cancel(); return; }
      if (captured.current === null) {
        try { host.setPointerCapture(event.pointerId); captured.current = event.pointerId; }
        catch { cancel(); return; }
      }
      if (event.cancelable) event.preventDefault();
      setState('dragging');
      const direction = result.dx > 0 ? 1 : -1;
      const available = latest.current.target(direction);
      // Gentle resistance supplies feedback without exposing an empty next page.
      offset.current = motion.matches ? 0 : Math.sign(result.dx) *
        Math.min(available ? 40 : 12, Math.abs(result.dx) * (available ? 0.28 : 0.1));
      if (!frame.current) frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        const layer = latest.current.composition.current;
        if (layer) {
          layer.style.willChange = 'transform';
          layer.style.transform = `translate3d(${offset.current}px,0,0)`;
        }
      });
    };
    const onUp = (event: PointerEvent) => {
      contacts.current.delete(event.pointerId);
      if (!controller.owns(event.pointerId)) return;
      event.stopPropagation();
      const direction = controller.end(event, latest.current.generation);
      releaseCapture();
      clickGuard.current = { id: event.pointerId, until: performance.now() + 600 };
      const target = direction && latest.current.ready ? latest.current.target(direction) : null;
      animate(offset.current, 160);
      if (target && direction) {
        pending.current = { key: target.key, direction };
        latest.current.cancelMarking();
        latest.current.navigate(target.page);
      }
    };
    const onCancel = (event: PointerEvent) => {
      contacts.current.delete(event.pointerId);
      if (controller.owns(event.pointerId)) cancel();
    };
    const onLostCapture = (event: PointerEvent) => {
      // Touch implicitly captures its initial target. Its bubbled loss when we
      // transfer ownership to the stage is expected, not a cancelled swipe.
      if (event.target === host && controller.owns(event.pointerId) && captured.current === event.pointerId) cancel();
    };
    const onClick = (event: MouseEvent) => {
      const guard = clickGuard.current;
      if (!guard || event.detail === 0 || performance.now() > guard.until) return;
      if ('pointerId' in event && event.pointerId !== guard.id) return;
      event.preventDefault(); event.stopPropagation(); clickGuard.current = null;
    };
    const onBlur = () => { contacts.current.clear(); cancel(); latest.current.cancelMarking(); };
    const onVisibility = () => { if (document.hidden) onBlur(); };
    const onResize = () => { cancel(); updatePanMode(); };
    const onScroll = () => { if (controller.active()) cancel(); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') cancel(); };
    const observer = new ResizeObserver(updatePanMode);
    observer.observe(host);
    if (options.composition.current) observer.observe(options.composition.current);
    updatePanMode(); setState('idle');
    document.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointermove', onMove, { capture: true, passive: false });
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onCancel, true);
    host.addEventListener('lostpointercapture', onLostCapture);
    host.addEventListener('click', onClick, true);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('keydown', onKey, true);
    window.visualViewport?.addEventListener('resize', onResize);
    motion.addEventListener('change', cancel);
    return () => {
      cancel(); contacts.current.clear(); observer.disconnect();
      document.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onCancel, true);
      host.removeEventListener('lostpointercapture', onLostCapture);
      host.removeEventListener('click', onClick, true);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('keydown', onKey, true);
      window.visualViewport?.removeEventListener('resize', onResize);
      motion.removeEventListener('change', cancel);
      cancelRef.current = () => {};
      animateRef.current = () => {};
      updatePanModeRef.current = () => {};
      delete host.dataset.pageSwipeMode; delete host.dataset.pageSwipeState;
    };
  }, [options.enabled, options.host, options.composition]);

  useLayoutEffect(() => {
    const turn = pending.current;
    // A coherent destination is now mounted. Other navigation never borrows its motion.
    if (turn?.key === options.viewKey) {
      gesture.current.cancel(); pending.current = null;
      animateRef.current(-turn.direction * 32, 200);
    } else {
      cancelRef.current();
    }
  }, [options.viewKey, options.generation]);
  // Fit/rotation can change overflow before ResizeObserver delivers its callback.
  // Publish the native policy in the same layout commit, before new contact.
  useLayoutEffect(() => { updatePanModeRef.current(); });
  useLayoutEffect(() => { if (options.error) cancelRef.current(); }, [options.error]);

  return { isLocked: () => gesture.current.active() || animation.current !== null ||
    pending.current !== null || contacts.current.size > 1 };
}
