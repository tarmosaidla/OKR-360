-- ─── Org levels ─────────────────────────────────────────────────────────────
-- Configurable per-org hierarchy: Group → Company → Division → Team → Individual
-- depth 0 = top, 4 = bottom; orgs configure which levels they use

CREATE TABLE IF NOT EXISTS public.org_levels (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  depth      int  NOT NULL CHECK (depth >= 0 AND depth <= 4),
  color      text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now(),
  UNIQUE (depth)
);

ALTER TABLE public.org_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_levels_read_all" ON public.org_levels FOR SELECT USING (true);

-- Default 4-level config (run ONCE; skip if already seeded)
INSERT INTO public.org_levels (name, depth, color) VALUES
  ('Group',      0, '#6366f1'),
  ('Company',    1, '#8b5cf6'),
  ('Division',   2, '#3b82f6'),
  ('Team',       3, '#22c55e')
ON CONFLICT (depth) DO NOTHING;

-- ─── Team hierarchy ──────────────────────────────────────────────────────────
-- Add parent_id so teams can nest into an org tree

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS parent_id  uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS level_id   uuid REFERENCES public.org_levels(id) ON DELETE SET NULL;

-- ─── Objective cascade ───────────────────────────────────────────────────────
-- parent_objective_id links an objective to the one above it in the cascade
-- level_id records which hierarchy level this objective belongs to

ALTER TABLE public.objectives
  ADD COLUMN IF NOT EXISTS parent_objective_id uuid REFERENCES public.objectives(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS level_id            uuid REFERENCES public.org_levels(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_objectives_parent ON public.objectives(parent_objective_id);
CREATE INDEX IF NOT EXISTS idx_objectives_level  ON public.objectives(level_id);
