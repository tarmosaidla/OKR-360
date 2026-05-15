import { supabase } from '../lib/supabase'
import type { Task } from '../types/cadence'

export async function getMyTasks(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('owner_id', userId)
    .order('due_date', { ascending: true })
  if (error) throw error
  return (data ?? []) as Task[]
}

export async function toggleTask(id: string, done: boolean): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ done })
    .eq('id', id)
  if (error) throw error
}

export async function createTask(task: Omit<Task, 'id'>): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single()
  if (error) throw error
  return data as Task
}

export async function addQuickTask(
  title: string,
  userId: string,
  dueDate: string,
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title,
      owner_id: userId,
      due_date: dueDate,
      due_label: 'This week',
      done: false,
      objective_id: null,
      objective_label: null,
    })
    .select()
    .single()
  if (error) throw error
  return data as Task
}
