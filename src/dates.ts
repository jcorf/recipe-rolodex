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

export const addMonths = (year: number, month: number, by: number) => {
  const d = new Date(year, month + by, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
};
