-- ── initiatives table upgrade ─────────────────────────────────────────────

ALTER TABLE public.initiatives
  ADD COLUMN IF NOT EXISTS owner_person_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_id         uuid REFERENCES public.units(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS due             text,
  ADD COLUMN IF NOT EXISTS year            int DEFAULT EXTRACT(YEAR FROM now())::int,
  ADD COLUMN IF NOT EXISTS created_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Backfill owner_person_id from owner_id, due from due_label, year from created_at
UPDATE public.initiatives
SET
  owner_person_id = owner_id,
  due = due_label,
  year = EXTRACT(YEAR FROM created_at)::int
WHERE owner_person_id IS NULL;

-- Update RLS: add write policy for owner_person_id
DO $$ BEGIN
  CREATE POLICY "initiatives_write_person" ON public.initiatives
    FOR ALL TO authenticated
    USING (owner_person_id = auth.uid() OR owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Seed: Annual initiatives ──────────────────────────────────────────────

DO $$
DECLARE
  v_profiles uuid[];
  v_p1 uuid; v_p2 uuid; v_p3 uuid; v_p4 uuid; v_p5 uuid;
BEGIN
  -- Skip if already seeded with new columns
  IF EXISTS (SELECT 1 FROM public.initiatives WHERE due IS NOT NULL LIMIT 1) THEN
    RETURN;
  END IF;

  SELECT ARRAY(SELECT id FROM public.profiles ORDER BY created_at LIMIT 5)
  INTO v_profiles;

  IF array_length(v_profiles, 1) IS NULL THEN RETURN; END IF;

  v_p1 := v_profiles[1];
  v_p2 := COALESCE(v_profiles[2], v_profiles[1]);
  v_p3 := COALESCE(v_profiles[3], v_profiles[1]);
  v_p4 := COALESCE(v_profiles[4], v_profiles[1]);
  v_p5 := COALESCE(v_profiles[5], v_profiles[1]);

  INSERT INTO public.initiatives
    (title, owner_id, owner_person_id, status, progress, due_label, due, year, created_by)
  VALUES
    ('Ship Cadence Insights to GA',          v_p1, v_p1, 'On track',  0.58, 'Q3 2026', 'Q3 2026', 2026, v_p1),
    ('Migrate primary region to eu-north-1', v_p2, v_p2, 'On track',  0.72, 'Q2 2026', 'Q2 2026', 2026, v_p2),
    ('Hire Director of Sales (Nordics)',      v_p3, v_p3, 'At risk',   0.30, 'Q3 2026', 'Q3 2026', 2026, v_p3),
    ('Open-source the Cadence CLI',          v_p5, v_p5, 'On track',  0.45, 'Q4 2026', 'Q4 2026', 2026, v_p5),
    ('SOC 2 Type II audit',                  v_p3, v_p3, 'Off track', 0.18, 'Q3 2026', 'Q3 2026', 2026, v_p3)
  ON CONFLICT DO NOTHING;

EXCEPTION WHEN OTHERS THEN NULL;
END $$;
