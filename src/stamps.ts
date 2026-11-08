import type { Recipe, Shown, StampCard } from './types';

/**
 * Everything stamped on the calendar, by day: each day a recipe was cooked (when recipes are in the box),
 * and each meal eaten out (when restaurants are), which stamps its restaurant with that visit's photo
 * or the card's own.
 */
export function stampsByDay(recipes: Recipe[], show: Shown) {
  const days = new Map<string, StampCard[]>();
  const add = (day: string, card: StampCard) => days.set(day, [...(days.get(day) ?? []), card]);
  for (const r of recipes) {
    if (r.kind === 'restaurant') {
      if (!show.restaurants) continue;
      (r.visits ?? []).forEach((v, i) =>
        add(v.date, { ...r, id: `${r.id}@${v.date}@${i}`, cardId: r.id, ateOut: true, dish: v.dish, photo: v.photo || r.photo }),
      );
    } else if (show.recipes) {
      for (const day of r.cooked ?? []) add(day, r);
    }
  }
  return days;
}

/** The card behind a stamp (a meal eaten out stamps its restaurant). */
export const stampCardId = (s: StampCard) => s.cardId ?? s.id;
