import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { CIRCLES, FRAMES, RULES, STARS, TABS } from './inkPaths';

// Hand-drawn pieces shared by every card-like surface: the rolodex cards and the open card.

/** FNV-1a: a stable number per card id, so a card always keeps the same hand-drawn look. */
function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

const GRAINS = 6; // public/cotton-0…5.webp, grain size from fine (0) to 2× coarser (5); made by `npm run textures`
/** How strongly the cotton grain shows, per card: from faint to full. */
const GRAIN_OPACITY: [number, number] = [0.45, 1];

/** Each card's own border, header line, cotton grain (offset and rotated) and star shapes. */
export function cardLook(id: string) {
  const h = hash(id);
  return {
    frame: h % FRAMES.length,
    rule: (h >>> 4) % RULES.length,
    star: (h >>> 8) % STARS.length,
    tab: (h >>> 14) % TABS.length,
    circle: (h >>> 12) % CIRCLES.length,
    style: {
      '--grain': `url('/cotton-${(h >>> 16) % GRAINS}.webp')`,
      '--grain-x': `${(h >>> 3) % 256}px`,
      '--grain-y': `${(h >>> 11) % 256}px`,
      '--grain-rot': `${(h >>> 19) % 360}deg`,
      '--grain-opacity': (GRAIN_OPACITY[0] + (((h >>> 23) % 101) / 100) * (GRAIN_OPACITY[1] - GRAIN_OPACITY[0])).toFixed(2),
    } as CSSProperties,
  };
}

/** Pen border: wobbling sides, corners that overshoot, a lighter second pass over part of it. */
export function InkFrame({ variant }: { variant: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  // Draw in the card's real pixel size so a tall (expanded) card keeps its border
  // the same distance from the paper edge instead of stretching it inward.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect;
      setSize((prev) => (prev && Math.abs(prev.w - w) < 1 && Math.abs(prev.h - h) < 1 ? prev : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { main, echo } = FRAMES[variant];
  return (
    <svg ref={ref} className="ink-frame" viewBox={size ? `0 0 ${size.w} ${size.h}` : '0 0 100 100'} aria-hidden="true">
      {size && <path d={toPixels(main, size.w, size.h)} />}
      {size && echo && <path className="ink-frame-echo" d={toPixels(echo, size.w, size.h)} />}
    </svg>
  );
}

/** Frame paths are authored at the base card size (100 units ≈ that card); vertical distances stay
 *  fixed from the nearest top/bottom edge so only the long sides stretch as a card grows. */
function toPixels(d: string, w: number, h: number) {
  const base = h > 0 ? Math.min(h, BASE_CARD_H) : BASE_CARD_H;
  let isX = true;
  return d.replace(/-?\d*\.?\d+/g, (n) => {
    const v = parseFloat(n);
    const out = isX ? (v / 100) * w : v < 50 ? (v / 100) * base : h - ((100 - v) / 100) * base;
    isX = !isX;
    return out.toFixed(1);
  });
}
const BASE_CARD_H = 380; // px: roughly the card height the frames were drawn for

/** Pen outline around a card's tab: up one side, a wobbly top, down the other; open where it meets the card. */
export function TabEdge({ variant }: { variant: number }) {
  return (
    <svg className="tab-edge" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path vectorEffect="non-scaling-stroke" d={TABS[variant]} />
    </svg>
  );
}

/** Wobbly pen line under a card's header. */
export function InkRule({ variant }: { variant: number }) {
  return (
    <svg className="ink-rule" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true">
      <path vectorEffect="non-scaling-stroke" d={RULES[variant]} />
    </svg>
  );
}

/** The divider's recipe count, circled by hand. */
export function CircledCount({ count, variant }: { count: number; variant: number }) {
  return (
    <span className="circled-count" aria-label={`${count} recipe${count === 1 ? '' : 's'}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <path vectorEffect="non-scaling-stroke" d={CIRCLES[variant]} />
      </svg>
      <span aria-hidden="true">{count}</span>
    </span>
  );
}


/** A pen loop drawn around whatever it sits in (the chosen option, the current fruit). */
export function PenCircle({ variant = 0 }: { variant?: number }) {
  return (
    <svg className="pen-circle" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path vectorEffect="non-scaling-stroke" d={CIRCLES[variant % CIRCLES.length]} />
    </svg>
  );
}
