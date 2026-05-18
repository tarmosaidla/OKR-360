import { create } from 'zustand'

type PageActionState = {
  objectivesModalOpen: boolean
  kpiModalOpen: boolean
  newMeetingOpen: boolean
  addUnitOpen: boolean
  addUserOpen: boolean
  setObjectivesModalOpen: (v: boolean) => void
  setKpiModalOpen: (v: boolean) => void
  setNewMeetingOpen: (v: boolean) => void
  setAddUnitOpen: (v: boolean) => void
  setAddUserOpen: (v: boolean) => void
}

export const usePageActionStore = create<PageActionState>(set => ({
  objectivesModalOpen: false,
  kpiModalOpen:        false,
  newMeetingOpen:      false,
  addUnitOpen:         false,
  addUserOpen:         false,
  setObjectivesModalOpen: v => set({ objectivesModalOpen: v }),
  setKpiModalOpen:        v => set({ kpiModalOpen: v }),
  setNewMeetingOpen:      v => set({ newMeetingOpen: v }),
  setAddUnitOpen:         v => set({ addUnitOpen: v }),
  setAddUserOpen:         v => set({ addUserOpen: v }),
}))
