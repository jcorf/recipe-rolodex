/**
 * Google sign-in runs through Supabase (see docs/google-sign-in.md). Until both keys are set
 * (in .env.local for `npm run dev`, or in Vercel's environment variables), the app stays
 * local-only and no sign-in button is shown.
 *
 * The anon key is public by design: what a signed-in person can read or write is decided by
 * Row Level Security in supabase/migrations, never by this key. The service_role key must never
 * be put in a VITE_ variable (those are shipped to the browser).
 */
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

/** True once the project's keys are in place. */
export const accountsReady = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
