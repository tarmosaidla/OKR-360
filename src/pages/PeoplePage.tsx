import { useSearchParams } from 'react-router-dom'
import { OneOnOnesPage } from './OneOnOnesPage'
import { ScorecardPage } from './ScorecardPage'
import { usePageTitle } from '../hooks/usePageTitle'

const TABS = [
  { id: '1on1s',      label: '1:1s'       },
  { id: 'scorecards', label: 'Scorecards' },
]

export function PeoplePage() {
  usePageTitle('People')
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? '1on1s'

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
        {tab === '1on1s'      && <OneOnOnesPage />}
        {tab === 'scorecards' && <ScorecardPage />}
      </div>
    </>
  )
}
