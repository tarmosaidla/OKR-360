import { ConfidenceCell } from './ConfidenceCell'

interface ConfidenceTrendProps {
  values: (number | null)[]
  currentIdx: number
  weeks: number[]
  size?: number
}

export function ConfidenceTrend({ values, currentIdx, weeks, size = 22 }: ConfidenceTrendProps) {
  return (
    <div className="cd-conf-trend">
      {weeks.map((w, i) => {
        const v = values[i]
        const isCurrent = i === currentIdx
        return (
          <div key={w} className="cd-conf-col">
            <ConfidenceCell value={v} size={size} current={isCurrent} />
            <span className={'cd-conf-wk ' + (isCurrent ? 'is-current' : '')}>
              {w}
            </span>
          </div>
        )
      })}
    </div>
  )
}
