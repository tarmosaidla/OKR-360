import { supabase } from '../lib/supabase'
import type { KrTargetType } from '../types'

export interface KRSuggestion {
  title: string
  target_type: KrTargetType
  target_value: number
  unit: string | null
}

export async function suggestKRs(title: string, description?: string): Promise<KRSuggestion[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/suggest-krs`
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ title, description }),
  })

  const json = await resp.json()
  if (!resp.ok) throw new Error(json.error ?? 'AI suggestion failed')
  return json.suggestions as KRSuggestion[]
}
