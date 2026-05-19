import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { objectivesService } from '../services/objectives.service'
import { ObjectiveForm } from '../components/objectives/ObjectiveForm'
import { usePageActionStore } from '../stores/pageActionStore'
import { MyFocusPage } from './MyFocusPage'
import { CascadePage } from './CascadePage'
import { MyContributionPage } from './MyContributionPage'
import type { CreateObjectiveInput } from '../types'
import { usePageTitle } from '../hooks/usePageTitle'

const TABS = [
  { id: 'my-okrs',    label: 'My OKRs'   },
  { id: 'cascade',    label: 'Cascade'   },
  { id: 'alignment',  label: 'Alignment' },
]

export function ObjectivesPage() {
  usePageTitle('Objectives')
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'my-okrs'
  const { user } = useAuth()
  const { objectivesModalOpen, setObjectivesModalOpen } = usePageActionStore()

  function setTab(id: string) {
    setParams({ tab: id }, { replace: true })
  }

  async function handleCreate(data: CreateObjectiveInput) {
    if (!user) return
    const obj = await objectivesService.create({ ...data, owner_id: user.id })
    return obj.id
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

      <ObjectiveForm
        open={objectivesModalOpen}
        onClose={() => setObjectivesModalOpen(false)}
        onSubmit={handleCreate}
      />
    </>
  )
}
