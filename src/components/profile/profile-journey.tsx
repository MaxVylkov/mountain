'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { detectJourneyStage, STAGE_META, type JourneyStage } from '@/lib/flow-engine'

const STAGES: JourneyStage[] = ['foothills', 'basecamp', 'assault', 'summit']

interface StageData {
  foothillsPercent: number
  gearCount: number
  hasTrip: boolean
  tripStatus: string | null
  completedRoutes: number
  stage: JourneyStage
  stageIndex: number
  stageProgress: number
}

export function ProfileJourney({ userId }: { userId: string }) {
  const [data, setData] = useState<StageData | null>(null)

  useEffect(() => {
    const supabase = createClient()

    Promise.all([
      supabase.from('kg_nodes').select('*', { count: 'exact', head: true }),
      supabase.from('kg_progress').select('*', { count: 'exact', head: true })
        .eq('user_id', userId).eq('studied', true),
      supabase.from('knots').select('*', { count: 'exact', head: true }),
      supabase.from('knot_progress').select('*', { count: 'exact', head: true })
        .eq('user_id', userId).eq('status', 'mastered'),
      supabase.from('user_gear').select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase.from('trips').select('id, name, status, packing_set_id')
        .eq('user_id', userId)
        .in('status', ['planning', 'packing', 'active'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('user_route_status').select('*', { count: 'exact', head: true })
        .eq('user_id', userId).eq('completed', true),
    ]).then(([kgTotal, kgStudied, knotTotal, knotMastered, gear, tripRes, routes]) => {
      const totalKG = kgTotal.count ?? 0
      const studiedKG = kgStudied.count ?? 0
      const totalKnots = knotTotal.count ?? 0
      const masteredKnots = knotMastered.count ?? 0
      const gearCount = gear.count ?? 0
      const completedRoutes = routes.count ?? 0

      const kgScore = totalKG > 0 ? (studiedKG / totalKG) * 60 : 0
      const knotScore = totalKnots > 0 ? (masteredKnots / totalKnots) * 40 : 0
      const foothillsPercent = Math.round(kgScore + knotScore)

      const trip = tripRes.data
      const activeTrip = trip ? { id: trip.id, name: trip.name, status: trip.status, packingPercent: 0, hasPackingSet: false } : null

      const journey = detectJourneyStage(foothillsPercent, gearCount, activeTrip, completedRoutes)

      setData({
        foothillsPercent,
        gearCount,
        hasTrip: !!trip,
        tripStatus: trip?.status ?? null,
        completedRoutes,
        stage: journey.stage,
        stageIndex: journey.stageIndex,
        stageProgress: journey.stageProgress,
      })
    })
  }, [userId])

  if (!data) {
    return (
      <div className="space-y-3">
        <div className="h-20 rounded-xl bg-mountain-surface animate-pulse" />
        <div className="h-12 rounded-lg bg-mountain-surface animate-pulse" />
      </div>
    )
  }

  const tripLabel = data.tripStatus === 'planning' ? 'планирование'
    : data.tripStatus === 'packing' ? 'сборы'
    : data.tripStatus === 'active' ? 'в пути'
    : '—'

  const cells = [
    { name: 'Подножие', value: `${data.foothillsPercent}%`, hint: 'KG + узлы', href: '/knowledge', color: data.foothillsPercent > 0 ? 'text-mountain-success' : 'text-mountain-border', isCurrent: data.stage === 'foothills' },
    { name: 'База', value: `${data.gearCount} поз.`, hint: 'снаряжение', href: '/gear', color: data.gearCount > 0 ? 'text-mountain-primary' : 'text-mountain-border', isCurrent: data.stage === 'basecamp' },
    { name: 'Штурм', value: tripLabel, hint: data.hasTrip ? 'поездка' : 'нет поездки', href: '/trips', color: data.hasTrip ? 'text-mountain-accent' : 'text-mountain-border', isCurrent: data.stage === 'assault' },
    { name: 'Вершина', value: data.completedRoutes > 0 ? String(data.completedRoutes) : '—', hint: 'восхождений', href: '/mountains', color: data.completedRoutes > 0 ? 'text-mountain-success' : 'text-mountain-border', isCurrent: data.stage === 'summit' },
  ]

  return (
    <div className="space-y-3">
      {/* Stage cells */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {cells.map(cell => (
          <Link
            key={cell.name}
            href={cell.href}
            className={`block bg-mountain-surface/30 border rounded-lg px-3 py-3 text-center transition-colors hover:bg-mountain-surface/60 ${
              cell.isCurrent ? 'border-mountain-accent/40 ring-1 ring-mountain-accent/20' : 'border-mountain-border'
            }`}
          >
            <p className={`text-[10px] uppercase tracking-wider font-medium mb-1.5 ${cell.isCurrent ? 'text-mountain-accent' : 'text-mountain-muted'}`}>
              {cell.name}
            </p>
            <p className={`text-lg font-bold leading-none mb-1.5 ${cell.color}`}>{cell.value}</p>
            <p className="text-[10px] text-mountain-muted">{cell.hint}</p>
          </Link>
        ))}
      </div>

      {/* Journey progress bar */}
      <div className="rounded-lg border border-mountain-border bg-mountain-surface/30 px-4 py-3">
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-xs font-semibold tracking-[0.12em] uppercase text-mountain-accent">
            {STAGE_META[data.stage].label}
          </p>
          <p className="text-xs text-mountain-muted">
            {STAGE_META[data.stage].hint}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {STAGES.map((s, i) => (
            <div key={s} className="flex-1">
              <div className="h-1.5 rounded-full overflow-hidden bg-mountain-border/60">
                {i < data.stageIndex && <div className="h-full w-full bg-mountain-accent rounded-full" />}
                {i === data.stageIndex && (
                  <div className="h-full bg-mountain-accent rounded-full transition-all duration-500" style={{ width: `${Math.max(data.stageProgress, 5)}%` }} />
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1.5">
          {STAGES.map((s, i) => (
            <p key={s} className={`text-[10px] ${i === data.stageIndex ? 'text-mountain-accent font-medium' : i < data.stageIndex ? 'text-mountain-accent/50' : 'text-mountain-muted/50'}`}>
              {STAGE_META[s].label}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}
