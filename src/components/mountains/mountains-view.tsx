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
        return (
          <Link key={region} href={href}>
            <Card hover className="h-full space-y-2">
              <h3 className="text-base font-bold">{region}</h3>
              <div className="flex items-center gap-2 text-sm text-mountain-muted">
                {items.length > 1 && <span>{items.length} вершины</span>}
                {items.length > 1 && totalRoutes > 0 && <span>·</span>}
                {totalRoutes > 0 && <span>{totalRoutes} маршрутов</span>}
                {items.length === 1 && items[0].height > 0 && (
                  <span className="ml-auto font-mono text-mountain-accent">{items[0].height} м</span>
                )}
              </div>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

function DifficultyBadge({ difficulty }: { difficulty: number }) {
  const labels: Record<number, { text: string; color: string }> = {
    1: { text: 'Простая', color: 'text-mountain-success' },
    2: { text: 'Средняя', color: 'text-mountain-accent' },
    3: { text: 'Сложная', color: 'text-mountain-accent' },
    4: { text: 'Трудная', color: 'text-mountain-danger' },
    5: { text: 'Экстремальная', color: 'text-mountain-danger' },
  }
  const label = labels[difficulty] || labels[3]
  return <span className={`font-medium ${label.color}`}>{label.text}</span>
}
