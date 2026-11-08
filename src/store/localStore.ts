// The signed-out store: every card and setting kept in this browser's IndexedDB.
import type { Recipe, Settings } from '../types';
import type { Store } from './types';
import type { PhotoFiles } from '../photos';
import { applySettings, cardsToAdd, newId, newRecipe, patchRecipe, photoIds, withDefaults } from './rules';
import { askToPersist, del, get, getAll, getAllKeys, put, tx } from './db';
import seed from './seed.json';

const SETTINGS = 'settings';
const STARTED = 'started';
/** The sample cards added after launch (ids starting "seed-"), and which of them this browser has already been given. */
const SEEDED = 'seeded';
const TOP_UP = (seed as Recipe[]).filter((r) => r.id.startsWith('seed-'));
/** A photo no card points to is cleared once it's this old (a day covers a card still being written). */
const UNUSED_PHOTO_MS = 24 * 60 * 60 * 1000;

interface PhotoRecord extends PhotoFiles {
  id: string;
  createdAt: number;
}

/** Cards in the order they were added (IndexedDB hands them back by id). */
const byAdded = (a: Recipe, b: Recipe) => a.createdAt.localeCompare(b.createdAt);

/**
 * While developing, the cards used to live in data/recipes.json (behind the old Express server).
 * `npm run dev` still hands those files out read-only, so the first visit brings the cards and
 * settings over and nothing is left behind.
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

/**
 * Sample cards added to the app later are handed to a box that already exists too, once each: a card
 * you tear up (or any that's already there) is never put back.
 */
async function topUp() {
  await tx(['recipes', 'kv'], 'readwrite', async (t) => {
    const given = (await get<string[]>(t, 'kv', SEEDED)) ?? [];
    const todo = TOP_UP.filter((r) => !given.includes(r.id));
    if (!todo.length) return;
    for (const card of todo) if (!(await get<Recipe>(t, 'recipes', card.id))) await put(t, 'recipes', card);
    await put(t, 'kv', [...given, ...todo.map((r) => r.id)], SEEDED);
  });
}

let starting: Promise<void> | null = null;

/** The first visit fills the box with the sample cards (or your old cards, in development). */
function start() {
  starting ??= (async () => {
    const started = await tx('kv', 'readonly', (t) => get<boolean>(t, 'kv', STARTED));
    if (started) return topUp();
    const old = await fromOldServer();
    const recipes = (old?.recipes ?? (seed as Recipe[])) as Recipe[];
    await tx(['recipes', 'kv'], 'readwrite', async (t) => {
      if (await get<boolean>(t, 'kv', STARTED)) return; // another tab got there first
      await Promise.all(recipes.map((r) => put(t, 'recipes', r)));
      if (old?.settings) await put(t, 'kv', withDefaults(old.settings), SETTINGS);
      await put(t, 'kv', true, STARTED);
    });
    await topUp(); // a first visit already has them all; this just notes that
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
    const used = new Set((await getAll<Recipe>(t, 'recipes')).flatMap(photoIds));
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
      // a replaced or removed photo (the card's own, or one on a visit) goes with it
      const kept = new Set(photoIds(next));
      for (const id of photoIds(current)) if (!kept.has(id)) await del(t, 'photos', id);
      return next;
    });
  },

  async remove(id) {
    await start();
    await tx(['recipes', 'photos'], 'readwrite', async (t) => {
      const current = await get<Recipe>(t, 'recipes', id);
      if (!current) throw new Error('That card is no longer in the rolodex.');
      await del(t, 'recipes', id);
      for (const id of photoIds(current)) await del(t, 'photos', id);
    });
  },

  async removeAll(kind) {
    await start();
    return tx(['recipes', 'photos'], 'readwrite', async (t) => {
      const all = await getAll<Recipe>(t, 'recipes');
      const going = all.filter((r) => kind === 'both' || (kind === 'restaurants') === (r.kind === 'restaurant'));
      for (const r of going) {
        await del(t, 'recipes', r.id);
        for (const id of photoIds(r)) await del(t, 'photos', id);
      }
      return going.length;
    });
  },

  async reseed() {
    await start();
    const now = new Date().toISOString();
    const fresh = (seed as Recipe[]).map((r) => ({ ...r, rating: 0, updatedAt: now }));
    await tx(['recipes', 'kv'], 'readwrite', async (t) => {
      for (const r of fresh) await put(t, 'recipes', r);
      // noted as given, so the top-up doesn't hand any of them out a second time
      await put(t, 'kv', [...new Set([...((await get<string[]>(t, 'kv', SEEDED)) ?? []), ...TOP_UP.map((r) => r.id)])], SEEDED);
    });
    return fresh;
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
    const record: PhotoRecord = { id: newId(), main, thumb, createdAt: Date.now() };
    await tx('photos', 'readwrite', (t) => put(t, 'photos', record));
    void askToPersist();
    return record.id;
  },

  async photo(id, size) {
    const record = await tx('photos', 'readonly', (t) => get<PhotoRecord>(t, 'photos', id));
    return record?.[size];
  },
};
