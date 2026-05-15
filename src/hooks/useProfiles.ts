import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { profileToPerson } from '../lib/cadenceUtils'
import type { Person } from '../types/cadence'

export function useProfiles() {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .then(({ data }) => {
        setPeople((data ?? []).map(profileToPerson))
        setLoading(false)
      })
  }, [])

  return { people, loading }
}
