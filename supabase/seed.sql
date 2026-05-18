-- ── Cadence OKR: demo seed data ──────────────────────────────────────────────
-- Run AFTER schema.sql + all migrations.
-- Uses the existing auth user (you) as one of the people.
-- All IDs are stable UUIDs so the script is idempotent.

-- ── Helpers ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.cycles WHERE year = 2026 AND quarter = 2) THEN
    INSERT INTO public.cycles (year, quarter, label, start_date, end_date, status)
    VALUES (2026, 2, 'Q2 2026', '2026-04-01', '2026-06-30', 'active');
  END IF;
END $$;

-- ── Org levels (idempotent) ───────────────────────────────────────────────────
INSERT INTO public.levels (id, name, color, position, enabled) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Group',      '#6366f1', 0, true),
  ('11111111-0000-0000-0000-000000000002', 'Subsidiary',  '#8b5cf6', 1, true),
  ('11111111-0000-0000-0000-000000000003', 'Department',  '#3b82f6', 2, true),
  ('11111111-0000-0000-0000-000000000004', 'Team',        '#22c55e', 3, true)
ON CONFLICT DO NOTHING;

-- ── Org units ─────────────────────────────────────────────────────────────────
INSERT INTO public.units (id, name, level_id, parent_id, position) VALUES
  -- Group
  ('22222222-0000-0000-0000-000000000001', 'Northwind Group',
    '11111111-0000-0000-0000-000000000001', NULL, 0),
  -- Subsidiaries
  ('22222222-0000-0000-0000-000000000002', 'Baltic Subsidiary',
    '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 0),
  ('22222222-0000-0000-0000-000000000003', 'Nordic Subsidiary',
    '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 1),
  -- Departments under Baltic
  ('22222222-0000-0000-0000-000000000004', 'Leadership',
    '11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000002', 0),
  ('22222222-0000-0000-0000-000000000005', 'Product',
    '11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000002', 1),
  ('22222222-0000-0000-0000-000000000006', 'Engineering',
    '11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000002', 2),
  ('22222222-0000-0000-0000-000000000007', 'Go-to-market',
    '11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000002', 3),
  -- Teams
  ('22222222-0000-0000-0000-000000000008', 'Platform',
    '11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000006', 0),
  ('22222222-0000-0000-0000-000000000009', 'Mobile',
    '11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000006', 1)
ON CONFLICT (id) DO NOTHING;

-- ── Demo profiles (non-auth users; the real auth user is seeded separately) ───
-- These are placeholder profiles. In a real setup, users sign up through auth.
-- We insert into profiles directly for demo purposes.
-- Tarmo Saidla (ts) should be the logged-in user — we update the first profile.

DO $$
DECLARE
  v_q2_cycle   uuid;
  v_kr_id      uuid;
  v_ts_id      uuid;   -- Tarmo (current auth user / engineering lead)
  v_hl_id      uuid;
  v_kr_id_ceo  uuid;
  v_mp_id      uuid;
  v_ar_id      uuid;
  v_jk_id      uuid;
  v_o1 uuid; v_o2 uuid; v_o3 uuid; v_o4 uuid;
  v_kr1 uuid; v_kr2 uuid; v_kr3 uuid;
  v_kr4 uuid; v_kr5 uuid; v_kr6 uuid;
  v_kr7 uuid; v_kr8 uuid; v_kr9 uuid;
  v_kr10 uuid; v_kr11 uuid; v_kr12 uuid;
  w int;
BEGIN
  SELECT id INTO v_q2_cycle FROM public.cycles WHERE year = 2026 AND quarter = 2 LIMIT 1;
  IF v_q2_cycle IS NULL THEN RAISE EXCEPTION 'Q2 2026 cycle not found — run schema + migrations first'; END IF;

  -- ── People: upsert profiles ────────────────────────────────────────────────
  -- Use the first existing profile as Tarmo (the logged-in engineer)
  SELECT id INTO v_ts_id FROM public.profiles ORDER BY created_at LIMIT 1;

  IF v_ts_id IS NOT NULL THEN
    UPDATE public.profiles SET
      full_name = 'Tarmo Saidla',
      role      = 'Engineering Lead',
      job_title = 'Engineering Lead',
      is_global_admin = true
    WHERE id = v_ts_id;
  END IF;

  -- Hannes Laaser — Head of Product (separate auth user needed in prod; skip if already exists)
  v_hl_id := '33333333-0000-0000-0000-000000000001';
  INSERT INTO public.profiles (id, full_name, role, job_title, email, status)
  VALUES (v_hl_id, 'Hannes Laaser', 'Head of Product', 'Head of Product', 'hannes@example.com', 'active')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role      = EXCLUDED.role,
    job_title = EXCLUDED.job_title;

  -- Kadi Rebane — CEO
  v_kr_id_ceo := '33333333-0000-0000-0000-000000000002';
  INSERT INTO public.profiles (id, full_name, role, job_title, email, status)
  VALUES (v_kr_id_ceo, 'Kadi Rebane', 'CEO', 'CEO', 'kadi@example.com', 'active')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role      = EXCLUDED.role,
    job_title = EXCLUDED.job_title;

  -- Mart Pärn — Head of Sales
  v_mp_id := '33333333-0000-0000-0000-000000000003';
  INSERT INTO public.profiles (id, full_name, role, job_title, email, status)
  VALUES (v_mp_id, 'Mart Pärn', 'Head of Sales', 'Head of Sales', 'mart@example.com', 'active')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role      = EXCLUDED.role,
    job_title = EXCLUDED.job_title;

  -- Anu Roosileht — Head of Marketing
  v_ar_id := '33333333-0000-0000-0000-000000000004';
  INSERT INTO public.profiles (id, full_name, role, job_title, email, status)
  VALUES (v_ar_id, 'Anu Roosileht', 'Head of Marketing', 'Head of Marketing', 'anu@example.com', 'active')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role      = EXCLUDED.role,
    job_title = EXCLUDED.job_title;

  -- Jaan Kask — Senior Engineer
  v_jk_id := '33333333-0000-0000-0000-000000000005';
  INSERT INTO public.profiles (id, full_name, role, job_title, email, status)
  VALUES (v_jk_id, 'Jaan Kask', 'Senior Engineer', 'Senior Engineer', 'jaan@example.com', 'active')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role      = EXCLUDED.role,
    job_title = EXCLUDED.job_title;

  -- ── Unit memberships ───────────────────────────────────────────────────────
  -- Tarmo in Engineering (admin/lead)
  IF v_ts_id IS NOT NULL THEN
    INSERT INTO public.people_units (person_id, unit_id, role, is_primary)
    VALUES
      (v_ts_id, '22222222-0000-0000-0000-000000000006', 'lead',   true),
      (v_ts_id, '22222222-0000-0000-0000-000000000004', 'member', false)
    ON CONFLICT (person_id, unit_id) DO UPDATE SET role = EXCLUDED.role, is_primary = EXCLUDED.is_primary;
  END IF;

  -- Hannes in Product
  INSERT INTO public.people_units (person_id, unit_id, role, is_primary)
  VALUES
    (v_hl_id, '22222222-0000-0000-0000-000000000005', 'lead',   true),
    (v_hl_id, '22222222-0000-0000-0000-000000000004', 'member', false)
  ON CONFLICT (person_id, unit_id) DO UPDATE SET role = EXCLUDED.role, is_primary = EXCLUDED.is_primary;

  -- Kadi in Leadership
  INSERT INTO public.people_units (person_id, unit_id, role, is_primary)
  VALUES (v_kr_id_ceo, '22222222-0000-0000-0000-000000000004', 'admin', true)
  ON CONFLICT (person_id, unit_id) DO UPDATE SET role = EXCLUDED.role, is_primary = EXCLUDED.is_primary;

  -- Mart in Go-to-market
  INSERT INTO public.people_units (person_id, unit_id, role, is_primary)
  VALUES
    (v_mp_id, '22222222-0000-0000-0000-000000000007', 'lead',   true),
    (v_mp_id, '22222222-0000-0000-0000-000000000004', 'member', false)
  ON CONFLICT (person_id, unit_id) DO UPDATE SET role = EXCLUDED.role, is_primary = EXCLUDED.is_primary;

  -- Anu in Go-to-market
  INSERT INTO public.people_units (person_id, unit_id, role, is_primary)
  VALUES (v_ar_id, '22222222-0000-0000-0000-000000000007', 'member', true)
  ON CONFLICT (person_id, unit_id) DO UPDATE SET role = EXCLUDED.role, is_primary = EXCLUDED.is_primary;

  -- Jaan in Engineering (Platform team)
  INSERT INTO public.people_units (person_id, unit_id, role, is_primary)
  VALUES
    (v_jk_id, '22222222-0000-0000-0000-000000000006', 'member', true),
    (v_jk_id, '22222222-0000-0000-0000-000000000008', 'member', false)
  ON CONFLICT (person_id, unit_id) DO UPDATE SET role = EXCLUDED.role, is_primary = EXCLUDED.is_primary;

  -- ── Objectives ─────────────────────────────────────────────────────────────
  v_o1 := '44444444-0000-0000-0000-000000000001';
  v_o2 := '44444444-0000-0000-0000-000000000002';
  v_o3 := '44444444-0000-0000-0000-000000000003';
  v_o4 := '44444444-0000-0000-0000-000000000004';

  INSERT INTO public.objectives (id, title, owner_id, cycle_id, unit_id, status) VALUES
    (v_o1, 'Become the default OKR tool for Nordic scale-ups',
      v_kr_id_ceo, v_q2_cycle, '22222222-0000-0000-0000-000000000004', 'on_track'),
    (v_o2, 'Ship Cadence Insights — turn standups into signal',
      v_hl_id,     v_q2_cycle, '22222222-0000-0000-0000-000000000005', 'on_track'),
    (v_o3, 'Make Cadence the fastest tool in our category',
      v_ts_id,     v_q2_cycle, '22222222-0000-0000-0000-000000000006', 'on_track'),
    (v_o4, 'Turn the website into our best salesperson',
      v_ar_id,     v_q2_cycle, '22222222-0000-0000-0000-000000000007', 'at_risk')
  ON CONFLICT (id) DO UPDATE SET
    title    = EXCLUDED.title,
    owner_id = EXCLUDED.owner_id,
    unit_id  = EXCLUDED.unit_id,
    status   = EXCLUDED.status;

  -- If Tarmo is NULL (no existing user), set a fallback owner for o3
  IF v_ts_id IS NULL THEN
    UPDATE public.objectives SET owner_id = v_kr_id_ceo WHERE id = v_o3;
  END IF;

  -- ── Key Results ────────────────────────────────────────────────────────────
  v_kr1  := '55555555-0000-0000-0000-000000000001';
  v_kr2  := '55555555-0000-0000-0000-000000000002';
  v_kr3  := '55555555-0000-0000-0000-000000000003';
  v_kr4  := '55555555-0000-0000-0000-000000000004';
  v_kr5  := '55555555-0000-0000-0000-000000000005';
  v_kr6  := '55555555-0000-0000-0000-000000000006';
  v_kr7  := '55555555-0000-0000-0000-000000000007';
  v_kr8  := '55555555-0000-0000-0000-000000000008';
  v_kr9  := '55555555-0000-0000-0000-000000000009';
  v_kr10 := '55555555-0000-0000-0000-000000000010';
  v_kr11 := '55555555-0000-0000-0000-000000000011';
  v_kr12 := '55555555-0000-0000-0000-000000000012';

  INSERT INTO public.key_results
    (id, objective_id, title, target_value, current_value, unit, confidence) VALUES
    -- O1: Nordic growth
    (v_kr1,  v_o1, 'Reach 120 paying teams (from 84)',   120, 103,  'teams', 8),
    (v_kr2,  v_o1, '$2.4M ARR run-rate',                 2.4, 1.92, '$M',   7),
    (v_kr3,  v_o1, 'Net revenue retention ≥ 115%',       115, 109,  '%',    6),
    -- O2: Insights
    (v_kr4,  v_o2, 'Beta to 25 design-partner teams',    25,  17,   'teams', 8),
    (v_kr5,  v_o2, 'Weekly active retention ≥ 70%',      70,  62,   '%',    6),
    (v_kr6,  v_o2, 'Insights drives 3+ check-ins/user/wk', 3, 2.1, 'ck/wk', 6),
    -- O3: Speed
    (v_kr7,  v_o3, 'p95 dashboard load ≤ 200ms',         200, 214,  'ms',   9),
    (v_kr8,  v_o3, 'Zero P0 incidents this quarter',     0,   0,    'P0s',  10),
    (v_kr9,  v_o3, 'Cut bundle size to ≤ 180kb gz',      180, 196,  'kb',   7),
    -- O4: Website
    (v_kr10, v_o4, 'Trial signups ≥ 1,200/mo',           1200, 740, '/mo',  3),
    (v_kr11, v_o4, 'Marketing-sourced ARR ≥ $480K',       480, 220, '$K',   4),
    (v_kr12, v_o4, 'Activation rate ≥ 55%',               55,  47,  '%',    5)
  ON CONFLICT (id) DO UPDATE SET
    title         = EXCLUDED.title,
    target_value  = EXCLUDED.target_value,
    current_value = EXCLUDED.current_value,
    unit          = EXCLUDED.unit,
    confidence    = EXCLUDED.confidence;

  -- ── KPIs ──────────────────────────────────────────────────────────────────
  BEGIN
    INSERT INTO public.kpis
      (id, name, unit, good, plan, plan_to_date, actual, cycle_id, role_name, owner_person_id, owner_id, unit_id, created_by)
    VALUES
      ('66666666-0000-0000-0000-000000000001', 'Activation rate',         '%',  'up',   55,   50,   47,   v_q2_cycle, 'Head of Product',   v_hl_id,     v_hl_id,     '22222222-0000-0000-0000-000000000005', COALESCE(v_ts_id, v_hl_id)),
      ('66666666-0000-0000-0000-000000000002', 'Time-to-value (median)', 'min', 'down',  7,    8,    9.2,  v_q2_cycle, 'Head of Product',   v_hl_id,     v_hl_id,     '22222222-0000-0000-0000-000000000005', COALESCE(v_ts_id, v_hl_id)),
      ('66666666-0000-0000-0000-000000000003', 'p95 dashboard latency',  'ms',  'down', 200,  220,  214,  v_q2_cycle, 'Engineering Lead',  COALESCE(v_ts_id, v_hl_id), COALESCE(v_ts_id, v_hl_id), '22222222-0000-0000-0000-000000000006', COALESCE(v_ts_id, v_hl_id)),
      ('66666666-0000-0000-0000-000000000004', 'Deploys per week',        '',   'up',   25,   24,   31,   v_q2_cycle, 'Engineering Lead',  COALESCE(v_ts_id, v_hl_id), COALESCE(v_ts_id, v_hl_id), '22222222-0000-0000-0000-000000000006', COALESCE(v_ts_id, v_hl_id)),
      ('66666666-0000-0000-0000-000000000005', 'Pipeline coverage',       'x',  'up',   3.5,  3.2,  3.6,  v_q2_cycle, 'Head of Sales',     v_mp_id,     v_mp_id,     '22222222-0000-0000-0000-000000000007', COALESCE(v_ts_id, v_hl_id)),
      ('66666666-0000-0000-0000-000000000006', 'Net revenue retention',   '%',  'up',   115,  112,  109,  v_q2_cycle, 'Head of Sales',     v_mp_id,     v_mp_id,     '22222222-0000-0000-0000-000000000007', COALESCE(v_ts_id, v_hl_id)),
      ('66666666-0000-0000-0000-000000000007', 'Trial signups',           '/mo','up',   1200, 1050, 740,  v_q2_cycle, 'Head of Marketing', v_ar_id,     v_ar_id,     '22222222-0000-0000-0000-000000000007', COALESCE(v_ts_id, v_hl_id)),
      ('66666666-0000-0000-0000-000000000008', 'Cost per qualified lead', '€',  'down', 180,  195,  168,  v_q2_cycle, 'Head of Marketing', v_ar_id,     v_ar_id,     '22222222-0000-0000-0000-000000000007', COALESCE(v_ts_id, v_hl_id)),
      ('66666666-0000-0000-0000-000000000009', 'Cash runway',             'mo', 'up',   24,   22,   23,   v_q2_cycle, 'CEO',               v_kr_id_ceo, v_kr_id_ceo, '22222222-0000-0000-0000-000000000004', COALESCE(v_ts_id, v_hl_id)),
      ('66666666-0000-0000-0000-000000000010', 'Employee eNPS',           '',   'up',   45,   40,   52,   v_q2_cycle, 'CEO',               v_kr_id_ceo, v_kr_id_ceo, '22222222-0000-0000-0000-000000000004', COALESCE(v_ts_id, v_hl_id))
    ON CONFLICT (id) DO UPDATE SET
      actual       = EXCLUDED.actual,
      plan         = EXCLUDED.plan,
      plan_to_date = EXCLUDED.plan_to_date;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- ── Initiatives ────────────────────────────────────────────────────────────
  BEGIN
    INSERT INTO public.initiatives
      (id, title, owner_id, owner_person_id, status, progress, due_label, due, year, unit_id, created_by)
    VALUES
      ('77777777-0000-0000-0000-000000000001', 'Ship Cadence Insights to GA',
        v_hl_id, v_hl_id, 'On track', 0.58, 'Q3 2026', 'Q3 2026', 2026, '22222222-0000-0000-0000-000000000005', COALESCE(v_ts_id, v_hl_id)),
      ('77777777-0000-0000-0000-000000000002', 'Migrate primary region to eu-north-1',
        COALESCE(v_ts_id, v_hl_id), COALESCE(v_ts_id, v_hl_id), 'On track', 0.72, 'Q2 2026', 'Q2 2026', 2026, '22222222-0000-0000-0000-000000000006', COALESCE(v_ts_id, v_hl_id)),
      ('77777777-0000-0000-0000-000000000003', 'Hire Director of Sales (Nordics)',
        v_kr_id_ceo, v_kr_id_ceo, 'At risk', 0.30, 'Q3 2026', 'Q3 2026', 2026, '22222222-0000-0000-0000-000000000004', COALESCE(v_ts_id, v_hl_id)),
      ('77777777-0000-0000-0000-000000000004', 'Open-source the Cadence CLI',
        v_jk_id, v_jk_id, 'On track', 0.45, 'Q4 2026', 'Q4 2026', 2026, '22222222-0000-0000-0000-000000000006', COALESCE(v_ts_id, v_hl_id)),
      ('77777777-0000-0000-0000-000000000005', 'SOC 2 Type II audit',
        v_kr_id_ceo, v_kr_id_ceo, 'Off track', 0.18, 'Q3 2026', 'Q3 2026', 2026, '22222222-0000-0000-0000-000000000004', COALESCE(v_ts_id, v_hl_id))
    ON CONFLICT (id) DO UPDATE SET
      progress  = EXCLUDED.progress,
      status    = EXCLUDED.status;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- ── Check-in history (last 7 weeks for each KR) ────────────────────────────
  -- Week 14-20 of 2026 (Q2 2026 weeks 1-7)
  -- Only seed for KRs where we have an owner we can reference

  BEGIN
    FOR w IN 14..20 LOOP
      -- O1 KRs
      INSERT INTO public.checkins (key_result_id, author_id, value_at_checkin, week_number, year, person_id, new_value, confidence, cycle_id)
      VALUES
        (v_kr1, v_kr_id_ceo, 84 + (w - 14) * 2.7, w, 2026, v_kr_id_ceo, 84 + (w - 14) * 2.7, 7 + CASE WHEN w >= 19 THEN 1 ELSE 0 END, v_q2_cycle),
        (v_kr2, v_kr_id_ceo, 1.5 + (w - 14) * 0.06, w, 2026, v_kr_id_ceo, 1.5 + (w - 14) * 0.06, 7, v_q2_cycle),
        (v_kr3, v_mp_id, 106 + (w - 14) * 0.5, w, 2026, v_mp_id, 106 + (w - 14) * 0.5, 6, v_q2_cycle)
      ON CONFLICT DO NOTHING;

      -- O3 KRs (engineering) — use Tarmo if available
      IF v_ts_id IS NOT NULL THEN
        INSERT INTO public.checkins (key_result_id, author_id, value_at_checkin, week_number, year, person_id, new_value, confidence, cycle_id)
        VALUES
          (v_kr7, v_ts_id, 240 - (w - 14) * 3.5, w, 2026, v_ts_id, 240 - (w - 14) * 3.5, 8 + CASE WHEN w >= 19 THEN 1 ELSE 0 END, v_q2_cycle),
          (v_kr8, v_ts_id, 0, w, 2026, v_ts_id, 0, 10, v_q2_cycle),
          (v_kr9, v_jk_id, 220 - (w - 14) * 3.5, w, 2026, v_jk_id, 220 - (w - 14) * 3.5, 7, v_q2_cycle)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    -- checkin columns may not exist yet — skip
    NULL;
  END;

END $$;
