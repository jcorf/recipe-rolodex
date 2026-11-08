# Setting up Google sign-in

The code for signing in is already in the app (`src/account/`). It stays hidden until the two
keys below are set. Doing this takes about 20 minutes and is free.

## 1. Supabase project
1. Make a project at https://supabase.com (the free tier is enough).
2. **SQL Editor** → paste `supabase/migrations/0001_accounts_and_sharing.sql` → Run.
3. **Project Settings → API**: copy the *Project URL* and the *anon public* key.
   Never copy the `service_role` key anywhere in this repo.

## 2. Google OAuth client
1. https://console.cloud.google.com → make (or pick) a project.
2. **APIs & Services → OAuth consent screen**: External, app name "Recipe Rolodex", your email.
   Scopes: just `email`, `profile`, `openid`. While it's in *Testing*, add friends as test users.
3. **Credentials → Create credentials → OAuth client ID → Web application**.
   - Authorised JavaScript origins: `https://recipe-rolodex-nu.vercel.app`, `http://localhost:5173`
   - Authorised redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. Copy the Client ID and Client secret.

## 3. Connect them
1. Supabase → **Authentication → Providers → Google**: turn on, paste the ID and secret.
2. Supabase → **Authentication → URL Configuration**:
   - Site URL: `https://recipe-rolodex-nu.vercel.app`
   - Redirect URLs: `https://recipe-rolodex-nu.vercel.app/**`, `http://localhost:5173/**`
     (add `https://*-jcorf.vercel.app/**` if you want preview deploys to sign in too).

## 4. Give the app the keys
- Local: copy `.env.example` to `.env.local` and fill in both lines, then `npm run dev`.
- Vercel: **Settings → Environment Variables** → add `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY` → redeploy.

Open the jam jar: a **your account** section with "sign in with Google" now shows.

## Checking the sharing rules
Sign in with two Google accounts (one in a private window). Insert a row into `shares` from the
first with the second's email, and the second can read those cards but not change them.

## What's not built yet
- `cloudStore`: saving cards to the `recipes` table when signed in (today they stay on the device).
- "Move my cards to my account" on first sign-in.
- A share screen (pick a friend's email, list what you've shared) and a "shared with me" box.
