import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      className={'cd-card' + (onClick ? ' cd-card--click' : '') + (className ? ' ' + className : '')}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: ReactNode
  action?: ReactNode
  sub?: ReactNode
}

export function CardHeader({ title, action, sub }: CardHeaderProps) {
  return (
    <div className="cd-card-hd">
      <div className="cd-card-titles">
        {sub && <span className="cd-card-eyebrow">{sub}</span>}
        <h3 className="cd-card-title">{title}</h3>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
