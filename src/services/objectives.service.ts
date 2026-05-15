import { supabase } from '../lib/supabase'
import type { Objective, CreateObjectiveInput, UpdateObjectiveInput } from '../types'

const SELECT_OBJECTIVE = `
  id, title, description, owner_id, team_id, cycle_id, status, created_at, updated_at,
  owner:profiles(id, full_name, avatar_url, team_id),
  team:teams(id, name),
  key_results(id, objective_id, title, target_type, current_value, target_value, unit, created_at, updated_at)
`

export const objectivesService = {
  async getByCycle(cycleId: string, teamId?: string | null): Promise<Objective[]> {
    let query = supabase
      .from('objectives')
      .select(SELECT_OBJECTIVE)
      .eq('cycle_id', cycleId)
      .order('created_at', { ascending: false })

    if (teamId) query = query.eq('team_id', teamId)

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as unknown as Objective[]
  },

  async getByOwner(cycleId: string, ownerId: string): Promise<Objective[]> {
    const { data, error } = await supabase
      .from('objectives')
      .select(SELECT_OBJECTIVE)
      .eq('cycle_id', cycleId)
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as unknown as Objective[]
  },

  async getById(id: string): Promise<Objective | null> {
    const { data, error } = await supabase
      .from('objectives')
      .select(SELECT_OBJECTIVE)
      .eq('id', id)
      .single()

    if (error) throw error
    return data as unknown as Objective
  },

  async create(input: CreateObjectiveInput & { owner_id: string }): Promise<Objective> {
    const { data, error } = await supabase
      .from('objectives')
      .insert(input)
      .select(SELECT_OBJECTIVE)
      .single()

    if (error) throw error
    return data as unknown as Objective
  },

  async update(id: string, input: UpdateObjectiveInput): Promise<Objective> {
    const { data, error } = await supabase
      .from('objectives')
      .update(input)
      .eq('id', id)
      .select(SELECT_OBJECTIVE)
      .single()

    if (error) throw error
    return data as unknown as Objective
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('objectives').delete().eq('id', id)
    if (error) throw error
  },
}
