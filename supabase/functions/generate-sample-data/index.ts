import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── ISO week helpers ──────────────────────────────────────────────────────

function isoWeek(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const y = d.getUTCFullYear()
  const jan4 = new Date(Date.UTC(y, 0, 4))
  const week = Math.ceil(((d.getTime() - jan4.getTime()) / 86400000 + 1) / 7)
  return { week, year: y }
}

/** Returns an array of {week, year} going back `count` weeks from today (oldest first) */
function recentWeeks(count: number): { week: number; year: number }[] {
  const result = []
  const now = new Date()
  for (let i = count; i >= 1; i--) {
    const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
    result.push(isoWeek(d))
  }
  return result
}

// ── Quarter helpers ───────────────────────────────────────────────────────

function currentQuarter(): { year: number; quarter: number; start: string; end: string; label: string } {
  const now = new Date()
  const y = now.getFullYear()
  const q = Math.floor(now.getMonth() / 3) + 1
  const starts = [[1, 0], [4, 3], [7, 6], [10, 9]]
  const [sm, ] = starts[q - 1]
  const [em, ] = starts[q % 4]
  const ey = q === 4 ? y + 1 : y
  const startDate = `${y}-${String(sm).padStart(2, '0')}-01`
  const endDate = q === 4
    ? `${y + 1}-01-01`
    : `${y}-${String(em).padStart(2, '0')}-01`
  return {
    year: y, quarter: q,
    start: startDate,
    end: endDate,
    label: `Q${q} ${y}`,
  }
}

// ── Sample data definitions ───────────────────────────────────────────────

const SAMPLE_UNITS = [
  { name: 'Product',     slug: 'product'     },
  { name: 'Engineering', slug: 'engineering' },
  { name: 'Sales',       slug: 'sales'       },
]

const SAMPLE_USERS = [
  { name: 'Alex Chen',      job_title: 'Head of Product',   slug: 'product'     },
  { name: 'Jamie Williams', job_title: 'Engineering Lead',  slug: 'engineering' },
  { name: 'Sam Rivera',     job_title: 'Head of Sales',     slug: 'sales'       },
]

interface KRDef {
  title: string
  target_type: string
  current_value: number
  target_value: number
  unit: string | null
  history: number[]        // 8 values oldest→newest
  confidence: number[]     // 8 values
}

interface ObjDef {
  title: string
  description: string
  status: string
  ownerSlug: string | 'founder'
  unitSlug: string | null
  krs: KRDef[]
}

