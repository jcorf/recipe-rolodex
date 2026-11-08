import { useEffect, useState } from 'react';

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

export function Fruit({ glyph, className = '' }: { glyph: string; className?: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    loadFruitFont().then((ok) => alive && setReady(ok));
    return () => { alive = false; };
  }, []);
  return ready ? <span className={`fruit ${className}`} aria-hidden="true">{glyph}</span> : null;
}

/** The cherries beside "my recipes". */
export function FruitMark() {
  return <Fruit glyph="h" className="fruit-mark" />;
}
