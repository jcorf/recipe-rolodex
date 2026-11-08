// The rules a card and the settings must follow, whichever store keeps them.
// (Moved from the old Express server so the app works without one.)
import { CATEGORIES, GLOWS, PRICES, STAMP_FINISHES, VENUES, type Draft, type Recipe, type Settings, type Visit } from '../types';
import { SORT_OPTIONS } from '../sorting';

const CATEGORY_KEYS: string[] = CATEGORIES.map((c) => c.key);

const TEXT_FIELDS = [
  'title', 'sourceUrl', 'sourceName', 'image', 'cuisine', 'servings', 'totalTime', 'description', 'review', 'location',
] as const;

/** Only web links (or nothing) for links that end up in an href or src. Blocks `javascript:` and the like. */
function safeLink(value: string) {
  return value === '' || /^https?:\/\//i.test(value) ? value : '';
}

/** Meals eaten out: real days only, what was had, and a photo id if there is one. Oldest first. */
function cleanVisits(value: unknown): Visit[] {
  if (!Array.isArray(value)) return [];
  const visits: Visit[] = [];
  for (const v of value) {
    if (!v || typeof v !== 'object') continue;
    const { date, dish, photo } = v as Record<string, unknown>;
    const day = String(date ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(day))) continue;
    const id = photo == null ? '' : String(photo);
    visits.push({ date: day, dish: String(dish ?? '').trim().slice(0, 120), ...(/^[a-z0-9-]{1,64}$/i.test(id) ? { photo: id } : {}) });
  }
  return visits.sort((a, b) => a.date.localeCompare(b.date));
}

/** Every kept photo a card points to: its own, and the ones on its visits. */
export function photoIds(r: Pick<Recipe, 'photo' | 'visits'>): string[] {
  return [r.photo, ...(r.visits ?? []).map((v) => v.photo)].filter((id): id is string => !!id);
}

/** Keeps only the fields a card has, each in the shape it should be. */
export function cleanRecipe(input: Record<string, unknown>): Draft {
  const out: Draft = {};
  for (const key of TEXT_FIELDS) {
    if (!(key in input)) continue;
    const value = input[key];
    const text = value == null ? '' : String(value).trim();
    out[key] = key === 'sourceUrl' || key === 'image' ? safeLink(text) : text;
  }
  for (const key of ['ingredients', 'steps'] as const) {
    if (!(key in input)) continue;
    const value = input[key];
    out[key] = Array.isArray(value) ? value.map(String).map((s) => s.trim()).filter(Boolean) : [];
  }
  if ('cooked' in input) {
    // days as YYYY-MM-DD, real dates only, no repeats, oldest first
    const value = input.cooked;
    const days = Array.isArray(value)
      ? value.map(String).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d)))
      : [];
    out.cooked = [...new Set(days)].sort();
  }
  if ('kind' in input) out.kind = input.kind === 'restaurant' ? 'restaurant' : 'recipe';
  if ('price' in input) out.price = PRICES.includes(input.price as never) ? (input.price as Recipe['price']) : '';
  if ('venue' in input) out.venue = VENUES.some((v) => v.key === input.venue) ? (input.venue as Recipe['venue']) : '';
  if ('visits' in input) out.visits = cleanVisits(input.visits);
  if ('photo' in input) {
    const id = input.photo == null ? '' : String(input.photo);
    out.photo = /^[a-z0-9-]{1,64}$/i.test(id) ? id : '';
  }
  if ('category' in input) {
    out.category = CATEGORY_KEYS.includes(input.category as string) ? (input.category as Recipe['category']) : '';
  }
  if ('rating' in input) {
    out.rating = Math.max(0, Math.min(5, Math.round((Number(input.rating) || 0) * 2) / 2)); // half stars
  }
  return out;
}

/**
 * A random id. crypto.randomUUID only exists on https and localhost pages, so on a phone testing
 * over home Wi-Fi (http://192.168…) build one from getRandomValues, which works everywhere.
 */
export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant
  const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** A new card from a draft, with a fresh id and dates. */
export function newRecipe(draft: Record<string, unknown>, now = new Date().toISOString()): Recipe {
  const recipe: Recipe = {
    id: newId(),
    title: '', category: '', sourceUrl: '', sourceName: '', image: '', photo: '', cuisine: '', servings: '',
    totalTime: '', description: '', ingredients: [], steps: [], rating: 0, review: '', cooked: [],
    ...cleanRecipe(draft),
    createdAt: now,
    updatedAt: now,
  };
  if (!recipe.title) recipe.title = recipe.kind === 'restaurant' ? 'untitled restaurant' : 'untitled recipe';
  return recipe;
}

/** A saved card with a patch applied. */
export function patchRecipe(current: Recipe, patch: Record<string, unknown>): Recipe {
  const next = { ...current, ...cleanRecipe(patch), updatedAt: new Date().toISOString() };
  if (!next.title) next.title = next.kind === 'restaurant' ? 'untitled restaurant' : 'untitled recipe';
  return next;
}

/** The cards in an exported .json file: one card, a list, or an "export all" file ({ recipes: [...] }). */
function importedCards(payload: unknown): Record<string, unknown>[] {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { recipes?: unknown })?.recipes)
      ? (payload as { recipes: unknown[] }).recipes
      : payload && typeof payload === 'object' ? [payload] : [];
  return list.filter((r): r is Record<string, unknown> => !!r && typeof r === 'object' && !Array.isArray(r));
}

