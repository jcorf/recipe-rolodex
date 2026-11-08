import type { Recipe } from './types';

function download(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
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
