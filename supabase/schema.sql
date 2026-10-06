create table if not exists public.leaderboard (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null,
  name text not null,
  score integer not null,
  accuracy numeric not null,
  correct integer not null,
  total integer not null,
  mode text,
  created_at timestamptz not null default now()
);

create index if not exists leaderboard_score_idx
  on public.leaderboard (score desc);

alter table public.leaderboard enable row level security;

drop policy if exists "public read leaderboard" on public.leaderboard;
create policy "public read leaderboard"
  on public.leaderboard for select
  using (true);

drop policy if exists "public insert leaderboard" on public.leaderboard;
create policy "public insert leaderboard"
  on public.leaderboard for insert
  with check (true);
