import { useLayoutEffect, useRef, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { createMushafPageGesture, type SwipeDirection } from '../lib/mushafPageGesture';

interface Options {
  host: RefObject<HTMLDivElement>;
  composition: RefObject<HTMLDivElement>;
  preview: RefObject<HTMLDivElement>;
  showPreviews(show: boolean): void;
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

/** One live judging surface; inert presentations follow the physical contact. */
export function useMushafPageGesture(options: Options) {
  const latest = useRef(options), gesture = useRef(createMushafPageGesture());
  const contacts = useRef(new Set<number>()), animation = useRef<Animation | null>(null);
  const pending = useRef<{ key: string; from: string; generation: string } | null>(null);
  const frame = useRef(0), offset = useRef(0), rawOffset = useRef(0);
  const captured = useRef<number | null>(null);
  const clickGuard = useRef<{ id: number; until: number } | null>(null);
  const cancelRef = useRef<() => void>(() => {}), refreshRef = useRef<() => void>(() => {});
  useLayoutEffect(() => { latest.current = options; });

  useLayoutEffect(() => {
    const host = options.host.current ?? options.composition.current?.closest<HTMLDivElement>('.mushaf-shell');
    if (!host || !options.enabled) return;
    const controller = gesture.current, motion = matchMedia('(prefers-reduced-motion: reduce)');
    const track = () => latest.current.preview.current?.querySelector<HTMLElement>('.mushaf-swipe-track');
    const setState = (state: string) => { host.dataset.pageSwipeState = state; };
    const releaseCapture = () => {
      const id = captured.current; captured.current = null;
      if (id !== null && host.hasPointerCapture(id)) host.releasePointerCapture(id);
    };
    const resetMotion = () => {
      cancelAnimationFrame(frame.current); frame.current = 0;
      animation.current?.cancel(); animation.current = null;
      const layer = latest.current.preview.current;
      if (layer) {
        layer.style.visibility = 'hidden';
        for (const property of ['top', 'left', 'width', 'height']) layer.style.removeProperty(property);
      }
      layer?.querySelector('[data-swipe-current]')?.replaceChildren();
      latest.current.composition.current?.style.removeProperty('visibility');
      offset.current = rawOffset.current = 0;
    };
    const cancel = () => {
      controller.cancel(); releaseCapture(); pending.current = null;
      resetMotion(); setState('idle');
    };
    cancelRef.current = cancel;
    const updatePanMode = () => {
      if (controller.active() || animation.current || pending.current) return;
      const width = host.dataset.mobilePaper === 'true'
        ? latest.current.composition.current?.getBoundingClientRect().width ?? host.scrollWidth
        : host.scrollWidth;
      const pan = width > host.clientWidth + 2 || (window.visualViewport?.scale ?? 1) > 1.01;
      host.dataset.pageSwipeMode = pan ? 'pan' : 'swipe';
      if (pan) cancel();
    };
    const readyPreview = (key: string) => {
      const view = latest.current.preview.current?.querySelector<HTMLElement>(`[data-swipe-view="${key}"]`);
      return view?.querySelector('[data-presentation-ready="true"]') ? view : null;
    };
    const draw = () => {
      const layer = latest.current.preview.current, strip = track();
      if (!layer || !strip || motion.matches) return;
      const dx = rawOffset.current, direction = dx >= 0 ? 1 : -1;
      const target = latest.current.target(direction), distance = host.clientWidth;
      const available = target && readyPreview(target.key);
      offset.current = available ? Math.max(-distance, Math.min(distance, dx))
        : Math.sign(dx) * Math.min(target ? 28 : 12, Math.abs(dx) * 0.18);
      for (const view of layer.querySelectorAll<HTMLElement>('[data-swipe-view]')) {
        const forward = latest.current.target(1)?.key === view.dataset.swipeView;
        view.style.transform = `translate3d(${forward ? -distance : distance}px,0,0)`;
      }
      strip.style.transform = `translate3d(${offset.current}px,0,0)`;
      if (host.dataset.pageSwipeState === 'dragging') {
        layer.style.visibility = 'visible';
        latest.current.composition.current?.style.setProperty('visibility', 'hidden');
      }
    };
    refreshRef.current = () => { updatePanMode(); if (controller.active()) draw(); };
    const animate = (to: number, done: () => void) => {
      cancelAnimationFrame(frame.current); frame.current = 0;
      const strip = track();
      if (!strip || motion.matches || Math.abs(to - offset.current) < 1) { done(); return; }
      setState('settling');
      const duration = Math.max(140, Math.min(280, 140 + Math.abs(to - offset.current) / host.clientWidth * 140));
      const effect = strip.animate([
        { transform: `translate3d(${offset.current}px,0,0)` },
        { transform: `translate3d(${to}px,0,0)` },
      ], { duration, easing: 'cubic-bezier(0.22,0.8,0.3,1)', fill: 'forwards' });
      animation.current = effect;
      void effect.finished.then(() => {
        if (animation.current !== effect) return;
        strip.style.transform = `translate3d(${to}px,0,0)`;
        offset.current = to; animation.current = null; effect.cancel(); done();
      }, () => {});
    };
    const prepare = () => {
      if (motion.matches) return;
      if (!latest.current.preview.current) flushSync(() => latest.current.showPreviews(true));
      const layer = latest.current.preview.current;
      const original = latest.current.composition.current?.closest('.mushaf-scroll');
      const slot = layer?.querySelector('[data-swipe-current]');
      if (!layer || !original || !slot) return;
      // Cloning copies appearance, not React handlers. The entire layer is inert.
      const copy = original.cloneNode(true) as HTMLElement;
      copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      slot.replaceChildren(copy);
      layer.style.top = `${host.scrollTop}px`; layer.style.left = `${host.scrollLeft}px`;
      layer.style.width = `${host.clientWidth}px`; layer.style.height = `${host.clientHeight}px`;
      draw();
    };
    const onDown = (event: PointerEvent) => {
      clickGuard.current = null; contacts.current.add(event.pointerId);
      const target = event.target instanceof Element ? event.target : null;
      const inside = target && host.contains(target);
      if (contacts.current.size > 1) {
        cancel(); latest.current.cancelMarking(); if (inside) event.stopPropagation(); return;
      }
      if (!inside) { cancel(); return; }
      if (target.closest(CONTROL) && !target.closest('[data-word-hit]')) { cancel(); return; }
      if (!['touch', 'pen'].includes(event.pointerType)) return;
      if (animation.current || pending.current || !latest.current.ready) { event.stopPropagation(); return; }
      const kind = latest.current.classify(event);
      if (kind === 'dismiss') { latest.current.cancelMarking(); event.stopPropagation(); return; }
      if (document.querySelector('[aria-modal="true"], dialog[open], [role="menu"]')) return;
      if (kind === 'control' || kind === 'word') return;
      updatePanMode(); if (host.dataset.pageSwipeMode === 'pan') return;
      if (!controller.begin({ pointerId: event.pointerId, pointerType: event.pointerType,
        button: event.button, isPrimary: event.isPrimary, clientX: event.clientX, clientY: event.clientY,
        width: host.clientWidth, generation: latest.current.generation })) return;
      setState('candidate'); event.stopPropagation(); prepare();
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
      setState('dragging'); rawOffset.current = result.dx;
      if (!frame.current) frame.current = requestAnimationFrame(() => { frame.current = 0; draw(); });
    };
    const onUp = (event: PointerEvent) => {
      contacts.current.delete(event.pointerId);
      if (!controller.owns(event.pointerId)) return;
      event.stopPropagation();
      const direction = controller.end(event, latest.current.generation);
      releaseCapture(); clickGuard.current = { id: event.pointerId, until: performance.now() + 600 };
      draw();
      const target = direction && latest.current.ready ? latest.current.target(direction) : null;
      if (!target || !direction) { animate(0, cancel); return; }
      pending.current = { key: target.key, from: latest.current.viewKey, generation: latest.current.generation };
      latest.current.cancelMarking();
      const preview = readyPreview(target.key);
      // Settle the already-visible destination, then hand over at the same place.
      animate(preview ? direction * host.clientWidth : 0, () => {
        if (!preview) {
          latest.current.preview.current?.style.setProperty('visibility', 'hidden');
          latest.current.composition.current?.style.removeProperty('visibility');
        }
        setState('waiting'); latest.current.navigate(target.page);
      });
    };
    const onCancel = (event: PointerEvent) => {
      contacts.current.delete(event.pointerId); if (controller.owns(event.pointerId)) cancel();
    };
    const onLostCapture = (event: PointerEvent) => {
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
    const onScroll = (event: Event) => {
      if (event.target instanceof Node && latest.current.preview.current?.contains(event.target)) return;
      if (controller.active()) cancel();
    };
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
      cancelRef.current = refreshRef.current = () => {};
      delete host.dataset.pageSwipeMode; delete host.dataset.pageSwipeState;
    };
  }, [options.enabled, options.host, options.composition]);
  useLayoutEffect(() => {
    const turn = pending.current;
    if (turn && options.viewKey === turn.key) {
      if (options.ready) { cancelRef.current(); options.settled(); }
    } else if (!turn || options.viewKey !== turn.from || options.generation !== turn.generation) {
      cancelRef.current();
    }
  }, [options.viewKey, options.generation, options.ready]);
  useLayoutEffect(() => { refreshRef.current(); });
  useLayoutEffect(() => { if (options.error) cancelRef.current(); }, [options.error]);
  return { refreshPreview: () => refreshRef.current(),
    isLocked: () => gesture.current.active() || animation.current !== null ||
    pending.current !== null || contacts.current.size > 1 };
}
