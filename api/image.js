// Vercel function: GET /api/image?url=… — passes a recipe photo through for shared pictures.
import { handleImage } from './_lib/handlers.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET.' });
  const { status, headers, bytes, json } = await handleImage(req.query);
  if (json) return res.status(status).json(json);
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.status(status).send(bytes);
}
