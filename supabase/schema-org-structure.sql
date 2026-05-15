-- ─── Org structure tables ────────────────────────────────────────────────────
-- Replaces the org_levels + teams approach with a clean levels / units / settings split

-- Hierarchy level definitions (Group, Company, Division, Team, …)
CREATE TABLE IF NOT EXISTS public.levels (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name     text NOT NULL,
  color    text NOT NULL DEFAULT '#6366f1',
  position int  NOT NULL DEFAULT 0,   -- sort order, 0 = top
  enabled  bool NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "levels_read_all"   ON public.levels FOR SELECT USING (true);
CREATE POLICY "levels_write_auth" ON public.levels FOR ALL USING (auth.role() = 'authenticated');

-- Default 4-level configuration
INSERT INTO public.levels (name, color, position, enabled) VALUES
  ('Group',    '#6366f1', 0, true),
  ('Company',  '#8b5cf6', 1, true),
  ('Division', '#3b82f6', 2, true),
  ('Team',     '#22c55e', 3, true)
ON CONFLICT DO NOTHING;

-- Org units — the actual entities in the chart (Baltic Subsidiary, Engineering, Mobile Team…)
CREATE TABLE IF NOT EXISTS public.units (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name      text NOT NULL,
  level_id  uuid REFERENCES public.levels(id) ON DELETE SET NULL,
  parent_id uuid REFERENCES public.units(id)  ON DELETE SET NULL,
  position  int  NOT NULL DEFAULT 0,           -- sort within siblings
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_units_parent   ON public.units(parent_id);
CREATE INDEX IF NOT EXISTS idx_units_level    ON public.units(level_id);
CREATE INDEX IF NOT EXISTS idx_units_position ON public.units(position);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "units_read_all"   ON public.units FOR SELECT USING (true);
CREATE POLICY "units_write_auth" ON public.units FOR ALL USING (auth.role() = 'authenticated');

-- Cascade behaviour settings (one row per org — upsert on id)
CREATE TABLE IF NOT EXISTS public.org_settings (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  require_parent_link      bool NOT NULL DEFAULT false,
  allow_cross_level        bool NOT NULL DEFAULT false,
  individual_level_enabled bool NOT NULL DEFAULT false,
  show_alignment_gaps      bool NOT NULL DEFAULT true,
  updated_at               timestamptz DEFAULT now()
);

ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_settings_read_all"   ON public.org_settings FOR SELECT USING (true);
CREATE POLICY "org_settings_write_auth" ON public.org_settings FOR ALL USING (auth.role() = 'authenticated');

-- Seed one default row
INSERT INTO public.org_settings (require_parent_link, allow_cross_level, individual_level_enabled, show_alignment_gaps)
VALUES (false, false, false, true)
ON CONFLICT DO NOTHING;

-- Add unit_id to objectives so an objective can belong to an org unit
ALTER TABLE public.objectives
  ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL;
