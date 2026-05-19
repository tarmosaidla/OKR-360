import { useEffect } from 'react'
import { useOrg } from '../context/OrgContext'

export function usePageTitle(page: string) {
  const { org } = useOrg()
  useEffect(() => {
    document.title = org?.name ? `${org.name} · ${page} — OKR 360` : `${page} — OKR 360`
  }, [org?.name, page])
}
