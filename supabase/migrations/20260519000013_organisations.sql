-- ── Bootstrap: organisations table + org_id on every table ───────────────────
-- Run this FIRST in a fresh database, before migrations 013 and 014.
-- All statements are idempotent (IF NOT EXISTS / ON CONFLICT guards).

-- ── 1. organisations (no FK to profiles yet — circular dep) ──────────────────

CREATE TABLE IF NOT EXISTS public.organisations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  slug             text UNIQUE NOT NULL,
  industry         text,
  size             text,
  plan             text NOT NULL DEFAULT 'trial',
  trial_ends_at    timestamptz DEFAULT now() + interval '14 days',
  has_sample_data  boolean NOT NULL DEFAULT false,
  logo_url         text,
  primary_color    text NOT NULL DEFAULT '#5D5BE6',
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid  -- FK to profiles added in step 3 after profiles.org_id exists
);

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

-- ── 2. Add org_id + is_global_admin to profiles FIRST ────────────────────────
-- Must happen before my_org_id() is created, because the function body
-- references profiles.org_id.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE SET NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_global_admin boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON public.profiles(org_id);

-- ── 3. Helper functions (profiles.org_id now exists) ─────────────────────────

CREATE OR REPLACE FUNCTION public.my_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
$$;
GRANT EXECUTE ON FUNCTION public.my_org_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_global_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT is_global_admin FROM public.profiles WHERE id = auth.uid()),
    false
  )
$$;
GRANT EXECUTE ON FUNCTION public.is_global_admin() TO authenticated;

-- ── 4. Now safe to add FK back from organisations → profiles ─────────────────

DO $$ BEGIN
  ALTER TABLE public.organisations
    ADD CONSTRAINT organisations_created_by_fk
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── 5. organisations RLS (my_org_id() now exists) ────────────────────────────

