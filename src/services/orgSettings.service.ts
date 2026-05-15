import { supabase } from '../lib/supabase'
import type { OrgSettings } from '../types/cadence'

export async function getOrgSettings(): Promise<OrgSettings> {
  const { data, error } = await supabase
    .from('org_settings')
    .select('*')
    .single()
  if (error) {
    // Table not yet migrated — return safe defaults
    return { require_parent_link: false, allow_cross_level: false, individual_level_enabled: false, show_alignment_gaps: true }
  }
  return data as OrgSettings
}

export async function saveOrgSettings(settings: Partial<OrgSettings> & { id?: string }): Promise<void> {
  const { error } = await supabase
    .from('org_settings')
    .upsert({ ...settings, updated_at: new Date().toISOString() })
  if (error) throw error
}
