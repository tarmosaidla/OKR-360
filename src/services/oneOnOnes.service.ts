import { supabase } from '../lib/supabase'
import type { OneOnOne, OneOnOneEntry, Person } from '../types/cadence'

function profileToPerson(p: any): Person {
  if (!p) return { id: '', name: '—', role: '', initials: '?', color: '#888' }
  const parts = (p.full_name ?? '').trim().split(/\s+/)
  const initials = parts.slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? '').join('')
  return {
    id: p.id,
    name: p.full_name ?? '—',
    role: p.job_title ?? p.role ?? '',
    initials,
    color: p.color ?? '#888',
    avatar_url: p.avatar_url ?? null,
  }
}

// ── Reports (people in my units where I'm admin/lead) ─────────────────────

export async function getMyReports(userId: string): Promise<Person[]> {
  // Get units where current user is admin/lead
  const { data: myUnits } = await supabase
    .from('people_units')
    .select('unit_id')
    .eq('person_id', userId)
    .in('role', ['admin', 'lead'])

  const unitIds = (myUnits ?? []).map((m: any) => m.unit_id)
  if (unitIds.length === 0) return []

  // Get members (non-admin/lead) of those units who are not me
  const { data: members } = await supabase
    .from('people_units')
    .select('person_id, person:profiles!person_id(id, full_name, avatar_url, color, job_title)')
    .in('unit_id', unitIds)
    .in('role', ['member', 'contributor'])
    .neq('person_id', userId)

  // Deduplicate by person_id
  const seen = new Set<string>()
  return ((members ?? []) as any[])
    .filter((m: any) => m.person && !seen.has(m.person_id) && seen.add(m.person_id))
    .map((m: any) => profileToPerson(m.person))
}

// ── My manager (for reports who have no direct reports) ────────────────────

export async function getMyManager(userId: string): Promise<Person | null> {
  // Find units where I'm a member, get the admin/lead
  const { data: myUnits } = await supabase
    .from('people_units')
    .select('unit_id')
    .eq('person_id', userId)
    .in('role', ['member', 'contributor'])
    .eq('is_primary', true)
    .limit(1)

  if (!myUnits || myUnits.length === 0) return null
  const unitId = (myUnits[0] as any).unit_id

  const { data: leads } = await supabase
    .from('people_units')
    .select('person:profiles!person_id(id, full_name, avatar_url, color, job_title)')
    .eq('unit_id', unitId)
    .in('role', ['admin', 'lead'])
    .neq('person_id', userId)
    .limit(1)

  const lead = (leads ?? [])[0] as any
  return lead?.person ? profileToPerson(lead.person) : null
}

// ── Sessions for a pair ───────────────────────────────────────────────────

export async function getSessionsForPair(
  userId: string,
  otherId: string,
): Promise<OneOnOne[]> {
  const { data, error } = await supabase
    .from('one_on_ones')
    .select(`
      id, manager_id, report_id, scheduled_at, status, cycle_id,
      happiness, done, summary,
      next_date:meeting_date,
      manager:profiles!manager_id(id, full_name, avatar_url, color, job_title),
      report:profiles!report_id(id, full_name, avatar_url, color, job_title),
      entry:one_on_one_entries(
        id, one_on_one_id,
        personal_highlight, professional_highlight,
        personal_low, professional_low,
        work_wins, work_blockers, work_needs_manager, work_topics,
        feedback_for_report, feedback_from_report,
        happiness, happiness_followup, submitted_at, last_saved_at
      )
    `)
    .or(
      `and(manager_id.eq.${userId},report_id.eq.${otherId}),` +
      `and(manager_id.eq.${otherId},report_id.eq.${userId})`,
    )
    .order('scheduled_at', { ascending: false })
  if (error) throw error

  return ((data ?? []) as any[]).map((row: any) => ({
    ...row,
    manager: row.manager ? profileToPerson(row.manager) : null,
    report: row.report ? profileToPerson(row.report) : null,
    // entry is an array from the join — take the first one
    entry: Array.isArray(row.entry) ? (row.entry[0] ?? null) : (row.entry ?? null),
  })) as OneOnOne[]
}

// ── Create draft session ──────────────────────────────────────────────────

export async function createDraftSession(
  managerId: string,
  reportId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('one_on_ones')
    .insert({
      manager_id: managerId,
      report_id: reportId,
      scheduled_at: new Date().toISOString(),
      status: 'draft',
      done: false,
    })
    .select('id')
    .single()
  if (error) throw error

  // Create the entry row
  await supabase.from('one_on_one_entries').insert({ one_on_one_id: data.id })

  return data.id
}

// ── Upsert entry fields (auto-save) ───────────────────────────────────────

export async function upsertEntry(
  oneOnOneId: string,
  fields: Partial<OneOnOneEntry>,
): Promise<void> {
  const { data: existing } = await supabase
    .from('one_on_one_entries')
    .select('id')
    .eq('one_on_one_id', oneOnOneId)
    .single()

  if (existing) {
    await supabase
      .from('one_on_one_entries')
      .update({ ...fields, last_saved_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('one_on_one_entries')
      .insert({ one_on_one_id: oneOnOneId, ...fields, last_saved_at: new Date().toISOString() })
  }
}

// ── Submit session ────────────────────────────────────────────────────────

export async function submitSession(
  oneOnOneId: string,
  _submitterId: string,
  otherId: string,
  otherName: string,
): Promise<void> {
  const now = new Date().toISOString()

  // Mark session done
  await supabase
    .from('one_on_ones')
    .update({ status: 'done', done: true })
    .eq('id', oneOnOneId)

  // Mark entry submitted
  const { data: entry } = await supabase
    .from('one_on_one_entries')
    .select('id')
    .eq('one_on_one_id', oneOnOneId)
    .single()
  if (entry) {
    await supabase
      .from('one_on_one_entries')
      .update({ submitted_at: now, last_saved_at: now })
      .eq('id', (entry as any).id)
  }

  // Notify the other participant
  try {
    await supabase.rpc('send_notification', {
      p_person_id:  otherId,
      p_type:       'checkin_due',
      p_title:      `${otherName} submitted 1:1 prep`,
      p_body:       null,
      p_action_url: '/1on1s',
      p_metadata:   null,
    })
  } catch { /* best-effort */ }
}

// ── Legacy helpers kept for backward compat ────────────────────────────────

export async function getOneOnOnes(userId: string): Promise<OneOnOne[]> {
  const { data, error } = await supabase
    .from('one_on_ones')
    .select(`
      id, manager_id, report_id, scheduled_at, status, done, happiness, summary,
      next_date:meeting_date,
      report:profiles!report_id(id, full_name, avatar_url, color, job_title),
      manager:profiles!manager_id(id, full_name, avatar_url, color, job_title)
    `)
    .or(`manager_id.eq.${userId},report_id.eq.${userId}`)
    .order('scheduled_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as any[]).map((row: any) => ({
    ...row,
    manager: row.manager ? profileToPerson(row.manager) : null,
    report: row.report ? profileToPerson(row.report) : null,
    entry: null,
    cycle_id: row.cycle_id ?? null,
  })) as OneOnOne[]
}

export async function updateOneOnOne(id: string, patch: Partial<OneOnOne>): Promise<void> {
  const { error } = await supabase.from('one_on_ones').update(patch).eq('id', id)
  if (error) throw error
}