DO $$ BEGIN
  CREATE POLICY "orgs_read_own" ON public.organisations
    FOR SELECT TO authenticated USING (id = public.my_org_id());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "orgs_insert_auth" ON public.organisations
    FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "orgs_update_admin" ON public.organisations
    FOR UPDATE TO authenticated
    USING (id = public.my_org_id() AND public.is_global_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── 6. profiles RLS ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_org" ON public.profiles;
DO $$ BEGIN
  CREATE POLICY "profiles_read_org" ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR org_id = public.my_org_id());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid()) WITH CHECK (id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── 7. Seed Northwind org + assign existing profiles ─────────────────────────

DO $$
DECLARE
  v_org_id   uuid;
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id FROM public.profiles ORDER BY created_at LIMIT 1;
  IF v_admin_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.organisations (name, slug, plan, trial_ends_at, created_by)
  VALUES ('Northwind', 'northwind', 'trial', now() + interval '365 days', v_admin_id)
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_org_id;

  IF v_org_id IS NULL THEN
    SELECT id INTO v_org_id FROM public.organisations WHERE slug = 'northwind';
  END IF;

  IF v_org_id IS NULL THEN RETURN; END IF;

  UPDATE public.profiles SET org_id = v_org_id WHERE org_id IS NULL;

  UPDATE public.profiles
    SET is_global_admin = true
    WHERE id = v_admin_id;
END $$;

-- ── 8. set_org_id() trigger function ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_org_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.org_id IS NULL THEN
    NEW.org_id := public.my_org_id();
  END IF;
  RETURN NEW;
END;
$$;

-- ── 9. Add org_id to all remaining tables ────────────────────────────────────

ALTER TABLE public.units        ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE;
ALTER TABLE public.levels       ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE;
ALTER TABLE public.objectives   ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE;
ALTER TABLE public.key_results  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE;
ALTER TABLE public.cycles       ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE;
ALTER TABLE public.checkins     ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE;
ALTER TABLE public.people_units ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE;

DO $$ BEGIN ALTER TABLE public.kpis            ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN null; END $$;
DO $$ BEGIN ALTER TABLE public.kpi_snapshots   ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN null; END $$;
DO $$ BEGIN ALTER TABLE public.initiatives     ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN null; END $$;
DO $$ BEGIN ALTER TABLE public.tasks           ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN null; END $$;
DO $$ BEGIN ALTER TABLE public.one_on_ones     ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN null; END $$;
DO $$ BEGIN ALTER TABLE public.confidence_logs ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN null; END $$;
DO $$ BEGIN ALTER TABLE public.checkin_streaks ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN null; END $$;
DO $$ BEGIN ALTER TABLE public.org_settings    ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN null; END $$;
DO $$ BEGIN ALTER TABLE public.org_levels      ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN null; END $$;

-- ── 10. Backfill org_id on all existing rows ──────────────────────────────────

DO $$
DECLARE v_org_id uuid;
BEGIN
  SELECT id INTO v_org_id FROM public.organisations WHERE slug = 'northwind';
  IF v_org_id IS NULL THEN RETURN; END IF;

  UPDATE public.units        SET org_id = v_org_id WHERE org_id IS NULL;
  UPDATE public.levels       SET org_id = v_org_id WHERE org_id IS NULL;
  UPDATE public.objectives   SET org_id = v_org_id WHERE org_id IS NULL;
  UPDATE public.key_results  SET org_id = v_org_id WHERE org_id IS NULL;
  UPDATE public.cycles       SET org_id = v_org_id WHERE org_id IS NULL;
  UPDATE public.checkins     SET org_id = v_org_id WHERE org_id IS NULL;
  UPDATE public.people_units SET org_id = v_org_id WHERE org_id IS NULL;
  UPDATE public.notifications SET org_id = v_org_id WHERE org_id IS NULL;

  BEGIN UPDATE public.kpis            SET org_id = v_org_id WHERE org_id IS NULL; EXCEPTION WHEN undefined_table THEN null; END;
  BEGIN UPDATE public.kpi_snapshots   SET org_id = v_org_id WHERE org_id IS NULL; EXCEPTION WHEN undefined_table THEN null; END;
  BEGIN UPDATE public.initiatives     SET org_id = v_org_id WHERE org_id IS NULL; EXCEPTION WHEN undefined_table THEN null; END;
  BEGIN UPDATE public.tasks           SET org_id = v_org_id WHERE org_id IS NULL; EXCEPTION WHEN undefined_table THEN null; END;
  BEGIN UPDATE public.one_on_ones     SET org_id = v_org_id WHERE org_id IS NULL; EXCEPTION WHEN undefined_table THEN null; END;
  BEGIN UPDATE public.confidence_logs SET org_id = v_org_id WHERE org_id IS NULL; EXCEPTION WHEN undefined_table THEN null; END;
  BEGIN UPDATE public.checkin_streaks SET org_id = v_org_id WHERE org_id IS NULL; EXCEPTION WHEN undefined_table THEN null; END;
  BEGIN UPDATE public.org_settings    SET org_id = v_org_id WHERE org_id IS NULL; EXCEPTION WHEN undefined_table THEN null; END;
  BEGIN UPDATE public.org_levels      SET org_id = v_org_id WHERE org_id IS NULL; EXCEPTION WHEN undefined_table THEN null; END;
END $$;

-- ── 11. Triggers for new rows ─────────────────────────────────────────────────

DROP TRIGGER IF EXISTS set_org_id_units         ON public.units;
DROP TRIGGER IF EXISTS set_org_id_levels        ON public.levels;
DROP TRIGGER IF EXISTS set_org_id_objectives    ON public.objectives;
DROP TRIGGER IF EXISTS set_org_id_key_results   ON public.key_results;
DROP TRIGGER IF EXISTS set_org_id_cycles        ON public.cycles;
DROP TRIGGER IF EXISTS set_org_id_checkins      ON public.checkins;
DROP TRIGGER IF EXISTS set_org_id_people_units  ON public.people_units;
DROP TRIGGER IF EXISTS set_org_id_notifications ON public.notifications;

CREATE TRIGGER set_org_id_units         BEFORE INSERT ON public.units        FOR EACH ROW EXECUTE FUNCTION public.set_org_id();
CREATE TRIGGER set_org_id_levels        BEFORE INSERT ON public.levels       FOR EACH ROW EXECUTE FUNCTION public.set_org_id();
CREATE TRIGGER set_org_id_objectives    BEFORE INSERT ON public.objectives   FOR EACH ROW EXECUTE FUNCTION public.set_org_id();
CREATE TRIGGER set_org_id_key_results   BEFORE INSERT ON public.key_results  FOR EACH ROW EXECUTE FUNCTION public.set_org_id();
CREATE TRIGGER set_org_id_cycles        BEFORE INSERT ON public.cycles       FOR EACH ROW EXECUTE FUNCTION public.set_org_id();
CREATE TRIGGER set_org_id_checkins      BEFORE INSERT ON public.checkins     FOR EACH ROW EXECUTE FUNCTION public.set_org_id();
CREATE TRIGGER set_org_id_people_units  BEFORE INSERT ON public.people_units FOR EACH ROW EXECUTE FUNCTION public.set_org_id();
CREATE TRIGGER set_org_id_notifications BEFORE INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.set_org_id();

DO $$ BEGIN
  DROP TRIGGER IF EXISTS set_org_id_kpis ON public.kpis;
  CREATE TRIGGER set_org_id_kpis BEFORE INSERT ON public.kpis FOR EACH ROW EXECUTE FUNCTION public.set_org_id();
EXCEPTION WHEN undefined_table THEN null; END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS set_org_id_checkin_streaks ON public.checkin_streaks;
  CREATE TRIGGER set_org_id_checkin_streaks BEFORE INSERT ON public.checkin_streaks FOR EACH ROW EXECUTE FUNCTION public.set_org_id();
EXCEPTION WHEN undefined_table THEN null; END $$;
