import { Flame } from 'lucide-react'
import type { StreakInfo } from '@/lib/dashboard-data'

interface Props {
  streak: StreakInfo
}

export function StreakCard({ streak }: Props) {
  if (streak.current === 0 && !streak.isActiveToday) return null

  const label = streak.current === 1
    ? '1 день'
    : streak.current < 5
      ? `${streak.current} дня`
      : `${streak.current} дней`

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-mountain-surface/30 border border-mountain-border">
      <Flame
        size={14}
        className={streak.isActiveToday ? 'text-orange-400' : 'text-mountain-muted'}
      />
      <span className="text-xs font-medium text-mountain-text">
        {label} подряд
      </span>
      {!streak.isActiveToday && (
        <span className="text-[10px] text-mountain-muted">
          · продолжи сегодня
        </span>
      )}
    </div>
  )
}
