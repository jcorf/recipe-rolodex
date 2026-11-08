import express from 'express';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { DEFAULT_SETTINGS, GLOW_OPTIONS, SORT_OPTIONS, loadRecipes, loadSettings, saveRecipes, saveSettings } from './store.js';
import { importRecipe } from './importer.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PORT = Number(process.env.PORT) || 5174;
const app = express();
app.use(express.json({ limit: '10mb' }));

export const CATEGORIES = ['breakfast', 'small-plates', 'drinks', 'lunch', 'dinner', 'dessert'];

const FIELDS = [
  'title', 'category', 'sourceUrl', 'sourceName', 'image', 'cuisine', 'servings',
  'totalTime', 'description', 'ingredients', 'steps', 'rating', 'review', 'cooked',
];

function clean(input) {
  const out = {};
  for (const key of FIELDS) {
    if (!(key in input)) continue;
    const value = input[key];
    if (key === 'ingredients' || key === 'steps') {
      out[key] = Array.isArray(value) ? value.map(String).map((s) => s.trim()).filter(Boolean) : [];
    } else if (key === 'cooked') {
      // days as YYYY-MM-DD, real dates only, no repeats, oldest first
      const days = Array.isArray(value) ? value.map(String).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d))) : [];
      out[key] = [...new Set(days)].sort();
    } else if (key === 'category') {
      out[key] = CATEGORIES.includes(value) ? value : '';
    } else if (key === 'rating') {
      out[key] = Math.max(0, Math.min(5, Math.round((Number(value) || 0) * 2) / 2)); // half stars
    } else {
      out[key] = value == null ? '' : String(value).trim();
    }
  }
  return out;
}

app.get('/api/recipes', async (_req, res) => {
  res.json(await loadRecipes());
});

app.post('/api/recipes', async (req, res) => {
  const recipes = await loadRecipes();
  const now = new Date().toISOString();
  const recipe = {
    id: randomUUID(),
    title: '', category: '', sourceUrl: '', sourceName: '', image: '', cuisine: '', servings: '',
    totalTime: '', description: '', ingredients: [], steps: [], rating: 0, review: '', cooked: [],
    ...clean(req.body ?? {}),
    createdAt: now,
    updatedAt: now,
  };
  if (!recipe.title) recipe.title = 'untitled recipe';
  recipes.push(recipe);
  await saveRecipes(recipes);
  res.status(201).json(recipe);
});

/**
 * Adds recipes from exported .json: a single card, a list of cards, or an "export all" file
 * ({ recipes: [...] }). Every card gets a fresh id; one that's already in the box (same id, or
 * same name and original link) is skipped, so importing a file twice doesn't double the cards.
 */
function importedCards(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.recipes)) return body.recipes;
  return body && typeof body === 'object' ? [body] : [];
}

app.post('/api/recipes/import', async (req, res) => {
  const incoming = importedCards(req.body).filter((r) => r && typeof r === 'object' && !Array.isArray(r));
  const recipes = await loadRecipes();
  const sig = (r) => `${String(r.title ?? '').trim().toLowerCase()}|${String(r.sourceUrl ?? '').trim()}`;
  const seen = new Set(recipes.map(sig));
  const ids = new Set(recipes.map((r) => r.id));
  const now = new Date().toISOString();
  const added = [];
  let skipped = 0;
  let invalid = 0;
  for (const raw of incoming) {
    const card = clean(raw);
    if (!card.title && !card.ingredients?.length && !card.steps?.length) { invalid++; continue; }
    if ((raw.id && ids.has(raw.id)) || seen.has(sig(card))) { skipped++; continue; }
    const recipe = {
      id: randomUUID(),
      title: '', category: '', sourceUrl: '', sourceName: '', image: '', cuisine: '', servings: '',
      totalTime: '', description: '', ingredients: [], steps: [], rating: 0, review: '',
      ...card,
      createdAt: now,
      updatedAt: now,
    };
    if (!recipe.title) recipe.title = 'untitled recipe';
    seen.add(sig(recipe));
    added.push(recipe);
  }
  if (added.length) await saveRecipes([...recipes, ...added]);
  res.json({ added, skipped, invalid });
});

app.put('/api/recipes/:id', async (req, res) => {
  const recipes = await loadRecipes();
  const index = recipes.findIndex((r) => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'That card is no longer in the rolodex.' });
  recipes[index] = { ...recipes[index], ...clean(req.body ?? {}), updatedAt: new Date().toISOString() };
  if (!recipes[index].title) recipes[index].title = 'untitled recipe';
  await saveRecipes(recipes);
  res.json(recipes[index]);
});

