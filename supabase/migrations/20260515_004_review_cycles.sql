-- ── Extend cycles table ──────────────────────────────────────────────────────

ALTER TABLE public.cycles
  ADD COLUMN IF NOT EXISTS status            text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS review_open_at    timestamptz,
  ADD COLUMN IF NOT EXISTS review_closes_at  timestamptz,
  ADD COLUMN IF NOT EXISTS created_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.cycles
  DROP CONSTRAINT IF EXISTS cycles_status_check;
ALTER TABLE public.cycles
  ADD CONSTRAINT cycles_status_check CHECK (status IN ('draft','active','reviewing','archived'));

-- Default existing cycles to 'active'
UPDATE public.cycles SET status = 'active' WHERE status = 'draft';


-- ── Extend key_results ────────────────────────────────────────────────────────

ALTER TABLE public.key_results
  ADD COLUMN IF NOT EXISTS direction              text NOT NULL DEFAULT 'up' CHECK (direction IN ('up','down')),
  ADD COLUMN IF NOT EXISTS final_score            numeric CHECK (final_score >= 0 AND final_score <= 1),
  ADD COLUMN IF NOT EXISTS carry_forward_to_cycle_id uuid REFERENCES public.cycles(id) ON DELETE SET NULL;


-- ── Extend objectives ─────────────────────────────────────────────────────────

ALTER TABLE public.objectives
  ADD COLUMN IF NOT EXISTS final_score numeric CHECK (final_score >= 0 AND final_score <= 1);

-- cycle_id already exists (added in schema-cadence.sql as part of the cadence migration)
-- If it doesn't exist, add it:
ALTER TABLE public.objectives
  ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES public.cycles(id) ON DELETE SET NULL;


-- ── objective_reviews ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.objective_reviews (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id          uuid NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
  cycle_id              uuid NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
  reviewer_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stage                 text NOT NULL CHECK (stage IN ('self','manager','final')),
  submitted_at          timestamptz,
  reflection_what_drove text,
  reflection_improve    text,
  carry_forward         text DEFAULT 'no' CHECK (carry_forward IN ('yes','partial','no')),
  overall_note          text,
  UNIQUE (objective_id, reviewer_id, stage)
);

CREATE INDEX IF NOT EXISTS objective_reviews_cycle_idx ON public.objective_reviews(cycle_id);
CREATE INDEX IF NOT EXISTS objective_reviews_reviewer_idx ON public.objective_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS objective_reviews_objective_idx ON public.objective_reviews(objective_id);

