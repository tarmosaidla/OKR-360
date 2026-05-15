-- ============================================================
-- OKR App — Supabase Schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. TEAMS (created before profiles so profiles can reference it)
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  created_at  timestamptz not null default now()
);

-- 2. PROFILES (extends auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  avatar_url  text,
  team_id     uuid references public.teams(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- 3. CYCLES
create table if not exists public.cycles (
  id          uuid primary key default gen_random_uuid(),
  year        integer not null,
  quarter     integer not null check (quarter between 1 and 4),
  label       text not null,   -- e.g. "Q2 2026"
  start_date  date not null,
  end_date    date not null,
  created_at  timestamptz not null default now(),
  unique (year, quarter)
);

-- 4. OBJECTIVES
do $$ begin
  create type public.objective_status as enum ('on_track', 'at_risk', 'behind', 'completed');
exception when duplicate_object then null;
end $$;

create table if not exists public.objectives (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  team_id     uuid references public.teams(id) on delete set null,
  cycle_id    uuid not null references public.cycles(id) on delete cascade,
  status      public.objective_status not null default 'on_track',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 5. KEY RESULTS
do $$ begin
  create type public.kr_target_type as enum ('numeric', 'percentage', 'boolean');
exception when duplicate_object then null;
end $$;

create table if not exists public.key_results (
  id            uuid primary key default gen_random_uuid(),
  objective_id  uuid not null references public.objectives(id) on delete cascade,
  title         text not null,
  target_type   public.kr_target_type not null default 'numeric',
  current_value numeric not null default 0,
  target_value  numeric not null default 100,
  unit          text,   -- display label: "$", "users", etc.
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 6. CHECK-INS
create table if not exists public.checkins (
  id               uuid primary key default gen_random_uuid(),
  key_result_id    uuid not null references public.key_results(id) on delete cascade,
  author_id        uuid not null references public.profiles(id) on delete cascade,
  value_at_checkin numeric not null,
  notes            text,
  created_at       timestamptz not null default now()
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at timestamps
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists objectives_updated_at on public.objectives;
create trigger objectives_updated_at
  before update on public.objectives
  for each row execute procedure public.set_updated_at();

drop trigger if exists key_results_updated_at on public.key_results;
create trigger key_results_updated_at
  before update on public.key_results
  for each row execute procedure public.set_updated_at();

-- Sync key_result.current_value when a check-in is inserted
create or replace function public.sync_kr_value_on_checkin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.key_results
  set current_value = new.value_at_checkin,
      updated_at    = now()
  where id = new.key_result_id;
  return new;
end;
$$;

drop trigger if exists checkin_syncs_kr_value on public.checkins;
create trigger checkin_syncs_kr_value
  after insert on public.checkins
  for each row execute procedure public.sync_kr_value_on_checkin();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles    enable row level security;
alter table public.teams       enable row level security;
alter table public.cycles      enable row level security;
alter table public.objectives  enable row level security;
alter table public.key_results enable row level security;
alter table public.checkins    enable row level security;

-- profiles
create policy "profiles: authenticated can read all"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "profiles: users can update own"
  on public.profiles for update
  using (auth.uid() = id);

-- teams
create policy "teams: authenticated can read all"
  on public.teams for select
  using (auth.role() = 'authenticated');

-- cycles
create policy "cycles: authenticated can read all"
  on public.cycles for select
  using (auth.role() = 'authenticated');

-- objectives
create policy "objectives: authenticated can read all"
  on public.objectives for select
  using (auth.role() = 'authenticated');

create policy "objectives: owner can insert"
  on public.objectives for insert
  with check (auth.uid() = owner_id);

create policy "objectives: owner can update"
  on public.objectives for update
  using (auth.uid() = owner_id);

create policy "objectives: owner can delete"
  on public.objectives for delete
  using (auth.uid() = owner_id);

-- key_results
create policy "key_results: authenticated can read all"
  on public.key_results for select
  using (auth.role() = 'authenticated');

create policy "key_results: objective owner can insert"
  on public.key_results for insert
  with check (
    exists (
      select 1 from public.objectives o
      where o.id = key_results.objective_id
        and o.owner_id = auth.uid()
    )
  );

create policy "key_results: objective owner can update"
  on public.key_results for update
  using (
    exists (
      select 1 from public.objectives o
      where o.id = key_results.objective_id
        and o.owner_id = auth.uid()
    )
  );

create policy "key_results: objective owner can delete"
  on public.key_results for delete
  using (
    exists (
      select 1 from public.objectives o
      where o.id = key_results.objective_id
        and o.owner_id = auth.uid()
    )
  );

-- checkins
create policy "checkins: authenticated can read all"
  on public.checkins for select
  using (auth.role() = 'authenticated');

create policy "checkins: author can insert"
  on public.checkins for insert
  with check (auth.uid() = author_id);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Teams
insert into public.teams (name, description) values
  ('Engineering',  'Product and platform engineering'),
  ('Marketing',    'Growth and brand marketing'),
  ('Sales',        'Revenue and partnerships'),
  ('Product',      'Product strategy and design')
on conflict (name) do nothing;

-- Cycles — 2025 + 2026
insert into public.cycles (year, quarter, label, start_date, end_date) values
  (2025, 1, 'Q1 2025', '2025-01-01', '2025-03-31'),
  (2025, 2, 'Q2 2025', '2025-04-01', '2025-06-30'),
  (2025, 3, 'Q3 2025', '2025-07-01', '2025-09-30'),
  (2025, 4, 'Q4 2025', '2025-10-01', '2025-12-31'),
  (2026, 1, 'Q1 2026', '2026-01-01', '2026-03-31'),
  (2026, 2, 'Q2 2026', '2026-04-01', '2026-06-30'),
  (2026, 3, 'Q3 2026', '2026-07-01', '2026-09-30'),
  (2026, 4, 'Q4 2026', '2026-10-01', '2026-12-31')
on conflict (year, quarter) do nothing;
