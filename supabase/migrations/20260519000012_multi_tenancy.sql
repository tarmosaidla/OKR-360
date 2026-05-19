-- ── Multi-tenancy: organisations table + org_id on every table ───────────────
-- Idempotent. Run once after 010 + 011 migrations.

-- ── 1. organisations ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.organisations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text UNIQUE NOT NULL,
  industry      text,
  size          text,
  plan          text NOT NULL DEFAULT 'trial',
  trial_ends_at timestamptz NOT NULL DEFAULT now() + interval '14 days',
  created_by    uuid,            -- FK added after profiles.org_id exists
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

-- ── 2. my_org_id() helper ─────────────────────────────────────────────────────
-- Must exist before we create policies that reference it.

CREATE OR REPLACE FUNCTION public.my_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
$$;
GRANT EXECUTE ON FUNCTION public.my_org_id() TO authenticated;

-- ── 3. organisations RLS (now my_org_id exists) ───────────────────────────────

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

-- ── 4. Add org_id to profiles ─────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON public.profiles(org_id);

-- Allow FK back from organisations to profiles
DO $$ BEGIN
  ALTER TABLE public.organisations
    ADD CONSTRAINT organisations_created_by_fk
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Profiles SELECT: own row always visible + same-org rows visible
DROP POLICY IF EXISTS "profiles_read_all"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_org"  ON public.profiles;
DO $$ BEGIN
  CREATE POLICY "profiles_read_org" ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR org_id = public.my_org_id());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Allow updating own profile (needed for onboarding org_id assignment)
DO $$ BEGIN
  CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── 5. Auto-set org_id trigger ────────────────────────────────────────────────
-- Fires BEFORE INSERT on every org-scoped table.
-- If org_id not supplied, fills it from my_org_id() so existing service code
-- does not need to be updated.

CREATE OR REPLACE FUNCTION public.set_org_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.org_id IS NULL THEN
    NEW.org_id := public.my_org_id();
  END IF;
  RETURN NEW;
END;
$$;

-- ── 6. Add org_id + trigger to every table ────────────────────────────────────

-- levels
ALTER TABLE public.levels
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_levels_org_id ON public.levels(org_id);
DROP TRIGGER IF EXISTS set_org_id_levels ON public.levels;
CREATE TRIGGER set_org_id_levels BEFORE INSERT ON public.levels
  FOR EACH ROW EXECUTE FUNCTION public.set_org_id();

-- units
ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_units_org_id ON public.units(org_id);
DROP TRIGGER IF EXISTS set_org_id_units ON public.units;
CREATE TRIGGER set_org_id_units BEFORE INSERT ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.set_org_id();

-- org_settings
ALTER TABLE public.org_settings
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_org_settings_org_id ON public.org_settings(org_id);
DROP TRIGGER IF EXISTS set_org_id_org_settings ON public.org_settings;
CREATE TRIGGER set_org_id_org_settings BEFORE INSERT ON public.org_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_org_id();

-- org_levels
ALTER TABLE public.org_levels
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_org_levels_org_id ON public.org_levels(org_id);
DROP TRIGGER IF EXISTS set_org_id_org_levels ON public.org_levels;
CREATE TRIGGER set_org_id_org_levels BEFORE INSERT ON public.org_levels
  FOR EACH ROW EXECUTE FUNCTION public.set_org_id();

-- objectives
ALTER TABLE public.objectives
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_objectives_org_id ON public.objectives(org_id);
DROP TRIGGER IF EXISTS set_org_id_objectives ON public.objectives;
CREATE TRIGGER set_org_id_objectives BEFORE INSERT ON public.objectives
  FOR EACH ROW EXECUTE FUNCTION public.set_org_id();

-- key_results
ALTER TABLE public.key_results
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_key_results_org_id ON public.key_results(org_id);
DROP TRIGGER IF EXISTS set_org_id_key_results ON public.key_results;
CREATE TRIGGER set_org_id_key_results BEFORE INSERT ON public.key_results
  FOR EACH ROW EXECUTE FUNCTION public.set_org_id();

-- checkins
ALTER TABLE public.checkins
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_checkins_org_id ON public.checkins(org_id);
DROP TRIGGER IF EXISTS set_org_id_checkins ON public.checkins;
CREATE TRIGGER set_org_id_checkins BEFORE INSERT ON public.checkins
  FOR EACH ROW EXECUTE FUNCTION public.set_org_id();

