-- ── people_units ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.people_units (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  unit_id     uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'member', -- 'member' | 'lead' | 'contributor'
  is_primary  boolean NOT NULL DEFAULT false,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(person_id, unit_id)
);

CREATE INDEX IF NOT EXISTS people_units_person_id_idx ON public.people_units(person_id);
CREATE INDEX IF NOT EXISTS people_units_unit_id_idx ON public.people_units(unit_id);

ALTER TABLE public.people_units ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "people_units_read_all" ON public.people_units
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "people_units_insert_own" ON public.people_units
    FOR INSERT TO authenticated WITH CHECK (person_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "people_units_update_own" ON public.people_units
    FOR UPDATE TO authenticated USING (person_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "people_units_delete_own" ON public.people_units
    FOR DELETE TO authenticated USING (person_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- ── kr_tasks ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.kr_tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_result_id   uuid NOT NULL REFERENCES public.key_results(id) ON DELETE CASCADE,
  title           text NOT NULL,
  status          text NOT NULL DEFAULT 'todo', -- 'todo' | 'in_progress' | 'done'
  assignee_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by      uuid NOT NULL REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kr_tasks_key_result_id_idx ON public.kr_tasks(key_result_id);
CREATE INDEX IF NOT EXISTS kr_tasks_assignee_id_idx ON public.kr_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS kr_tasks_created_by_idx ON public.kr_tasks(created_by);

ALTER TABLE public.kr_tasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "kr_tasks_read_all" ON public.kr_tasks
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "kr_tasks_insert_own" ON public.kr_tasks
    FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "kr_tasks_update_own" ON public.kr_tasks
    FOR UPDATE TO authenticated
    USING (created_by = auth.uid() OR assignee_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "kr_tasks_delete_own" ON public.kr_tasks
    FOR DELETE TO authenticated USING (created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- ── visible_units_for_person function ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.visible_units_for_person(p_person_id uuid)
RETURNS TABLE(unit_id uuid, unit_name text, depth int)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH RECURSIVE unit_tree AS (
    SELECT u.id AS uid, u.name AS uname, 0 AS d
    FROM public.units u
    JOIN public.people_units pu ON pu.unit_id = u.id
    WHERE pu.person_id = p_person_id

    UNION ALL

    SELECT u.id, u.name, ut.d + 1
    FROM public.units u
    JOIN unit_tree ut ON u.parent_id = ut.uid
  )
  SELECT DISTINCT uid AS unit_id, uname AS unit_name, d AS depth
  FROM unit_tree;
$$;

GRANT EXECUTE ON FUNCTION public.visible_units_for_person(uuid) TO authenticated;
