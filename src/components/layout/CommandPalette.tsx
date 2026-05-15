import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../cadence/Icon'

interface CmdItem {
  id: string
  label: string
  group: string
  to: string
  icon: React.ComponentProps<typeof Icon>['name']
}

const ITEMS: CmdItem[] = [
  { id: 'dash', label: 'My Week', group: 'Pages', to: '/dashboard', icon: 'dashboard' },
  { id: 'okrs', label: 'OKRs', group: 'Pages', to: '/okrs', icon: 'target' },
  { id: 'kpis', label: 'KPIs', group: 'Pages', to: '/kpis', icon: 'chart' },
  { id: 'scorecard', label: 'Scorecard', group: 'Pages', to: '/scorecard', icon: 'grid' },
  { id: '1on1s', label: '1-on-1s', group: 'Pages', to: '/1on1s', icon: 'chat' },
]

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const filtered = query.trim()
    ? ITEMS.filter(i => i.label.toLowerCase().includes(query.toLowerCase()))
    : ITEMS

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [open])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onClose()
      }
      if (!open) return
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
      if (e.key === 'Enter') { e.preventDefault(); go(filtered[active]) }
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, filtered, active])

  function go(item: CmdItem | undefined) {
    if (!item) return
    navigate(item.to)
    onClose()
  }

  if (!open) return null

  const groups = [...new Set(filtered.map(i => i.group))]

  return (
    <>
      <div className="cd-cmd-backdrop" onClick={onClose} />
      <div className="cd-cmd" role="dialog" aria-modal aria-label="Command palette">
        <div className="cd-cmd-input">
          <Icon name="search" size={16} />
          <input
            ref={inputRef}
            placeholder="Search pages…"
            value={query}
            onChange={e => { setQuery(e.target.value); setActive(0) }}
          />
        </div>
        <div className="cd-cmd-results">
          {groups.map(g => (
            <div key={g} className="cd-cmd-grp">
              <div className="cd-cmd-grp-lbl">{g}</div>
              {filtered.filter(i => i.group === g).map((item) => {
                const globalIdx = filtered.indexOf(item)
                return (
                  <button
                    key={item.id}
                    className={'cd-cmd-item' + (globalIdx === active ? ' is-on' : '')}
                    onMouseEnter={() => setActive(globalIdx)}
                    onClick={() => go(item)}
                    type="button"
                  >
                    <Icon name={item.icon} size={15} />
                    <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                  </button>
                )
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13 }}>
              No results for "{query}"
            </div>
          )}
        </div>
      </div>
    </>
  )
}