/**
 * Turns imported cards into new ones. Every card gets a fresh id; one that's already in the box
 * (same id, or same name and original link) is skipped, so importing a file twice doesn't double the cards.
 */
export function cardsToAdd(existing: Recipe[], payload: unknown) {
  const sig = (r: Draft) => `${String(r.title ?? '').trim().toLowerCase()}|${String(r.sourceUrl ?? '').trim()}`;
  const seen = new Set(existing.map(sig));
  const ids = new Set(existing.map((r) => r.id));
  const now = new Date().toISOString();
  const added: Recipe[] = [];
  let skipped = 0;
  let invalid = 0;
  for (const raw of importedCards(payload)) {
    const card = cleanRecipe(raw);
    if (!card.title && !card.ingredients?.length && !card.steps?.length && !card.visits?.length) { invalid++; continue; }
    if ((typeof raw.id === 'string' && ids.has(raw.id)) || seen.has(sig(card))) { skipped++; continue; }
    const recipe = newRecipe(raw, now);
    seen.add(sig(recipe));
    added.push(recipe);
  }
  return { added, skipped, invalid };
}

// ───────── settings ─────────

export const DEFAULT_SETTINGS: Settings = {
  sortBy: 'category',
  titleFruit: 'h',
  recipeFont: 'hand',
  dividerFruits: {},
  showNewCard: true,
  showFind: true,
  flipSound: true,
  showRecipes: true,
  showRestaurants: false, // a feature to turn on
  ateOutBorder: true,
  stampFinish: 'plain',
  siteTitle: 'my recipes',
  glowPalette: 'peach',
  dividerColors: {
    breakfast: '#f6e7b0',
    'small-plates': '#f5d6c4',
    drinks: '#cfe3ef',
    lunch: '#d7e8cd',
    dinner: '#ded5ec',
    dessert: '#f4d2de',
    unsorted: '#e4e2dd',
  },
};

/** Saved settings filled out with the defaults (older saves may be missing newer settings). */
export function withDefaults(saved: Partial<Settings> & { grainyStamps?: boolean } = {}): Settings {
  const { grainyStamps, ...rest } = saved;
  return {
    ...DEFAULT_SETTINGS,
    ...rest,
    // the grainy option used to be a plain on/off setting
    stampFinish: rest.stampFinish ?? (grainyStamps ? 'grainy' : 'plain'),
    dividerColors: { ...DEFAULT_SETTINGS.dividerColors, ...rest.dividerColors },
    dividerFruits: { ...rest.dividerFruits },
  };
}

const fail = (message: string): never => { throw new Error(message); };

/** Applies a settings change, or throws with a message the page can show. */
export function applySettings(current: Settings, patch: Partial<Settings>): Settings {
  const next: Settings = { ...current, dividerColors: { ...current.dividerColors } };

  for (const [group, value] of Object.entries(patch.dividerColors ?? {})) {
    if (!(group in DEFAULT_SETTINGS.dividerColors)) continue;
    if (!/^#[0-9a-f]{6}$/i.test(String(value))) fail(`“${value}” isn’t a color. Use a hex value like #f4d2de.`);
    next.dividerColors[group as keyof Settings['dividerColors']] = String(value).toLowerCase();
  }
  if (patch.sortBy !== undefined) {
    if (!SORT_OPTIONS.some((o) => o.key === patch.sortBy)) fail(`Can't sort by “${patch.sortBy}”.`);
    next.sortBy = patch.sortBy;
  }
  if (patch.titleFruit !== undefined) {
    if (!/^[a-z0-9]$/.test(String(patch.titleFruit))) fail('Pick a fruit from the list.');
    next.titleFruit = patch.titleFruit;
  }
  if (patch.recipeFont !== undefined) {
    if (!['hand', 'caveat', 'print'].includes(patch.recipeFont)) fail('Pick a handwriting or printed.');
    next.recipeFont = patch.recipeFont;
  }
  if (patch.dividerFruits !== undefined) {
    // the page always sends the whole set of divider fruits, so it replaces the saved one
    const fruits: Record<string, string> = {};
    for (const [group, glyph] of Object.entries(patch.dividerFruits)) {
      if (group.length > 60 || !/^[a-z0-9]$/.test(String(glyph))) fail('Pick a fruit from the list.');
      fruits[group] = glyph;
    }
    next.dividerFruits = fruits;
  }
  if (patch.siteTitle !== undefined) {
    const text = String(patch.siteTitle).replace(/\s+/g, ' ').trim();
    if (!text || text.length > 40) fail('Give the desk a name of 1 to 40 characters.');
    next.siteTitle = text;
  }
  if (patch.stampFinish !== undefined) {
    if (!STAMP_FINISHES.some((f) => f.key === patch.stampFinish)) fail('Pick plain, grainy or faded.');
    next.stampFinish = patch.stampFinish;
  }
  if (patch.glowPalette !== undefined) {
    if (!GLOWS.some((g) => g.key === patch.glowPalette)) fail('Pick a glow from the list.');
    next.glowPalette = patch.glowPalette;
  }
  for (const key of ['showNewCard', 'showFind', 'flipSound', 'showRecipes', 'showRestaurants', 'ateOutBorder'] as const) {
    if (patch[key] === undefined) continue;
    if (typeof patch[key] !== 'boolean') fail(`${key} must be true or false.`);
    next[key] = patch[key];
  }
  if (!next.showRecipes && !next.showRestaurants) fail('Keep recipes or restaurants in the box: it can’t hold neither.');
  return next;
}
