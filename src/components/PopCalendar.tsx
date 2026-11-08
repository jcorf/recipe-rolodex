import { useEffect, useState } from 'react';
import { MONTH_NAMES, addDays, addMonths, parseDay, rangeLabel, todayYmd, weekOf, ymd } from '../dates';
import type { StampCard } from '../types';
import { MonthGrid, type StampLook } from './MonthGrid';
import { PenIcon } from './PenIcons';

const NARROW = '(max-width: 40rem)';

/** True on a phone-sized screen, kept up to date if the window changes. */
function useNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW).matches);
  useEffect(() => {
    const mq = window.matchMedia(NARROW);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
}

/**
 * The little calendar in the "when did you cook it / eat here" pops: a month page, or on a phone
 * just one week (a whole month is a lot on a small screen), flipped a week at a time.
 */
export function PopCalendar({
  start, days, look, seed, onDay,
}: { start: string; days: Map<string, StampCard[]>; look: StampLook; seed: number; onDay: (day: string) => void }) {
  const narrow = useNarrow();
  const first = parseDay(start);
  const [at, setAt] = useState({ year: first.getFullYear(), month: first.getMonth() });
  const [week, setWeek] = useState(start);
  const flip = (by: number) => (narrow ? setWeek((w) => addDays(w, by * 7)) : setAt((a) => addMonths(a.year, a.month, by)));
  const shownWeek = weekOf(week);
  // moving between a phone and a wider window keeps you near the same place
  useEffect(() => {
    if (narrow) {
      const inMonth = ymd(new Date(at.year, at.month, 1));
      if (!weekOf(week).some((d) => d.startsWith(inMonth.slice(0, 7)))) setWeek(inMonth.slice(0, 7) === todayYmd().slice(0, 7) ? todayYmd() : inMonth);
    } else {
      const d = parseDay(week);
      setAt({ year: d.getFullYear(), month: d.getMonth() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrow]);
  const what = narrow ? 'week' : 'month';
  return (
    <>
      <div className="cooked-head">
        <button type="button" className="month-flip" aria-label={`Previous ${what}`} onClick={() => flip(-1)}><PenIcon name="left" /></button>
        {narrow ? (
          <span className="cooked-month">{rangeLabel(shownWeek[0], shownWeek[6])}</span>
        ) : (
          <span className="cooked-month">{MONTH_NAMES[at.month]} <small>{at.year}</small></span>
        )}
        <button type="button" className="month-flip" aria-label={`Next ${what}`} onClick={() => flip(1)}><PenIcon name="right" /></button>
      </div>
      <MonthGrid year={at.year} month={at.month} week={narrow ? week : undefined} days={days} look={look} seed={seed} compact onDay={onDay} />
    </>
  );
}
