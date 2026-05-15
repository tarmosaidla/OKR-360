import { supabase } from '../lib/supabase'
import type { KeyResult, CreateKeyResultInput, UpdateKeyResultInput } from '../types'

export const keyResultsService = {
  async getByObjective(objectiveId: string): Promise<KeyResult[]> {
    const { data, error } = await supabase
      .from('key_results')
      .select('*')
      .eq('objective_id', objectiveId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data ?? []
  },

  async create(input: CreateKeyResultInput): Promise<KeyResult> {
    const { data, error } = await supabase
      .from('key_results')
      .insert(input)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, input: UpdateKeyResultInput): Promise<KeyResult> {
    const { data, error } = await supabase
      .from('key_results')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('key_results').delete().eq('id', id)
    if (error) throw error
  },
}
