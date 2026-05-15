import { supabase } from '../lib/supabase'
import type { Team } from '../types'

export const teamsService = {
  async getAll(): Promise<Team[]> {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('name')

    if (error) throw error
    return data ?? []
  },
}
