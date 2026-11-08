import { CATEGORIES, type Recipe, type SortBy } from './types';

/** One divider's worth of cards. */
export interface Group {
  key: string;
  label: string;
  recipes: Recipe[];
  /** For star-rating dividers: draw this many stars instead of a fruit. */
  stars?: number;
  /** For a–z dividers: just the letter, no fruit. */
  plain?: boolean;
}

export const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: 'category', label: 'meal' },
  { key: 'rating', label: 'stars' },
  { key: 'time', label: 'time' },
  { key: 'cuisine', label: 'cuisine' },
  { key: 'alpha', label: 'a – z' },
];

export const byTitle = (a: Recipe, b: Recipe) =>
  a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });

/** "1 hr 30 min" → 90, "25 min" → 25, "PT45M"-style leftovers → 45; null when there's no number. */
export function minutesOf(time?: string): number | null {
  if (!time) return null;
  const t = time.toLowerCase();
  const h = /(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/.exec(t);
  const m = /(\d+)\s*(?:m|min|mins|minute|minutes)\b/.exec(t);
  if (!h && !m) {
    const bare = /^\s*(\d+)\s*$/.exec(t); // a bare number reads as minutes
    return bare ? Number(bare[1]) : null;
  }
  return Math.round((h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0));
}

const TIME_BUCKETS = [
  { key: 'under-30', label: 'under 30 min', test: (m: number) => m < 30 },
  { key: 'under-60', label: 'under an hour', test: (m: number) => m < 60 },
  { key: 'under-120', label: 'under 2 hours', test: (m: number) => m < 120 },
  { key: '120-plus', label: '2 hours +', test: () => true },
];

/** Puts the recipes into ordered groups for the chosen sort, A–Z inside each group. */
export function groupRecipes(recipes: Recipe[], sortBy: SortBy): Group[] {
  const buckets = new Map<string, Group>();
  const add = (key: string, label: string, recipe: Recipe, extra?: Partial<Group>) => {
    if (!buckets.has(key)) buckets.set(key, { key, label, recipes: [], ...extra });
    buckets.get(key)!.recipes.push(recipe);
  };
  let order: string[] = [];

  switch (sortBy) {
    case 'category': {
      for (const r of recipes) {
        const c = CATEGORIES.find((x) => x.key === r.category);
        add(c?.key ?? 'unsorted', c?.label ?? 'unsorted', r);
      }
      order = [...CATEGORIES.map((c) => c.key), 'unsorted'];
      break;
    }
    case 'rating': {
      // only star levels that have cards get a divider
      for (const r of recipes) {
        const stars = Math.max(0, Math.min(5, Math.floor(r.rating || 0))); // 4.5 counts as 4
        if (stars === 0) add('stars-0', 'not rated', r);
        else add(`stars-${stars}`, `${stars} star${stars > 1 ? 's' : ''}`, r, { stars });
      }
      order = ['stars-5', 'stars-4', 'stars-3', 'stars-2', 'stars-1', 'stars-0'];
      break;
    }
    case 'time': {
      for (const r of recipes) {
        const m = minutesOf(r.totalTime);
        const b = m == null ? null : TIME_BUCKETS.find((x) => x.test(m))!;
        add(b?.key ?? 'time-unknown', b?.label ?? 'time unknown', r);
      }
      order = [...TIME_BUCKETS.map((b) => b.key), 'time-unknown'];
      break;
    }
    case 'cuisine': {
      for (const r of recipes) {
        const c = r.cuisine.trim().toLowerCase();
        add(c ? `cuisine-${c}` : 'cuisine-none', c || 'no cuisine', r);
      }
      order = [...buckets.keys()].sort((a, b) =>
        a === 'cuisine-none' ? 1 : b === 'cuisine-none' ? -1 : a.localeCompare(b),
      );
      break;
    }
    case 'alpha': {
      for (const r of recipes) {
        const ch = r.title.trim().charAt(0).toLowerCase();
        const letter = /[a-z]/.test(ch) ? ch : '#';
        add(`letter-${letter}`, letter, r, { plain: true });
      }
      // only letters that have cards; '#' (numbers, symbols) last
      order = [...buckets.keys()].sort((a, b) =>
        a === 'letter-#' ? 1 : b === 'letter-#' ? -1 : a.localeCompare(b),
      );
      break;
    }
  }

  return order
    .map((key) => buckets.get(key))
    .filter((g): g is Group => !!g)
    .map((g) => ({ ...g, recipes: [...g.recipes].sort(byTitle) }));
}
