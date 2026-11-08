import { useEffect, useRef, type CSSProperties } from 'react';
import { CATEGORIES, type Recipe, type SortBy } from '../types';
import { groupRecipes } from '../sorting';
import { Star, starFill } from './Stickers';
import { StarRating } from './StarRating';
import { cardLook, CircledCount, InkFrame, InkRule, TabEdge } from './ink';
import { ratingLabel, servesLabel, splitAmount, stepText } from '../recipeText';
import { dividerFruit, Fruit, FruitPicker } from './FruitMark';

const BEHIND = 6; // cards visible behind the front one

const mod = (n: number, m: number) => ((n % m) + m) % m;

export type RolodexItem =
  | { kind: 'divider'; group: string; label: string; count: number; index: number; total: number; stars?: number; plain?: boolean }
  | { kind: 'recipe'; recipe: Recipe; ordinal: number };

/** The cards in rolodex order: one divider per group (meal, stars, time, cuisine or letter), then its recipes. */
export function buildItems(recipes: Recipe[], sortBy: SortBy): RolodexItem[] {
  const groups = groupRecipes(recipes, sortBy);
  const items: RolodexItem[] = [];
  let ordinal = 0;
  groups.forEach((g, index) => {
    items.push({ kind: 'divider', group: g.key, label: g.label, count: g.recipes.length, index, total: groups.length, stars: g.stars, plain: g.plain });
    for (const recipe of g.recipes) items.push({ kind: 'recipe', recipe, ordinal: ++ordinal });
  });
  return items;
}

/** Divider tabs step left → right in order; plain tabs scatter so the ones behind stay reachable. */
function dividerTabX(index: number, total: number) {
  return 3 + (total > 1 ? index / (total - 1) : 0) * 68;
}
function plainTabX(ordinal: number) {
  return 10 + ((ordinal * 23) % 76);
}

/** Meal dividers use their own pastel; any other sort cycles through the same pastels. */
function dividerColor(item: Extract<RolodexItem, { kind: 'divider' }>, colors: Record<string, string>) {
  if (colors[item.group]) return colors[item.group];
  const palette = CATEGORIES.map((c) => colors[c.key]).filter(Boolean);
  return palette.length ? palette[item.index % palette.length] : undefined;
}

interface Props {
  items: RolodexItem[];
  dividerColors: Record<string, string>;
  index: number;
  recipeCount: number;
  onIndex: (i: number) => void;
  onOpen: (recipe: Recipe) => void;
  /** The blank card shown when there's nothing to flip through starts a new recipe. */
  onNew: () => void;
  emptyMessage: string;
  /** When true, the arrow keys flip the rolodex from anywhere on the desk (no click needed first). */
  keyboard: boolean;
  dividerFruits: Record<string, string>;
  onDividerFruit: (group: string, glyph: string) => void;
  onRate: (recipe: Recipe, rating: number) => void;
}

export function Rolodex({ items, dividerColors, index, recipeCount, onIndex, onOpen, onNew, emptyMessage, keyboard, dividerFruits, onDividerFruit, onRate }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const count = items.length;
  // The box is a loop: past the last card comes the first, and back from the first is the last.
  const go = (delta: number) => count > 1 && onIndex(mod(index + delta, count));

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

  const onKeyDown = (e: KeyboardEvent | React.KeyboardEvent) => {
    // up flips forward (cards lift away from you), down brings the last one back
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    else if (e.key === 'Home') { e.preventDefault(); onIndex(0); }
    else if (e.key === 'End') { e.preventDefault(); onIndex(count - 1); }
    else if ((e.key === 'Enter' || e.key === ' ') && current) { e.preventDefault(); activate(current); }
    else if ((e.key === 'Enter' || e.key === ' ') && !count) { e.preventDefault(); onNew(); }
  };

  // Arrow keys work straight away, without clicking the rolodex first. They're left alone while
  // you're typing in a field, using another control (Enter/space), or a card is open.
  useEffect(() => {
    if (!keyboard) return;
    const onWindowKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable]')) return;
      if (stageRef.current?.contains(t)) return; // the stage handles its own keys
      if ((e.key === 'Enter' || e.key === ' ') && t.closest('button, a, [role="option"], label')) return;
      onKeyDown(e);
    };
    window.addEventListener('keydown', onWindowKey);
    return () => window.removeEventListener('keydown', onWindowKey);
  });

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
            <div className="index-card is-front is-blank" onClick={onNew}>
              <div className="card-face">
                <InkFrame variant={0} />
                <p className="blank-note">{emptyMessage}</p>
                <p className="blank-hint">click this card to write a new one</p>
              </div>
            </div>
          )}
          {items.map((item, i) => {
            // distance from the front card, going round the loop: the card just before it is flipped away
            const ahead = mod(i - index, count);
            const d = count > 2 && ahead === count - 1 ? -1 : ahead;
            if (d > BEHIND) return null;
            const state = d === 0 ? 'is-front' : d < 0 ? 'is-flipped' : 'is-behind';
            const isDivider = item.kind === 'divider';
            const look = cardLook(isDivider ? `divider-${item.group}` : item.recipe.id);
            const style = {
              ...look.style,
              ...(isDivider ? { '--stock': dividerColor(item, dividerColors) } : null),
              '--d': d,
              '--tab-x': `${isDivider ? dividerTabX(item.index, item.total) : plainTabX(item.ordinal)}%`,
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
                    <span className={`divider-name ${item.plain ? 'is-letter' : ''}`}>
                      {item.stars ? (
                        // star dividers are just the stars, drawn; the words stay on the tab and for screen readers
                        <span className="divider-stars">
                          {Array.from({ length: item.stars }, (_, n) => (
                            <Star key={n} fill={1} variant={look.star + n} className="divider-star" />
                          ))}
                          <span className="visually-hidden">{item.label}</span>
                        </span>
                      ) : (
                        <>
                          {!item.plain && (d === 0 ? (
                            <FruitPicker
                              glyph={dividerFruit(item.group, item.index, dividerFruits)}
                              onChange={(g) => onDividerFruit(item.group, g)}
                              label={`Change the fruit for ${item.label}`}
                              className="divider-fruit"
                            />
                          ) : (
                            <Fruit glyph={dividerFruit(item.group, item.index, dividerFruits)} className="divider-fruit" />
                          ))}
                          {item.label}
                        </>
                      )}
                    </span>
                  </div>
                </div>
              );
            }

            const { recipe } = item;
            const serves = servesLabel(recipe.servings);
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
                    {d === 0 ? (
                      // rate right from the rolodex: the front card's stars take clicks (halves too)
                      <StarRating
                        rating={recipe.rating}
                        onRate={(value) => onRate(recipe, value)}
                        variant={look.star}
                        className="card-stars is-live"
                      />
                    ) : (
                      <div className="card-stars" role="img" aria-label={ratingLabel(recipe.rating)}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} fill={starFill(recipe.rating, n)} variant={look.star + n} className="mini-star" />
                        ))}
                      </div>
                    )}
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
                          {recipe.steps.map((step, n) => <li key={n}>{stepText(step)}</li>)}
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
