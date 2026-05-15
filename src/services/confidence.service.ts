import { supabase } from '../lib/supabase'

export interface ConfidenceLog {
  id: string
  key_result_id: string
  week: number
  year: number
  value: number
  created_by: string
}

export async function getConfidenceLogs(keyResultIds: string[], year: number): Promise<ConfidenceLog[]> {
  const { data, error } = await supabase
    .from('confidence_logs')
    .select('*')
    .in('key_result_id', keyResultIds)
    .eq('year', year)
    .order('week', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function upsertConfidence(
  keyResultId: string,
  week: number,
  year: number,
  value: number,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('confidence_logs')
    .upsert(
      { key_result_id: keyResultId, week, year, value, created_by: userId },
      { onConflict: 'key_result_id,week,year' },
    )
  if (error) throw error
}
