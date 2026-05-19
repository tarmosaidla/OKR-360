-- ── retros table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.retros (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id      uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  week_number  int  NOT NULL,
  year         int  NOT NULL,
  start_items    text[] DEFAULT '{}',
  stop_items     text[] DEFAULT '{}',
  continue_items text[] DEFAULT '{}',
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(unit_id, week_number, year)
);

ALTER TABLE public.retros ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "retros_read_visible" ON public.retros FOR SELECT TO authenticated
    USING (unit_id IN (SELECT unit_id FROM public.visible_units_for_person(auth.uid())));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "retros_write_admin" ON public.retros FOR ALL TO authenticated
    USING (
      unit_id IN (
        SELECT pu.unit_id FROM public.people_units pu
        WHERE pu.person_id = auth.uid() AND pu.role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Seed: last week's retro ───────────────────────────────────────────────

DO $$
DECLARE
  v_unit uuid;
  v_person uuid;
BEGIN
  SELECT id INTO v_unit FROM public.units ORDER BY created_at LIMIT 1;
  SELECT id INTO v_person FROM public.profiles ORDER BY created_at LIMIT 1;
  IF v_unit IS NULL OR v_person IS NULL THEN RETURN; END IF;

  INSERT INTO public.retros
    (unit_id, week_number, year, start_items, stop_items, continue_items, created_by)
  VALUES (
    v_unit, 19, 2026,
    ARRAY['Pair-design Fridays for the Insights surface', 'A shared "wins" channel — too quiet right now'],
    ARRAY['Splitting design reviews across two days', 'Promising launch dates in #general before the team commits'],
    ARRAY['Weekly customer call rotation', 'The 30-min Monday kickoff', 'Tarmo''s perf newsletter'],
    v_person
  )
  ON CONFLICT DO NOTHING;
END $$;

-- ── tasks: add due_date column if missing ─────────────────────────────────

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS due_date date;

-- ── get_analytics RPC ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_analytics(
  p_cycle_id  uuid,
  p_viewer_id uuid
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_visible_units uuid[];

  v_org_conf      numeric;
  v_ci_submitted  int;
  v_ci_total      int;
  v_aligned       int;
  v_total_objs    int;
  v_off_plan_kpis jsonb;
  v_kpi_on_track  int;
  v_kpi_at_risk   int;
  v_kpi_off_plan  int;

  v_weekly_conf   jsonb;
  v_team_ci       jsonb;
  v_cycle_history jsonb;
  v_alignment     jsonb;
  v_unaligned     jsonb;
  v_leaderboard   jsonb;
BEGIN
  -- Visible units for this viewer
  SELECT ARRAY(SELECT unit_id FROM public.visible_units_for_person(p_viewer_id))
  INTO v_visible_units;

  -- 1. Org confidence avg (avg of latest checkin confidence per KR in cycle)
  SELECT COALESCE(AVG(kr.confidence), 0)
  INTO v_org_conf
  FROM public.key_results kr
  JOIN public.objectives o ON o.id = kr.objective_id
  WHERE o.cycle_id = p_cycle_id
    AND kr.confidence IS NOT NULL;

  -- 2. Check-in rate this ISO week
  SELECT
    COUNT(DISTINCT c.person_id),
    COUNT(DISTINCT pu.person_id)
  INTO v_ci_submitted, v_ci_total
  FROM public.people_units pu
  LEFT JOIN public.checkins c ON
    c.person_id = pu.person_id
    AND c.week_number = EXTRACT(WEEK FROM now())::int
    AND c.year = EXTRACT(YEAR FROM now())::int
  WHERE pu.unit_id = ANY(v_visible_units);

  -- 3. Alignment rate
  SELECT
    COUNT(*) FILTER (WHERE parent_objective_id IS NOT NULL),
    COUNT(*)
  INTO v_aligned, v_total_objs
  FROM public.objectives
  WHERE cycle_id = p_cycle_id;

  -- 4. KPI health
  SELECT
    COUNT(*) FILTER (WHERE k.actual >= k.plan * 0.95),
    COUNT(*) FILTER (WHERE k.actual >= k.plan * 0.70 AND k.actual < k.plan * 0.95),
    COUNT(*) FILTER (WHERE k.actual < k.plan * 0.70)
  INTO v_kpi_on_track, v_kpi_at_risk, v_kpi_off_plan
  FROM public.kpis k
  WHERE k.cycle_id = p_cycle_id OR k.cycle_id IS NULL;

  -- 5. Weekly confidence by unit (last 13 weeks from confidence_logs)
  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]')
  INTO v_weekly_conf
  FROM (
    SELECT cl.week, o.team_id::text AS unit_id, ROUND(AVG(cl.value)::numeric, 1) AS avg_conf
    FROM public.confidence_logs cl
    JOIN public.key_results kr ON kr.id = cl.key_result_id
    JOIN public.objectives o ON o.id = kr.objective_id
    WHERE o.cycle_id = p_cycle_id
      AND cl.year = EXTRACT(YEAR FROM now())::int
    GROUP BY cl.week, o.team_id
    ORDER BY cl.week
  ) r;

  -- 6. Alignment by level (using objectives.level_id)
  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]')
  INTO v_alignment
  FROM (
    SELECT
      ol.depth AS level,
      ol.name  AS level_name,
      COUNT(o.id) FILTER (WHERE o.parent_objective_id IS NOT NULL) AS aligned,
      COUNT(o.id) AS total
    FROM public.objectives o
    JOIN public.org_levels ol ON ol.id = o.level_id
    WHERE o.cycle_id = p_cycle_id
    GROUP BY ol.depth, ol.name
    ORDER BY ol.depth
  ) r;

  -- 7. Unaligned objectives
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', o.id, 'title', o.title)), '[]')
  INTO v_unaligned
  FROM public.objectives o
  WHERE o.cycle_id = p_cycle_id
    AND o.parent_objective_id IS NULL;

  -- 8. Cycle history (archived cycles with avg score)
  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]')
  INTO v_cycle_history
  FROM (
    SELECT c.label, COALESCE(AVG(orv.final_score), 0) AS score
    FROM public.cycles c
    LEFT JOIN public.objective_reviews orv ON orv.cycle_id = c.id
    WHERE c.status = 'archived' OR c.id = p_cycle_id
    GROUP BY c.id, c.label, c.start_date
    ORDER BY c.start_date
    LIMIT 6
  ) r;

  -- 9. Team check-in completion
  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]')
  INTO v_team_ci
  FROM (
    SELECT
      u.name AS unit_name,
      COUNT(DISTINCT pu.person_id) AS total_members,
      COUNT(DISTINCT c.person_id)  AS submitted
    FROM public.units u
    JOIN public.people_units pu ON pu.unit_id = u.id
    LEFT JOIN public.checkins c ON
      c.person_id = pu.person_id
      AND c.week_number = EXTRACT(WEEK FROM now())::int
      AND c.year = EXTRACT(YEAR FROM now())::int
    WHERE u.id = ANY(v_visible_units)
    GROUP BY u.id, u.name
    ORDER BY u.name
  ) r;

  -- 10. Leaderboard
  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]')
  INTO v_leaderboard
  FROM (
    SELECT
      u.name AS unit_name,
      COUNT(DISTINCT pu.person_id) AS member_count,
      COALESCE(AVG(CASE WHEN c.week_number = EXTRACT(WEEK FROM now())::int THEN c.confidence END), 0) AS avg_conf,
      ROUND(100.0 * COUNT(DISTINCT CASE WHEN c.week_number = EXTRACT(WEEK FROM now())::int THEN c.person_id END)
            / NULLIF(COUNT(DISTINCT pu.person_id), 0)) AS ci_rate,
      COUNT(DISTINCT o.id) FILTER (WHERE o.parent_objective_id IS NOT NULL)::int AS aligned_objs,
      COUNT(DISTINCT o.id)::int AS total_objs
    FROM public.units u
    JOIN public.people_units pu ON pu.unit_id = u.id
    LEFT JOIN public.checkins c ON c.person_id = pu.person_id
    LEFT JOIN public.objectives o ON o.owner_id = pu.person_id AND o.cycle_id = p_cycle_id
    WHERE u.id = ANY(v_visible_units)
    GROUP BY u.id, u.name
    ORDER BY avg_conf DESC
    LIMIT 20
  ) r;

  RETURN jsonb_build_object(
    'orgConfidence',   ROUND(v_org_conf::numeric, 1),
    'checkInRate',     jsonb_build_object('submitted', v_ci_submitted, 'total', v_ci_total),
    'alignmentRate',   CASE WHEN v_total_objs > 0 THEN ROUND(100.0 * v_aligned / v_total_objs) ELSE 0 END,
    'kpiHealth',       jsonb_build_object('onTrack', v_kpi_on_track, 'atRisk', v_kpi_at_risk, 'offPlan', v_kpi_off_plan),
    'weeklyConf',      v_weekly_conf,
    'teamCheckIns',    v_team_ci,
    'cycleHistory',    v_cycle_history,
    'alignment',       v_alignment,
    'unaligned',       v_unaligned,
    'leaderboard',     v_leaderboard
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.get_analytics(uuid, uuid) TO authenticated;