ALTER TABLE public.objective_reviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "obj_reviews_read_auth" ON public.objective_reviews
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "obj_reviews_write_own" ON public.objective_reviews
    FOR ALL TO authenticated USING (reviewer_id = auth.uid()) WITH CHECK (reviewer_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "obj_reviews_write_admin" ON public.objective_reviews
    FOR ALL TO authenticated
    USING (public.is_global_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- ── key_result_scores ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.key_result_scores (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_result_id  uuid NOT NULL REFERENCES public.key_results(id) ON DELETE CASCADE,
  cycle_id       uuid NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
  reviewer_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stage          text NOT NULL CHECK (stage IN ('self','manager','final')),
  score          numeric NOT NULL CHECK (score >= 0 AND score <= 1),
  note           text,
  scored_at      timestamptz DEFAULT now(),
  UNIQUE (key_result_id, reviewer_id, stage)
);

CREATE INDEX IF NOT EXISTS kr_scores_cycle_idx ON public.key_result_scores(cycle_id);
CREATE INDEX IF NOT EXISTS kr_scores_kr_idx ON public.key_result_scores(key_result_id);
CREATE INDEX IF NOT EXISTS kr_scores_reviewer_idx ON public.key_result_scores(reviewer_id);

ALTER TABLE public.key_result_scores ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "kr_scores_read_auth" ON public.key_result_scores
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "kr_scores_write_own" ON public.key_result_scores
    FOR ALL TO authenticated USING (reviewer_id = auth.uid()) WITH CHECK (reviewer_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "kr_scores_write_admin" ON public.key_result_scores
    FOR ALL TO authenticated USING (public.is_global_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- ── Score computation function ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.compute_kr_score(
  p_current    numeric,
  p_target     numeric,
  p_type       text,   -- 'numeric' | 'percentage' | 'boolean'
  p_direction  text    -- 'up' | 'down'
) RETURNS numeric LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_target = 0 THEN RETURN 0; END IF;
  IF p_type = 'boolean' THEN
    RETURN CASE WHEN p_current >= 1 THEN 1.0 ELSE 0.0 END;
  END IF;
  IF p_direction = 'down' THEN
    RETURN GREATEST(0.0, LEAST(1.0, (2.0 * p_target - p_current) / p_target));
  END IF;
  -- 'up' direction (default)
  RETURN GREATEST(0.0, LEAST(1.0, p_current / p_target));
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_kr_score(numeric, numeric, text, text) TO authenticated;


-- ── Lock cycle final scores + carry-forward ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.lock_cycle_scores(
  p_cycle_id      uuid,
  p_next_cycle_id uuid DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  rec RECORD;
  new_obj_id uuid;
  kr_rec RECORD;
BEGIN
  -- Only global admins can lock
  IF NOT public.is_global_admin() THEN
    RAISE EXCEPTION 'Only global admins can lock cycle scores';
  END IF;

  -- 1. Copy manager scores → final (or auto-scores where no manager score exists)
  INSERT INTO public.key_result_scores (key_result_id, cycle_id, reviewer_id, stage, score, scored_at)
  SELECT DISTINCT ON (krs.key_result_id)
    krs.key_result_id,
    p_cycle_id,
    krs.reviewer_id,
    'final',
    krs.score,
    now()
  FROM public.key_result_scores krs
  WHERE krs.cycle_id = p_cycle_id
    AND krs.stage IN ('manager', 'self')
  ORDER BY krs.key_result_id,
           CASE krs.stage WHEN 'manager' THEN 0 ELSE 1 END
  ON CONFLICT (key_result_id, reviewer_id, stage) DO UPDATE SET score = EXCLUDED.score, scored_at = now();

  -- 2. Write final_score back to key_results
  UPDATE public.key_results kr
  SET final_score = s.score
  FROM public.key_result_scores s
  WHERE s.key_result_id = kr.id
    AND s.cycle_id = p_cycle_id
    AND s.stage = 'final';

  -- 3. Compute and write objective final_score (avg of KR final scores)
  UPDATE public.objectives obj
  SET final_score = (
    SELECT AVG(kr.final_score)
    FROM public.key_results kr
    WHERE kr.objective_id = obj.id
      AND kr.final_score IS NOT NULL
  )
  WHERE obj.cycle_id = p_cycle_id;

  -- 4. Set cycle status to archived
  UPDATE public.cycles SET status = 'archived' WHERE id = p_cycle_id;

  -- 5. Carry forward if next cycle provided
  IF p_next_cycle_id IS NOT NULL THEN
    FOR rec IN
      SELECT o.id AS obj_id, o.title, o.owner_id, o.team_id, o.unit_id, o.level_id,
             o.parent_objective_id, or2.carry_forward
      FROM public.objectives o
      JOIN public.objective_reviews or2
        ON or2.objective_id = o.id AND or2.cycle_id = p_cycle_id AND or2.stage = 'final'
      WHERE o.cycle_id = p_cycle_id
        AND or2.carry_forward IN ('yes','partial')
    LOOP
      -- Create new objective in next cycle
      INSERT INTO public.objectives (
        title, owner_id, team_id, unit_id, level_id,
        cycle_id, parent_objective_id, status
      ) VALUES (
        rec.title, rec.owner_id, rec.team_id, rec.unit_id, rec.level_id,
        p_next_cycle_id, rec.obj_id, 'on_track'
      )
      RETURNING id INTO new_obj_id;

      -- Copy KRs (all for 'yes', only score < 0.7 for 'partial')
      FOR kr_rec IN
        SELECT kr.title, kr.target_type, kr.target_value, kr.unit, kr.owner_id, kr.direction
        FROM public.key_results kr
        WHERE kr.objective_id = rec.obj_id
          AND (
            rec.carry_forward = 'yes'
            OR (rec.carry_forward = 'partial' AND (kr.final_score IS NULL OR kr.final_score < 0.7))
          )
      LOOP
        INSERT INTO public.key_results (
          objective_id, title, target_type, target_value, current_value, unit, owner_id, direction
        ) VALUES (
          new_obj_id, kr_rec.title, kr_rec.target_type, kr_rec.target_value, 0,
          kr_rec.unit, kr_rec.owner_id, kr_rec.direction
        );
      END LOOP;

      -- Link original KR back to new cycle
      UPDATE public.key_results SET carry_forward_to_cycle_id = p_next_cycle_id
      WHERE objective_id = rec.obj_id;
    END LOOP;

    -- 6. Notify owners of carried-forward objectives
    INSERT INTO public.notifications (person_id, type, title, body)
    SELECT DISTINCT o.owner_id,
      'cycle_archived',
      'Cycle closed — objectives carried forward',
      'Some of your objectives have been carried into the next cycle. Check your new objectives.'
    FROM public.objectives o
    JOIN public.objective_reviews or2
      ON or2.objective_id = o.id AND or2.cycle_id = p_cycle_id AND or2.stage = 'final'
    WHERE o.cycle_id = p_cycle_id
      AND or2.carry_forward IN ('yes','partial')
      AND o.owner_id IS NOT NULL;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lock_cycle_scores(uuid, uuid) TO authenticated;


-- ── Notify all KR owners when cycle enters review ────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_review_open(p_cycle_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  cycle_label text;
  close_date  text;
BEGIN
  IF NOT public.is_global_admin() THEN
    RAISE EXCEPTION 'Only global admins can open review';
  END IF;

  SELECT label, TO_CHAR(review_closes_at, 'Mon DD')
  INTO cycle_label, close_date
  FROM public.cycles WHERE id = p_cycle_id;

  UPDATE public.cycles SET status = 'reviewing' WHERE id = p_cycle_id;

  -- Notify all KR owners who have KRs in objectives for this cycle
  INSERT INTO public.notifications (person_id, type, title, body)
  SELECT DISTINCT kr.owner_id,
    'review_open',
    cycle_label || ' review is open — score your OKRs',
    'Self-assessment is due by ' || COALESCE(close_date, 'end of cycle') || '. Score your key results now.'
  FROM public.key_results kr
  JOIN public.objectives obj ON obj.id = kr.objective_id
  WHERE obj.cycle_id = p_cycle_id
    AND kr.owner_id IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_review_open(uuid) TO authenticated;
