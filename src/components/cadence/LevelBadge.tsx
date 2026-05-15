interface LevelLike {
  name: string
  color: string
}

interface LevelBadgeProps {
  level: LevelLike | null | undefined
  size?: 'sm' | 'md'
}

export function LevelBadge({ level, size = 'md' }: LevelBadgeProps) {
  if (!level) {
    return (
      <span className="cd-level-badge cd-level-badge--none" title="No level assigned">
        —
      </span>
    )
  }
  return (
    <span
      className={'cd-level-badge' + (size === 'sm' ? ' cd-level-badge--sm' : '')}
      style={{
        background: `color-mix(in oklab, ${level.color} 12%, transparent)`,
        color: level.color,
        borderColor: `color-mix(in oklab, ${level.color} 25%, transparent)`,
      }}
      title={`Level: ${level.name}`}
    >
      {level.name.toUpperCase()}
    </span>
  )
}
