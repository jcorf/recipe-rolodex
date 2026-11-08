import { CATEGORIES, type Recipe } from './types';
import { abbreviateUnits, ratingLabel, servesLabel, stepText } from './recipeText';

function download(filename: string, data: unknown, type = 'application/json') {
  const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Today's date where you are (not UTC), e.g. 2026-11-07. */
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const slug = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'recipe';

/** Every recipe in the box, as my-recipes-YYYY-MM-DD.json. */
export function exportAll(recipes: Recipe[]) {
  download(`my-recipes-${today()}.json`, { exportedAt: new Date().toISOString(), count: recipes.length, recipes });
}

/** One recipe, as its-name.json. */
export function exportOne(recipe: Recipe) {
  download(`${slug(recipe.title)}.json`, recipe);
}

export type ExportFormat = 'json' | 'md';

const FORMAT_KEY = 'export-format';
/** The format exports use (.json to back up and add back, .md to read or print); remembered in this browser. */
export function loadExportFormat(): ExportFormat {
  try { return localStorage.getItem(FORMAT_KEY) === 'md' ? 'md' : 'json'; } catch { return 'json'; }
}
export function saveExportFormat(format: ExportFormat) {
  try { localStorage.setItem(FORMAT_KEY, format); } catch { /* private window: fine for this visit */ }
}

export interface ImportSummary {
  added: Recipe[];
  /** Cards already in the box. */
  skipped: number;
  /** Cards (or whole files) that weren't recipes. */
  invalid: number;
}

/** Reads .json files (one card, a list, or an "export all" file) and adds their recipes to the box. */
export async function importFiles(files: File[], send: (payload: unknown) => Promise<ImportSummary>): Promise<ImportSummary> {
  const total: ImportSummary = { added: [], skipped: 0, invalid: 0 };
  const cards: unknown[] = [];
  for (const file of files) {
    try {
      const data = JSON.parse(await file.text());
      cards.push(...(Array.isArray(data) ? data : Array.isArray(data?.recipes) ? data.recipes : [data]));
    } catch {
      total.invalid++; // not JSON at all
    }
  }
  if (cards.length) {
    const sent = await send(cards);
    total.added = sent.added;
    total.skipped += sent.skipped;
    total.invalid += sent.invalid;
  }
  return total;
}

/** "added 3 recipes · 1 was already here" */
export function importMessage({ added, skipped, invalid }: ImportSummary) {
  const parts = [`added ${added.length} recipe${added.length === 1 ? '' : 's'}`];
  if (skipped) parts.push(`${skipped} already in the box`);
  if (invalid) parts.push(`${invalid} couldn’t be read`);
  return parts.join(' · ');
}

/** One recipe as markdown: title, a line of details, the note, ingredients, numbered directions. */
export function recipeToMarkdown(r: Recipe) {
  const meal = CATEGORIES.find((c) => c.key === r.category)?.label;
  const details = [meal, r.cuisine, r.totalTime, servesLabel(r.servings), r.rating ? ratingLabel(r.rating) : ''].filter(Boolean);
  const out = [`# ${r.title}`];
  if (details.length) out.push(`*${details.join(' · ')}*`);
  if (r.sourceUrl) out.push(`From [${r.sourceName && r.sourceName !== 'sample card' ? r.sourceName : r.sourceUrl}](${r.sourceUrl})`);
  if (r.review) out.push(r.review.split('\n').map((l) => `> ${l}`).join('\n'));
  out.push('## Ingredients', r.ingredients.length ? r.ingredients.map((i) => `- ${abbreviateUnits(i)}`).join('\n') : '_none written down yet_');
  out.push('## Directions', r.steps.length ? r.steps.map((s, n) => `${n + 1}. ${stepText(s)}`).join('\n') : '_none written down yet_');
  return out.join('\n\n') + '\n';
}

/** Every recipe in the box as one my-recipes-YYYY-MM-DD.md, a rule between cards. */
export function exportAllMarkdown(recipes: Recipe[]) {
  download(`my-recipes-${today()}.md`, recipes.map(recipeToMarkdown).join('\n---\n\n'), 'text/markdown');
}

/** One recipe, as its-name.md. */
export function exportOneMarkdown(recipe: Recipe) {
  download(`${slug(recipe.title)}.md`, recipeToMarkdown(recipe), 'text/markdown');
}
