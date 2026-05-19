-- ── Upgrade notifications table ───────────────────────────────────────────────

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS action_url text,
  ADD COLUMN IF NOT EXISTS metadata   jsonb,
  ADD COLUMN IF NOT EXISTS read_at    timestamptz;

-- Backfill read_at from existing read=true rows
UPDATE public.notifications
SET read_at = created_at
WHERE read = true AND read_at IS NULL;

-- Extend type constraint to include all new types
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Expand type allowlist (no constraint — free text for extensibility)
-- Remove old policies and add scoped ones

-- Enable realtime on notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;


-- ── notification_preferences ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  person_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type            text NOT NULL,
  in_app_enabled  boolean NOT NULL DEFAULT true,
  PRIMARY KEY (person_id, type)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "notif_prefs_own" ON public.notification_preferences
    FOR ALL TO authenticated
    USING (person_id = auth.uid())
    WITH CHECK (person_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- ── RLS: tighten notifications ────────────────────────────────────────────────
-- Drop old permissive policies
DROP POLICY IF EXISTS "notif_read_own"   ON public.notifications;
DROP POLICY IF EXISTS "notif_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notif_insert_any" ON public.notifications;

-- Re-create: scoped read + update, open insert (needed for cross-user notifications)
DO $$ BEGIN
  CREATE POLICY "notif_select_own" ON public.notifications
    FOR SELECT TO authenticated USING (person_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "notif_update_own" ON public.notifications
    FOR UPDATE TO authenticated USING (person_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Authenticated users can send notifications to others (blocker alerts, etc.)
DO $$ BEGIN
  CREATE POLICY "notif_insert_auth" ON public.notifications
    FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- ── send_notification function (respects preferences) ────────────────────────

CREATE OR REPLACE FUNCTION public.send_notification(
  p_person_id  uuid,
  p_type       text,
  p_title      text,
  p_body       text      DEFAULT NULL,
  p_action_url text      DEFAULT NULL,
  p_metadata   jsonb     DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Check preferences: skip if user has opted out
  IF EXISTS (
    SELECT 1 FROM public.notification_preferences
    WHERE person_id = p_person_id
      AND type = p_type
      AND in_app_enabled = false
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (person_id, type, title, body, action_url, metadata)
  VALUES (p_person_id, p_type, p_title, p_body, p_action_url, p_metadata);
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_notification(uuid, text, text, text, text, jsonb) TO authenticated;


-- ── pg_cron: weekly check-in notification triggers ───────────────────────────
-- Requires pg_cron extension to be enabled in Supabase dashboard

-- Monday 07:00 UTC: checkin_due
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'checkin-due-monday',
      '0 7 * * 1',  -- Monday 07:00 UTC
      $$
        INSERT INTO public.notifications (person_id, type, title, body, action_url)
        SELECT DISTINCT kr.owner_id,
          'checkin_due',
          'Week ' || EXTRACT(WEEK FROM now())::int || ' check-in ready',
          COUNT(kr.id) || ' KRs waiting for your update',
          '/check-in'
        FROM public.key_results kr
        JOIN public.objectives obj ON obj.id = kr.objective_id
        JOIN public.cycles c ON c.id = obj.cycle_id
        WHERE c.status = 'active'
          AND kr.owner_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM public.checkins ci
            WHERE ci.key_result_id = kr.id
              AND ci.person_id = kr.owner_id
              AND ci.week_number = EXTRACT(WEEK FROM now())::int
              AND ci.year = EXTRACT(YEAR FROM now())::int
          )
        GROUP BY kr.owner_id;
      $$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- pg_cron not available, skip silently
  NULL;
END $$;

-- Wednesday 08:00 UTC: checkin_reminder
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'checkin-reminder-wednesday',
      '0 8 * * 3',  -- Wednesday 08:00 UTC
      $$
        INSERT INTO public.notifications (person_id, type, title, body, action_url)
        SELECT DISTINCT kr.owner_id,
          'checkin_reminder',
          'Check-in reminder — due by Sunday',
          'You haven''t checked in yet this week.',
          '/check-in'
        FROM public.key_results kr
        JOIN public.objectives obj ON obj.id = kr.objective_id
        JOIN public.cycles c ON c.id = obj.cycle_id
        WHERE c.status = 'active'
          AND kr.owner_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM public.checkins ci
            WHERE ci.key_result_id = kr.id
              AND ci.person_id = kr.owner_id
              AND ci.week_number = EXTRACT(WEEK FROM now())::int
              AND ci.year = EXTRACT(YEAR FROM now())::int
          )
          -- Only remind if checkin_due was already sent this week
          AND EXISTS (
            SELECT 1 FROM public.notifications n
            WHERE n.person_id = kr.owner_id
              AND n.type = 'checkin_due'
              AND n.created_at >= date_trunc('week', now())
          );
      $$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Nightly 02:00 UTC: okr_unaligned sweep
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'okr-unaligned-nightly',
      '0 2 * * *',  -- Nightly 02:00 UTC
      $$
        WITH week_num AS (SELECT EXTRACT(WEEK FROM now())::int AS w, EXTRACT(YEAR FROM now())::int AS y)
        INSERT INTO public.notifications (person_id, type, title, body, action_url, metadata)
        SELECT obj.owner_id,
          'okr_unaligned',
          'OKR not yet linked to a parent objective',
          obj.title,
          '/cascade',
          jsonb_build_object('objective_id', obj.id, 'last_notified_week', (SELECT w FROM week_num), 'last_notified_year', (SELECT y FROM week_num))
        FROM public.objectives obj
        JOIN public.cycles c ON c.id = obj.cycle_id
        WHERE c.status = 'active'
          AND obj.parent_objective_id IS NULL
          AND obj.level_id IS NOT NULL  -- not a top-level objective
          AND obj.owner_id IS NOT NULL
          -- Not notified this week already
          AND NOT EXISTS (
            SELECT 1 FROM public.notifications n
            WHERE n.person_id = obj.owner_id
              AND n.type = 'okr_unaligned'
              AND (n.metadata->>'objective_id') = obj.id::text
              AND (n.metadata->>'last_notified_week')::int = (SELECT w FROM week_num)
              AND (n.metadata->>'last_notified_year')::int = (SELECT y FROM week_num)
          );
      $$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ── invite_accepted: extend handle_user_activation to notify inviter ──────
-- Replaces the function created in migration 003

CREATE OR REPLACE FUNCTION public.handle_user_activation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_inviter_id  uuid;
  v_full_name   text;
  v_was_pending boolean;
BEGIN
  -- Capture state before update
  SELECT invited_by, full_name, (status = 'pending')
  INTO v_inviter_id, v_full_name, v_was_pending
  FROM public.profiles WHERE id = NEW.id;

  -- Update profile timestamps + status
  UPDATE public.profiles
  SET
    last_active_at = now(),
    status = CASE WHEN status = 'pending' THEN 'active' ELSE status END,
    email = COALESCE(email, NEW.email)
  WHERE id = NEW.id;

  -- Notify the inviter on first activation
  IF v_was_pending AND v_inviter_id IS NOT NULL THEN
    PERFORM public.send_notification(
      v_inviter_id,
      'invite_accepted',
      COALESCE(v_full_name, NEW.email) || ' accepted your invite',
      NULL,
      '/settings/users',
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$;
