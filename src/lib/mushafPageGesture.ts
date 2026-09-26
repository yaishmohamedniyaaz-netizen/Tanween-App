/** Navigation intent only. This module cannot write judging evidence. */
export type SwipeDirection = -1 | 1;
export interface SwipePoint { pointerId: number; clientX: number; clientY: number }
export interface SwipeStart extends SwipePoint {
  pointerType: string;
  button: number;
  isPrimary: boolean;
  width: number;
  generation: string;
}

export function swipeReleaseDistance(width: number): number {
  return Math.max(48, Math.min(96, width * 0.12));
}

export function createMushafPageGesture() {
  let start: SwipeStart | null = null;
  let intent: 'candidate' | 'horizontal' | 'cancelled' = 'candidate';
  return {
    begin(value: SwipeStart): boolean {
      if (start || !['touch', 'pen'].includes(value.pointerType) ||
          value.button !== 0 || !value.isPrimary || value.width <= 0) return false;
      start = value;
      intent = 'candidate';
      return true;
    },
    owns(pointerId: number) { return start?.pointerId === pointerId; },
    active() { return start !== null; },
    move(point: SwipePoint, generation: string) {
      if (!start || point.pointerId !== start.pointerId) return null;
      if (generation !== start.generation) intent = 'cancelled';
      const dx = point.clientX - start.clientX, dy = point.clientY - start.clientY;
      if (intent === 'candidate' && Math.hypot(dx, dy) >= 12) {
        if (Math.abs(dx) >= Math.abs(dy) * 1.5) intent = 'horizontal';
        else intent = 'cancelled';
      }
      return { horizontal: intent === 'horizontal', dx, dy };
    },
    end(point: SwipePoint, generation: string): SwipeDirection | null {
      if (!start || point.pointerId !== start.pointerId) return null;
      const result = this.move(point, generation);
      const accepted = result?.horizontal &&
        Math.abs(result.dx) >= swipeReleaseDistance(start.width) &&
        Math.abs(result.dx) >= Math.abs(result.dy) * 1.5;
      start = null;
      // RTL book: moving the paper to the right reveals the following view.
      return accepted && result ? result.dx > 0 ? 1 : -1 : null;
    },
    cancel() { start = null; intent = 'cancelled'; },
  };
}
