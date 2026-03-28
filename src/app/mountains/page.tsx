import { createClient } from '@/lib/supabase/server'
import { Mountain } from 'lucide-react'
import MountainsView from '@/components/mountains/mountains-view'

export default async function MountainsPage() {
  const supabase = await createClient()
  const { data: mountains } = await supabase
    .from('mountains')
    .select('*, routes(count)')
    .order('name')

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Mountain className="text-mountain-primary" />
          База маршрутов
        </h1>
      </div>

      <MountainsView mountains={mountains || []} />
    </div>
  )
}
