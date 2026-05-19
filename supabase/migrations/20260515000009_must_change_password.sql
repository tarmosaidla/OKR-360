-- ── must_change_password flag ─────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

-- Admins can reset any non-admin profile's must_change_password flag
CREATE OR REPLACE FUNCTION public.clear_must_change_password(p_target_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles
  SET must_change_password = false
  WHERE id = p_target_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.clear_must_change_password(uuid) TO authenticated;

-- Update last_active_at for own profile (called client-side on session start)
CREATE OR REPLACE FUNCTION public.touch_last_active()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles
  SET last_active_at = now()
  WHERE id = auth.uid();
END; $$;

GRANT EXECUTE ON FUNCTION public.touch_last_active() TO authenticated;