const OBJECTIVES: ObjDef[] = [
  {
    title: 'Become the go-to solution in our market',
    description: 'Achieve market leadership through customer growth and revenue milestones.',
    status: 'on_track',
    ownerSlug: 'founder',
    unitSlug: null,
    krs: [
      {
        title: 'Reach 100 paying customers',
        target_type: 'numeric', current_value: 67, target_value: 100, unit: null,
        history:    [35, 39, 44, 48, 52, 57, 62, 67],
        confidence: [ 6,  6,  7,  7,  7,  7,  6,  6],
      },
      {
        title: 'Achieve $1M ARR',
        target_type: 'numeric', current_value: 720000, target_value: 1000000, unit: '$',
        history:    [480000, 515000, 550000, 590000, 630000, 670000, 700000, 720000],
        confidence: [     7,      7,      7,      7,      7,      7,      6,      6],
      },
      {
        title: 'Maintain NPS ≥ 50',
        target_type: 'numeric', current_value: 44, target_value: 50, unit: null,
        history:    [36, 38, 39, 40, 41, 42, 43, 44],
        confidence: [ 5,  5,  5,  5,  5,  5,  5,  5],
      },
    ],
  },
  {
    title: 'Ship product features that drive retention',
    description: 'Improve onboarding and retention with targeted product improvements.',
    status: 'at_risk',
    ownerSlug: 'product',
    unitSlug: 'product',
    krs: [
      {
        title: 'Activation rate ≥ 60%',
        target_type: 'percentage', current_value: 54, target_value: 60, unit: '%',
        history:    [44, 46, 48, 49, 50, 51, 52, 54],
        confidence: [ 5,  5,  5,  5,  5,  6,  5,  5],
      },
      {
        title: 'Time-to-value ≤ 10 min',
        target_type: 'numeric', current_value: 12, target_value: 10, unit: 'min',
        history:    [22, 20, 18, 17, 16, 15, 14, 12],
        confidence: [ 5,  5,  6,  6,  6,  6,  6,  5],
      },
      {
        title: '30-day retention ≥ 70%',
        target_type: 'percentage', current_value: 68, target_value: 70, unit: '%',
        history:    [58, 60, 62, 63, 64, 65, 66, 68],
        confidence: [ 7,  7,  7,  7,  7,  7,  7,  6],
      },
    ],
  },
  {
    title: 'Build engineering excellence',
    description: 'Establish deployment cadence, reliability, and performance standards.',
    status: 'on_track',
    ownerSlug: 'engineering',
    unitSlug: 'engineering',
    krs: [
      {
        title: 'Deploy ≥ 5 times per week',
        target_type: 'numeric', current_value: 6, target_value: 5, unit: '/week',
        history:    [1, 2, 2, 3, 4, 4, 5, 6],
        confidence: [4, 5, 5, 6, 7, 7, 8, 8],
      },
      {
        title: 'p95 API latency ≤ 200 ms',
        target_type: 'numeric', current_value: 218, target_value: 200, unit: 'ms',
        history:    [310, 285, 265, 252, 240, 233, 225, 218],
        confidence: [  5,   5,   6,   6,   6,   6,   6,   6],
      },
      {
        title: 'Zero P0 incidents in quarter',
        target_type: 'numeric', current_value: 0, target_value: 0, unit: null,
        history:    [3, 2, 2, 1, 1, 0, 0, 0],
        confidence: [4, 5, 5, 6, 7, 8, 9, 9],
      },
    ],
  },
  {
    title: 'Build a repeatable sales engine',
    description: 'Establish scalable sales processes and metrics.',
    status: 'behind',
    ownerSlug: 'sales',
    unitSlug: 'sales',
    krs: [
      {
        title: 'Pipeline coverage ≥ 3×',
        target_type: 'numeric', current_value: 2.4, target_value: 3, unit: '×',
        history:    [1.1, 1.4, 1.6, 1.8, 2.0, 2.2, 2.3, 2.4],
        confidence: [  4,   4,   4,   4,   5,   5,   5,   4],
      },
      {
        title: 'Close rate ≥ 25%',
        target_type: 'percentage', current_value: 22, target_value: 25, unit: '%',
        history:    [13, 14, 15, 16, 17, 18, 19, 22],
        confidence: [ 4,  4,  5,  5,  5,  5,  5,  5],
      },
      {
        title: 'CAC payback ≤ 12 months',
        target_type: 'numeric', current_value: 14, target_value: 12, unit: 'mo',
        history:    [22, 21, 20, 19, 18, 17, 16, 14],
        confidence: [ 4,  4,  4,  5,  5,  5,  5,  5],
      },
    ],
  },
]

interface KPIDef {
  name: string
  unit: string
  good: 'up' | 'down'
  role_name: string
  ownerSlug: 'product' | 'engineering' | 'sales' | 'founder'
  unitSlug: 'product' | 'engineering' | 'sales' | null
  plan: number
  actual: number
  snapshots: number[]
}

const KPIS: KPIDef[] = [
  {
    name: 'Activation rate', unit: '%', good: 'up', role_name: 'Product',
    ownerSlug: 'product', unitSlug: 'product', plan: 60, actual: 54,
    snapshots: [44, 46, 48, 49, 50, 51, 52, 54],
  },
  {
    name: 'Time-to-value', unit: 'min', good: 'down', role_name: 'Product',
    ownerSlug: 'product', unitSlug: 'product', plan: 10, actual: 12,
    snapshots: [22, 20, 18, 17, 16, 15, 14, 12],
  },
  {
    name: 'Deploys per week', unit: '/wk', good: 'up', role_name: 'Engineering',
    ownerSlug: 'engineering', unitSlug: 'engineering', plan: 5, actual: 6,
    snapshots: [1, 2, 2, 3, 4, 4, 5, 6],
  },
  {
    name: 'p95 API latency', unit: 'ms', good: 'down', role_name: 'Engineering',
    ownerSlug: 'engineering', unitSlug: 'engineering', plan: 200, actual: 218,
    snapshots: [310, 285, 265, 252, 240, 233, 225, 218],
  },
  {
    name: 'Pipeline coverage', unit: '×', good: 'up', role_name: 'Sales',
    ownerSlug: 'sales', unitSlug: 'sales', plan: 3.0, actual: 2.4,
    snapshots: [1.1, 1.4, 1.6, 1.8, 2.0, 2.2, 2.3, 2.4],
  },
  {
    name: 'MRR', unit: '$', good: 'up', role_name: 'Company',
    ownerSlug: 'founder', unitSlug: null, plan: 80000, actual: 71000,
    snapshots: [40000, 45000, 50000, 55000, 60000, 64000, 68000, 71000],
  },
]

