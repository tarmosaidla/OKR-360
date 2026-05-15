import { STATUS_COLORS } from '../../types/cadence'

interface StatusChipProps {
  status: string
  size?: 'sm' | 'md'
}

export function StatusChip({ status, size = 'md' }: StatusChipProps) {
  const colors = STATUS_COLORS[status]
  const style = colors
    ? { background: colors.bg, color: colors.fg, borderColor: 'transparent' }
    : { background: 'var(--bg-sub)', color: 'var(--ink-mid)' }
  return (
    <span
      className={'cd-chip' + (size === 'sm' ? ' cd-chip--sm' : '')}
      style={{ ...style, fontSize: size === 'sm' ? 11 : undefined }}
    >
      <span className="cd-chip-dot" style={{ background: colors?.fg ?? 'var(--ink-faint)' }} />
      {status}
    </span>
  )
}
