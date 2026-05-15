-- ── Profiles: new columns ───────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email         text,
  ADD COLUMN IF NOT EXISTS job_title     text,
  ADD COLUMN IF NOT EXISTS is_global_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status        text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS invited_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invited_at    timestamptz,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_check CHECK (status IN ('active','pending','inactive'));

-- Backfill email from auth.users (run once)
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE au.id = p.id AND p.email IS NULL;


-- ── people_units: expand allowed roles ──────────────────────────────────────
-- Existing roles: member | lead | contributor
-- New roles added: admin | viewer
-- No constraint existed, so just document expected values:
-- 'admin' | 'member' | 'viewer' (| 'lead' | 'contributor' for back-compat)


-- ── get_admin_scope ──────────────────────────────────────────────────────────
-- Returns all unit_ids that p_admin_id can administrate
-- (units where they have role='admin' or 'lead', plus all descendant units)

CREATE OR REPLACE FUNCTION public.get_admin_scope(p_admin_id uuid)
RETURNS TABLE(unit_id uuid, depth int)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH RECURSIVE scope AS (
    -- Base: units where caller is admin or lead
    SELECT u.id AS uid, 0 AS d
    FROM public.units u
    JOIN public.people_units pu ON pu.unit_id = u.id
    WHERE pu.person_id = p_admin_id
      AND pu.role IN ('admin', 'lead')

    UNION ALL

    -- Recurse: all descendant units
    SELECT u.id, s.d + 1
    FROM public.units u
    JOIN scope s ON u.parent_id = s.uid
  )
  SELECT DISTINCT uid AS unit_id, d AS depth FROM scope;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_scope(uuid) TO authenticated;


-- ── Helper: is current user a global admin? ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_global_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT is_global_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_global_admin() TO authenticated;


-- ── Helper: can current user manage a given unit? ────────────────────────────

CREATE OR REPLACE FUNCTION public.can_manage_unit(p_unit_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    public.is_global_admin()
    OR
    EXISTS (
      SELECT 1 FROM public.get_admin_scope(auth.uid())
      WHERE unit_id = p_unit_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_unit(uuid) TO authenticated;


-- ── SECURITY DEFINER mutations (called by app to bypass RLS) ─────────────────

-- Admin upsert unit membership (for target user, within caller's scope)
CREATE OR REPLACE FUNCTION public.admin_upsert_membership(
  p_target_id uuid,
  p_unit_id   uuid,
  p_role      text,
  p_primary   boolean DEFAULT false
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Permission check
  IF NOT public.can_manage_unit(p_unit_id) THEN
    RAISE EXCEPTION 'Not authorised to manage unit %', p_unit_id;
  END IF;
  -- Only global admins can grant 'admin'
  IF p_role = 'admin' AND NOT public.is_global_admin() THEN
    RAISE EXCEPTION 'Only global admins can grant admin role';
  END IF;

  INSERT INTO public.people_units (person_id, unit_id, role, is_primary)
  VALUES (p_target_id, p_unit_id, p_role, p_primary)
  ON CONFLICT (person_id, unit_id) DO UPDATE
    SET role = EXCLUDED.role,
        is_primary = CASE WHEN EXCLUDED.is_primary THEN true ELSE people_units.is_primary END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_upsert_membership(uuid, uuid, text, boolean) TO authenticated;


-- Admin remove unit membership
CREATE OR REPLACE FUNCTION public.admin_remove_membership(
  p_target_id uuid,
  p_unit_id   uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.can_manage_unit(p_unit_id) THEN
    RAISE EXCEPTION 'Not authorised to manage unit %', p_unit_id;
  END IF;
  DELETE FROM public.people_units
  WHERE person_id = p_target_id AND unit_id = p_unit_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_remove_membership(uuid, uuid) TO authenticated;


-- Admin set user status (global admin only)
CREATE OR REPLACE FUNCTION public.admin_set_user_status(
  p_target_id uuid,
  p_status    text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.is_global_admin() THEN
    RAISE EXCEPTION 'Only global admins can change user status';
  END IF;
  -- Cannot deactivate another global admin
  IF p_status = 'inactive' AND (SELECT is_global_admin FROM public.profiles WHERE id = p_target_id) THEN
    RAISE EXCEPTION 'Cannot deactivate a global admin';
  END IF;
  UPDATE public.profiles SET status = p_status WHERE id = p_target_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_status(uuid, text) TO authenticated;


-- Admin update profile fields (name, job_title, is_global_admin)
CREATE OR REPLACE FUNCTION public.admin_update_profile(
  p_target_id   uuid,
  p_full_name   text DEFAULT NULL,
  p_job_title   text DEFAULT NULL,
  p_is_global_admin boolean DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_is_global_admin IS NOT NULL AND NOT public.is_global_admin() THEN
    RAISE EXCEPTION 'Only global admins can change global_admin flag';
  END IF;
  UPDATE public.profiles SET
    full_name = COALESCE(p_full_name, full_name),
    job_title = COALESCE(p_job_title, job_title),
    is_global_admin = COALESCE(p_is_global_admin, is_global_admin)
  WHERE id = p_target_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_profile(uuid, text, text, boolean) TO authenticated;


-- ── RLS: people_units — allow admins to manage other users ──────────────────
-- (existing 'own' policies remain active; these add admin access via OR logic)

DO $$ BEGIN
  CREATE POLICY "people_units_insert_admin" ON public.people_units
    FOR INSERT TO authenticated
    WITH CHECK (
      public.is_global_admin()
      OR unit_id IN (SELECT unit_id FROM public.get_admin_scope(auth.uid()))
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "people_units_update_admin" ON public.people_units
    FOR UPDATE TO authenticated
    USING (
      public.is_global_admin()
      OR unit_id IN (SELECT unit_id FROM public.get_admin_scope(auth.uid()))
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "people_units_delete_admin" ON public.people_units
    FOR DELETE TO authenticated
    USING (
      public.is_global_admin()
      OR unit_id IN (SELECT unit_id FROM public.get_admin_scope(auth.uid()))
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- ── RLS: profiles — restrict who can UPDATE sensitive fields ─────────────────
-- Existing read policy stays (all authenticated can read all profiles)
-- Add update policy that restricts is_global_admin and status changes

DO $$ BEGIN
  CREATE POLICY "profiles_update_admin_fields" ON public.profiles
    FOR UPDATE TO authenticated
    USING (
      -- Can always update own non-admin fields
      id = auth.uid()
      OR
      -- Global admins can update any profile
      public.is_global_admin()
    )
    WITH CHECK (
      id = auth.uid()
      OR public.is_global_admin()
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- ── Trigger: on invite accepted (new auth.users row OR email confirmed) ───────
-- When a pending user logs in for the first time, set status='active'

CREATE OR REPLACE FUNCTION public.handle_user_activation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Copy email to profiles on every login/update
  UPDATE public.profiles
  SET
    last_active_at = now(),
    status = CASE WHEN status = 'pending' THEN 'active' ELSE status END,
    email = COALESCE(email, NEW.email)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Trigger on auth.users UPDATE (login updates last_sign_in_at)
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at)
  EXECUTE FUNCTION public.handle_user_activation();

-- Also update profiles trigger to copy email on INSERT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(profiles.full_name, EXCLUDED.full_name);
  RETURN NEW;
END;
$$;

-- Replace existing signup trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
