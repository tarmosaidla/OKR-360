interface ProgressBarProps {
  value: number // 0–1
  height?: number
  color?: string
  track?: string
  radius?: number
}

export function ProgressBar({ value, height = 6, color = 'var(--accent)', track = 'var(--border)', radius = 99 }: ProgressBarProps) {
  const pct = Math.min(1, Math.max(0, value)) * 100
  return (
    <div className="cd-progress-track" style={{ height, background: track, borderRadius: radius, overflow: 'hidden' }}>
      <div
        className="cd-progress-fill"
        style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: radius, transition: 'width .3s ease' }}
      />
    </div>
  )
}
