-- ── Extend checkins table with weekly check-in fields ────────────────────────
-- Old columns (author_id, value_at_checkin, notes) kept for backward compat

ALTER TABLE public.checkins
  ADD COLUMN IF NOT EXISTS person_id    uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS week_number  int,
  ADD COLUMN IF NOT EXISTS year         int,
  ADD COLUMN IF NOT EXISTS cycle_id     uuid REFERENCES public.cycles(id),
  ADD COLUMN IF NOT EXISTS new_value    numeric,
  ADD COLUMN IF NOT EXISTS confidence   int,
  ADD COLUMN IF NOT EXISTS has_blocker  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocker_text text,
  ADD COLUMN IF NOT EXISTS note         text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz DEFAULT now();

DO $$ BEGIN
  ALTER TABLE public.checkins
    ADD CONSTRAINT checkins_confidence_range
    CHECK (confidence IS NULL OR (confidence >= 1 AND confidence <= 10));
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- One check-in per KR per person per week
DO $$ BEGIN
  ALTER TABLE public.checkins
    ADD CONSTRAINT checkins_weekly_unique
    UNIQUE (key_result_id, person_id, week_number, year);
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS checkins_person_week_idx
  ON public.checkins(person_id, week_number, year);
CREATE INDEX IF NOT EXISTS checkins_kr_week_idx
  ON public.checkins(key_result_id, week_number, year);


-- ── Replace sync trigger: handle both old + new schema ────────────────────────

CREATE OR REPLACE FUNCTION public.sync_kr_on_checkin()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.key_results
  SET
    current_value = COALESCE(NEW.new_value, NEW.value_at_checkin, current_value),
    confidence    = COALESCE(NEW.confidence, confidence),
    updated_at    = now()
  WHERE id = NEW.key_result_id;

  -- Write to confidence_logs when week info is present
  IF NEW.week_number IS NOT NULL AND NEW.year IS NOT NULL AND NEW.confidence IS NOT NULL THEN
    INSERT INTO public.confidence_logs (key_result_id, week, year, value, created_by)
    VALUES (
      NEW.key_result_id, NEW.week_number, NEW.year, NEW.confidence,
      COALESCE(NEW.person_id, NEW.author_id)
    )
    ON CONFLICT (key_result_id, week, year) DO UPDATE SET value = EXCLUDED.value;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS checkin_syncs_kr_value ON public.checkins;
CREATE TRIGGER checkin_syncs_kr_value
  AFTER INSERT OR UPDATE ON public.checkins
  FOR EACH ROW EXECUTE FUNCTION public.sync_kr_on_checkin();


-- ── checkin_streaks ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.checkin_streaks (
  person_id         uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_streak    int NOT NULL DEFAULT 0,
  longest_streak    int NOT NULL DEFAULT 0,
  last_checkin_week int,
  last_checkin_year int,
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE public.checkin_streaks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "streaks_read_all" ON public.checkin_streaks
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "streaks_write_own" ON public.checkin_streaks
    FOR ALL TO authenticated USING (person_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- ── notifications ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       text NOT NULL,  -- 'checkin_reminder' | 'blocker_flagged' | 'nudge'
  title      text NOT NULL,
  body       text,
  read       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_person_unread_idx
  ON public.notifications(person_id, read) WHERE NOT read;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "notif_read_own" ON public.notifications
    FOR SELECT TO authenticated USING (person_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "notif_update_own" ON public.notifications
    FOR UPDATE TO authenticated USING (person_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "notif_insert_any" ON public.notifications
    FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- ── update_checkin_streak function ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_checkin_streak(
  p_person_id uuid,
  p_week      int,
  p_year      int
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  last_week int; last_year int; curr int; longest int;
  prev_week int; prev_year int;
BEGIN
  SELECT last_checkin_week, last_checkin_year, current_streak, longest_streak
    INTO last_week, last_year, curr, longest
    FROM public.checkin_streaks WHERE person_id = p_person_id;

  IF NOT FOUND THEN
    INSERT INTO public.checkin_streaks
      (person_id, current_streak, longest_streak, last_checkin_week, last_checkin_year, updated_at)
    VALUES (p_person_id, 1, 1, p_week, p_year, now());
    RETURN;
  END IF;

  -- Idempotent: same week already counted
  IF last_week = p_week AND last_year = p_year THEN RETURN; END IF;

  prev_week := CASE WHEN p_week = 1 THEN 52 ELSE p_week - 1 END;
  prev_year := CASE WHEN p_week = 1 THEN p_year - 1 ELSE p_year END;

  curr := CASE
    WHEN last_week = prev_week AND last_year = prev_year THEN curr + 1
    ELSE 1
  END;
  longest := GREATEST(longest, curr);

  UPDATE public.checkin_streaks
  SET current_streak    = curr,
      longest_streak    = longest,
      last_checkin_week = p_week,
      last_checkin_year = p_year,
      updated_at        = now()
  WHERE person_id = p_person_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_checkin_streak(uuid, int, int) TO authenticated;
