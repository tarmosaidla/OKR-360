import { supabase } from '../lib/supabase'
import type { Initiative } from '../types/cadence'

function rowToInitiative(row: any): Initiative {
  return {
    id:              row.id,
    title:           row.title,
    owner_id:        row.owner_id ?? null,
    owner_person_id: row.owner_person_id ?? null,
    owner:           row.owner ?? null,
    unit_id:         row.unit_id ?? null,
    status:          row.status ?? 'On track',
    progress:        row.progress ?? 0,
    due_label:       row.due_label ?? row.due ?? '',
    due:             row.due ?? row.due_label ?? null,
    year:            row.year ?? null,
    cycle_id:        row.cycle_id ?? null,
    created_by:      row.created_by ?? null,
  }
}

export async function getInitiatives(_cycleId: string): Promise<Initiative[]> {
  const { data, error } = await supabase
    .from('initiatives')
    .select('*, owner:profiles!owner_person_id(id, full_name, avatar_url, color)')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map(rowToInitiative)
}

export async function getInitiativesForPerson(
  personId: string,
  year?: number,
): Promise<Initiative[]> {
  let q = supabase
    .from('initiatives')
    .select('*, owner:profiles!owner_person_id(id, full_name, avatar_url, color)')
    .or(`owner_person_id.eq.${personId},owner_id.eq.${personId}`)
    .order('due', { ascending: true })

  if (year) q = q.eq('year', year)

  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map(rowToInitiative)
}

export async function updateInitiativeProgress(id: string, progress: number): Promise<void> {
  const { error } = await supabase
    .from('initiatives')
    .update({ progress })
    .eq('id', id)
  if (error) throw error
}

export async function updateInitiativeStatus(
  id: string,
  status: Initiative['status'],
): Promise<void> {
  const { error } = await supabase
    .from('initiatives')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

export interface CreateInitiativeInput {
  title: string
  unit_id: string | null
  status: Initiative['status']
  due: string
  year: number
  owner_person_id: string
  created_by: string
}

export async function createInitiative(input: CreateInitiativeInput): Promise<string> {
  const { data, error } = await supabase
    .from('initiatives')
    .insert({
      title:           input.title,
      unit_id:         input.unit_id,
      owner_id:        input.owner_person_id,
      owner_person_id: input.owner_person_id,
      status:          input.status,
      progress:        0,
      due:             input.due,
      due_label:       input.due,
      year:            input.year,
      created_by:      input.created_by,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}
