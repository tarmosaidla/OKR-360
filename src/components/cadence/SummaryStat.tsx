import type { ReactNode } from 'react'

interface SummaryStatProps {
  label: string
  value: ReactNode
  delta?: ReactNode
  accent?: boolean
}

export function SummaryStat({ label, value, delta, accent = false }: SummaryStatProps) {
  return (
    <div className={'cd-stat' + (accent ? ' cd-stat--accent' : '')}>
      <span className="cd-stat-label">{label}</span>
      <span className="cd-stat-value">{value}</span>
      {delta && <span className="cd-stat-delta">{delta}</span>}
    </div>
  )
}
