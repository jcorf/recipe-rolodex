import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { CATEGORIES, type Recipe } from '../types';
import { Star } from './Stickers';
import { CIRCLES, FRAMES, RULES, STARS, TABS } from './inkPaths';
import { DIVIDER_FRUIT, Fruit } from './FruitMark';

const BEHIND = 6; // cards visible behind the front one

type GroupKey = Recipe['category'] | 'unsorted';

export type RolodexItem =
  | { kind: 'divider'; group: GroupKey; label: string; count: number }
  | { kind: 'recipe'; recipe: Recipe; ordinal: number };

const ORDER: GroupKey[] = [...CATEGORIES.map((c) => c.key), 'unsorted'];
const LABELS: Record<string, string> = Object.fromEntries([
  ...CATEGORIES.map((c) => [c.key, c.label]),
  ['unsorted', 'unsorted'],
]);

const groupOf = (r: Recipe): GroupKey => r.category || 'unsorted';

export const byTitle = (a: Recipe, b: Recipe) =>
  a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });

/** breakfast → small plates → drinks → lunch → dinner → dessert, A–Z inside each, one divider per group. */
export function buildItems(recipes: Recipe[]): RolodexItem[] {
  const items: RolodexItem[] = [];
  let ordinal = 0;
  for (const group of ORDER) {
    const members = recipes.filter((r) => groupOf(r) === group).sort(byTitle);
    if (!members.length) continue;
    items.push({ kind: 'divider', group, label: LABELS[group], count: members.length });
    for (const recipe of members) items.push({ kind: 'recipe', recipe, ordinal: ++ordinal });
  }
  return items;
}

/** Category tabs step left → right in menu order; plain tabs scatter so the ones behind stay reachable. */
function dividerTabX(group: GroupKey) {
  return 3 + (ORDER.indexOf(group) / (ORDER.length - 1)) * 68;
}
function plainTabX(ordinal: number) {
  return 10 + ((ordinal * 23) % 76);
}

/** FNV-1a: a stable number per card id, so a card always keeps the same hand-drawn look. */
function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

const GRAINS = 6; // public/cotton-0…5.jpg, grain size from fine (0) to 2× coarser (5); made by `npm run textures`
/** How strongly the cotton grain shows, per card: from faint to full. */
const GRAIN_OPACITY: [number, number] = [0.45, 1];

/** Each card's own border, header line, cotton grain (offset and rotated) and star shapes. */
function cardLook(id: string) {
  const h = hash(id);
  return {
    frame: h % FRAMES.length,
    rule: (h >>> 4) % RULES.length,
    star: (h >>> 8) % STARS.length,
    tab: (h >>> 14) % TABS.length,
    circle: (h >>> 12) % CIRCLES.length,
    style: {
      '--grain': `url('/cotton-${(h >>> 16) % GRAINS}.jpg')`,
      '--grain-x': `${(h >>> 3) % 256}px`,
      '--grain-y': `${(h >>> 11) % 256}px`,
      '--grain-rot': `${(h >>> 19) % 360}deg`,
      '--grain-opacity': (GRAIN_OPACITY[0] + (((h >>> 23) % 101) / 100) * (GRAIN_OPACITY[1] - GRAIN_OPACITY[0])).toFixed(2),
    } as CSSProperties,
  };
}

