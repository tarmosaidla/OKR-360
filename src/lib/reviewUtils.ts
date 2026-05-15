// ── Score computation ─────────────────────────────────────────────────────

export function computeAutoScore(
  currentValue: number,
  targetValue: number,
  targetType: string,
  direction: 'up' | 'down' = 'up',
): number {
  if (targetValue === 0) return 0
  if (targetType === 'boolean') return currentValue >= 1 ? 1.0 : 0.0
  if (direction === 'down') {
    return Math.max(0, Math.min(1, (2 * targetValue - currentValue) / targetValue))
  }
  return Math.max(0, Math.min(1, currentValue / targetValue))
}

// ── Score band ────────────────────────────────────────────────────────────

export interface ScoreBand {
  label: string
  color: string
  bg: string
}

export function scoreBand(score: number | null | undefined): ScoreBand {
  if (score == null) return { label: '—', color: 'var(--ink-faint)', bg: 'var(--bg-sub)' }
  if (score >= 0.7) return { label: 'Delivered',   color: '#1D9E75', bg: 'color-mix(in oklab, #1D9E75 12%, transparent)' }
  if (score >= 0.3) return { label: 'Progressing', color: '#C58A0E', bg: 'color-mix(in oklab, #C58A0E 12%, transparent)' }
  return             { label: 'Missed',       color: '#E24B4A', bg: 'color-mix(in oklab, #E24B4A 12%, transparent)' }
}

export function scorePercent(score: number | null | undefined): string {
  if (score == null) return '—'
  return Math.round(score * 100) + '%'
}

// ── Average score from array ──────────────────────────────────────────────

export function avgScore(scores: (number | null | undefined)[]): number | null {
  const valid = scores.filter((s): s is number => s != null)
  if (!valid.length) return null
  return valid.reduce((a, b) => a + b, 0) / valid.length
}
