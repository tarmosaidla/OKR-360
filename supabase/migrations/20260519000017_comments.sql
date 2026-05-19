-- Comments on objectives and key results
CREATE TABLE IF NOT EXISTS public.comments (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  author_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  objective_id    uuid        REFERENCES public.objectives(id) ON DELETE CASCADE,
  key_result_id   uuid        REFERENCES public.key_results(id) ON DELETE CASCADE,
  body            text        NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 2000),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT comments_one_target CHECK (
    (objective_id IS NOT NULL)::int + (key_result_id IS NOT NULL)::int = 1
  )
);

CREATE INDEX IF NOT EXISTS comments_objective_idx   ON public.comments(objective_id)  WHERE objective_id   IS NOT NULL;
CREATE INDEX IF NOT EXISTS comments_key_result_idx  ON public.comments(key_result_id) WHERE key_result_id  IS NOT NULL;
CREATE INDEX IF NOT EXISTS comments_org_idx         ON public.comments(org_id);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Org members can read comments in their org
CREATE POLICY "comments_select_org" ON public.comments
  FOR SELECT TO authenticated
  USING (org_id = public.my_org_id());

-- Authenticated users can post comments (org_id auto-filled by trigger)
CREATE POLICY "comments_insert_own" ON public.comments
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

-- Authors can delete their own comments
CREATE POLICY "comments_delete_own" ON public.comments
  FOR DELETE TO authenticated
  USING (author_id = auth.uid());

-- Trigger: auto-fill org_id on insert
CREATE OR REPLACE FUNCTION public.set_comment_org_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NEW.org_id := public.my_org_id();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_comment_org_id_trigger ON public.comments;
CREATE TRIGGER set_comment_org_id_trigger
  BEFORE INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.set_comment_org_id();
