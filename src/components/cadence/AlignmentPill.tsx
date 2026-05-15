interface ParentRef {
  id: string
  title: string
}

interface AlignmentPillProps {
  parent: ParentRef | null | undefined
  /** If true, this objective is expected to have a parent (i.e. not a top-level obj) */
  required?: boolean
  onNavigate?: (id: string) => void
}

export function AlignmentPill({ parent, required = false, onNavigate }: AlignmentPillProps) {
  if (!parent) {
    if (!required) return null
    return (
      <span className="cd-align-pill cd-align-pill--missing" title="Unaligned — no parent objective">
        <span className="cd-align-dot cd-align-dot--warn" />
        Unaligned
      </span>
    )
  }

  return (
    <button
      type="button"
      className="cd-align-pill"
      onClick={() => onNavigate?.(parent.id)}
      title={`Supports: ${parent.title}`}
    >
      <span className="cd-align-arrow">↑</span>
      <span className="cd-align-title">{parent.title}</span>
    </button>
  )
}
