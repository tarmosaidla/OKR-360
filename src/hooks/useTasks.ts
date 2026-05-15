import { useEffect, useState } from 'react'
import { getMyTasks, toggleTask } from '../services/tasks.service'
import type { Task } from '../types/cadence'

export function useTasks(userId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    getMyTasks(userId)
      .then(setTasks)
      .finally(() => setLoading(false))
  }, [userId])

  async function toggle(id: string, done: boolean) {
    await toggleTask(id, done)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done } : t))
  }

  return { tasks, loading, toggle }
}
