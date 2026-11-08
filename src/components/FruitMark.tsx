import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDismiss } from '../useDismiss';
import { PenCircle } from './ink';

/**
 * Fruit drawings from the KR Fruitsy dingbat font (Kat's Fun Fonts, freeware for non-commercial use),
 * supplied by the owner at public/fonts/kr-fruitsy.ttf. Each letter is a fruit:
 *   a–z  apples, strawberries, bananas, cherries, lemons, oranges, grapes, kiwi, persimmon…
 *   0–9  peach, pear, pear, strawberries, strawberry, pomegranate, mixed fruit, figs, watermelon, pineapple
 * Nothing renders until the font has loaded, so a missing file never shows a stray letter.
 */
let fontLoad: Promise<boolean> | null = null;
function loadFruitFont() {
  fontLoad ??= new FontFace('KR Fruitsy', "url('/fonts/kr-fruitsy.ttf')")
    .load()
    .then((face) => {
      document.fonts.add(face);
      return true;
    })
    .catch(() => false);
  return fontLoad;
}

/** The fruit beside each divider's name. */
export const DIVIDER_FRUIT: Record<string, string> = {
  breakfast: '4', // strawberry
  'small-plates': 'r', // grapes
  drinks: 'm', // citrus slice
  lunch: '2', // pear
  dinner: 'o', // persimmon / tomato
  dessert: '9', // pineapple
  unsorted: 'k', // apple core
};

/** Fruits for dividers that aren't meals (cuisines, times, letters…), handed out in turn. */
const FRUIT_CYCLE = ['b', '4', 'r', 'm', '2', 'o', '9', 'e', 'z', 'x', 's', 'q'];

/** The divider's fruit: the owner's pick if there is one, else the meal default, else the next in turn. */
export function dividerFruit(group: string, index: number, picked: Record<string, string> = {}) {
  return picked[group] ?? DIVIDER_FRUIT[group] ?? FRUIT_CYCLE[index % FRUIT_CYCLE.length];
}

/** Every distinct fruit in the font (uppercase letters repeat the lowercase ones). */
export const ALL_FRUITS = [...'abcdefghijklmnopqrstuvwxyz0123456789'];

export function Fruit({ glyph, className = '' }: { glyph: string; className?: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    loadFruitFont().then((ok) => alive && setReady(ok));
    return () => { alive = false; };
  }, []);
  return ready ? <span className={`fruit ${className}`} aria-hidden="true">{glyph}</span> : null;
}

/**
 * A fruit you can change: a soft round glow on hover, and a click opens a cotton card of every
 * fruit in the font with the current one circled. The card opens over the whole page (a portal),
 * so a card's torn edge can't clip it.
 */
export function FruitPicker({
  glyph, onChange, label, className = '',
}: { glyph: string; onChange: (glyph: string) => void; label: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState<{ x: number; y: number; above: boolean } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLSpanElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const refs = useMemo(() => [buttonRef, popRef], []);
  useDismiss(open, refs, close);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // don't also flip or open the card it sits on
    const r = buttonRef.current!.getBoundingClientRect();
    // open below the fruit, or above it when there isn't room for the whole card below
    const above = r.bottom + 400 > window.innerHeight && r.top > 400;
    setAt({ x: r.left + r.width / 2, y: above ? r.top : r.bottom, above });
    setOpen((o) => !o);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`fruit-button ${open ? 'is-open' : ''} ${className}`}
        aria-label={label}
        aria-expanded={open}
        onClick={toggle}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Fruit glyph={glyph} />
      </button>
      {open && at && createPortal(
        <span
          ref={popRef}
          className="pop fruit-pop"
          // the picker is portaled out of the card, but React events still bubble to it: don't flip the card
          onClick={(e) => e.stopPropagation()}
          style={{ left: at.x, top: at.above ? at.y - 10 : at.y + 10, translate: at.above ? '-50% -100%' : '-50% 0' }}
        >
          <span className="pop-card">
            <span className="pop-title">pick a fruit</span>
            <span className="fruit-grid" role="listbox" aria-label="Fruits">
              {ALL_FRUITS.map((g, i) => (
                <button
                  key={g}
                  type="button"
                  role="option"
                  aria-selected={g === glyph}
                  aria-label={`Fruit ${i + 1}`}
                  className="fruit-choice"
                  onClick={() => { onChange(g); setOpen(false); }}
                >
                  <Fruit glyph={g} />
                  {g === glyph && <PenCircle variant={i} />}
                </button>
              ))}
            </span>
          </span>
        </span>,
        document.body,
      )}
    </>
  );
}

/** The fruit beside "my recipes". */
export function FruitMark({ glyph, onChange }: { glyph: string; onChange: (glyph: string) => void }) {
  return <FruitPicker glyph={glyph} onChange={onChange} label="Change the fruit beside the title" className="fruit-mark" />;
}
