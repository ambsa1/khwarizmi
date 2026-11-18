-- Khawarizmi cloud (Supabase). Paste the whole file into: Supabase dashboard > SQL Editor > New query > Run.
-- Visitors' browsers (the public "anon" key) can only ADD rows; only the signed-in developer account can READ them.
-- No child names are ever stored: the family children appear only by their id (m1..m4).

create table if not exists public.errors (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  device text, version text, place text, message text, ua text
);
-- progress is append-only: every change is a new row; the developer panel shows the latest row of each child
create table if not exists public.progress (
  id bigint generated always as identity primary key,
  member text not null check (member in ('m1', 'm2', 'm3', 'm4')),
  device text,
  updated_at timestamptz not null default now(),
  summary jsonb not null
);
create index if not exists progress_member_time on public.progress (member, updated_at desc);

alter table public.errors enable row level security;
alter table public.progress enable row level security;

-- the app (any browser) may only ADD error reports and progress rows of the four children - never read or change them
drop policy if exists "app adds errors" on public.errors;
create policy "app adds errors" on public.errors for insert to anon, authenticated
  with check (length(coalesce(message, '')) <= 600 and length(coalesce(ua, '')) <= 300);
drop policy if exists "app adds progress" on public.progress;
create policy "app adds progress" on public.progress for insert to anon, authenticated
  with check (member in ('m1', 'm2', 'm3', 'm4') and length(summary::text) <= 8000);

-- only the developer account reads (sign-ups are switched off, so it is the only account)
drop policy if exists "developer reads errors" on public.errors;
create policy "developer reads errors" on public.errors for select to authenticated using (true);
drop policy if exists "developer reads progress" on public.progress;
create policy "developer reads progress" on public.progress for select to authenticated using (true);
