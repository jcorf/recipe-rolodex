// Pulls recipe details out of a page's schema.org JSON-LD, which most recipe
// sites (NYT Cooking, Bon Appétit, Serious Eats, blogs on WP Recipe Maker…) embed.
// Falls back to Open Graph title/image so the card can still be finished by hand.

// Identify honestly. Sites that refuse automated requests get the
// "fill it in by hand" fallback rather than a workaround.
const UA = 'RecipeRolodex/0.1 (personal, self-hosted recipe importer)';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', frac12: '½', frac14: '¼', frac34: '¾', deg: '°' };

function decode(text) {
  return String(text ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z0-9]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

function findRecipe(node) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipe(item);
      if (found) return found;
    }
    return null;
  }
  const types = [].concat(node['@type'] ?? []);
  if (types.includes('Recipe')) return node;
  return findRecipe(node['@graph']) ?? findRecipe(node.mainEntity) ?? null;
}

function flattenSteps(value) {
  if (!value) return [];
  if (typeof value === 'string') return value.split(/\n+/).map(decode).filter(Boolean);
  if (Array.isArray(value)) return value.flatMap(flattenSteps);
  if (value.itemListElement) return flattenSteps(value.itemListElement);
  if (value.text) return [decode(value.text)];
  if (value.name) return [decode(value.name)];
  return [];
}

function pickImage(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return pickImage(value[0]);
  return value.url ?? value.contentUrl ?? '';
}

function duration(iso) {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i.exec(String(iso ?? ''));
  if (!m) return '';
  const hours = Number(m[1] ?? 0) * 24 + Number(m[2] ?? 0);
  const mins = Number(m[3] ?? 0);
  return [hours && `${hours} hr`, mins && `${mins} min`].filter(Boolean).join(' ');
}

function listText(value) {
  if (Array.isArray(value)) return decode(value[0] ?? '');
  return decode(value ?? '');
}

const CATEGORY_WORDS = [
  ['breakfast', /breakfast|brunch|pancake|waffle|oatmeal|granola/],
  ['drinks', /drink|beverage|cocktail|smoothie|juice|coffee|tea\b|lemonade|mocktail/],
  ['dessert', /dessert|cookie|cake|pie\b|tart|brownie|pudding|ice cream|sweet|pastry|galette/],
  ['small-plates', /appetizer|starter|snack|side|small plate|tapas|dip\b|hors/],
  ['lunch', /lunch|sandwich|salad/],
  ['dinner', /dinner|main|entr[eé]e|supper/],
];

/** Best guess from the page's recipeCategory/keywords; empty when nothing matches. */
function guessCategory(recipe) {
  const text = [recipe.recipeCategory, recipe.keywords, recipe.name]
    .flat()
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return CATEGORY_WORDS.find(([, re]) => re.test(text))?.[0] ?? '';
}

function meta(html, prop) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, 'i');
  const tag = re.exec(html)?.[0];
  return tag ? decode(/content=["']([^"']*)["']/i.exec(tag)?.[1] ?? '') : '';
}

export async function importRecipe(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
    if (!/^https?:$/.test(url.protocol)) throw new Error();
  } catch {
    throw new Error('That doesn’t look like a web link. Paste the full address, starting with https://');
  }

  let html;
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
    });
    if (res.status === 401 || res.status === 403) throw new Error('this site doesn’t allow apps to read its pages');
    if (!res.ok) throw new Error(`the site answered ${res.status}`);
    html = await res.text();
  } catch (err) {
    throw new Error(`Couldn’t open that page (${err.message}). Check the link, or write the card by hand.`);
  }

  const sourceName = url.hostname.replace(/^www\./, '');
  let recipe = null;
  for (const match of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      recipe = findRecipe(JSON.parse(match[1].trim()));
    } catch {
      /* malformed block; keep looking */
    }
    if (recipe) break;
  }

  if (!recipe) {
    return {
      found: false,
      draft: {
        title: meta(html, 'og:title') || decode(/<title>([^<]*)<\/title>/i.exec(html)?.[1] ?? ''),
        image: meta(html, 'og:image'),
        description: meta(html, 'og:description'),
        sourceUrl: url.href,
        sourceName,
        ingredients: [],
        steps: [],
      },
    };
  }

  return {
    found: true,
    draft: {
      title: decode(recipe.name),
      category: guessCategory(recipe),
      description: decode(recipe.description),
      image: pickImage(recipe.image) || meta(html, 'og:image'),
      cuisine: listText(recipe.recipeCuisine).toLowerCase(),
      servings: listText(recipe.recipeYield),
      totalTime: duration(recipe.totalTime || recipe.cookTime),
      ingredients: [].concat(recipe.recipeIngredient ?? recipe.ingredients ?? []).map(decode).filter(Boolean),
      steps: flattenSteps(recipe.recipeInstructions),
      sourceUrl: url.href,
      sourceName,
    },
  };
}
