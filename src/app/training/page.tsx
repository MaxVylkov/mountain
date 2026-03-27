import { Dumbbell } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function TrainingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <Dumbbell className="text-mountain-primary" />
        Тренировки
      </h1>
      <Card>
        <p className="text-mountain-muted">Упражнения и рекомендации для подготовки — скоро здесь.</p>
      </Card>
    </div>
  )
}
