import { Dumbbell } from 'lucide-react'
import WorkoutsView from '@/components/training/workouts-view'
import { NextStepBanner } from '@/components/flow/next-step-banner'

export default function TrainingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Dumbbell className="text-mountain-primary" />
          Тренировки
        </h1>
        <p className="text-mountain-muted mt-1 text-sm">
          Программы подготовки к восхождениям — нажми на карточку, чтобы увидеть упражнения
        </p>
      </div>

      <WorkoutsView />
      <NextStepBanner currentModule="training" />
    </div>
  )
}
