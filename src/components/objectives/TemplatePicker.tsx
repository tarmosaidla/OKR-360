import { useState } from 'react'
import { CdModal } from '../cadence/CdModal'
import { TEMPLATE_CATEGORIES, type OKRTemplate } from '../../data/okrTemplates'

interface TemplatePickerProps {
  open: boolean
  onClose: () => void
  onSelect: (template: OKRTemplate) => void
}

export function TemplatePicker({ open, onClose, onSelect }: TemplatePickerProps) {
  const [activeCategory, setActiveCategory] = useState(TEMPLATE_CATEGORIES[0].id)

  const category = TEMPLATE_CATEGORIES.find(c => c.id === activeCategory)!

  return (
    <CdModal open={open} onClose={onClose} title="Choose a template" width={620}>
      <div className="cd-tpl-picker">
        {/* Category sidebar */}
        <nav className="cd-tpl-cats">
          {TEMPLATE_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              className={'cd-tpl-cat-btn' + (cat.id === activeCategory ? ' is-on' : '')}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
              <span className="cd-tpl-cat-count">{cat.templates.length}</span>
            </button>
          ))}
        </nav>

        {/* Template list */}
        <div className="cd-tpl-list">
          {category.templates.map(tpl => (
            <button
              key={tpl.id}
              type="button"
              className="cd-tpl-card"
              onClick={() => { onSelect(tpl); onClose() }}
            >
              <div className="cd-tpl-card-title">{tpl.title}</div>
              <ul className="cd-tpl-card-krs">
                {tpl.krs.map((kr, i) => (
                  <li key={i} className="cd-tpl-card-kr">
                    <span className="cd-tpl-kr-dot" />
                    <span>{kr.title}</span>
                    <span className="cd-tpl-kr-target">
                      {kr.target_type === 'boolean'
                        ? 'Done / not done'
                        : kr.target_type === 'percentage'
                        ? `${kr.target_value}%`
                        : `${kr.target_value.toLocaleString()}${kr.unit ? ' ' + kr.unit : ''}`}
                    </span>
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      </div>
    </CdModal>
  )
}
