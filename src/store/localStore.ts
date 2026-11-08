// The signed-out store: every card and setting kept in this browser's IndexedDB.
import type { Recipe, Settings } from '../types';
import type { Store } from './types';
import { applySettings, cardsToAdd, newRecipe, patchRecipe, withDefaults } from './rules';
import { askToPersist, del, get, getAll, put, tx } from './db';
import seed from './seed.json';

const SETTINGS = 'settings';
const STARTED = 'started';

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

async function readSettings(t: IDBTransaction) {
  return withDefaults(await get<Settings>(t, 'kv', SETTINGS));
}

export const localStore: Store = {
  async list() {
    await start();
    const recipes = await tx('recipes', 'readonly', (t) => getAll<Recipe>(t, 'recipes'));
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
    return tx('recipes', 'readwrite', async (t) => {
      const current = await get<Recipe>(t, 'recipes', id);
      if (!current) throw new Error('That card is no longer in the rolodex.');
      const next = patchRecipe(current, patch as Record<string, unknown>);
      await put(t, 'recipes', next);
      return next;
    });
  },

  async remove(id) {
    await start();
    await tx('recipes', 'readwrite', async (t) => {
      if (!(await get<Recipe>(t, 'recipes', id))) throw new Error('That card is no longer in the rolodex.');
      await del(t, 'recipes', id);
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
};