-- cycles
ALTER TABLE public.cycles
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cycles_org_id ON public.cycles(org_id);
DROP TRIGGER IF EXISTS set_org_id_cycles ON public.cycles;
CREATE TRIGGER set_org_id_cycles BEFORE INSERT ON public.cycles
  FOR EACH ROW EXECUTE FUNCTION public.set_org_id();

-- people_units
ALTER TABLE public.people_units
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_people_units_org_id ON public.people_units(org_id);
DROP TRIGGER IF EXISTS set_org_id_people_units ON public.people_units;
CREATE TRIGGER set_org_id_people_units BEFORE INSERT ON public.people_units
  FOR EACH ROW EXECUTE FUNCTION public.set_org_id();

-- notifications
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_notifications_org_id ON public.notifications(org_id);
DROP TRIGGER IF EXISTS set_org_id_notifications ON public.notifications;
CREATE TRIGGER set_org_id_notifications BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_org_id();

-- notification_preferences
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_notif_pref_org_id ON public.notification_preferences(org_id);
DROP TRIGGER IF EXISTS set_org_id_notif_pref ON public.notification_preferences;
CREATE TRIGGER set_org_id_notif_pref BEFORE INSERT ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_org_id();

-- checkin_streaks
ALTER TABLE public.checkin_streaks
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_checkin_streaks_org_id ON public.checkin_streaks(org_id);
DROP TRIGGER IF EXISTS set_org_id_streaks ON public.checkin_streaks;
CREATE TRIGGER set_org_id_streaks BEFORE INSERT ON public.checkin_streaks
  FOR EACH ROW EXECUTE FUNCTION public.set_org_id();

-- kpis, initiatives, tasks (may not exist in some environments)
DO $$ BEGIN
  ALTER TABLE public.kpis ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE;
  CREATE INDEX IF NOT EXISTS idx_kpis_org_id ON public.kpis(org_id);
  DROP TRIGGER IF EXISTS set_org_id_kpis ON public.kpis;
  CREATE TRIGGER set_org_id_kpis BEFORE INSERT ON public.kpis FOR EACH ROW EXECUTE FUNCTION public.set_org_id();
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.initiatives ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE;
  CREATE INDEX IF NOT EXISTS idx_initiatives_org_id ON public.initiatives(org_id);
  DROP TRIGGER IF EXISTS set_org_id_initiatives ON public.initiatives;
  CREATE TRIGGER set_org_id_initiatives BEFORE INSERT ON public.initiatives FOR EACH ROW EXECUTE FUNCTION public.set_org_id();
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE;
  CREATE INDEX IF NOT EXISTS idx_tasks_org_id ON public.tasks(org_id);
  DROP TRIGGER IF EXISTS set_org_id_tasks ON public.tasks;
  CREATE TRIGGER set_org_id_tasks BEFORE INSERT ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_org_id();
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.one_on_ones ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE;
  CREATE INDEX IF NOT EXISTS idx_one_on_ones_org_id ON public.one_on_ones(org_id);
  DROP TRIGGER IF EXISTS set_org_id_one_on_ones ON public.one_on_ones;
  CREATE TRIGGER set_org_id_one_on_ones BEFORE INSERT ON public.one_on_ones FOR EACH ROW EXECUTE FUNCTION public.set_org_id();
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.confidence_logs ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE;
  DROP TRIGGER IF EXISTS set_org_id_confidence_logs ON public.confidence_logs;
  CREATE TRIGGER set_org_id_confidence_logs BEFORE INSERT ON public.confidence_logs FOR EACH ROW EXECUTE FUNCTION public.set_org_id();
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ── 7. Update RLS policies for all org-scoped tables ─────────────────────────

