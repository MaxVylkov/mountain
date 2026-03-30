'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Map, List, Mountain as MountainIcon, Target, Check } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { createClient } from '@/lib/supabase/client'

const AlpineMap = dynamic(() => import('./alpine-map'), { ssr: false })

interface Mountain {
  id: string
  name: string
  region: string
  height: number
  latitude: number
  longitude: number
  difficulty: number
  routes?: { count: number }[]
}

interface RegionStatus {
  want_to_go: boolean
  visited: boolean
}

type FilterTab = 'all' | 'want_to_go' | 'visited'

export default function MountainsView({ mountains }: { mountains: Mountain[] }) {
  const [view, setView] = useState<'list' | 'map'>('list')
  const [userId, setUserId] = useState<string | null>(null)
  const [regionStatuses, setRegionStatuses] = useState<Record<string, RegionStatus>>({})
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      setUserId(data.user.id)
      supabase
        .from('user_region_status')
        .select('region, want_to_go, visited')
        .eq('user_id', data.user.id)
        .then(({ data: rows }) => {
          if (rows) {
            const map: Record<string, RegionStatus> = {}
            rows.forEach((r: any) => { map[r.region] = { want_to_go: r.want_to_go, visited: r.visited } })
            setRegionStatuses(map)
          }
        })
    })
  }, [])

  async function toggleRegionStatus(region: string, field: 'want_to_go' | 'visited') {
    if (!userId) return
    const current = regionStatuses[region] ?? { want_to_go: false, visited: false }
    const newValue = !current[field]
    // Optimistic update
    setRegionStatuses(prev => ({
      ...prev,
      [region]: { ...current, [field]: newValue },
    }))
    const supabase = createClient()
    const { error } = await supabase
      .from('user_region_status')
      .upsert({ user_id: userId, region, [field]: newValue }, { onConflict: 'user_id,region' })
    if (error) {
      setRegionStatuses(prev => ({ ...prev, [region]: current }))
    }
  }

  const wantToGoCount = Object.values(regionStatuses).filter(s => s.want_to_go).length
  const visitedCount = Object.values(regionStatuses).filter(s => s.visited).length

  return (
    <>
      {/* View toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setView('list')}
          aria-pressed={view === 'list'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            view === 'list'
              ? 'bg-mountain-primary text-white'
              : 'bg-mountain-surface text-mountain-muted hover:text-mountain-text border border-mountain-border'
          }`}
        >
          <List size={16} />
          Список
        </button>
        <button
          onClick={() => setView('map')}
          aria-pressed={view === 'map'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            view === 'map'
              ? 'bg-mountain-primary text-white'
              : 'bg-mountain-surface text-mountain-muted hover:text-mountain-text border border-mountain-border'
          }`}
        >
          <Map size={16} />
          Альпкарта
        </button>
      </div>

      {view === 'list' ? (
        <>
          {/* Filter tabs — only for logged-in users */}
          {userId && (
            <div className="flex border-b border-mountain-border">
              {([
                { key: 'all' as FilterTab, label: 'Все регионы', count: null },
                { key: 'want_to_go' as FilterTab, label: 'Хочу съездить', icon: Target, count: wantToGoCount },
                { key: 'visited' as FilterTab, label: 'Был', icon: Check, count: visitedCount },
              ]).map(({ key, label, icon: Icon, count }) => (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  aria-pressed={activeFilter === key}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    activeFilter === key
                      ? 'border-mountain-primary text-mountain-primary'
                      : 'border-transparent text-mountain-muted hover:text-mountain-text'
                  }`}
                >
                  {Icon && <Icon size={14} />}
                  <span className="hidden sm:inline">{label}</span>
                  {count !== null && count > 0 && (
                    <span className="text-xs bg-mountain-surface px-1.5 py-0.5 rounded-full">{count}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {(!mountains || mountains.length === 0) ? (
            <EmptyState
              icon={MountainIcon}
              title="Горы ещё не добавлены"
              description="База данных пополняется. Скоро здесь появятся маршруты и вершины Кавказа, Тянь-Шаня и Памира."
            />
          ) : (
            <RegionGroups
              mountains={mountains}
              userId={userId}
              regionStatuses={regionStatuses}
              activeFilter={activeFilter}
              onToggle={toggleRegionStatus}
            />
          )}
        </>
      ) : (
        <AlpineMap mountains={mountains} />
      )}
    </>
  )
}

interface RegionGroupsProps {
  mountains: Mountain[]
  userId: string | null
  regionStatuses: Record<string, RegionStatus>
  activeFilter: FilterTab
  onToggle: (region: string, field: 'want_to_go' | 'visited') => void
}

function RegionGroups({ mountains, userId, regionStatuses, activeFilter, onToggle }: RegionGroupsProps) {
  const grouped = mountains.reduce<Record<string, Mountain[]>>((acc, m) => {
    const key = m.region || 'Без региона'
    ;(acc[key] ??= []).push(m)
    return acc
  }, {})

  const filteredEntries = Object.entries(grouped).filter(([region]) => {
    if (activeFilter === 'all') return true
    const s = regionStatuses[region]
    if (activeFilter === 'want_to_go') return s?.want_to_go === true
    if (activeFilter === 'visited') return s?.visited === true
    return true
  })

  if (filteredEntries.length === 0) {
    const emptyTitle = activeFilter === 'want_to_go'
      ? 'Нет запланированных регионов'
      : 'Нет посещённых регионов'
    const emptyDesc = activeFilter === 'want_to_go'
      ? 'Нажми Target на карточке региона, чтобы добавить в список.'
      : 'Нажми Был на карточке региона после поездки.'
    return (
      <EmptyState
        icon={activeFilter === 'want_to_go' ? Target : Check}
        title={emptyTitle}
        description={emptyDesc}
      />
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {filteredEntries.map(([region, items]) => {
        const totalRoutes = items.reduce((sum, m) => sum + (m.routes?.[0]?.count || 0), 0)
        const href = items.length === 1
          ? `/mountains/${items[0].id}`
          : `/mountains/region/${encodeURIComponent(region)}`
        const heights = items.map(m => m.height).filter(h => h > 0).sort((a, b) => a - b)
        const heightLabel = heights.length > 1
          ? `${heights[0]}–${heights[heights.length - 1]} м`
          : heights.length === 1 ? `${heights[0]} м` : null
        const status = regionStatuses[region] ?? { want_to_go: false, visited: false }

        return (
          <div key={region} className="relative group">
            <Link href={href}>
              <Card hover className="h-full flex flex-col justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold">{region}</h3>
                  <div className="flex items-center gap-2 text-sm text-mountain-muted mt-1">
                    {items.length > 1 && <span>{items.length} вершин</span>}
                    {items.length > 1 && totalRoutes > 0 && <span>·</span>}
                    {totalRoutes > 0 && <span>{totalRoutes} маршрутов</span>}
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  {heightLabel && (
                    <div className="font-mono text-xs text-mountain-accent">{heightLabel}</div>
                  )}
                  {/* Status indicators visible when active */}
                  {userId && (
                    <div className="flex gap-1 ml-auto">
                      {status.want_to_go && (
                        <span className="text-mountain-accent">
                          <Target size={14} />
                        </span>
                      )}
                      {status.visited && (
                        <span className="text-mountain-success">
                          <Check size={14} />
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </Link>

            {/* Action buttons — shown on hover */}
            {userId && (
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={e => { e.preventDefault(); onToggle(region, 'want_to_go') }}
                  aria-label={status.want_to_go ? 'Убрать из запланированных' : 'Хочу съездить'}
                  aria-pressed={status.want_to_go}
                  className={`p-1.5 rounded-md transition-colors ${
                    status.want_to_go
                      ? 'bg-mountain-accent/30 text-mountain-accent'
                      : 'bg-mountain-surface/90 text-mountain-muted hover:text-mountain-accent hover:bg-mountain-accent/20'
                  }`}
                >
                  <Target size={14} />
                </button>
                <button
                  onClick={e => { e.preventDefault(); onToggle(region, 'visited') }}
                  aria-label={status.visited ? 'Убрать отметку "Был"' : 'Отметить как посещённый'}
                  aria-pressed={status.visited}
                  className={`p-1.5 rounded-md transition-colors ${
                    status.visited
                      ? 'bg-mountain-success/30 text-mountain-success'
                      : 'bg-mountain-surface/90 text-mountain-muted hover:text-mountain-success hover:bg-mountain-success/20'
                  }`}
                >
                  <Check size={14} />
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
