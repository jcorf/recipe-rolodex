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

/** The Sunday-to-Saturday week a day falls in, as seven YYYY-MM-DDs (across a month's end if it must). */
export function weekOf(day: string): string[] {
  const sunday = addDays(day, -parseDay(day).getDay());
  return Array.from({ length: 7 }, (_, i) => addDays(sunday, i));
}

export const WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** A YYYY-MM-DD as a Date at midday (so a clock change never moves it to another day). */
export const parseDay = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

export const addDays = (day: string, by: number) => {
  const d = parseDay(day);
  d.setDate(d.getDate() + by);
  return ymd(d);
};

export const weekdayName = (day: string) => WEEKDAY_NAMES[parseDay(day).getDay()];

/** "2026-11-07" → "november 7, 2026" */
export function longDate(day: string) {
  const d = parseDay(day);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** Seven days as one line: "november 2 – 8", or "october 30 – november 5" across a month. */
export function rangeLabel(first: string, last: string) {
  const a = parseDay(first);
  const b = parseDay(last);
  const aText = `${MONTH_NAMES[a.getMonth()]} ${a.getDate()}`;
  return a.getMonth() === b.getMonth() ? `${aText} – ${b.getDate()}` : `${aText} – ${MONTH_NAMES[b.getMonth()]} ${b.getDate()}`;
}

/** "2026-11-07" → "nov 7" */
export function shortDay(day: string) {
  const [, m, d] = day.split('-').map(Number);
  return `${MONTH_NAMES[m - 1].slice(0, 3)} ${d}`;
}

/** A steady "random" number from 0 to 1 for some text (the same text always gives the same one). */
export function hash01(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  // final mix, so inputs that differ by one character still land far apart
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/**
 * How far one stamp leans on its day, in degrees (-8 to 8). `seed` is re-rolled each time the calendar
 * opens or turns a page, so a recipe never leans the same way twice; within one look, the page and
 * a picture of it agree.
 */
export const stampTilt = (recipeId: string, day: string, seed = 0) => +((hash01(`${seed}|${recipeId}|${day}`) - 0.5) * 16).toFixed(1);

/**
 * A day with more than two dishes only has room for two stamps (the rest show as "+n"). Which two is
 * a shuffle that follows `seed`, so the dice can deal a new pair; with two or fewer nothing moves.
 */
export function pickShown<T extends { id: string }>(list: T[], day: string, seed: number): T[] {
  if (list.length <= 2) return list;
  return [...list].sort((a, b) => hash01(`${seed}|${a.id}|${day}|pick`) - hash01(`${seed}|${b.id}|${day}|pick`)).slice(0, 2);
}

export const addMonths = (year: number, month: number, by: number) => {
  const d = new Date(year, month + by, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
};
