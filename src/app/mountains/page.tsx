import { Mountain } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function MountainsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <Mountain className="text-mountain-primary" />
        База гор
      </h1>
      <Card>
        <p className="text-mountain-muted">Каталог гор и маршрутов — скоро здесь.</p>
      </Card>
    </div>
  )
}
