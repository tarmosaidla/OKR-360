import { supabase } from '../lib/supabase'
import type { KrTask, KrTaskStatus } from '../types/cadence'

export async function getKrTasks(keyResultId: string): Promise<KrTask[]> {
  const { data, error } = await supabase
    .from('kr_tasks')
    .select('id, key_result_id, title, status, assignee_id, created_by, created_at')
    .eq('key_result_id', keyResultId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as KrTask[]
}

export async function createKrTask(
  keyResultId: string,
  title: string,
  createdBy: string,
  assigneeId?: string | null,
): Promise<KrTask> {
  const { data, error } = await supabase
    .from('kr_tasks')
    .insert({ key_result_id: keyResultId, title, created_by: createdBy, assignee_id: assigneeId ?? null })
    .select()
    .single()
  if (error) throw error
  return data as KrTask
}

export async function updateKrTaskStatus(taskId: string, status: KrTaskStatus): Promise<void> {
  const { error } = await supabase
    .from('kr_tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', taskId)
  if (error) throw error
}

export async function deleteKrTask(taskId: string): Promise<void> {
  const { error } = await supabase
    .from('kr_tasks')
    .delete()
    .eq('id', taskId)
  if (error) throw error
}
