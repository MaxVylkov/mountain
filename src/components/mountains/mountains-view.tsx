'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Map, List, Mountain as MountainIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

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

export default function MountainsView({ mountains }: { mountains: Mountain[] }) {
  const [view, setView] = useState<'list' | 'map'>('list')

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => setView('list')}
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
          {(!mountains || mountains.length === 0) ? (
            <EmptyState
              icon={MountainIcon}
              title="Горы ещё не добавлены"
              description="База данных пополняется. Скоро здесь появятся маршруты и вершины Кавказа, Тянь-Шаня и Памира."
            />
          ) : (
            <RegionGroups mountains={mountains} />
          )}
        </>
      ) : (
        <AlpineMap mountains={mountains} />
      )}
    </>
  )
}

function RegionGroups({ mountains }: { mountains: Mountain[] }) {
  const grouped = mountains.reduce<Record<string, Mountain[]>>((acc, m) => {
    const key = m.region || 'Без региона'
    ;(acc[key] ??= []).push(m)
    return acc
  }, {})

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Object.entries(grouped).map(([region, items]) => {
        const totalRoutes = items.reduce((sum, m) => sum + (m.routes?.[0]?.count || 0), 0)
        const href = items.length === 1
          ? `/mountains/${items[0].id}`
          : `/mountains/region/${encodeURIComponent(region)}`
        const heights = items.map(m => m.height).filter(h => h > 0).sort((a, b) => a - b)
        const heightLabel = heights.length > 1
          ? `${heights[0]}–${heights[heights.length - 1]} м`
          : heights.length === 1 ? `${heights[0]} м` : null
        return (
          <Link key={region} href={href}>
            <Card hover className="h-full flex flex-col justify-between gap-3">
              <div>
                <h3 className="text-base font-bold">{region}</h3>
                <div className="flex items-center gap-2 text-sm text-mountain-muted mt-1">
                  {items.length > 1 && <span>{items.length} вершин</span>}
                  {items.length > 1 && totalRoutes > 0 && <span>·</span>}
                  {totalRoutes > 0 && <span>{totalRoutes} маршрутов</span>}
                </div>
              </div>
              {heightLabel && (
                <div className="font-mono text-xs text-mountain-accent">{heightLabel}</div>
              )}
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

