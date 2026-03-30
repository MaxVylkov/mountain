'use client'

import { Dumbbell, Clock } from 'lucide-react'
import Link from 'next/link'

const WORKOUTS_SUMMARY = [
  { id: '1', title: 'Тренировка пальцев на хангборде', category: 'Специальная', duration: '30–40 мин', goal: 'Сила пальцев' },
  { id: '2', title: 'Длинный бег в горах', category: 'Выносливость', duration: '60–90 мин', goal: 'Аэробная база' },
  { id: '3', title: 'Интервальный бег', category: 'Кардио', duration: '40–45 мин', goal: 'МПК и скорость' },
  { id: '4', title: 'Силовая на турнике', category: 'Силовая', duration: '45–50 мин', goal: 'Сила верхней части тела' },
  { id: '5', title: 'Тренировка кора', category: 'Силовая', duration: '30 мин', goal: 'Стабилизация и баланс' },
  { id: '6', title: 'Тренировка ног', category: 'Силовая', duration: '50 мин', goal: 'Сила и мощность ног' },
  { id: '7', title: 'Скалолазание на стенде', category: 'Специальная', duration: '90–120 мин', goal: 'Техника и специальная сила' },
  { id: '8', title: 'Поход с рюкзаком', category: 'Выносливость', duration: '3–6 часов', goal: 'Специфическая выносливость' },
  { id: '9', title: 'Тренировка равновесия и проприоцепции', category: 'Специальная', duration: '30 мин', goal: 'Баланс и координация' },
  { id: '10', title: 'Растяжка и восстановление', category: 'Восстановление', duration: '30–40 мин', goal: 'Гибкость и восстановление' },
]

const CATEGORY_COLORS: Record<string, string> = {
  'Силовая': 'bg-yellow-500/15 text-yellow-400',
  'Выносливость': 'bg-mountain-success/15 text-mountain-success',
  'Кардио': 'bg-orange-500/15 text-orange-400',
  'Специальная': 'bg-purple-500/15 text-purple-400',
  'Восстановление': 'bg-mountain-primary/15 text-mountain-primary',
}

interface Props {
  workoutId: string
}

export function AttachmentWorkoutCard({ workoutId }: Props) {
  const workout = WORKOUTS_SUMMARY.find(w => w.id === workoutId)
  if (!workout) return null

  return (
    <div className="rounded-xl border border-mountain-border bg-mountain-surface/40 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Dumbbell className="w-4 h-4 text-mountain-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-mountain-text">{workout.title}</p>
          <p className="text-xs text-mountain-muted">{workout.goal}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[workout.category] ?? 'bg-mountain-surface text-mountain-muted'}`}>
            {workout.category}
          </span>
          <span className="flex items-center gap-1 text-xs text-mountain-muted">
            <Clock className="w-3 h-3" />{workout.duration}
          </span>
        </div>
      </div>
      <Link href="/training" className="text-xs text-mountain-primary hover:underline">
        Открыть в тренировках →
      </Link>
    </div>
  )
}
