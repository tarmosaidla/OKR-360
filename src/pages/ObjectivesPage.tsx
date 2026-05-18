import { useSearchParams } from 'react-router-dom'
import { MyFocusPage } from './MyFocusPage'
import { CascadePage } from './CascadePage'
import { MyContributionPage } from './MyContributionPage'

const TABS = [
  { id: 'my-okrs',    label: 'My OKRs'   },
  { id: 'cascade',    label: 'Cascade'   },
  { id: 'alignment',  label: 'Alignment' },
]

export function ObjectivesPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'my-okrs'

  function setTab(id: string) {
    setParams({ tab: id }, { replace: true })
  }

  return (
    <>
      <div className="cd-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            className={'cd-tab-btn' + (tab === t.id ? ' is-on' : '')}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="cd-tab-content">
        {tab === 'my-okrs'   && <MyFocusPage />}
        {tab === 'cascade'   && <CascadePage />}
        {tab === 'alignment' && <MyContributionPage />}
      </div>
    </>
  )
}
