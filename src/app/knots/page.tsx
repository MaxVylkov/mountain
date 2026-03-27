import { Grip } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function KnotsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <Grip className="text-mountain-primary" />
        Узлы
      </h1>
      <Card>
        <p className="text-mountain-muted">Обучение узлам в стиле Duolingo — скоро здесь.</p>
      </Card>
    </div>
  )
}
