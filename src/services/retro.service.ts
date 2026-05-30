import { supabase } from '../lib/supabase'
import { getISOWeek } from '../lib/cadenceUtils'
import type { IndividualRetro } from '../types/cadence'

export async function getMyRetro(
  personId: string,
  weekNumber?: number,
  year?: number,
): Promise<IndividualRetro | null> {
  const w = weekNumber ?? getISOWeek(new Date())
  const y = year ?? new Date().getFullYear()
  const { data } = await supabase
    .from('retros')
    .select('id, person_id, week_number, year, parking_lot, top_work, notes_text, feedforward')
    .eq('person_id', personId)
    .eq('week_number', w)
    .eq('year', y)
    .single()
  return data as IndividualRetro | null
}

export async function upsertRetro(
  personId: string,
  weekNumber: number,
  year: number,
  patch: Partial<Pick<IndividualRetro, 'parking_lot' | 'top_work' | 'notes_text' | 'feedforward'>>,
): Promise<void> {
  const { error } = await supabase
    .from('retros')
    .upsert(
      { person_id: personId, week_number: weekNumber, year, ...patch },
      { onConflict: 'person_id,week_number,year' },
    )
  if (error) throw error
}

export async function getRetroHistory(personId: string, limit = 26): Promise<IndividualRetro[]> {
  const { data, error } = await supabase
    .from('retros')
    .select('id, person_id, week_number, year, parking_lot, top_work, notes_text, feedforward')
    .eq('person_id', personId)
    .not('person_id', 'is', null)
    .order('year', { ascending: false })
    .order('week_number', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as IndividualRetro[]
}
