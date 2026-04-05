import { getTripStatusLabel } from '@/lib/dashboard-data'

interface Props {
  foothillsPercent: number
  gearCount: number
  activeTrip: { status: string } | null
  completedRoutes: number
}

interface CellProps {
  name: string
  value: string
  hint: string
  color: 'green' | 'blue' | 'amber' | 'dim'
}

function StageCell({ name, value, hint, color }: CellProps) {
  const colorClass = {
    green: 'text-mountain-success',
    blue: 'text-mountain-primary',
    amber: 'text-mountain-accent',
    dim: 'text-mountain-border',
  }[color]

  return (
    <div className="bg-mountain-surface/30 border border-mountain-border rounded-lg p-2 text-center">
      <p className="text-[9px] text-mountain-muted uppercase tracking-wider mb-1">{name}</p>
      <p className={`text-base font-bold leading-none mb-1 ${colorClass}`}>{value}</p>
      <p className="text-[9px] text-mountain-muted">{hint}</p>
    </div>
  )
}

export function StagesRow({ foothillsPercent, gearCount, activeTrip, completedRoutes }: Props) {
  const stormValue = activeTrip ? getTripStatusLabel(activeTrip.status) : '—'
  const stormColor = activeTrip ? 'amber' : 'dim'

  const summitColor = completedRoutes > 0 ? 'green' : 'dim'
  const summitValue = completedRoutes > 0 ? String(completedRoutes) : '—'

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <StageCell
        name="Подножие"
        value={`${foothillsPercent}%`}
        hint="KG + узлы"
        color={foothillsPercent > 0 ? 'green' : 'dim'}
      />
      <StageCell
        name="База"
        value={`${gearCount} позиций`}
        hint="снаряжение"
        color={gearCount > 0 ? 'blue' : 'dim'}
      />
      <StageCell
        name="Штурм"
        value={stormValue}
        hint={activeTrip ? 'поездка' : 'нет поездки'}
        color={stormColor as 'amber' | 'dim'}
      />
      <StageCell
        name="Вершина"
        value={summitValue}
        hint="восхождений"
        color={summitColor}
      />
    </div>
  )
}
