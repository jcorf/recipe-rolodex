import { MONTH_NAMES, WEEKDAYS, monthWeeks, stampTilt, todayYmd } from '../dates';
import type { Recipe } from '../types';
import { Stamp } from './Stamp';
import { dividerFruit } from './FruitMark';

/** What a day's stamps need to know about the desk. */
export interface StampLook {
  colors: Record<string, string>;
  fruits: Record<string, string>;
  /** The worn, speckled print look (a setting). */
  grainy?: boolean;
}

export const stampFill = (r: Recipe, look: StampLook) => look.colors[r.category || 'unsorted'] ?? '#e4e2dd';
export const stampFruit = (r: Recipe, look: StampLook) => dividerFruit(r.category || 'unsorted', 0, look.fruits);

/**
 * One month, as a page of the calendar: weekday initials, hand-numbered days, and on each cooked
 * day a stamp of the recipe (two overlap if you cooked twice; more show as "+n").
 * With `onDay` every day is a button (used to mark a recipe cooked); otherwise stamps open their recipe.
 */
export function MonthGrid({
  year, month, days, look, compact = false, onDay, onStamp,
}: {
  year: number;
  month: number;
  /** Recipes cooked, by day. */
  days: Map<string, Recipe[]>;
  look: StampLook;
  compact?: boolean;
  onDay?: (day: string) => void;
  onStamp?: (recipe: Recipe) => void;
}) {
  const today = todayYmd();
  return (
    <table className={`month-grid ${compact ? 'is-compact' : ''}`} aria-label={`${MONTH_NAMES[month]} ${year}`}>
      <thead>
        <tr>{WEEKDAYS.map((d, i) => <th key={i} scope="col">{d}</th>)}</tr>
      </thead>
      <tbody>
        {monthWeeks(year, month).map((week, w) => (
          <tr key={w}>
            {week.map((day, i) => {
              if (!day) return <td key={i} className="is-blank" />;
              const cooked = days.get(day) ?? [];
              const shown = cooked.slice(0, 2);
              const label = `${MONTH_NAMES[month]} ${Number(day.slice(8))}${cooked.length ? `, cooked ${cooked.map((r) => r.title).join(', ')}` : ''}`;
              const face = (
                <>
                  <span className="day-num">{Number(day.slice(8))}</span>
                  {shown.map((r, n) => {
                    const stamp = <Stamp image={r.image} fill={stampFill(r, look)} fruit={stampFruit(r, look)} label={r.title} grainy={look.grainy} />;
                    const cls = `day-stamp is-${shown.length}-${n}`;
                    const lean = { rotate: `${stampTilt(r.id, day)}deg` };
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
