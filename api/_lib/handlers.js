// The two things the rolodex still asks a server for, written once and used both by the Vercel
// functions (api/import.js, api/image.js) and by `npm run dev` (vite.config.ts).
import { importRecipe } from './importer.js';
import { safeFetch } from './safeFetch.js';

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

/** POST /api/import { url } → { found, draft } from the page's recipe data. */
export async function handleImport(body) {
  try {
    return { status: 200, json: await importRecipe(String(body?.url ?? '').trim()) };
  } catch (err) {
    return { status: 422, json: { error: err.message } };
  }
}

/**
 * GET /api/image?url=… passes a recipe photo through from its own site, so the page can draw it
 * onto a canvas for a shared picture (a canvas can't be saved once it holds a picture from another site).
 */
export async function handleImage(query) {
  try {
    const raw = String(query?.url ?? '');
    if (!/^https?:\/\//i.test(raw)) throw new Error('not a web link');
    const { res, bytes } = await safeFetch(raw, { headers: { accept: 'image/*' }, maxBytes: MAX_PHOTO_BYTES });
    const type = res.headers.get('content-type') ?? '';
    // only real pictures pass (no SVG: it can carry script)
    if (!res.ok || !/^image\/(jpeg|png|webp|gif|avif)\b/.test(type)) throw new Error('not a photo');
    return {
      status: 200,
      headers: {
        'content-type': type,
        'cache-control': 'public, max-age=86400',
        'x-content-type-options': 'nosniff',
        'content-security-policy': "default-src 'none'",
      },
      bytes,
    };
  } catch (err) {
    return { status: 422, json: { error: `Couldn’t load that photo (${err.message}).` } };
  }
}
