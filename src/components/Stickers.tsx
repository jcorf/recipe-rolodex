import { useEffect, useId, useRef } from 'react';
import { STARS } from './inkPaths';

/** Hand-drawn star: ink-filled when on, a thin pen outline when off. `variant` picks one of the drawn shapes. */
export function Star({ filled, variant = 0, className }: { filled: boolean; variant?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
      // a hand never draws two stars alike: each leans, sits and sizes a touch differently
      style={{
        rotate: `${((variant * 37) % 23) - 11}deg`,
        scale: `${0.88 + ((variant * 13) % 17) / 100}`,
        translate: `0 ${((variant * 7) % 5) - 2}%`,
      }}
    >
      <path
        d={STARS[variant % STARS.length]}
        fill={filled ? 'currentColor' : 'none'}
        fillOpacity={filled ? 0.92 : 0}
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={filled ? 1 : 0.45}
      />
    </svg>
  );
}

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

/** Googly eyes whose pupils follow the pointer. */
export function GooglyEyes({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        ref.current?.querySelectorAll<HTMLElement>('.pupil').forEach((pupil) => {
          const eye = pupil.parentElement!.getBoundingClientRect();
          const dx = e.clientX - (eye.left + eye.width / 2);
          const dy = e.clientY - (eye.top + eye.height / 2);
          const angle = Math.atan2(dy, dx);
          const reach = Math.min(Math.hypot(dx, dy) / 30, 1) * eye.width * 0.2;
          pupil.style.transform = `translate(${Math.cos(angle) * reach}px, ${Math.sin(angle) * reach}px)`;
        });
      });
    };
    window.addEventListener('pointermove', onMove);
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <div ref={ref} className={`googly ${className ?? ''}`} aria-hidden="true">
      <span className="eye"><span className="pupil" /></span>
      <span className="eye"><span className="pupil" /></span>
    </div>
  );
}
