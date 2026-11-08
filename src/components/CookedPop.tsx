import { useMemo, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { MONTH_NAMES, addMonths } from '../dates';
import type { Recipe } from '../types';
import { MonthGrid, type StampLook } from './MonthGrid';
import { PenIcon } from './PenIcons';

/**
 * "When did you cook it?": a little month page beside the tags. Click a day to stamp this recipe
 * on it, click a stamped day to lift the stamp off again.
 */
export function CookedPop({
  recipe, look, onChange, innerRef,
}: { recipe: Recipe; look: StampLook; onChange: (days: string[]) => void; innerRef: RefObject<HTMLDivElement> }) {
  const cooked = recipe.cooked ?? [];
  const start = cooked.length ? new Date(`${cooked[cooked.length - 1]}T12:00:00`) : new Date();
  const [seed] = useState(() => Math.random()); // each opening lays the stamps a little differently
  const [at, setAt] = useState({ year: start.getFullYear(), month: start.getMonth() });
  const days = useMemo(() => new Map<string, Recipe[]>(cooked.map((d) => [d, [recipe]])), [cooked, recipe]);
  const flip = (by: number) => setAt((a) => addMonths(a.year, a.month, by));

  const toggle = (day: string) =>
    onChange(cooked.includes(day) ? cooked.filter((d) => d !== day) : [...cooked, day].sort());

  // opened over the whole page (a portal): the tag column has no room beside it for a month
  return createPortal(
    <div ref={innerRef} className="pop cooked-pop" role="dialog" aria-label="When did you cook this?">
      <div className="pop-card">
        <span className="pop-title">when did you cook it?</span>
        <div className="cooked-head">
          <button type="button" className="month-flip" aria-label="Previous month" onClick={() => flip(-1)}><PenIcon name="left" /></button>
          <span className="cooked-month">{MONTH_NAMES[at.month]} <small>{at.year}</small></span>
          <button type="button" className="month-flip" aria-label="Next month" onClick={() => flip(1)}><PenIcon name="right" /></button>
        </div>
        <MonthGrid year={at.year} month={at.month} days={days} look={look} seed={seed} compact onDay={toggle} />
        <p className="cooked-total" aria-live="polite">
          {cooked.length ? `cooked ${cooked.length} ${cooked.length === 1 ? 'time' : 'times'}` : 'not cooked yet'}
        </p>
      </div>
    </div>,
    document.body,
  );
}
