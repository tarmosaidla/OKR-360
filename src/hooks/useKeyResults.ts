import { useCallback, useEffect, useState } from 'react'
import { keyResultsService } from '../services/keyResults.service'
import type { KeyResult, CreateKeyResultInput, UpdateKeyResultInput } from '../types'

export function useKeyResults(objectiveId: string | null) {
  const [keyResults, setKeyResults] = useState<KeyResult[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!objectiveId) return
    setLoading(true)
    try {
      const data = await keyResultsService.getByObjective(objectiveId)
      setKeyResults(data)
    } finally {
      setLoading(false)
    }
  }, [objectiveId])

  useEffect(() => { fetch() }, [fetch])

  async function createKeyResult(input: CreateKeyResultInput): Promise<KeyResult> {
    const kr = await keyResultsService.create(input)
    setKeyResults((prev) => [...prev, kr])
    return kr
  }

  async function updateKeyResult(id: string, input: UpdateKeyResultInput): Promise<void> {
    const updated = await keyResultsService.update(id, input)
    setKeyResults((prev) => prev.map((k) => (k.id === id ? updated : k)))
  }

  async function deleteKeyResult(id: string): Promise<void> {
    await keyResultsService.delete(id)
    setKeyResults((prev) => prev.filter((k) => k.id !== id))
  }

  return { keyResults, loading, createKeyResult, updateKeyResult, deleteKeyResult, refetch: fetch }
}
