-- ── Sample data flags, audit log, permissions ────────────────────────────
-- Idempotent. Run after migration 012.

-- ── 1. is_sample_data on tables ───────────────────────────────────────────

ALTER TABLE public.objectives  ADD COLUMN IF NOT EXISTS is_sample_data boolean NOT NULL DEFAULT false;
ALTER TABLE public.key_results ADD COLUMN IF NOT EXISTS is_sample_data boolean NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE public.kpis ADD COLUMN IF NOT EXISTS is_sample_data boolean NOT NULL DEFAULT false;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── 2. has_sample_data on organisations ───────────────────────────────────

ALTER TABLE public.organisations ADD COLUMN IF NOT EXISTS has_sample_data boolean NOT NULL DEFAULT false;

-- ── 3. clear_sample_data() RPC ────────────────────────────────────────────
-- Deletes all sample objectives/KRs/checkins/KPIs for the caller's org.
-- Demo user profiles are cleaned up by clear-sample-data edge function.

CREATE OR REPLACE FUNCTION public.clear_sample_data()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid := public.my_org_id();
BEGIN
  -- Delete checkins under sample KRs (explicit, in case no CASCADE)
  DELETE FROM public.checkins
  WHERE key_result_id IN (
    SELECT kr.id
    FROM public.key_results kr
    JOIN public.objectives obj ON kr.objective_id = obj.id
    WHERE obj.org_id = v_org_id AND obj.is_sample_data = true
  );

  -- Delete sample KRs
  DELETE FROM public.key_results
  WHERE objective_id IN (
    SELECT id FROM public.objectives
    WHERE org_id = v_org_id AND is_sample_data = true
  );

  -- Delete sample objectives
  DELETE FROM public.objectives WHERE org_id = v_org_id AND is_sample_data = true;

  -- Delete sample KPI snapshots + KPIs (wrapped in case table missing)
  BEGIN
    DELETE FROM public.kpi_snapshots
    WHERE kpi_id IN (
      SELECT id FROM public.kpis WHERE org_id = v_org_id AND is_sample_data = true
    );
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM public.kpis WHERE org_id = v_org_id AND is_sample_data = true;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- Clear flag
  UPDATE public.organisations SET has_sample_data = false WHERE id = v_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.clear_sample_data() TO authenticated;

-- ── 4. my_org_has_sample_data() helper ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.my_org_has_sample_data()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(has_sample_data, false)
  FROM public.organisations WHERE id = public.my_org_id()
$$;

GRANT EXECUTE ON FUNCTION public.my_org_has_sample_data() TO authenticated;

-- ── 5. audit_log table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid REFERENCES public.organisations(id) ON DELETE CASCADE,
  actor_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action      text NOT NULL,
  target_type text,
  target_id   uuid,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_org_idx ON public.audit_log(org_id, created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "audit_log_read_org" ON public.audit_log
    FOR SELECT TO authenticated USING (org_id = public.my_org_id());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "audit_log_insert_org" ON public.audit_log
    FOR INSERT TO authenticated WITH CHECK (org_id = public.my_org_id());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Service role (edge functions) can insert without session context
DO $$ BEGIN
  CREATE POLICY "audit_log_service_insert" ON public.audit_log
    FOR INSERT TO service_role WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── 6. permissions table ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.permissions (
  permission_key text NOT NULL,
  role           text NOT NULL,
  enabled        boolean NOT NULL DEFAULT true,
  org_id         uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  PRIMARY KEY (permission_key, role, org_id)
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "permissions_read_org" ON public.permissions
    FOR SELECT TO authenticated USING (org_id = public.my_org_id());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "permissions_admin_write" ON public.permissions
    FOR ALL TO authenticated
    USING (org_id = public.my_org_id() AND public.is_global_admin())
    WITH CHECK (org_id = public.my_org_id() AND public.is_global_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── 7. seed_default_permissions(org_id) ─────────────────────────────────
-- Call this when a new org is created (in onboarding edge function or trigger).

CREATE OR REPLACE FUNCTION public.seed_default_permissions(p_org_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.permissions (permission_key, role, enabled, org_id) VALUES
    ('create_objectives',   'viewer',     false, p_org_id),
    ('create_objectives',   'member',     true,  p_org_id),
    ('create_objectives',   'unit_admin', true,  p_org_id),
    ('create_objectives',   'org_admin',  true,  p_org_id),
    ('submit_checkins',     'viewer',     false, p_org_id),
    ('submit_checkins',     'member',     true,  p_org_id),
    ('submit_checkins',     'unit_admin', true,  p_org_id),
    ('submit_checkins',     'org_admin',  true,  p_org_id),
    ('set_kpis',            'viewer',     false, p_org_id),
    ('set_kpis',            'member',     false, p_org_id),
    ('set_kpis',            'unit_admin', true,  p_org_id),
    ('set_kpis',            'org_admin',  true,  p_org_id),
    ('invite_members',      'viewer',     false, p_org_id),
    ('invite_members',      'member',     false, p_org_id),
    ('invite_members',      'unit_admin', true,  p_org_id),
    ('invite_members',      'org_admin',  true,  p_org_id),
    ('view_analytics',      'viewer',     false, p_org_id),
    ('view_analytics',      'member',     true,  p_org_id),
    ('view_analytics',      'unit_admin', true,  p_org_id),
    ('view_analytics',      'org_admin',  true,  p_org_id),
    ('manage_users',        'viewer',     false, p_org_id),
    ('manage_users',        'member',     false, p_org_id),
    ('manage_users',        'unit_admin', true,  p_org_id),
    ('manage_users',        'org_admin',  true,  p_org_id),
    ('edit_org_settings',   'viewer',     false, p_org_id),
    ('edit_org_settings',   'member',     false, p_org_id),
    ('edit_org_settings',   'unit_admin', false, p_org_id),
    ('edit_org_settings',   'org_admin',  true,  p_org_id)
  ON CONFLICT (permission_key, role, org_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_default_permissions(uuid) TO service_role;
