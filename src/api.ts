import type { Draft } from './types';
import type { Store } from './store/types';
import { localStore } from './store/localStore';

/** The one place that still needs a server: reading a recipe page from another site. */
async function importLink(url: string): Promise<{ found: boolean; draft: Draft }> {
  let res: Response;
  try {
    res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url }),
    });
  } catch {
    throw new Error('Couldn’t reach the recipe reader. Check your connection, or write the card by hand.');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Something went wrong (${res.status}).`);
  return body;
}

/** Cards and settings live in this browser for now; a signed-in store slots in here later. */
const store: Store = localStore;

export const api = { ...store, importLink };
