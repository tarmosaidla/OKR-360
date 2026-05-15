import { avatarColor } from './colors'
import type { Person, KPI, CadenceKeyResult } from '../types/cadence'

// ── Number formatting ─────────────────────────────────────────────────────

export function fmt(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n === 0) return '0'
  const abs = Math.abs(n)
  if (abs >= 1000) return n.toLocaleString()
  if (abs >= 100) return n.toFixed(0)
  if (abs >= 10) return n.toFixed(1)
  return n.toFixed(2)
}

// ── KPI logic ─────────────────────────────────────────────────────────────

export function isOnTrack(k: KPI): boolean {
  if (k.plan_to_date == null || k.actual == null) return true
  const diff = k.actual - k.plan_to_date
  const isGood = k.direction === 'up' ? diff >= 0 : diff <= 0
  if (isGood) return true
  const ratio = Math.abs(diff) / Math.max(1, Math.abs(k.plan_to_date))
  return ratio < 0.05  // within 5% tolerance
}

export function makeTrend(k: KPI): number[] {
  const seed = (k.id.charCodeAt(0) ?? 65) * 13
  const n = 13
  const start = k.actual * 0.7
  const end = k.actual
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1)
    const noise = Math.sin(seed + i * 1.3) * (k.actual * 0.06)
    return start + (end - start) * t + noise
  })
}

// ── ISO week helpers ──────────────────────────────────────────────────────

export function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

export function getQuarterWeeks(quarter: number): number[] {
  // Each quarter ≈ 13 ISO weeks
  const starts = [1, 14, 27, 40]
  const start = starts[quarter - 1] ?? 1
  return Array.from({ length: 13 }, (_, i) => start + i)
}

export function getCurrentWeekIdx(quarter: number): number {
  const weeks = getQuarterWeeks(quarter)
  const current = getISOWeek(new Date())
  const idx = weeks.indexOf(current)
  return idx >= 0 ? idx : weeks.length - 1
}

// ── Profile → Person ──────────────────────────────────────────────────────

export function profileToPerson(p: {
  id: string
  full_name: string
  avatar_url?: string | null
  role?: string | null
  team_id?: string | null
}): Person {
  const parts = p.full_name.trim().split(/\s+/)
  const initials = parts.slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
  return {
    id: p.id,
    name: p.full_name,
    role: p.role ?? '',
    initials,
    color: avatarColor(p.id),
    team_id: p.team_id ?? null,
    avatar_url: p.avatar_url ?? null,
  }
}

// ── Objective progress ────────────────────────────────────────────────────

export function objectiveProgress(keyResults: CadenceKeyResult[]): number {
  if (!keyResults.length) return 0
  const progresses = keyResults.map(kr => {
    if (kr.target_type === 'boolean') return kr.current_value >= 1 ? 1 : 0
    if (kr.target_value === 0) return 0
    return Math.min(1, kr.current_value / kr.target_value)
  })
  return progresses.reduce((a, b) => a + b, 0) / progresses.length
}

// ── Happiness label ───────────────────────────────────────────────────────

export function happinessLabel(n: number): string {
  if (n <= 3) return 'rough patch'
  if (n <= 5) return 'wobbly'
  if (n <= 7) return 'steady'
  if (n <= 9) return 'great'
  return 'soaring'
}
