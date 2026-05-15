import { supabase } from '../lib/supabase'
import type { Checkin, CreateCheckinInput } from '../types'

export const checkinsService = {
  async getByKeyResult(keyResultId: string): Promise<Checkin[]> {
    const { data, error } = await supabase
      .from('checkins')
      .select('*, author:profiles(id, full_name, avatar_url)')
      .eq('key_result_id', keyResultId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as unknown as Checkin[]
  },

  async create(input: CreateCheckinInput & { author_id: string }): Promise<Checkin> {
    const { data, error } = await supabase
      .from('checkins')
      .insert(input)
      .select('*, author:profiles(id, full_name, avatar_url)')
      .single()

    if (error) throw error
    return data as unknown as Checkin
  },
}