app.delete('/api/recipes/:id', async (req, res) => {
  const recipes = await loadRecipes();
  const next = recipes.filter((r) => r.id !== req.params.id);
  if (next.length === recipes.length) return res.status(404).json({ error: 'That card is no longer in the rolodex.' });
  await saveRecipes(next);
  res.status(204).end();
});

app.get('/api/settings', async (_req, res) => {
  res.json(await loadSettings());
});

app.put('/api/settings', async (req, res) => {
  const current = await loadSettings();
  const colors = { ...current.dividerColors };
  for (const [group, value] of Object.entries(req.body?.dividerColors ?? {})) {
    if (!(group in DEFAULT_SETTINGS.dividerColors)) continue;
    if (!/^#[0-9a-f]{6}$/i.test(String(value))) {
      return res.status(400).json({ error: `“${value}” isn’t a color. Use a hex value like #f4d2de.` });
    }
    colors[group] = String(value).toLowerCase();
  }
  let sortBy = current.sortBy;
  if (req.body?.sortBy !== undefined) {
    if (!SORT_OPTIONS.includes(req.body.sortBy)) {
      return res.status(400).json({ error: `Can't sort by “${req.body.sortBy}”.` });
    }
    sortBy = req.body.sortBy;
  }
  let titleFruit = current.titleFruit;
  if (req.body?.titleFruit !== undefined) {
    if (!/^[a-z0-9]$/.test(String(req.body.titleFruit))) {
      return res.status(400).json({ error: 'Pick a fruit from the list.' });
    }
    titleFruit = req.body.titleFruit;
  }
  let recipeFont = current.recipeFont;
  if (req.body?.recipeFont !== undefined) {
    if (!['hand', 'caveat', 'print'].includes(req.body.recipeFont)) return res.status(400).json({ error: 'Pick a handwriting or printed.' });
    recipeFont = req.body.recipeFont;
  }
  // the page always sends the whole set of divider fruits, so it replaces the saved one
  const dividerFruits = req.body?.dividerFruits !== undefined ? {} : { ...current.dividerFruits };
  for (const [group, glyph] of Object.entries(req.body?.dividerFruits ?? current.dividerFruits ?? {})) {
    if (String(group).length > 60 || !/^[a-z0-9]$/.test(String(glyph))) {
      return res.status(400).json({ error: 'Pick a fruit from the list.' });
    }
    dividerFruits[group] = glyph;
  }
  let siteTitle = current.siteTitle;
  if (req.body?.siteTitle !== undefined) {
    const text = String(req.body.siteTitle).replace(/\s+/g, ' ').trim();
    if (!text || text.length > 40) return res.status(400).json({ error: 'Give the desk a name of 1 to 40 characters.' });
    siteTitle = text;
  }
  let glowPalette = current.glowPalette;
  if (req.body?.glowPalette !== undefined) {
    if (!GLOW_OPTIONS.includes(req.body.glowPalette)) return res.status(400).json({ error: 'Pick a glow from the list.' });
    glowPalette = req.body.glowPalette;
  }
  const flags = {};
  for (const key of ['showNewCard', 'showFind', 'flipSound', 'grainyStamps']) {
    if (req.body?.[key] === undefined) continue;
    if (typeof req.body[key] !== 'boolean') return res.status(400).json({ error: `${key} must be true or false.` });
    flags[key] = req.body[key];
  }
  const next = { ...current, sortBy, titleFruit, recipeFont, siteTitle, glowPalette, dividerFruits, ...flags, dividerColors: colors };
  await saveSettings(next);
  res.json(next);
});

/**
 * Passes a recipe photo through from its own site, so the page can draw it onto a canvas for a
 * shared image (a canvas can't be saved once it holds a picture from another site).
 */
app.get('/api/image', async (req, res) => {
  try {
    const url = new URL(String(req.query.url ?? ''));
    if (!/^https?:$/.test(url.protocol)) throw new Error('not a web link');
    const upstream = await fetch(url, { headers: { 'user-agent': 'RecipeRolodex/0.1 (personal, self-hosted recipe importer)' }, signal: AbortSignal.timeout(12000) });
    const type = upstream.headers.get('content-type') ?? '';
    if (!upstream.ok || !type.startsWith('image/')) throw new Error('not an image');
    const bytes = Buffer.from(await upstream.arrayBuffer());
    if (bytes.length > 8 * 1024 * 1024) throw new Error('too large');
    res.set('content-type', type).set('cache-control', 'private, max-age=86400').send(bytes);
  } catch (err) {
    res.status(422).json({ error: `Couldn’t load that photo (${err.message}).` });
  }
});

app.post('/api/import', async (req, res) => {
  const url = String(req.body?.url ?? '').trim();
  try {
    res.json(await importRecipe(url));
  } catch (err) {
    res.status(422).json({ error: err.message });
  }
});

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(root, 'dist');
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`recipe rolodex api on http://localhost:${PORT}`);
});
