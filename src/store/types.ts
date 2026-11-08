import type { Draft, Recipe, Settings } from '../types';
import type { PhotoFiles, PhotoSize } from '../photos';

/** What adding recipes from an exported .json file did. */
export interface ImportResult {
  added: Recipe[];
  /** Cards already in the box. */
  skipped: number;
  /** Cards that weren't recipes. */
  invalid: number;
}

/**
 * Where the rolodex keeps its cards and settings. The page only talks to this, so the same app
 * can keep everything in this browser (signed out) or in an account (signed in, later).
 */
export interface Store {
  list(): Promise<Recipe[]>;
  create(draft: Draft): Promise<Recipe>;
  update(id: string, patch: Draft): Promise<Recipe>;
  remove(id: string): Promise<void>;
  /** Adds cards from exported .json (one card, a list, or an "export all" file). */
  importRecipes(payload: unknown): Promise<ImportResult>;
  settings(): Promise<Settings>;
  saveSettings(patch: Partial<Settings>): Promise<Settings>;
  /**
   * Keeps a photo's two copies and returns its id, to put on a card as `photo`. A photo no card
   * points to is cleared away later, so one picked for a card that's never saved doesn't linger.
   */
  savePhoto(files: PhotoFiles): Promise<string>;
  /** One copy of a kept photo, or undefined if it's gone. */
  photo(id: string, size: PhotoSize): Promise<Blob | undefined>;
}
