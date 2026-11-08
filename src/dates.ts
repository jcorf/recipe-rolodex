/** Days are kept as YYYY-MM-DD in the owner's own time zone (never UTC, so a late dinner stays on its day). */
export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const todayYmd = () => ymd(new Date());

export const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
export const WEEKDAYS = ['s', 'm', 't', 'w', 't', 'f', 's'];

/** A month as weeks of 7 days starting Sunday; days outside the month are null. */
export function monthWeeks(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1).getDay();
  const count = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array<null>(first).fill(null),
    ...Array.from({ length: count }, (_, i) => ymd(new Date(year, month, i + 1))),
  ];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

/** "2026-11-07" → "nov 7" */
export function shortDay(day: string) {
  const [, m, d] = day.split('-').map(Number);
  return `${MONTH_NAMES[m - 1].slice(0, 3)} ${d}`;
}

export const addMonths = (year: number, month: number, by: number) => {
  const d = new Date(year, month + by, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
};
