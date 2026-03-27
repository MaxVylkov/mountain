'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, Mountain, Package, Navigation, CheckCircle } from 'lucide-react'

interface Trip {
  id: string
  name: string
  status: string
  template: string | null
  mountains: { name: string; region: string } | null
  created_at: string
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ComponentType<{ size?: number }> }> = {
  planning: { label: 'Планирование', color: 'text-mountain-primary', icon: Mountain },
  packing: { label: 'Сборы', color: 'text-mountain-accent', icon: Package },
  active: { label: 'На маршруте', color: 'text-mountain-success', icon: Navigation },
  completed: { label: 'Завершена', color: 'text-mountain-muted', icon: CheckCircle },
}

const TEMPLATE_LABELS: Record<string, string> = {
  light_trek: 'Лёгкий треккинг',
  np: 'НП',
  sp3: 'СП-3',
  sp2: 'СП-2 и выше',
}

export function TripsList({ mountains }: { mountains: any[] }) {
  const [trips, setTrips] = useState<Trip[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
        supabase
          .from('trips')
          .select('*, mountains(name, region)')
          .eq('user_id', data.user.id)
          .order('created_at', { ascending: false })
          .then(({ data: tripsData }) => {
            if (tripsData) setTrips(tripsData as any)
          })
      }
    })
  }, [])

  if (!userId) {
    return (
      <Card>
        <p className="text-mountain-muted text-center">
          <a href="/login" className="text-mountain-primary hover:underline">Войди</a>, чтобы планировать поездки.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Link href="/trips/new">
        <Button>
          <Plus size={16} className="mr-2" />
          Собираюсь в горы
        </Button>
      </Link>

      {trips.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {trips.map(trip => {
            const statusInfo = STATUS_LABELS[trip.status] || STATUS_LABELS.planning
            const Icon = statusInfo.icon
            return (
              <Link key={trip.id} href={`/trips/${trip.id}`}>
                <Card hover className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">{trip.name}</h3>
                    <span className={`flex items-center gap-1 text-xs ${statusInfo.color}`}>
                      <Icon size={14} />
                      {statusInfo.label}
                    </span>
                  </div>
                  {trip.mountains && (
                    <p className="text-sm text-mountain-muted">{(trip.mountains as any).name}, {(trip.mountains as any).region}</p>
                  )}
                  {trip.template && (
                    <span className="inline-block px-2 py-0.5 rounded text-xs bg-mountain-surface text-mountain-muted">
                      {TEMPLATE_LABELS[trip.template]}
                    </span>
                  )}
                </Card>
              </Link>
            )
          })}
        </div>
      ) : (
        <Card className="py-12">
          <p className="text-mountain-muted text-center">Пока нет поездок. Нажми &quot;Собираюсь в горы&quot; чтобы начать!</p>
        </Card>
      )}
    </div>
  )
}
