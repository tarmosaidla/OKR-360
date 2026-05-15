import { useCycle } from '../../context/CycleContext'

export function CycleSelector() {
  const { cycles, activeCycle, setActiveCycle } = useCycle()

  return (
    <select
      value={activeCycle?.id ?? ''}
      onChange={(e) => {
        const c = cycles.find((c) => c.id === e.target.value)
        if (c) setActiveCycle(c)
      }}
      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900
                 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      {cycles.map((c) => (
        <option key={c.id} value={c.id}>{c.label}</option>
      ))}
    </select>
  )
}
