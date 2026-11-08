-- Accounts, cards and sharing for the recipe rolodex.
-- Run once in the Supabase dashboard (SQL Editor) or with `supabase db push`.
-- Every table has Row Level Security on, so the public anon key in the browser can only ever
-- reach rows the signed-in person owns, or rows someone has shared with them.

-- ── cards ───────────────────────────────────────────────────────────────────────────────
-- One row per card. `data` holds the Recipe object as the app already writes it (src/types.ts),
-- so the schema doesn't have to change every time a field is added.
create table if not exists public.recipes (
  user_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
  id         text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.settings (
  user_id    uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ── sharing ─────────────────────────────────────────────────────────────────────────────
-- The owner shares one card (recipe_id set) or the whole box (recipe_id null) with a friend's
-- Google email. Friends can only read; only the owner edits. Deleting the row unshares.
create table if not exists public.shares (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
  recipe_id   text,
  shared_with text not null check (shared_with = lower(shared_with)),
  created_at  timestamptz not null default now(),
  unique nulls not distinct (owner_id, recipe_id, shared_with)
);
create index if not exists shares_shared_with on public.shares (shared_with);

alter table public.recipes  enable row level security;
alter table public.settings enable row level security;
alter table public.shares   enable row level security;

-- The signed-in person's email, lower-cased, from their login token.
create or replace function public.my_email() returns text
  language sql stable as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

-- Your own cards: everything.
create policy "own cards" on public.recipes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Cards shared with you: read only.
create policy "cards shared with me" on public.recipes
  for select using (
    exists (
      select 1 from public.shares s
      where s.owner_id = recipes.user_id
        and s.shared_with = public.my_email()
        and (s.recipe_id is null or s.recipe_id = recipes.id)
    )
  );

create policy "own settings" on public.settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- The owner manages their shares; the friend can see what was shared with them.
create policy "my shares" on public.shares
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "shared with me" on public.shares
  for select using (shared_with = public.my_email());

-- ── photos ──────────────────────────────────────────────────────────────────────────────
-- A private bucket; each person's photos sit under a folder named by their user id.
insert into storage.buckets (id, name, public) values ('photos', 'photos', false)
  on conflict (id) do nothing;

create policy "own photos" on storage.objects
  for all using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Friends can see the photos of an owner who shared anything with them.
create policy "photos shared with me" on storage.objects
  for select using (
    bucket_id = 'photos' and exists (
      select 1 from public.shares s
      where s.owner_id::text = (storage.foldername(name))[1]
        and s.shared_with = public.my_email()
    )
  );
