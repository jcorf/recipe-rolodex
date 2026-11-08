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
