// The signed-out store: every card and setting kept in this browser's IndexedDB.
import type { Recipe, Settings } from '../types';
import type { Store } from './types';
import type { PhotoFiles } from '../photos';
import { applySettings, cardsToAdd, newRecipe, patchRecipe, withDefaults } from './rules';
import { askToPersist, del, get, getAll, getAllKeys, put, tx } from './db';
import seed from './seed.json';

const SETTINGS = 'settings';
const STARTED = 'started';
/** A photo no card points to is cleared once it's this old (a day covers a card still being written). */
const UNUSED_PHOTO_MS = 24 * 60 * 60 * 1000;

interface PhotoRecord extends PhotoFiles {
  id: string;
  createdAt: number;
}

/** Cards in the order they were added (IndexedDB hands them back by id). */
const byAdded = (a: Recipe, b: Recipe) => a.createdAt.localeCompare(b.createdAt);

/**
 * While developing, the cards used to live in data/recipes.json behind the old server. If it's
 * still running the first time, bring those cards and settings over so nothing is left behind.
 */
async function fromOldServer(): Promise<{ recipes: Recipe[]; settings?: Settings } | null> {
  if (!import.meta.env.DEV) return null;
  try {
    const [r, s] = await Promise.all([fetch('/api/recipes'), fetch('/api/settings')]);
    if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return null;
    const recipes = await r.json();
    if (!Array.isArray(recipes)) return null;
    const settings = s.ok ? await s.json().catch(() => undefined) : undefined;
    return { recipes, settings };
  } catch {
    return null;
  }
}

let starting: Promise<void> | null = null;

/** The first visit fills the box with the sample cards (or your old cards, in development). */
function start() {
  starting ??= (async () => {
    const started = await tx('kv', 'readonly', (t) => get<boolean>(t, 'kv', STARTED));
    if (started) return;
    const old = await fromOldServer();
    const recipes = (old?.recipes ?? (seed as Recipe[])) as Recipe[];
    await tx(['recipes', 'kv'], 'readwrite', async (t) => {
      if (await get<boolean>(t, 'kv', STARTED)) return; // another tab got there first
      await Promise.all(recipes.map((r) => put(t, 'recipes', r)));
      if (old?.settings) await put(t, 'kv', withDefaults(old.settings), SETTINGS);
      await put(t, 'kv', true, STARTED);
    });
    void askToPersist();
  })().catch((err) => { starting = null; throw err; });
  return starting;
}

let swept = false;

/** Once a visit: clears photos that no card points to (picked for a card that was never saved, or replaced). */
async function sweepPhotos() {
  if (swept) return;
  swept = true;
  await tx(['recipes', 'photos'], 'readwrite', async (t) => {
    const used = new Set((await getAll<Recipe>(t, 'recipes')).map((r) => r.photo).filter(Boolean));
    const keys = (await getAllKeys(t, 'photos')) as string[];
    const old = Date.now() - UNUSED_PHOTO_MS;
    for (const id of keys) {
      if (used.has(id)) continue;
      const record = await get<PhotoRecord>(t, 'photos', id);
      if (record && record.createdAt < old) await del(t, 'photos', id);
    }
  }).catch(() => { swept = false; });
}

async function readSettings(t: IDBTransaction) {
  return withDefaults(await get<Settings>(t, 'kv', SETTINGS));
}

export const localStore: Store = {
  async list() {
    await start();
    const recipes = await tx('recipes', 'readonly', (t) => getAll<Recipe>(t, 'recipes'));
    void sweepPhotos();
    return recipes.sort(byAdded);
  },

  async create(draft) {
    await start();
    const recipe = newRecipe(draft as Record<string, unknown>);
    await tx('recipes', 'readwrite', (t) => put(t, 'recipes', recipe));
    return recipe;
  },

  async update(id, patch) {
    await start();
    return tx(['recipes', 'photos'], 'readwrite', async (t) => {
      const current = await get<Recipe>(t, 'recipes', id);
      if (!current) throw new Error('That card is no longer in the rolodex.');
      const next = patchRecipe(current, patch as Record<string, unknown>);
      await put(t, 'recipes', next);
      // a replaced or removed photo goes with it
      if (current.photo && current.photo !== next.photo) await del(t, 'photos', current.photo);
      return next;
    });
  },

  async remove(id) {
    await start();
    await tx(['recipes', 'photos'], 'readwrite', async (t) => {
      const current = await get<Recipe>(t, 'recipes', id);
      if (!current) throw new Error('That card is no longer in the rolodex.');
      await del(t, 'recipes', id);
      if (current.photo) await del(t, 'photos', current.photo);
    });
  },

  async importRecipes(payload) {
    await start();
    return tx('recipes', 'readwrite', async (t) => {
      const result = cardsToAdd(await getAll<Recipe>(t, 'recipes'), payload);
      await Promise.all(result.added.map((r) => put(t, 'recipes', r)));
      return result;
    });
  },

  async settings() {
    await start();
    return tx('kv', 'readonly', readSettings);
  },

  async saveSettings(patch) {
    await start();
    return tx('kv', 'readwrite', async (t) => {
      const next = applySettings(await readSettings(t), patch);
      await put(t, 'kv', next, SETTINGS);
      return next;
    });
  },

  async savePhoto({ main, thumb }) {
    const record: PhotoRecord = { id: crypto.randomUUID(), main, thumb, createdAt: Date.now() };
    await tx('photos', 'readwrite', (t) => put(t, 'photos', record));
    void askToPersist();
    return record.id;
  },

  async photo(id, size) {
    const record = await tx('photos', 'readonly', (t) => get<PhotoRecord>(t, 'photos', id));
    return record?.[size];
  },
};
