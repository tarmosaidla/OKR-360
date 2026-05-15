import type { CheckinStreak } from '../../types/cadence'

interface StreakBadgeProps {
  streak: CheckinStreak | null
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  const count = streak?.current_streak ?? 0
  if (count === 0) return null

  return (
    <span className="cd-streak-badge" title={`${count}-week check-in streak (longest: ${streak?.longest_streak ?? count})`}>
      🔥 {count}w
    </span>
  )
}
