import { supabase } from '../lib/supabase'
import type { PeopleUnit, PeopleUnitRole, VisibleUnit } from '../types/cadence'

export async function getPeopleUnits(personId: string): Promise<PeopleUnit[]> {
  const { data, error } = await supabase
    .from('people_units')
    .select('id, person_id, unit_id, role, is_primary, joined_at, unit:units(id, name, level_id, parent_id, position)')
    .eq('person_id', personId)
    .order('joined_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as PeopleUnit[]
}

export async function getUnitMembers(unitId: string): Promise<PeopleUnit[]> {
  const { data, error } = await supabase
    .from('people_units')
    .select('id, person_id, unit_id, role, is_primary, joined_at, person:profiles!person_id(id, full_name, avatar_url, color, role)')
    .eq('unit_id', unitId)
    .order('joined_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as PeopleUnit[]
}

export async function joinUnit(personId: string, unitId: string, role: PeopleUnitRole): Promise<PeopleUnit> {
  const { data, error } = await supabase
    .from('people_units')
    .insert({ person_id: personId, unit_id: unitId, role })
    .select()
    .single()
  if (error) throw error
  return data as PeopleUnit
}

export async function leaveUnit(membershipId: string): Promise<void> {
  const { error } = await supabase
    .from('people_units')
    .delete()
    .eq('id', membershipId)
  if (error) throw error
}

export async function setPrimaryUnit(personId: string, unitId: string): Promise<void> {
  // Clear all primary flags for this person, then set the new one
  const { error: clearError } = await supabase
    .from('people_units')
    .update({ is_primary: false })
    .eq('person_id', personId)
  if (clearError) throw clearError

  const { error: setError } = await supabase
    .from('people_units')
    .update({ is_primary: true })
    .eq('person_id', personId)
    .eq('unit_id', unitId)
  if (setError) throw setError
}

export async function updateRole(membershipId: string, role: PeopleUnitRole): Promise<void> {
  const { error } = await supabase
    .from('people_units')
    .update({ role })
    .eq('id', membershipId)
  if (error) throw error
}

export async function getVisibleUnits(personId: string): Promise<VisibleUnit[]> {
  const { data, error } = await supabase
    .rpc('visible_units_for_person', { p_person_id: personId })
  if (error) throw error
  return (data ?? []) as VisibleUnit[]
}
