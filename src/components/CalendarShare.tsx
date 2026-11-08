import { useMemo, useState } from 'react';
import { MONTH_NAMES, addDays, longDate, rangeLabel, todayYmd, weekdayName } from '../dates';
import type { Recipe } from '../types';
import { fileSlug, renderDayImage, renderMonthImage, renderWeekImage, type ShareContext } from '../shareImage';
import { PenCircle } from './ink';
import { PenIcon } from './PenIcons';
import { ShareSheet } from './ShareSheet';

type Page = 'month' | 'week' | 'day';
const PAGES: { key: Page; label: string }[] = [
  { key: 'month', label: 'month' },
  { key: 'week', label: 'week' },
  { key: 'day', label: 'day' },
];

/** A pen arrow that steps a date earlier or later; `far` is a double arrow that jumps a whole week. */
function Step({ dir, far = false, label, disabled, onClick }: { dir: 'left' | 'right'; far?: boolean; label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`month-flip share-step ${far ? 'is-far' : ''}`} aria-label={label} disabled={disabled} onClick={onClick}>
      <PenIcon name={dir} />
      {far && <PenIcon name={dir} />}
    </button>
  );
}

/** How far back a picture can go: far enough that it never gets in the way. */
const REACH = 1100;

/**
 * Share what was cooked as a picture of the month on the calendar, of any seven days in a row
 * (you pick the day it starts on, up to the last seven days ending today), or of one day with all its
 * stamps scattered together.
 */
export function CalendarShare({
  year, month, seed, recipes, context, onClose,
}: {
  year: number;
  month: number;
  seed: number;
  recipes: Recipe[];
  context: ShareContext;
  onClose: () => void;
}) {
  const today = todayYmd();
  // the day to start on: the latest one with a stamp (up to today), so the picture isn't empty
  const latestCooked = useMemo(
    () => [...new Set(recipes.flatMap((r) => r.cooked ?? []))].filter((d) => d <= today).sort().pop(),
    [recipes, today],
  );
  const [page, setPage] = useState<Page>('month');
  const [weekStart, setWeekStart] = useState(addDays(today, -6)); // the last seven days, ending today
  const [day, setDay] = useState(latestCooked ?? today);

  const lastStart = addDays(today, -6); // a week can't run past today
  const firstStart = addDays(today, -REACH);
  const firstDay = addDays(today, -REACH);
  const clamp = (day: string, lo: string, hi: string) => (day < lo ? lo : day > hi ? hi : day);
  const moveWeek = (by: number) => setWeekStart((d) => clamp(addDays(d, by), firstStart, lastStart));
  const moveDay = (by: number) => setDay((d) => clamp(addDays(d, by), firstDay, today));
  const look = { seed };

  const { title, filename, render } = (() => {
    if (page === 'week') {
      const end = addDays(weekStart, 6);
      return {
        title: `${rangeLabel(weekStart, end)}, what I cooked`,
        filename: `cooked-week-${weekStart}.png`,
        render: (white: boolean) => renderWeekImage(weekStart, recipes, { ...context, white }, look),
      };
    }
    if (page === 'day') {
      return {
        title: `${weekdayName(day)} ${longDate(day)}, what I cooked`,
        filename: `cooked-day-${day}.png`,
        render: (white: boolean) => renderDayImage(day, recipes, { ...context, white }, look),
      };
    }
    return {
      title: `${MONTH_NAMES[month]} ${year}, what I cooked`,
      filename: `cooked-${year}-${String(month + 1).padStart(2, '0')}.png`,
      render: (white: boolean) => renderMonthImage(year, month, recipes, { ...context, white }, look),
    };
  })();

  const controls = (
    <>
      <div role="radiogroup" aria-label="What the picture shows" className="share-row">
        <span>picture of</span>
        {PAGES.map((p, i) => (
          <label key={p.key} className={`sort-option ${page === p.key ? 'is-chosen' : ''}`}>
            <input type="radio" name="share-page" className="visually-hidden" checked={page === p.key} onChange={() => setPage(p.key)} />
            <span className="sort-label">
              {p.label}
              {page === p.key && <PenCircle variant={i + 1} />}
            </span>
          </label>
        ))}
      </div>
      {page === 'week' && (
        <div className="share-row" role="group" aria-label="Which seven days">
          <span>starting</span>
          <Step dir="left" far label="Start a week earlier" disabled={weekStart <= firstStart} onClick={() => moveWeek(-7)} />
          <Step dir="left" label="Start one day earlier" disabled={weekStart <= firstStart} onClick={() => moveWeek(-1)} />
          <span className="share-date">{rangeLabel(weekStart, addDays(weekStart, 6))}</span>
          <Step dir="right" label="Start one day later" disabled={weekStart >= lastStart} onClick={() => moveWeek(1)} />
          <Step dir="right" far label="Start a week later" disabled={weekStart >= lastStart} onClick={() => moveWeek(7)} />
        </div>
      )}
      {page === 'day' && (
        <div className="share-row" role="group" aria-label="Which day">
          <span>on</span>
          <Step dir="left" far label="A week earlier" disabled={day <= firstDay} onClick={() => moveDay(-7)} />
          <Step dir="left" label="One day earlier" disabled={day <= firstDay} onClick={() => moveDay(-1)} />
          <span className="share-date">{weekdayName(day).slice(0, 3)} {longDate(day).replace(/, \d{4}$/, '')}</span>
          <Step dir="right" label="One day later" disabled={day >= today} onClick={() => moveDay(1)} />
          <Step dir="right" far label="A week later" disabled={day >= today} onClick={() => moveDay(7)} />
        </div>
      )}
    </>
  );

  return (
    <ShareSheet
      title={title}
      filename={filename}
      render={render}
      renderKey={`${page}|${weekStart}|${day}`}
      controls={controls}
      onClose={onClose}
    />
  );
}
