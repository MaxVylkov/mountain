'use client'

import { useState } from 'react'
import { Dumbbell, BookOpen } from 'lucide-react'
import WorkoutsView from '@/components/training/workouts-view'
import { ResourcesSection } from '@/components/training/resources-section'

type Tab = 'workouts' | 'resources'

const TABS: { key: Tab; label: string; icon: typeof Dumbbell }[] = [
  { key: 'workouts', label: 'Тренировки', icon: Dumbbell },
  { key: 'resources', label: 'Ресурсы', icon: BookOpen },
]

export default function TrainingPage() {
  const [tab, setTab] = useState<Tab>('workouts')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-mountain-text">Обучение</h1>
        <p className="text-mountain-muted mt-1 text-sm">
          Подготовка к восхождениям — тренировки, материалы и полезные ссылки
        </p>
      </div>

      {/* Top-level tabs */}
      <div className="flex border-b border-mountain-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-mountain-primary text-mountain-primary'
                : 'border-transparent text-mountain-muted hover:text-mountain-text'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'workouts' && <WorkoutsView />}
      {tab === 'resources' && <ResourcesSection />}
    </div>
  )
}
