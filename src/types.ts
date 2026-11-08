export const CATEGORIES = [
  { key: 'breakfast', label: 'breakfast' },
  { key: 'small-plates', label: 'appetizers' }, // key kept so saved recipes and colours don't move
  { key: 'drinks', label: 'drinks' },
  { key: 'lunch', label: 'lunch' },
  { key: 'dinner', label: 'dinner' },
  { key: 'dessert', label: 'dessert' },
] as const;

export type Category = (typeof CATEGORIES)[number]['key'];

export interface Recipe {
  id: string;
  title: string;
  /** Empty until the owner files it under one of CATEGORIES. */
  category: Category | '';
  sourceUrl: string;
  sourceName: string;
  image: string;
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
  createdAt: string;
  updatedAt: string;
}

/** A card that hasn't been saved yet (imported or written by hand). */
export type Draft = Partial<Recipe>;

export type SortBy = 'category' | 'rating' | 'time' | 'cuisine' | 'alpha';

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
  /** Stamps on the calendar get a worn, speckled print texture. */
  grainyStamps: boolean;
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
