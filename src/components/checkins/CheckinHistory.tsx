import { useCheckins } from '../../hooks/useCheckins'
import { Avatar } from '../ui/Avatar'
import { Spinner } from '../ui/Spinner'
import { formatDate } from '../../lib/utils'
import type { KeyResult } from '../../types'

export function CheckinHistory({ keyResult }: { keyResult: KeyResult }) {
  const { checkins, loading } = useCheckins(keyResult.id)

  if (loading) return <Spinner className="h-4 w-4 mx-auto my-4" />
  if (!checkins.length) {
    return <p className="text-xs text-gray-400 py-2">No check-ins yet.</p>
  }

  return (
    <ul className="flex flex-col gap-3">
      {checkins.map((c) => (
        <li key={c.id} className="flex gap-3">
          {c.author && (
            <Avatar name={c.author.full_name} src={c.author.avatar_url} size="sm" className="mt-0.5 shrink-0" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-700">{c.author?.full_name}</span>
              <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
              <span className="ml-auto text-xs font-semibold text-indigo-600">
                {keyResult.target_type === 'boolean'
                  ? c.value_at_checkin >= 1 ? 'Done' : 'Not done'
                  : `${c.value_at_checkin}${keyResult.unit ? ` ${keyResult.unit}` : ''}`}
              </span>
            </div>
            {c.notes && (
              <p className="text-xs text-gray-500 mt-0.5">{c.notes}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
