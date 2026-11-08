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
  /** Ingredients, directions and notes: handwritten (Zeyada) or printed (Mukta Malar). */
  recipeFont: 'hand' | 'print';
  /** Fruit picked for a divider, by divider key. */
  dividerFruits: Record<string, string>;
  /** Whether the blank-card stack and the find slip are out on the desk. */
  showNewCard: boolean;
  showFind: boolean;
  /** Hex color per divider: one per category plus 'unsorted'. */
  dividerColors: Record<Category | 'unsorted', string>;
}
