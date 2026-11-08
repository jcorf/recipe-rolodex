import { MONTH_NAMES, WEEKDAYS, monthWeeks, pickShown, rangeLabel, stampTilt, todayYmd, weekOf } from '../dates';
import type { AteOutStyle, Recipe, StampCard, StampFinish } from '../types';
import { Stamp } from './Stamp';
import { dividerFruit } from './FruitMark';

/** What a day's stamps need to know about the desk. */
export interface StampLook {
  colors: Record<string, string>;
  fruits: Record<string, string>;
  /** How stamps are finished (a setting): plain, grainy or faded. */
  finish?: StampFinish;
  /** How a meal eaten out is stamped (a setting). */
  ateOutStyle?: AteOutStyle;
  /** The colour chosen for meals-out stamps ('' follows the kind of place). */
  ateOutColor?: string;
}

/** A restaurant borrows the meal pastels by its kind of place (bars: drinks blue, bakeries: dessert pink…). */
const VENUE_PASTEL: Record<string, string> = { restaurant: 'dinner', bar: 'drinks', bakery: 'dessert', 'fast-casual': 'lunch' };

export function stampFill(r: Recipe, look: StampLook) {
  if (r.kind === 'restaurant') {
    if (look.ateOutColor) return look.ateOutColor; // the colour you chose for meals out
    return look.colors[VENUE_PASTEL[r.venue ?? ''] ?? 'unsorted'] ?? '#e4e2dd';
  }
  return look.colors[r.category || 'unsorted'] ?? '#e4e2dd';
}
export const stampFruit = (r: Recipe, look: StampLook) => dividerFruit(r.category || 'unsorted', 0, look.fruits);

/**
 * One month, as a page of the calendar: weekday initials, hand-numbered days, and on each cooked
 * day a stamp of the recipe (two overlap if you cooked twice; more show as "+n").
 * With `onDay` every day is a button (used to mark a recipe cooked); otherwise stamps open their recipe.
 */
export function MonthGrid({
  year, month, days, look, seed = 0, compact = false, onDay, onStamp, week,
}: {
  /** Show just the week this day falls in, instead of the month (a phone's pop-up calendar). */
  week?: string;
  year: number;
  month: number;
  /** Recipes cooked, by day. */
  days: Map<string, StampCard[]>;
  look: StampLook;
  /** Re-rolled by the caller to shuffle every stamp's lean. */
  seed?: number;
  compact?: boolean;
  onDay?: (day: string) => void;
  onStamp?: (recipe: StampCard) => void;
}) {
  const today = todayYmd();
  const weeks = week ? [weekOf(week)] : monthWeeks(year, month);
  const name = week ? rangeLabel(weeks[0][0]!, weeks[0][6]!) : `${MONTH_NAMES[month]} ${year}`;
  return (
    <table className={`month-grid ${compact ? 'is-compact' : ''} ${week ? 'is-week' : ''}`} aria-label={name}>
      <thead>
        <tr>{WEEKDAYS.map((d, i) => <th key={i} scope="col">{d}</th>)}</tr>
      </thead>
      <tbody>
        {weeks.map((row, w) => (
          <tr key={w}>
            {row.map((day, i) => {
              if (!day) return <td key={i} className="is-blank" />;
              const cooked = days.get(day) ?? [];
              const shown = pickShown(cooked, day, seed);
              const label = `${MONTH_NAMES[Number(day.slice(5, 7)) - 1]} ${Number(day.slice(8))}${cooked.length ? `, ${cooked.map((r) => (r.ateOut ? `ate at ${r.title}` : `cooked ${r.title}`)).join(', ')}` : ''}`;
              const face = (
                <>
                  <span className="day-num">{Number(day.slice(8))}</span>
                  {shown.map((r, n) => {
                    const stamp = <Stamp image={r.image} photo={r.photo} fill={stampFill(r, look)} fruit={stampFruit(r, look)} label={r.title} finish={look.finish} ateOut={!!r.ateOut} ateOutStyle={look.ateOutStyle} />;
                    const cls = `day-stamp is-${shown.length}-${n}`;
                    const lean = { rotate: `${stampTilt(r.id, day, seed)}deg` };
                    return onStamp && !onDay ? (
                      <button key={r.id} type="button" className={cls} style={lean} aria-label={`Open ${r.title}`} onClick={() => onStamp(r)}>{stamp}</button>
                    ) : (
                      <span key={r.id} className={cls} style={lean}>{stamp}</span>
                    );
                  })}
                  {cooked.length > 2 && <span className="day-more">+{cooked.length - 2}</span>}
                </>
              );
              return (
                <td key={i} className={`${day === today ? 'is-today' : ''} ${cooked.length ? 'has-stamp' : ''}`}>
                  {onDay ? (
                    <button type="button" className="day-cell" aria-label={label} aria-pressed={cooked.length > 0} onClick={() => onDay(day)}>{face}</button>
                  ) : (
                    <div className="day-cell" role={cooked.length ? 'group' : undefined} aria-label={label}>{face}</div>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
