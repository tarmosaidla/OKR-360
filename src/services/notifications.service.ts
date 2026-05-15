import { supabase } from '../lib/supabase'
import type { AppNotification } from '../types/cadence'

export async function getNotifications(personId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('person_id', personId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data ?? []) as AppNotification[]
}

export async function markRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
  if (error) throw error
}

export async function markAllRead(personId: string): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('notifications')
    .update({ read: true, read_at: now })
    .eq('person_id', personId)
    .eq('read', false)
  if (error) throw error
}

export async function sendNudge(
  _fromPersonId: string,
  toPersonId: string,
): Promise<void> {
  const { error } = await supabase.rpc('send_notification', {
    p_person_id:  toPersonId,
    p_type:       'nudge',
    p_title:      'Reminder: check-in due this week',
    p_body:       'Your team lead sent a nudge — submit your check-in before Sunday.',
    p_action_url: '/check-in',
    p_metadata:   null,
  })
  if (error) throw error
}

// ── Notification preferences ──────────────────────────────────────────────

export interface NotificationPreference {
  type: AppNotification['type']
  in_app_enabled: boolean
}

export async function getPreferences(personId: string): Promise<NotificationPreference[]> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('type, in_app_enabled')
    .eq('person_id', personId)
  if (error) throw error
  return (data ?? []) as NotificationPreference[]
}

export async function upsertPreference(
  personId: string,
  type: AppNotification['type'],
  inAppEnabled: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('notification_preferences')
    .upsert({ person_id: personId, type, in_app_enabled: inAppEnabled },
             { onConflict: 'person_id,type' })
  if (error) throw error
}
