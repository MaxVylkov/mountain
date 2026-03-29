'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Map, List } from 'lucide-react'
import { Card } from '@/components/ui/card'

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
            <Card>
              <p className="text-mountain-muted text-center">Горы пока не добавлены.</p>
            </Card>
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
  // Group by region, preserving insertion order of first occurrence
  const grouped = mountains.reduce<Record<string, Mountain[]>>((acc, m) => {
    const key = m.region || 'Без региона'
    ;(acc[key] ??= []).push(m)
    return acc
  }, {})

  return (
    <div className="space-y-10">
      {Object.entries(grouped).map(([region, items]) => (
        <section key={region}>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold text-mountain-text">{region}</h2>
            <span className="text-xs text-mountain-muted">{items.length} {items.length === 1 ? 'вершина' : items.length < 5 ? 'вершины' : 'вершин'}</span>
            <div className="flex-1 h-px bg-mountain-border" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(mountain => (
              <Link key={mountain.id} href={`/mountains/${mountain.id}`}>
                <Card hover className="h-full space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold">{mountain.name}</h3>
                    {mountain.height > 0 && (
                      <span className="text-sm font-mono text-mountain-accent">{mountain.height} м</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-mountain-muted">
                      {mountain.routes?.[0]?.count || 0} маршрутов
                    </span>
                    {mountain.difficulty && (
                      <>
                        <span className="text-mountain-muted">•</span>
                        <DifficultyBadge difficulty={mountain.difficulty} />
                      </>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}
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
