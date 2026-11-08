import { useId } from 'react';
import { STARS } from './inkPaths';

/**
 * Hand-drawn star. `fill` is 1 (inked), 0.5 (left half inked) or 0 (a thin pen outline).
 * `variant` picks one of the drawn shapes; each also leans and sizes a touch differently.
 */
export function Star({ fill, variant = 0, className }: { fill: number; variant?: number; className?: string }) {
  const id = useId();
  const d = STARS[variant % STARS.length];
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
      style={{
        rotate: `${((variant * 37) % 23) - 11}deg`,
        scale: `${0.88 + ((variant * 13) % 17) / 100}`,
        translate: `0 ${((variant * 7) % 5) - 2}%`,
      }}
    >
      {fill === 0.5 && (
        <clipPath id={`${id}h`}>
          <rect x="0" y="0" width="50" height="100" />
        </clipPath>
      )}
      {fill > 0 && (
        <path d={d} fill="currentColor" fillOpacity={0.92} clipPath={fill === 0.5 ? `url(#${id}h)` : undefined} />
      )}
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={fill > 0 ? 1 : 0.45}
      />
    </svg>
  );
}

/** How much of star `n` (1–5) a rating fills: 1, 0.5 or 0. */
export const starFill = (rating: number, n: number) => (rating >= n ? 1 : rating >= n - 0.5 ? 0.5 : 0);

/** Embroidered patch heart, used as the envelope's seal. */
export function PatchHeart({ className }: { className?: string }) {
  const id = useId();
  const heart = 'M50 88 C20 66 6 50 6 32 C6 17 17 7 30 7 C39 7 46 12 50 20 C54 12 61 7 70 7 C83 7 94 17 94 32 C94 50 80 66 50 88 Z';
  return (
    <svg viewBox="0 0 100 96" className={className} aria-hidden="true">
      <defs>
        <pattern id={`${id}t`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <rect width="4" height="4" fill="#c8323a" />
          <rect width="2" height="4" fill="#b3262f" />
        </pattern>
      </defs>
      <path d={heart} fill="#8f1d25" />
      <path d={heart} fill={`url(#${id}t)`} transform="translate(50 47) scale(.86) translate(-50 -47)" />
      <path d={heart} fill="none" stroke="#f0a7ab" strokeWidth="1.6" strokeDasharray="3 2.4" transform="translate(50 47) scale(.76) translate(-50 -47)" />
    </svg>
  );
}

/** Red gingham ribbon bow. */
export function GinghamBow({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 120 110" className={className} aria-hidden="true">
      <defs>
        <pattern id={`${id}g`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
          <rect width="10" height="10" fill="#fff6f2" />
          <rect width="10" height="5" fill="#c8323a" opacity=".55" />
          <rect width="5" height="10" fill="#c8323a" opacity=".55" />
        </pattern>
      </defs>
      <g stroke="#9c2129" strokeWidth="1.2" strokeLinejoin="round" fill={`url(#${id}g)`}>
        <path d="M58 46 C40 22 12 14 8 30 C4 46 30 56 56 52 Z" />
        <path d="M62 46 C80 22 108 14 112 30 C116 46 90 56 64 52 Z" />
        <path d="M55 52 C46 70 36 88 26 104 L40 100 L44 108 C52 92 58 72 60 56 Z" />
        <path d="M65 52 C74 70 84 88 94 104 L80 100 L76 108 C68 92 62 72 60 56 Z" />
        <rect x="52" y="42" width="16" height="15" rx="5" />
      </g>
    </svg>
  );
}
