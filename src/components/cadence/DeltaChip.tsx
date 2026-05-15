interface DeltaChipProps {
  delta: number // positive = up, negative = down
  suffix?: string
  format?: (n: number) => string
}

export function DeltaChip({ delta, suffix = '', format }: DeltaChipProps) {
  const abs = Math.abs(delta)
  const label = format ? format(abs) : abs.toFixed(1)
  const cls = delta > 0 ? 'cd-delta cd-delta--up' : delta < 0 ? 'cd-delta cd-delta--dn' : 'cd-delta cd-delta--flat'
  const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '—'
  return (
    <span className={cls}>
      {arrow} {label}{suffix}
    </span>
  )
}
