import { UtensilsCrossed } from 'lucide-react'
import { RationsModule } from '@/components/rations/rations-module'

export default function RationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <UtensilsCrossed className="text-mountain-primary" />
        Продовольственная раскладка
      </h1>
      <RationsModule />
    </div>
  )
}
