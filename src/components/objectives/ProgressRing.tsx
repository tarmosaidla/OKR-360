import { getProgressColor } from '../../lib/utils'

interface ProgressRingProps {
  progress: number   // 0-100
  size?: number
  strokeWidth?: number
  showLabel?: boolean
}

export function ProgressRing({ progress, size = 60, strokeWidth = 5, showLabel = true }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference
  const color = getProgressColor(progress)

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="ring-progress"
        />
      </svg>
      {showLabel && (
        <span className="absolute text-xs font-bold" style={{ color }}>
          {Math.round(progress)}%
        </span>
      )}
    </div>
  )
}
