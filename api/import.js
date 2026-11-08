// Vercel function: POST /api/import — reads a recipe page someone pasted.
import { handleImport } from './_lib/handlers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  const { status, json } = await handleImport(req.body);
  res.status(status).json(json);
}