// ── Main handler ──────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── 1. Verify caller ──────────────────────────────────────────────────
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    if (!token) throw new Error('Missing authorization header')

    const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !caller) throw new Error('Not authenticated')

    const { data: callerProfile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('id, org_id, is_global_admin')
      .eq('id', caller.id)
      .single()

    if (profErr || !callerProfile) throw new Error('Profile not found')
    if (!callerProfile.is_global_admin) throw new Error('Forbidden: global admin required')

    const { org_id: orgId, cycle_id: providedCycleId } = await req.json() as {
      org_id: string
      cycle_id?: string
    }

    if (!orgId) throw new Error('org_id is required')
    if (callerProfile.org_id !== orgId) throw new Error('Forbidden: org mismatch')

    // ── 2. Get org info ───────────────────────────────────────────────────
    const { data: org } = await supabaseAdmin
      .from('organisations')
      .select('id, slug, created_by')
      .eq('id', orgId)
      .single()

    if (!org) throw new Error('Organisation not found')
    const founderId = org.created_by ?? caller.id
    const orgSlug = org.slug ?? 'org'

    // ── 3. Create or use cycle ────────────────────────────────────────────
    let cycleId = providedCycleId

    if (!cycleId) {
      const qtr = currentQuarter()
      const { data: newCycle, error: cycleErr } = await supabaseAdmin
        .from('cycles')
        .insert({
          year: qtr.year,
          quarter: qtr.quarter,
          label: qtr.label,
          start_date: qtr.start,
          end_date: qtr.end,
          org_id: orgId,
        })
        .select('id')
        .single()

      if (cycleErr) {
        // Cycle might already exist — fetch it
        const { data: existing } = await supabaseAdmin
          .from('cycles')
          .select('id')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        if (!existing) throw new Error(`Failed to create cycle: ${cycleErr.message}`)
        cycleId = existing.id
      } else {
        cycleId = newCycle.id
      }
    }

    // ── 4. Create sample units ────────────────────────────────────────────
    const unitIds: Record<string, string> = {}

    for (const u of SAMPLE_UNITS) {
      const { data: unit, error: uErr } = await supabaseAdmin
        .from('units')
        .insert({ name: u.name, org_id: orgId, parent_id: null })
        .select('id')
        .single()

      if (uErr) {
        // Unit might already exist — find it
        const { data: existing } = await supabaseAdmin
          .from('units')
          .select('id')
          .eq('org_id', orgId)
          .eq('name', u.name)
          .single()
        if (existing) unitIds[u.slug] = existing.id
      } else {
        unitIds[u.slug] = unit.id
      }
    }

    // ── 5. Create demo auth users + profiles ──────────────────────────────
    const demoUserIds: Record<string, string> = { founder: founderId }

    for (const u of SAMPLE_USERS) {
      const email = `demo-${u.slug}-${orgSlug}@sample.cadence`

      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: 'Demo123!',
        email_confirm: true,
        user_metadata: { full_name: u.name },
      })

      let userId: string
      if (createErr) {
        // User might already exist — fetch by email
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
        const existing = users.find(usr => usr.email === email)
        if (!existing) throw new Error(`Failed to create demo user ${u.name}: ${createErr.message}`)
        userId = existing.id
      } else {
        userId = created.user.id
      }

      demoUserIds[u.slug] = userId

      // Upsert profile
      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        full_name: u.name,
        email,
        job_title: u.job_title,
        org_id: orgId,
        status: 'demo',
        is_global_admin: false,
        must_change_password: false,
      }, { onConflict: 'id' })

      // Assign to unit
      if (unitIds[u.slug]) {
        await supabaseAdmin.from('people_units').upsert({
          person_id: userId,
          unit_id: unitIds[u.slug],
          role: 'admin',
          is_primary: true,
          org_id: orgId,
        }, { onConflict: 'person_id,unit_id' })
      }
    }

    // ── 6. Create objectives + KRs + check-ins ────────────────────────────
    const weeks = recentWeeks(8)

    for (const objDef of OBJECTIVES) {
      const ownerId = demoUserIds[objDef.ownerSlug] ?? founderId
      const unitId = objDef.unitSlug ? (unitIds[objDef.unitSlug] ?? null) : null

      const { data: obj, error: objErr } = await supabaseAdmin
        .from('objectives')
        .insert({
          title: objDef.title,
          description: objDef.description,
          owner_id: ownerId,
          unit_id: unitId,
          cycle_id: cycleId,
          status: objDef.status,
          org_id: orgId,
          is_sample_data: true,
        })
        .select('id')
        .single()

      if (objErr) throw new Error(`Failed to create objective "${objDef.title}": ${objErr.message}`)

      for (const krDef of objDef.krs) {
        const { data: kr, error: krErr } = await supabaseAdmin
          .from('key_results')
          .insert({
            objective_id: obj.id,
            title: krDef.title,
            target_type: krDef.target_type,
            current_value: krDef.current_value,
            target_value: krDef.target_value,
            unit: krDef.unit,
            org_id: orgId,
            is_sample_data: true,
          })
          .select('id')
          .single()

        if (krErr) throw new Error(`Failed to create KR "${krDef.title}": ${krErr.message}`)

        // Create 8 weeks of check-in history
        for (let wi = 0; wi < weeks.length; wi++) {
          const { week, year } = weeks[wi]
          const value = krDef.history[wi]
          const confidence = krDef.confidence[wi]

          await supabaseAdmin.from('checkins').upsert({
            key_result_id: kr.id,
            author_id: ownerId,
            person_id: ownerId,
            value_at_checkin: value,
            new_value: value,
            week_number: week,
            year: year,
            cycle_id: cycleId,
            confidence: confidence,
            has_blocker: false,
            submitted_at: new Date(Date.now() - (weeks.length - wi) * 7 * 24 * 60 * 60 * 1000).toISOString(),
          }, { onConflict: 'key_result_id,person_id,week_number,year', ignoreDuplicates: true })
        }
      }
    }

    // ── 7. Create KPIs + snapshots ────────────────────────────────────────
    for (const kpiDef of KPIS) {
      const ownerId = demoUserIds[kpiDef.ownerSlug] ?? founderId
      const unitId = kpiDef.unitSlug ? (unitIds[kpiDef.unitSlug] ?? null) : null

      let kpiId: string | null = null
      try {
        const { data: kpi, error: kpiErr } = await supabaseAdmin
          .from('kpis')
          .insert({
            name: kpiDef.name,
            unit: kpiDef.unit,
            good: kpiDef.good,
            direction: kpiDef.good,
            role_name: kpiDef.role_name,
            owner_person_id: ownerId,
            owner_id: ownerId,
            unit_id: unitId,
            cycle_id: cycleId,
            plan: kpiDef.plan,
            actual: kpiDef.actual,
            org_id: orgId,
            is_sample_data: true,
          })
          .select('id')
          .single()

        if (kpiErr) throw kpiErr
        kpiId = kpi.id

        // Insert target
        await supabaseAdmin.from('kpi_targets').insert({
          kpi_id: kpiId,
          cycle_id: cycleId,
          plan_value: kpiDef.plan,
        }).then(() => {}) // ignore conflicts

        // Insert 8 weeks of snapshots
        for (let wi = 0; wi < weeks.length; wi++) {
          const { week, year } = weeks[wi]
          await supabaseAdmin.from('kpi_snapshots').upsert({
            kpi_id: kpiId,
            value: kpiDef.snapshots[wi],
            week_number: week,
            year: year,
          }, { onConflict: 'kpi_id,week_number,year', ignoreDuplicates: true })
        }
      } catch (kpiTableErr) {
        // kpis table might not exist — skip silently
        console.warn('KPI insert skipped:', kpiTableErr)
      }
    }

    // ── 8. Seed default permissions ───────────────────────────────────────
    try {
      await supabaseAdmin.rpc('seed_default_permissions', { p_org_id: orgId })
    } catch { /* ignore */ }

    // ── 9. Mark org has_sample_data = true ───────────────────────────────
    await supabaseAdmin
      .from('organisations')
      .update({ has_sample_data: true })
      .eq('id', orgId)

    return new Response(
      JSON.stringify({
        success: true,
        created: {
          units: Object.keys(unitIds).length,
          demo_users: Object.keys(demoUserIds).length - 1, // exclude founder
          objectives: OBJECTIVES.length,
          krs: OBJECTIVES.reduce((s, o) => s + o.krs.length, 0),
          kpis: KPIS.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[generate-sample-data] Error:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
