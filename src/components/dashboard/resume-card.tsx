import Link from 'next/link'
import type { LastActivity } from '@/lib/dashboard-data'

interface Props {
  activity: LastActivity | null
}

export function ResumeCard({ activity }: Props) {
  if (!activity) {
    return (
      <div className="rounded-xl border border-mountain-border bg-mountain-surface/30 p-4">
        <p className="text-xs font-semibold tracking-widest uppercase text-mountain-muted mb-2">
          Начать
        </p>
        <p className="text-sm font-bold text-mountain-text mb-1">Граф знаний</p>
        <p className="text-xs text-mountain-muted mb-4">Основы альпинизма — с самого начала</p>
        <Link
          href="/knowledge"
          className="text-xs font-semibold text-mountain-accent hover:text-mountain-accent/80 transition-colors"
        >
          Начать с основ →
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-mountain-accent/20 bg-mountain-accent/[0.04] p-4">
      <p className="text-xs font-semibold tracking-widest uppercase text-mountain-accent/60 mb-2">
        Продолжить
      </p>
      <p className="text-sm font-bold text-mountain-text mb-1">{activity.module}</p>
      {activity.progressPercent !== null && (
        <>
          <div className="h-1 rounded-full bg-mountain-border mb-1 overflow-hidden">
            <div
              className="h-1 rounded-full bg-mountain-accent transition-all"
              style={{ width: `${activity.progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-mountain-muted mb-3">{activity.progressPercent}%</p>
        </>
      )}
      {activity.progressPercent === null && <div className="mb-3" />}
      <Link
        href={activity.href}
        className="text-xs font-semibold text-mountain-accent hover:text-mountain-accent/80 transition-colors"
      >
        Продолжить →
      </Link>
    </div>
  )
}
