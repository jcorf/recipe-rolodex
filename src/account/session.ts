import type { SupabaseClient, Session } from '@supabase/supabase-js';
import { accountsReady, SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

/** Who is signed in, in the few words the page needs. */
export interface Account {
  id: string;
  email: string;
  name: string;
  avatar: string;
}

let client: Promise<SupabaseClient> | null = null;

/**
 * The Supabase client, loaded only when first needed so the local-only app stays small.
 * Rejects when accounts aren't set up.
 */
export function supabase(): Promise<SupabaseClient> {
  if (!accountsReady) return Promise.reject(new Error('Sign-in isn’t set up yet.'));
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    }),
  );
  return client;
}

function toAccount(session: Session | null): Account | null {
  const user = session?.user;
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? '',
    name: String(meta.full_name ?? meta.name ?? user.email ?? ''),
    avatar: String(meta.avatar_url ?? meta.picture ?? ''),
  };
}

/** Sends the page to Google's sign-in, which comes back here signed in. */
export async function signInWithGoogle(): Promise<void> {
  const sb = await supabase();
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${location.origin}${location.pathname}`, queryParams: { prompt: 'select_account' } },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const sb = await supabase();
  const { error } = await sb.auth.signOut();
  if (error) throw error;
}

/**
 * Calls back with the signed-in account (or null) now and on every change; returns a stop
 * function. Does nothing when accounts aren't set up.
 */
export function watchAccount(onChange: (account: Account | null) => void): () => void {
  if (!accountsReady) return () => {};
  let stop = () => {};
  let stopped = false;
  supabase().then((sb) => {
    if (stopped) return;
    const { data } = sb.auth.onAuthStateChange((_event, session) => onChange(toAccount(session)));
    stop = () => data.subscription.unsubscribe();
  }).catch(() => onChange(null));
  return () => { stopped = true; stop(); };
}
