import { readFile, writeFile, rename, mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DATA_DIR = path.join(root, 'data');
const DATA_FILE = path.join(DATA_DIR, 'recipes.json');
const SEED_FILE = path.join(root, 'server', 'seed.json');

// Serialize writes so two quick saves never interleave.
let queue = Promise.resolve();

export async function loadRecipes() {
  try {
    return JSON.parse(await readFile(DATA_FILE, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    await mkdir(DATA_DIR, { recursive: true });
    await copyFile(SEED_FILE, DATA_FILE);
    return JSON.parse(await readFile(DATA_FILE, 'utf8'));
  }
}

export function saveRecipes(recipes) {
  queue = queue.then(async () => {
    await mkdir(DATA_DIR, { recursive: true });
    const tmp = `${DATA_FILE}.tmp`;
    await writeFile(tmp, JSON.stringify(recipes, null, 2));
    await rename(tmp, DATA_FILE);
  });
  return queue;
}

// ───────── settings ─────────
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

export const DEFAULT_SETTINGS = {
  /** Pastel stock for each category divider card. */
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

export async function loadSettings() {
  try {
    const saved = JSON.parse(await readFile(SETTINGS_FILE, 'utf8'));
    return { ...DEFAULT_SETTINGS, ...saved, dividerColors: { ...DEFAULT_SETTINGS.dividerColors, ...saved.dividerColors } };
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export function saveSettings(settings) {
  queue = queue.then(async () => {
    await mkdir(DATA_DIR, { recursive: true });
    const tmp = `${SETTINGS_FILE}.tmp`;
    await writeFile(tmp, JSON.stringify(settings, null, 2));
    await rename(tmp, SETTINGS_FILE);
  });
  return queue;
}
