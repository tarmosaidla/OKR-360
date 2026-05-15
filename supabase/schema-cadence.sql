-- ============================================================
-- Cadence schema extensions — run AFTER schema.sql
-- ============================================================

-- Extend profiles with role
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text;

-- Extend key_results with per-KR owner and confidence
ALTER TABLE public.key_results ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.key_results ADD COLUMN IF NOT EXISTS confidence integer CHECK (confidence BETWEEN 1 AND 10);

-- Weekly confidence logs per objective (1-10 scale, logged by owner each Monday)
CREATE TABLE IF NOT EXISTS public.confidence_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id  uuid NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
  author_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_num      integer NOT NULL,
  year          integer NOT NULL,
  score         integer NOT NULL CHECK (score BETWEEN 1 AND 10),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (objective_id, week_num, year)
);

-- KPIs — recurring metrics tied to roles
CREATE TABLE IF NOT EXISTS public.kpis (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  owner_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  role_name     text,
  unit          text DEFAULT '',
  direction     text NOT NULL DEFAULT 'up' CHECK (direction IN ('up', 'down')),
  plan          numeric,
  plan_to_date  numeric,
  actual        numeric,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Annual initiatives — bigger bets not weekly tracked
CREATE TABLE IF NOT EXISTS public.initiatives (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  owner_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'On track',
  progress      numeric NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 1),
  due_label     text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Tasks — weekly todos tied to objectives
CREATE TABLE IF NOT EXISTS public.tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  owner_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  objective_id    uuid REFERENCES public.objectives(id) ON DELETE SET NULL,
  objective_label text,
  due_label       text,
  done            boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 1:1 meetings
CREATE TABLE IF NOT EXISTS public.one_on_ones (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  meeting_date  date,
  happiness     integer CHECK (happiness BETWEEN 1 AND 10),
  summary       text,
  done          boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.confidence_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpis            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initiatives     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.one_on_ones     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "confidence_logs: read all"
  ON public.confidence_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "confidence_logs: insert own"
  ON public.confidence_logs FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "confidence_logs: update own"
  ON public.confidence_logs FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "kpis: read all"
  ON public.kpis FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "kpis: write own"
  ON public.kpis FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "initiatives: read all"
  ON public.initiatives FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "initiatives: write own"
  ON public.initiatives FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "tasks: read all"
  ON public.tasks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "tasks: write own"
  ON public.tasks FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "one_on_ones: read participants"
  ON public.one_on_ones FOR SELECT
  USING (auth.uid() = manager_id OR auth.uid() = report_id);
CREATE POLICY "one_on_ones: write manager"
  ON public.one_on_ones FOR ALL USING (auth.uid() = manager_id);
