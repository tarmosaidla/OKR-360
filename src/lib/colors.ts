// Perceptually-balanced confidence colours (ported from components.jsx)

export function confidenceColor(c: number): string {
  const v = Math.max(1, Math.min(10, c))
  const t = (v - 1) / 9          // 0..1
  const hue = 25 + t * 105       // 25 (red) → 130 (green)
  const chroma = 0.10 + t * 0.04
  const light = 0.78 - t * 0.06
  return `oklch(${light} ${chroma} ${hue})`
}

export function confidenceTextColor(c: number): string {
  const v = Math.max(1, Math.min(10, c))
  const t = (v - 1) / 9
  const hue = 25 + t * 105
  return `oklch(0.32 0.08 ${hue})`
}

// Deterministic avatar color from any string (name, id)
const AVATAR_COLORS = [
  '#7C6CE6', '#E07F4A', '#2F8F6B', '#D14D8A',
  '#3F7BC6', '#9A6BBF', '#E06A4A', '#4A9AE0',
]

function hashStr(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0
  }
  return Math.abs(h)
}

export function avatarColor(id: string): string {
  return AVATAR_COLORS[hashStr(id) % AVATAR_COLORS.length]
}

export function teamColorById(id: string): string {
  const MAP: Record<string, string> = {
    lead: '#5D5BE6',
    prod: '#E07F4A',
    eng:  '#2F8F6B',
    go2m: '#D14D8A',
  }
  return MAP[id] ?? avatarColor(id)
}
