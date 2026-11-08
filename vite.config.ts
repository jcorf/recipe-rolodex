import { defineConfig, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile } from 'node:fs/promises';
import type { ServerResponse } from 'node:http';
// @ts-ignore plain JS shared with the Vercel functions in api/
import { handleImage, handleImport } from './api/_lib/handlers.js';

function send(res: ServerResponse, status: number, json: unknown) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(json));
}

async function readJson(req: Connect.IncomingMessage) {
  let text = '';
  for await (const chunk of req) {
    text += chunk;
    if (text.length > 64 * 1024) throw new Error('too large');
  }
  return text ? JSON.parse(text) : {};
}

/**
 * The same /api/import and /api/image the Vercel functions answer, for `npm run dev` and
 * `npm run preview`, so the recipe reader works locally with no separate server.
 */
function localApi(): Plugin {
  const middleware = (legacy: boolean): Connect.NextHandleFunction => async (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    try {
      if (url.pathname === '/api/import' && req.method === 'POST') {
        const { status, json } = await handleImport(await readJson(req));
        return send(res, status, json);
      }
      if (url.pathname === '/api/image' && req.method === 'GET') {
        const out = await handleImage(Object.fromEntries(url.searchParams));
        if (out.json) return send(res, out.status, out.json);
        res.statusCode = out.status;
        for (const [k, v] of Object.entries(out.headers as Record<string, string>)) res.setHeader(k, v);
        return res.end(out.bytes);
      }
      // Development only: the cards that used to live in data/ (behind the old server), read once by
      // the browser the first time it opens so nothing is left behind. Read-only; delete data/ when done.
      if (legacy && req.method === 'GET' && (url.pathname === '/api/recipes' || url.pathname === '/api/settings')) {
        const file = url.pathname === '/api/recipes' ? 'data/recipes.json' : 'data/settings.json';
        try {
          return send(res, 200, JSON.parse(await readFile(file, 'utf8')));
        } catch {
          return send(res, 404, { error: 'no old cards' });
        }
      }
    } catch (err) {
      return send(res, 400, { error: (err as Error).message });
    }
    next();
  };
  return {
    name: 'rolodex-local-api',
    configureServer: (server) => { server.middlewares.use(middleware(true)); },
    configurePreviewServer: (server) => { server.middlewares.use(middleware(false)); },
  };
}

export default defineConfig({
  plugins: [react(), localApi()],
  server: { port: 5173 },
});
