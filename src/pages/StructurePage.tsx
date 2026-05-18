import { useSearchParams } from 'react-router-dom'
import { OrgStructurePage } from './OrgStructurePage'
import { CyclesPage } from './CyclesPage'
import { MyUnitsPage } from './MyUnitsPage'

const TABS = [
  { id: 'organisation', label: 'Organisation' },
  { id: 'cycles',       label: 'Cycles'       },
  { id: 'my-units',     label: 'My units'     },
]

export function StructurePage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'organisation'

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
        {tab === 'organisation' && <OrgStructurePage />}
        {tab === 'cycles'       && <CyclesPage />}
        {tab === 'my-units'     && <MyUnitsPage />}
      </div>
    </>
  )
}