/** Pen border: wobbling sides, corners that overshoot, a lighter second pass over part of it. */
function InkFrame({ variant }: { variant: number }) {
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
function TabEdge({ variant }: { variant: number }) {
  return (
    <svg className="tab-edge" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path vectorEffect="non-scaling-stroke" d={TABS[variant]} />
    </svg>
  );
}

/** Wobbly pen line under a card's header. */
function InkRule({ variant }: { variant: number }) {
  return (
    <svg className="ink-rule" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true">
      <path vectorEffect="non-scaling-stroke" d={RULES[variant]} />
    </svg>
  );
}

/** The divider's recipe count, circled by hand. */
function CircledCount({ count, variant }: { count: number; variant: number }) {
  return (
    <span className="circled-count" aria-label={`${count} recipe${count === 1 ? '' : 's'}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <path vectorEffect="non-scaling-stroke" d={CIRCLES[variant]} />
      </svg>
      <span aria-hidden="true">{count}</span>
    </span>
  );
}

interface Props {
  items: RolodexItem[];
  dividerColors: Record<string, string>;
  index: number;
  recipeCount: number;
  onIndex: (i: number) => void;
  onOpen: (recipe: Recipe) => void;
  emptyMessage: string;
}

export function Rolodex({ items, dividerColors, index, recipeCount, onIndex, onOpen, emptyMessage }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const count = items.length;
  const go = (delta: number) => count && onIndex(Math.max(0, Math.min(count - 1, index + delta)));

  // Wheel / trackpad flips one card per gesture tick.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    let last = 0;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 4) return;
      e.preventDefault();
      const now = performance.now();
      if (now - last < 140) return;
      last = now;
      go(e.deltaY > 0 ? 1 : -1);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  const current = items[index];
  const activate = (item: RolodexItem) => (item.kind === 'recipe' ? onOpen(item.recipe) : go(1));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    else if (e.key === 'Home') { e.preventDefault(); onIndex(0); }
    else if (e.key === 'End') { e.preventDefault(); onIndex(count - 1); }
    else if ((e.key === 'Enter' || e.key === ' ') && current) { e.preventDefault(); activate(current); }
  };

  const label = !current
    ? emptyMessage
    : current.kind === 'divider'
      ? `${current.label}, ${current.count} recipe${current.count === 1 ? '' : 's'}. Arrow keys flip.`
      : `${current.recipe.title}, ${current.ordinal} of ${recipeCount}. Arrow keys flip, Enter opens.`;

  return (
    <section className="rolodex" aria-label="Recipe rolodex">
      <div
        ref={stageRef}
        className="rolodex-stage"
        tabIndex={0}
        role="group"
        aria-roledescription="card file"
        aria-label={label}
        onKeyDown={onKeyDown}
      >
        <div className="rolodex-stack">
          {count === 0 && (
            <div className="index-card is-front is-blank">
              <div className="card-face">
                <InkFrame variant={0} />
                <p className="blank-note">{emptyMessage}</p>
              </div>
            </div>
          )}
          {items.map((item, i) => {
            const d = i - index;
            if (d < -1 || d > BEHIND) return null;
            const state = d === 0 ? 'is-front' : d < 0 ? 'is-flipped' : 'is-behind';
            const isDivider = item.kind === 'divider';
            const look = cardLook(isDivider ? `divider-${item.group}` : item.recipe.id);
            const style = {
              ...look.style,
              ...(isDivider ? { '--stock': dividerColors[item.group] } : null),
              '--d': d,
              '--tab-x': `${isDivider ? dividerTabX(item.group) : plainTabX(item.ordinal)}%`,
              zIndex: 100 - Math.abs(d),
            } as CSSProperties;
            const key = isDivider ? `divider-${item.group}` : item.recipe.id;
            const onClick = () => (d === 0 ? activate(item) : d > 0 ? onIndex(i) : undefined);

            if (isDivider) {
              return (
                <div key={key} className={`index-card is-divider ${state}`} style={style} aria-hidden={d !== 0} onClick={onClick}>
                  <span className="card-tab is-label">
                    <TabEdge variant={look.tab} />
                    <span>{item.label}</span>
                  </span>
                  <div className="card-face">
                    <InkFrame variant={look.frame} />
                    <CircledCount count={item.count} variant={look.circle} />
                    <span className="divider-name">
                      <Fruit glyph={DIVIDER_FRUIT[item.group]} className="divider-fruit" />
                      {item.label}
                    </span>
                  </div>
                </div>
              );
            }

            const { recipe } = item;
            const serves = recipe.servings && (/^serves\b/i.test(recipe.servings) ? recipe.servings.toLowerCase() : `serves ${recipe.servings}`);
            const meta = [recipe.totalTime, serves, recipe.cuisine].filter(Boolean);
            return (
              <div key={key} className={`index-card ${state}`} style={style} aria-hidden={d !== 0} onClick={onClick}>
                <span className="card-tab is-plain">
                  <TabEdge variant={look.tab} />
                </span>
                <div className="card-face">
                  <InkFrame variant={look.frame} />
                  <header className={`card-header ${meta.length ? 'has-meta' : ''}`}>
                    <h2 className="card-title">{recipe.title}</h2>
                    {meta.length > 0 && <p className="card-meta">{meta.join('  ·  ')}</p>}
                    <div className="card-stars" role="img" aria-label={`${recipe.rating} of 5 stars`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} filled={n <= recipe.rating} variant={look.star + n} className="mini-star" />
                      ))}
                    </div>
                  </header>
                  <InkRule variant={look.rule} />
                  <div className="card-columns">
                    <section className="card-col">
                      <h3 className="card-col-title">ingredients</h3>
                      {recipe.ingredients.length ? (
                        <ul className="card-ingredients">
                          {recipe.ingredients.map((line, n) => {
                            const [amount, name] = splitAmount(line);
                            return (
                              <li key={n}>
                                <span className="amt">{amount}</span>
                                <span>{name}</span>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="card-col-empty">none written down yet</p>
                      )}
                    </section>
                    <section className="card-col">
                      <h3 className="card-col-title">directions</h3>
                      {recipe.steps.length ? (
                        <ol className="card-steps">
                          {recipe.steps.map((step, n) => <li key={n}>{step}</li>)}
                        </ol>
                      ) : (
                        <p className="card-col-empty">none written down yet</p>
                      )}
                    </section>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const AMOUNT =
  /^((?:[\d½¼¾⅓⅔⅛]+(?:[\s/.–-]+[\d½¼¾⅓⅔⅛]+)*)\s*(?:(?:cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|l|cloves?|cans?|sticks?|pinch(?:es)?)\b\.?)?)\s+(.+)$/i;

/** "1 1/4 cups bread flour" → ["1 1/4 cups", "bread flour"]: the amount gets its own column on the card. */
function splitAmount(line: string): [string, string] {
  const m = AMOUNT.exec(line.trim());
  return m ? [m[1].trim(), m[2]] : ['', line];
}
