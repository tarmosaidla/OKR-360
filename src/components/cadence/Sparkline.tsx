interface SparklineProps {
  values: number[]
  width?: number
  height?: number
  stroke?: string
}

export function Sparkline({ values, width = 80, height = 22, stroke = 'currentColor' }: SparklineProps) {
  if (!values.length) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const stepX = width / (values.length - 1 || 1)
  const pts = values.map((v, i) => {
    const x = i * stepX
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const last = pts[pts.length - 1].split(',').map(Number)
  return (
    <svg width={width} height={height} className="cd-spark" aria-hidden="true">
      <polyline points={pts.join(' ')} fill="none" stroke={stroke} strokeWidth="1.5"
                strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="2" fill={stroke} />
    </svg>
  )
}
