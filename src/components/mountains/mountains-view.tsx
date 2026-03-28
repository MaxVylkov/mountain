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
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {mountains?.map((mountain) => (
              <Link key={mountain.id} href={`/mountains/${mountain.id}`}>
                <Card hover className="h-full space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">{mountain.name}</h2>
                    <span className="text-sm font-mono text-mountain-accent">{mountain.height} м</span>
                  </div>
                  <p className="text-sm text-mountain-muted">{mountain.region}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-mountain-muted">
                      {mountain.routes?.[0]?.count || 0} маршрутов
                    </span>
                    <span className="text-mountain-muted">•</span>
                    <DifficultyBadge difficulty={mountain.difficulty} />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
          {(!mountains || mountains.length === 0) && (
            <Card>
              <p className="text-mountain-muted text-center">Горы пока не добавлены.</p>
            </Card>
          )}
        </>
      ) : (
        <AlpineMap mountains={mountains} />
      )}
    </>
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