-- levels
DROP POLICY IF EXISTS "levels_read_all"  ON public.levels;
DROP POLICY IF EXISTS "levels_write_auth" ON public.levels;
DROP POLICY IF EXISTS "levels_read_org"  ON public.levels;
DROP POLICY IF EXISTS "levels_write_org" ON public.levels;
DO $$ BEGIN CREATE POLICY "levels_read_org"  ON public.levels FOR SELECT TO authenticated USING (org_id = public.my_org_id()); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "levels_write_org" ON public.levels FOR ALL    TO authenticated USING (org_id = public.my_org_id()) WITH CHECK (org_id = public.my_org_id()); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- units
DROP POLICY IF EXISTS "units_read_all"  ON public.units;
DROP POLICY IF EXISTS "units_write_auth" ON public.units;
DROP POLICY IF EXISTS "units_read_org"  ON public.units;
DROP POLICY IF EXISTS "units_write_org" ON public.units;
DO $$ BEGIN CREATE POLICY "units_read_org"  ON public.units FOR SELECT TO authenticated USING (org_id = public.my_org_id()); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "units_write_org" ON public.units FOR ALL    TO authenticated USING (org_id = public.my_org_id()) WITH CHECK (org_id = public.my_org_id()); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- org_settings
DROP POLICY IF EXISTS "org_settings_read_all"  ON public.org_settings;
DROP POLICY IF EXISTS "org_settings_write_auth" ON public.org_settings;
DROP POLICY IF EXISTS "org_settings_read_org"   ON public.org_settings;
DROP POLICY IF EXISTS "org_settings_write_org"  ON public.org_settings;
DO $$ BEGIN CREATE POLICY "org_settings_read_org"  ON public.org_settings FOR SELECT TO authenticated USING (org_id = public.my_org_id()); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "org_settings_write_org" ON public.org_settings FOR ALL    TO authenticated USING (org_id = public.my_org_id()) WITH CHECK (org_id = public.my_org_id()); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- org_levels
DROP POLICY IF EXISTS "org_levels_read_all" ON public.org_levels;
DROP POLICY IF EXISTS "org_levels_read_org" ON public.org_levels;
DROP POLICY IF EXISTS "org_levels_write_org" ON public.org_levels;
DO $$ BEGIN CREATE POLICY "org_levels_read_org"  ON public.org_levels FOR SELECT TO authenticated USING (org_id = public.my_org_id()); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "org_levels_write_org" ON public.org_levels FOR ALL    TO authenticated USING (org_id = public.my_org_id()) WITH CHECK (org_id = public.my_org_id()); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- objectives (preserve owner-based write scoping)
DROP POLICY IF EXISTS "objectives_select_all" ON public.objectives;
DROP POLICY IF EXISTS "objectives_insert_own" ON public.objectives;
DROP POLICY IF EXISTS "objectives_update_own" ON public.objectives;
DROP POLICY IF EXISTS "objectives_delete_own" ON public.objectives;
DROP POLICY IF EXISTS "objectives_read_org"   ON public.objectives;
DROP POLICY IF EXISTS "objectives_insert_org" ON public.objectives;
DROP POLICY IF EXISTS "objectives_update_org" ON public.objectives;
DROP POLICY IF EXISTS "objectives_delete_org" ON public.objectives;
DO $$ BEGIN CREATE POLICY "objectives_read_org"   ON public.objectives FOR SELECT TO authenticated USING (org_id = public.my_org_id()); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "objectives_insert_org" ON public.objectives FOR INSERT TO authenticated WITH CHECK (org_id = public.my_org_id()); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "objectives_update_org" ON public.objectives FOR UPDATE TO authenticated USING (org_id = public.my_org_id() AND (owner_id = auth.uid() OR public.is_global_admin())); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "objectives_delete_org" ON public.objectives FOR DELETE TO authenticated USING (org_id = public.my_org_id() AND (owner_id = auth.uid() OR public.is_global_admin())); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- key_results — drop all existing policies by name-scan, then recreate
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'key_results' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.key_results', r.policyname);
  END LOOP;
END $$;
DO $$ BEGIN CREATE POLICY "key_results_read_org"  ON public.key_results FOR SELECT TO authenticated USING (org_id = public.my_org_id()); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "key_results_write_org" ON public.key_results FOR ALL    TO authenticated USING (org_id = public.my_org_id()) WITH CHECK (org_id = public.my_org_id()); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- checkins
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'checkins' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.checkins', r.policyname);
  END LOOP;
END $$;
DO $$ BEGIN CREATE POLICY "checkins_read_org"  ON public.checkins FOR SELECT TO authenticated USING (org_id = public.my_org_id()); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "checkins_write_org" ON public.checkins FOR ALL    TO authenticated USING (org_id = public.my_org_id()) WITH CHECK (org_id = public.my_org_id()); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- cycles
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'cycles' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.cycles', r.policyname);
  END LOOP;
