import { useEffect, type RefObject } from 'react';

/** While `open`, a click outside every one of `refs` (or the Escape key) calls `close`. */
export function useDismiss(open: boolean, refs: RefObject<HTMLElement> | RefObject<HTMLElement>[], close: () => void) {
  useEffect(() => {
    if (!open) return;
    const list = Array.isArray(refs) ? refs : [refs];
    const onPointerDown = (e: PointerEvent) => {
      if (!list.some((r) => r.current?.contains(e.target as Node))) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, refs, close]);
}
