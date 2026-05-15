import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'

interface CdModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  width?: number
}

export function CdModal({ open, onClose, title, children, width = 520 }: CdModalProps) {
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="cd-modal-backdrop" onClick={onClose}>
      <div
        className="cd-modal"
        style={{ maxWidth: width }}
        onClick={e => e.stopPropagation()}
      >
        <div className="cd-modal-hd">
          <span className="cd-modal-title">{title}</span>
          <button type="button" className="cd-btn-icon" onClick={onClose} aria-label="Close">
            <Icon name="x" size={15} />
          </button>
        </div>
        <div className="cd-modal-body">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
