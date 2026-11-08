export const CATEGORIES = [
  { key: 'breakfast', label: 'breakfast' },
  { key: 'small-plates', label: 'small plates' },
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

export interface Settings {
  /** Hex color per divider: one per category plus 'unsorted'. */
  dividerColors: Record<Category | 'unsorted', string>;
}
