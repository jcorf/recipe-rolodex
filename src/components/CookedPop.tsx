import { useMemo, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { todayYmd } from '../dates';
import type { Recipe } from '../types';
import { type StampLook } from './MonthGrid';
import { PopCalendar } from './PopCalendar';

/**
 * "When did you cook it?": a little month page (a week, on a phone) beside the tags. Click a day to stamp this recipe
 * on it, click a stamped day to lift the stamp off again.
 */
export function CookedPop({
  recipe, look, onChange, innerRef,
}: { recipe: Recipe; look: StampLook; onChange: (days: string[]) => void; innerRef: RefObject<HTMLDivElement> }) {
  const cooked = recipe.cooked ?? [];
  const start = cooked.length ? cooked[cooked.length - 1] : todayYmd();
  const [seed] = useState(() => Math.random()); // each opening lays the stamps a little differently
  const days = useMemo(() => new Map<string, Recipe[]>(cooked.map((d) => [d, [recipe]])), [cooked, recipe]);

  const toggle = (day: string) =>
    onChange(cooked.includes(day) ? cooked.filter((d) => d !== day) : [...cooked, day].sort());

  // opened over the whole page (a portal): the tag column has no room beside it for a month
  return createPortal(
    <div ref={innerRef} className="pop cooked-pop" role="dialog" aria-label="When did you cook this?">
      <div className="pop-card">
        <span className="pop-title">when did you cook it?</span>
        <PopCalendar start={start} days={days} look={look} seed={seed} onDay={toggle} />
        <p className="cooked-total" aria-live="polite">
          {cooked.length ? `cooked ${cooked.length} ${cooked.length === 1 ? 'time' : 'times'}` : 'not cooked yet'}
        </p>
      </div>
    </div>,
    document.body,
  );
}
