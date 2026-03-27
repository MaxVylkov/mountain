import { BookOpen } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function KnowledgePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <BookOpen className="text-mountain-primary" />
        Граф знаний
      </h1>
      <Card>
        <p className="text-mountain-muted">Интерактивная карта знаний альпиниста — скоро здесь.</p>
      </Card>
    </div>
  )
}
