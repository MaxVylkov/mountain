import { Backpack } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function GearPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <Backpack className="text-mountain-primary" />
        Кладовка
      </h1>
      <Card>
        <p className="text-mountain-muted">Учёт снаряжения и режим сборов — скоро здесь.</p>
      </Card>
    </div>
  )
}
