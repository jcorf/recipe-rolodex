export const CATEGORIES = [
  { key: 'breakfast', label: 'breakfast' },
  { key: 'small-plates', label: 'appetizers' }, // key kept so saved recipes and colours don't move
  { key: 'drinks', label: 'drinks' },
  { key: 'lunch', label: 'lunch' },
  { key: 'dinner', label: 'dinner' },
  { key: 'dessert', label: 'dessert' },
] as const;

export type Category = (typeof CATEGORIES)[number]['key'];

/** Restaurant prices, cheapest first. */
export const PRICES = ['$', '$$', '$$$', '$$$+'] as const;
export type Price = (typeof PRICES)[number];

/** The kinds of place a restaurant card can be. */
export const VENUES = [
  { key: 'restaurant', label: 'restaurants' },
  { key: 'bar', label: 'bars' },
  { key: 'bakery', label: 'bakeries' },
  { key: 'fast-casual', label: 'fast-casual' },
] as const;
export type Venue = (typeof VENUES)[number]['key'];

/** One meal eaten at a restaurant: the day, and what was had (with a photo of it, if there is one). */
export interface Visit {
  date: string;
  dish: string;
  /** A photo of the dish kept by the store (its id). */
  photo?: string;
}

export interface Recipe {
  id: string;
  title: string;
  /** Empty until the owner files it under one of CATEGORIES. */
  category: Category | '';
  sourceUrl: string;
  sourceName: string;
  /** A photo from the web, by its link. */
  image: string;
  /** A photo added from this device, kept by the store (its id). Shown instead of `image`. */
  photo?: string;
  cuisine: string;
  servings: string;
  totalTime: string;
  description: string;
  ingredients: string[];
  steps: string[];
  rating: number;
  review: string;
  /** Days this was cooked, as YYYY-MM-DD, oldest first. */
  cooked?: string[];
  /** 'restaurant' for a place eaten out; a recipe when missing. A restaurant uses `title` as its name,
   *  `review` as the thoughts, `cuisine` and `rating` as they are, and the fields below. */
  kind?: 'recipe' | 'restaurant';
  price?: Price | '';
  /** The city: what the "location" sort groups by. */
  location?: string;
  /** An extra line for the spot itself (a street, a neighbourhood). */
  address?: string;
  venue?: Venue | '';
  /** Every meal eaten there, each with its day. */
  visits?: Visit[];
  createdAt: string;
  updatedAt: string;
}

/** A card that hasn't been saved yet (imported or written by hand). */
export type Draft = Partial<Recipe>;

export type SortBy = 'category' | 'rating' | 'time' | 'cuisine' | 'alpha' | 'price' | 'location' | 'venue';

export interface Settings {
  /** How the rolodex is divided: by meal, star rating, cooking time, cuisine or first letter. */
  sortBy: SortBy;
  /** KR Fruitsy letter for the fruit beside the title. */
  titleFruit: string;
  /** Ingredients, directions and notes: handwritten (Zeyada or Caveat) or printed (Mukta Malar). */
  recipeFont: 'hand' | 'caveat' | 'print';
  /** Fruit picked for a divider, by divider key. */
  dividerFruits: Record<string, string>;
  /** Whether the blank-card stack and the find slip are out on the desk. */
  showNewCard: boolean;
  showFind: boolean;
  /** The paper-flick sound when a card flips. */
  flipSound: boolean;
  /** What's in the box: recipes (on unless put away) and restaurants (a feature to turn on). At least one stays on. */
  showRecipes: boolean;
  showRestaurants: boolean;
  /** How a meal eaten out is stamped on the calendar, to tell it from cooking: a scalloped circle, or a bordered colour. */
  ateOutStyle: AteOutStyle;
  /** How stamps on the calendar are finished: as printed, worn and speckled, or faded under a thin veil. */
  stampFinish: StampFinish;
  /** The name written at the top of the desk (click it to rewrite it). */
  siteTitle: string;
  /** Which colours the cursor glow drifts between (a key of GLOWS). */
  glowPalette: GlowKey;
  /** Hex color per divider: one per category plus 'unsorted'. */
  dividerColors: Record<Category | 'unsorted', string>;
}

/** The cursor glow's colour pairs: warm follows the cursor, cool drifts on the far side (r g b). */
export const GLOWS = [
  { key: 'peach', label: 'peach', warm: '247 215 199', cool: '218 228 210' },
  { key: 'berry', label: 'berry', warm: '245 200 214', cool: '226 214 240' },
  { key: 'lemon', label: 'lemon', warm: '250 236 170', cool: '246 214 200' },
  { key: 'mint', label: 'mint', warm: '196 232 212', cool: '240 222 212' },
  { key: 'sky', label: 'sky', warm: '200 224 244', cool: '214 234 222' },
  { key: 'lavender', label: 'lavender', warm: '222 208 244', cool: '204 228 238' },
] as const;

export type GlowKey = (typeof GLOWS)[number]['key'];

/** The finishes a stamp can have; only one at a time. */
export const STAMP_FINISHES = [
  { key: 'plain', label: 'plain' },
  { key: 'grainy', label: 'grainy' },
  { key: 'faded', label: 'faded' },
] as const;
export type StampFinish = (typeof STAMP_FINISHES)[number]['key'];

/** A stamp on the calendar: a recipe cooked, or (when `ateOut`) one meal eaten at a restaurant. */
export interface StampCard extends Recipe {
  ateOut?: boolean;
  /** For a meal eaten out: the restaurant card's own id (the stamp's `id` is unique to the visit). */
  cardId?: string;
  dish?: string;
}

/** Which kinds of card are in the box right now. */
export interface Shown { recipes: boolean; restaurants: boolean }

/** The two looks for a meal eaten out (a cooked dish is always a perforated rectangle). */
export const ATE_OUT_STYLES = [
  { key: 'circle', label: 'circle' },
  { key: 'border', label: 'bordered' },
] as const;
export type AteOutStyle = (typeof ATE_OUT_STYLES)[number]['key'];
