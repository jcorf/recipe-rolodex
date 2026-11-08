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

/** The picture type from a file's first bytes, or '' when it isn't a JPEG, PNG, WebP, GIF or AVIF. */
function sniffImage(b) {
  if (b.length < 12) return '';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b.toString('latin1', 1, 4) === 'PNG') return 'image/png';
  if (b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  if (b.toString('latin1', 0, 4) === 'GIF8') return 'image/gif';
  if (b.toString('latin1', 4, 8) === 'ftyp' && /^avi[fs]/.test(b.toString('latin1', 8, 12))) return 'image/avif';
  return '';
}

/**
 * GET /api/image?url=… passes a recipe photo through from its own site, so the page can draw it
 * onto a canvas for a shared picture (a canvas can't be saved once it holds a picture from another site).
 */
export async function handleImage(query) {
  try {
    const raw = String(query?.url ?? '');
    if (!/^https?:\/\//i.test(raw)) throw new Error('not a web link');
    const { res, bytes } = await safeFetch(raw, { headers: { accept: 'image/avif,image/webp,image/*;q=0.9,*/*;q=0.5' }, maxBytes: MAX_PHOTO_BYTES });
    if (!res.ok) throw new Error(`its site answered ${res.status}`);
    // only real pictures pass (no SVG: it can carry script). Some hosts label photos loosely
    // ("image/jpg", "application/octet-stream"), so the bytes themselves decide what it is.
    const type = sniffImage(bytes);
    if (!type) throw new Error('not a photo');
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
