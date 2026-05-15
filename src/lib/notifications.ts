import { supabase } from './supabase'
import type { AppNotification } from '../types/cadence'

// Call the send_notification DB function which respects preferences
export async function sendNotification(
  personId: string,
  type: AppNotification['type'],
  title: string,
  body?: string | null,
  actionUrl?: string | null,
  metadata?: Record<string, unknown> | null,
): Promise<void> {
  const { error } = await supabase.rpc('send_notification', {
    p_person_id:  personId,
    p_type:       type,
    p_title:      title,
    p_body:       body ?? null,
    p_action_url: actionUrl ?? null,
    p_metadata:   metadata ?? null,
  })
  if (error) throw error
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString()
}
