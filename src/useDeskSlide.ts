import { useLayoutEffect, useRef, type RefObject } from 'react';

/**
 * When the blank-card stack or the find slip is put away or brought back, the one that stays slides
 * to its new place (centred on its own, side by side with the other) instead of jumping, and the one
 * coming back slides in beside it. Measured before and after each change, then played back ("FLIP").
 */
export function useDeskSlide(rowRef: RefObject<HTMLElement>, shown: string) {
  const last = useRef(new Map<string, number>());
  const lastShown = useRef(shown);
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const now = new Map<string, number>();
    for (const side of ['is-left', 'is-right']) {
      const el = row.querySelector<HTMLElement>(`.desk-side.${side} > *`);
      if (el) now.set(side, el.getBoundingClientRect().left);
    }
    const changed = lastShown.current !== shown;
    lastShown.current = shown;
    const before = last.current;
    last.current = now;
    if (!changed || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (const [side, x] of now) {
      const el = row.querySelector<HTMLElement>(`.desk-side.${side} > *`)!;
      const was = before.get(side);
      const easing = 'cubic-bezier(0.16, 1, 0.3, 1)';
      if (was !== undefined) {
        if (Math.abs(was - x) > 1) {
          el.animate([{ transform: `translateX(${was - x}px)` }, { transform: 'none' }], { duration: 500, easing });
        }
      } else {
        // coming back: out from behind the other one, towards its own side
        const from = side === 'is-left' ? '2.5rem' : '-2.5rem';
        el.animate([{ transform: `translateX(${from})`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 500, easing });
      }
    }
  });
}
