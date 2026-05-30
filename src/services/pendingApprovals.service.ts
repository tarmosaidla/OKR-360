import { supabase } from '../lib/supabase'
import type { PendingApproval } from '../types/cadence'

export async function getPendingApprovals(orgId: string): Promise<PendingApproval[]> {
  const { data, error } = await supabase
    .from('pending_approvals')
    .select('*')
    .eq('org_id', orgId)
    .order('requested_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as PendingApproval[]
}

export async function createPendingApproval(
  personId: string,
  email: string,
  fullName: string,
  orgId: string,
): Promise<void> {
  const { error } = await supabase
    .from('pending_approvals')
    .upsert({ person_id: personId, email, full_name: fullName, org_id: orgId },
             { onConflict: 'person_id' })
  if (error) throw error
}

export async function approveUser(
  personId: string,
  unitId: string,
  role: string,
  orgName: string,
): Promise<void> {
  // Activate the user
  await supabase.from('profiles').update({ status: 'active' }).eq('id', personId)
  // Add to unit
  await supabase.from('people_units').upsert(
    { person_id: personId, unit_id: unitId, role, is_primary: true },
    { onConflict: 'person_id,unit_id' },
  )
  // Remove from queue
  await supabase.from('pending_approvals').delete().eq('person_id', personId)
  // Notify the user
  await supabase.from('notifications').insert({
    person_id: personId,
    type: 'invite_accepted',
    title: `Your account has been approved — welcome to ${orgName}!`,
    body: 'You now have full access to the workspace.',
    action_url: '/dashboard',
  })
}

export async function rejectUser(personId: string): Promise<void> {
  await supabase.from('profiles').update({ status: 'inactive' }).eq('id', personId)
  await supabase.from('pending_approvals').delete().eq('person_id', personId)
}
