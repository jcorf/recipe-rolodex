import { useEffect } from 'react';

/**
 * Drives the page's soft background light: --mx/--my (0–1 across the viewport) ease toward the
 * pointer, and --glow brightens while the pointer is on the page. When the pointer leaves the
 * window the light drifts back to rest and dims.
 */
export function useDriftingLight() {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = document.documentElement;
    const REST = { x: 0.5, y: 0.42, glow: 0.55 };
    let target = { ...REST };
    let x = REST.x, y = REST.y, glow = REST.glow, frame = 0;

    const tick = () => {
      x += (target.x - x) * 0.045;
      y += (target.y - y) * 0.045;
      glow += (target.glow - glow) * 0.05;
      root.style.setProperty('--mx', x.toFixed(4));
      root.style.setProperty('--my', y.toFixed(4));
      root.style.setProperty('--glow', glow.toFixed(3));
      const moving = Math.abs(target.x - x) + Math.abs(target.y - y) + Math.abs(target.glow - glow) > 0.0008;
      frame = moving ? requestAnimationFrame(tick) : 0;
    };
    const wake = () => { if (!frame) frame = requestAnimationFrame(tick); };

    const onMove = (e: PointerEvent) => {
      target = { x: e.clientX / innerWidth, y: e.clientY / innerHeight, glow: 1 };
      wake();
    };
    const onLeave = (e: PointerEvent) => {
      if (e.relatedTarget) return; // still inside the page
      target = { ...REST };
      wake();
    };
    window.addEventListener('pointermove', onMove);
    document.documentElement.addEventListener('pointerout', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerout', onLeave);
      cancelAnimationFrame(frame);
    };
  }, []);
}
