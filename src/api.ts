import type { Draft, Recipe, Settings } from './types';

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { 'content-type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new Error('The rolodex server isn’t answering. Is `npm run dev` still running?');
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Something went wrong (${res.status}).`);
  return body as T;
}

export const api = {
  list: () => call<Recipe[]>('/api/recipes'),
  create: (draft: Draft) => call<Recipe>('/api/recipes', { method: 'POST', body: JSON.stringify(draft) }),
  update: (id: string, patch: Draft) =>
    call<Recipe>(`/api/recipes/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  remove: (id: string) => call<void>(`/api/recipes/${id}`, { method: 'DELETE' }),
  settings: () => call<Settings>('/api/settings'),
  saveSettings: (patch: Partial<Settings>) =>
    call<Settings>('/api/settings', { method: 'PUT', body: JSON.stringify(patch) }),
  importLink: (url: string) =>
    call<{ found: boolean; draft: Draft }>('/api/import', { method: 'POST', body: JSON.stringify({ url }) }),
};
