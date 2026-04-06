import { createClient } from '@/lib/supabase/server'
import { Tent } from 'lucide-react'
import { CampsList } from '@/components/camps/camps-list'

export default async function CampsPage() {
  const supabase = await createClient()
  const { data: camps } = await supabase
    .from('alpine_camps')
    .select('*')
    .order('region')
    .order('name')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Tent className="text-mountain-primary" />
          Альплагеря
        </h1>
        <p className="text-mountain-muted mt-1 text-sm">
          Базы и лагеря Кавказа — информация, контакты, скальные лаборатории
        </p>
      </div>

      <CampsList camps={camps || []} />
    </div>
  )
}
