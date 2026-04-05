import Link from 'next/link'
import type { ActiveTrip } from '@/lib/dashboard-data'
import { getTripStatusLabel } from '@/lib/dashboard-data'

interface Props {
  trip: ActiveTrip | null
}

export function TripCard({ trip }: Props) {
  if (!trip) {
    return (
      <div className="rounded-xl border border-dashed border-mountain-border bg-mountain-surface/20 p-4">
        <p className="text-xs font-semibold tracking-widest uppercase text-mountain-muted mb-2">
          Поездка
        </p>
        <p className="text-sm font-bold text-mountain-muted mb-1">Нет активной поездки</p>
        <p className="text-xs text-mountain-muted mb-4">Создай свой первый выход</p>
        <Link
          href="/trips"
          className="text-xs font-semibold text-mountain-muted hover:text-mountain-text transition-colors"
        >
          + Создать поездку
        </Link>
      </div>
    )
  }

  const statusLabel = getTripStatusLabel(trip.status)

  return (
    <div className="rounded-xl border border-mountain-primary/20 bg-mountain-primary/[0.04] p-4">
      <p className="text-xs font-semibold tracking-widest uppercase text-mountain-primary/60 mb-2">
        Активная поездка
      </p>
      <p className="text-sm font-bold text-mountain-text mb-1">{trip.name}</p>
      <p className="text-xs text-mountain-muted mb-2">
        {statusLabel}
        {trip.hasPackingSet && ` · сборы ${trip.packingPercent}%`}
        {!trip.hasPackingSet && ' · сборы не начаты'}
      </p>
      {trip.hasPackingSet && (
        <div className="h-1 rounded-full bg-mountain-border mb-3 overflow-hidden">
          <div
            className="h-1 rounded-full bg-mountain-primary transition-all"
            style={{ width: `${trip.packingPercent}%` }}
          />
        </div>
      )}
      {!trip.hasPackingSet && <div className="mb-3" />}
      <Link
        href={`/trips/${trip.id}`}
        className="text-xs font-semibold text-mountain-primary hover:text-mountain-primary/80 transition-colors"
      >
        Открыть поездку →
      </Link>
    </div>
  )
}
