import { formatValue, formatTarget } from '../../lib/utils'
import type { KeyResult } from '../../types'

interface KeyResultProgressProps {
  kr: KeyResult
}

export function KeyResultProgress({ kr }: KeyResultProgressProps) {
  let percentage: number

  if (kr.target_type === 'boolean') {
    percentage = kr.current_value >= 1 ? 100 : 0
  } else if (kr.target_value === 0) {
    percentage = 0
  } else {
    percentage = Math.min(100, (kr.current_value / kr.target_value) * 100)
  }

  const barColor =
    percentage >= 70 ? 'bg-green-500' :
    percentage >= 40 ? 'bg-yellow-500' :
    'bg-red-400'

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 whitespace-nowrap tabular-nums">
        {formatValue(kr)} / {formatTarget(kr)}
      </span>
    </div>
  )
}
