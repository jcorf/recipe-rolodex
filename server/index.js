import express from 'express';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { DEFAULT_SETTINGS, loadRecipes, loadSettings, saveRecipes, saveSettings } from './store.js';
import { importRecipe } from './importer.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PORT = Number(process.env.PORT) || 5174;
const app = express();
app.use(express.json({ limit: '2mb' }));

export const CATEGORIES = ['breakfast', 'small-plates', 'drinks', 'lunch', 'dinner', 'dessert'];

const FIELDS = [
  'title', 'category', 'sourceUrl', 'sourceName', 'image', 'cuisine', 'servings',
  'totalTime', 'description', 'ingredients', 'steps', 'rating', 'review',
];

function clean(input) {
  const out = {};
  for (const key of FIELDS) {
    if (!(key in input)) continue;
    const value = input[key];
    if (key === 'ingredients' || key === 'steps') {
      out[key] = Array.isArray(value) ? value.map(String).map((s) => s.trim()).filter(Boolean) : [];
    } else if (key === 'category') {
      out[key] = CATEGORIES.includes(value) ? value : '';
    } else if (key === 'rating') {
      out[key] = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
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
    totalTime: '', description: '', ingredients: [], steps: [], rating: 0, review: '',
    ...clean(req.body ?? {}),
    createdAt: now,
    updatedAt: now,
  };
  if (!recipe.title) recipe.title = 'untitled recipe';
  recipes.push(recipe);
  await saveRecipes(recipes);
  res.status(201).json(recipe);
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
  const next = { ...current, dividerColors: colors };
  await saveSettings(next);
  res.json(next);
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
