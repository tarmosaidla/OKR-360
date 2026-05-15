import { useCallback, useEffect, useState } from 'react'
import { checkinsService } from '../services/checkins.service'
import type { Checkin, CreateCheckinInput } from '../types'
import { useAuth } from '../context/AuthContext'

export function useCheckins(keyResultId: string | null) {
  const { user } = useAuth()
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!keyResultId) return
    setLoading(true)
    try {
      const data = await checkinsService.getByKeyResult(keyResultId)
      setCheckins(data)
    } finally {
      setLoading(false)
    }
  }, [keyResultId])

  useEffect(() => { fetch() }, [fetch])

  async function createCheckin(input: CreateCheckinInput): Promise<Checkin> {
    if (!user) throw new Error('Not authenticated')
    const checkin = await checkinsService.create({ ...input, author_id: user.id })
    setCheckins((prev) => [checkin, ...prev])
    return checkin
  }

  return { checkins, loading, createCheckin, refetch: fetch }
}