END $$;
DO $$ BEGIN CREATE POLICY "cycles_read_org"  ON public.cycles FOR SELECT TO authenticated USING (org_id = public.my_org_id()); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "cycles_write_org" ON public.cycles FOR ALL    TO authenticated USING (org_id = public.my_org_id()) WITH CHECK (org_id = public.my_org_id()); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- people_units — replace all complex policies with simple org-scoped ones
DROP POLICY IF EXISTS "people_units_read_all"    ON public.people_units;
DROP POLICY IF EXISTS "people_units_insert_own"  ON public.people_units;
DROP POLICY IF EXISTS "people_units_update_own"  ON public.people_units;
DROP POLICY IF EXISTS "people_units_delete_own"  ON public.people_units;
DROP POLICY IF EXISTS "people_units_insert_admin" ON public.people_units;
DROP POLICY IF EXISTS "people_units_update_admin" ON public.people_units;
DROP POLICY IF EXISTS "people_units_delete_admin" ON public.people_units;
DROP POLICY IF EXISTS "people_units_read_org"    ON public.people_units;
DROP POLICY IF EXISTS "people_units_write_org"   ON public.people_units;
DO $$ BEGIN CREATE POLICY "people_units_read_org"  ON public.people_units FOR SELECT TO authenticated USING (org_id = public.my_org_id()); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "people_units_write_org" ON public.people_units FOR ALL    TO authenticated USING (org_id = public.my_org_id() AND (person_id = auth.uid() OR public.is_global_admin() OR public.can_manage_unit(unit_id))) WITH CHECK (org_id = public.my_org_id()); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- notifications, preferences, streaks — keep personal scoping + org
DROP POLICY IF EXISTS "notif_read_own"   ON public.notifications;
DROP POLICY IF EXISTS "notif_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notif_insert_any" ON public.notifications;
DO $$ BEGIN CREATE POLICY "notif_read_own"    ON public.notifications FOR SELECT TO authenticated USING (person_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "notif_update_own"  ON public.notifications FOR UPDATE TO authenticated USING (person_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "notif_insert_org"  ON public.notifications FOR INSERT TO authenticated WITH CHECK (org_id = public.my_org_id()); EXCEPTION WHEN duplicate_object THEN null; END $$;

DROP POLICY IF EXISTS "notif_pref_own" ON public.notification_preferences;
DO $$ BEGIN CREATE POLICY "notif_pref_own" ON public.notification_preferences FOR ALL TO authenticated USING (person_id = auth.uid()) WITH CHECK (person_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN null; END $$;

DROP POLICY IF EXISTS "streaks_read_all" ON public.checkin_streaks;
DROP POLICY IF EXISTS "streaks_write_own" ON public.checkin_streaks;
DO $$ BEGIN CREATE POLICY "streaks_read_org"  ON public.checkin_streaks FOR SELECT TO authenticated USING (org_id = public.my_org_id()); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "streaks_write_own" ON public.checkin_streaks FOR ALL    TO authenticated USING (person_id = auth.uid()) WITH CHECK (person_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- kpis, initiatives, tasks, one_on_ones (best-effort)
DO $$ BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'kpis' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.kpis', r.policyname);
  END LOOP;
  EXECUTE 'CREATE POLICY "kpis_read_org"  ON public.kpis FOR SELECT TO authenticated USING (org_id = public.my_org_id())';
  EXECUTE 'CREATE POLICY "kpis_write_org" ON public.kpis FOR ALL    TO authenticated USING (org_id = public.my_org_id()) WITH CHECK (org_id = public.my_org_id())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN others THEN NULL; END $$;

DO $$ BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'initiatives' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.initiatives', r.policyname);
  END LOOP;
  EXECUTE 'CREATE POLICY "initiatives_read_org"  ON public.initiatives FOR SELECT TO authenticated USING (org_id = public.my_org_id())';
  EXECUTE 'CREATE POLICY "initiatives_write_org" ON public.initiatives FOR ALL    TO authenticated USING (org_id = public.my_org_id()) WITH CHECK (org_id = public.my_org_id())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN others THEN NULL; END $$;

DO $$ BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'tasks' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tasks', r.policyname);
  END LOOP;
  EXECUTE 'CREATE POLICY "tasks_read_org"  ON public.tasks FOR SELECT TO authenticated USING (org_id = public.my_org_id())';
  EXECUTE 'CREATE POLICY "tasks_write_org" ON public.tasks FOR ALL    TO authenticated USING (org_id = public.my_org_id()) WITH CHECK (org_id = public.my_org_id())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN others THEN NULL; END $$;

DO $$ BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'one_on_ones' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.one_on_ones', r.policyname);
  END LOOP;
  EXECUTE 'CREATE POLICY "one_on_ones_read_org"  ON public.one_on_ones FOR SELECT TO authenticated USING (org_id = public.my_org_id())';
  EXECUTE 'CREATE POLICY "one_on_ones_write_org" ON public.one_on_ones FOR ALL    TO authenticated USING (org_id = public.my_org_id()) WITH CHECK (org_id = public.my_org_id())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN others THEN NULL; END $$;

-- ── 8. Data backfill — create Northwind org for all existing rows ─────────────

DO $$
DECLARE
  v_org_id   uuid;
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id FROM public.profiles ORDER BY created_at LIMIT 1;
  IF v_admin_id IS NULL THEN RETURN; END IF;

  -- Insert Northwind org (skip if already exists)
  INSERT INTO public.organisations (name, slug, plan, trial_ends_at, created_by)
  VALUES ('Northwind Group', 'northwind', 'trial', now() + interval '365 days', v_admin_id)
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_org_id;

  IF v_org_id IS NULL THEN
    SELECT id INTO v_org_id FROM public.organisations WHERE slug = 'northwind';
  END IF;

  IF v_org_id IS NULL THEN RETURN; END IF;

  -- Update all tables
  UPDATE public.profiles                SET org_id = v_org_id WHERE org_id IS NULL;
  UPDATE public.levels                  SET org_id = v_org_id WHERE org_id IS NULL;
  UPDATE public.units                   SET org_id = v_org_id WHERE org_id IS NULL;
  UPDATE public.org_settings            SET org_id = v_org_id WHERE org_id IS NULL;
  UPDATE public.org_levels              SET org_id = v_org_id WHERE org_id IS NULL;
  UPDATE public.objectives              SET org_id = v_org_id WHERE org_id IS NULL;
  UPDATE public.key_results             SET org_id = v_org_id WHERE org_id IS NULL;
  UPDATE public.checkins                SET org_id = v_org_id WHERE org_id IS NULL;
  UPDATE public.cycles                  SET org_id = v_org_id WHERE org_id IS NULL;
  UPDATE public.people_units            SET org_id = v_org_id WHERE org_id IS NULL;
  UPDATE public.notifications           SET org_id = v_org_id WHERE org_id IS NULL;
  UPDATE public.notification_preferences SET org_id = v_org_id WHERE org_id IS NULL;
  UPDATE public.checkin_streaks         SET org_id = v_org_id WHERE org_id IS NULL;

  BEGIN UPDATE public.kpis        SET org_id = v_org_id WHERE org_id IS NULL; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN UPDATE public.initiatives  SET org_id = v_org_id WHERE org_id IS NULL; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN UPDATE public.tasks        SET org_id = v_org_id WHERE org_id IS NULL; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN UPDATE public.one_on_ones  SET org_id = v_org_id WHERE org_id IS NULL; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN UPDATE public.confidence_logs SET org_id = v_org_id WHERE org_id IS NULL; EXCEPTION WHEN undefined_table THEN NULL; END;
END $$;

-- ── 9. admin RPCs: pass org_id explicitly for service-role inserts ────────────

CREATE OR REPLACE FUNCTION public.admin_upsert_membership(
  p_target_id uuid, p_unit_id uuid, p_role text, p_primary boolean DEFAULT false
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.people_units (person_id, unit_id, role, is_primary, org_id)
  VALUES (p_target_id, p_unit_id, p_role, p_primary,
          (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  ON CONFLICT (person_id, unit_id)
  DO UPDATE SET role = EXCLUDED.role, is_primary = EXCLUDED.is_primary;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_upsert_membership(uuid, uuid, text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_remove_membership(
  p_target_id uuid, p_unit_id uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.people_units
  WHERE person_id = p_target_id AND unit_id = p_unit_id
    AND org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid());
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_remove_membership(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_user_status(
  p_target_id uuid, p_status text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.is_global_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles SET status = p_status WHERE id = p_target_id
    AND org_id = public.my_org_id();
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_set_user_status(uuid, text) TO authenticated;
