import { supabase } from '../lib/supabase'
import type { Cycle } from '../types'

export const cyclesService = {
  async getAll(): Promise<Cycle[]> {
    const { data, error } = await supabase
      .from('cycles')
      .select('*')
      .order('year', { ascending: true })
      .order('quarter', { ascending: true })

    if (error) throw error
    return data ?? []
  },
}
