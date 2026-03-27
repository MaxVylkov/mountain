import { createClient } from '@/lib/supabase/server'
import { Mountain } from 'lucide-react'
import { TripsList } from '@/components/trips/trips-list'

export default async function TripsPage() {
  const supabase = await createClient()

  const { data: mountains } = await supabase
    .from('mountains')
    .select('id, name, region, height')
    .order('name')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <Mountain className="text-mountain-primary" />
        Мои поездки
      </h1>
      <TripsList mountains={mountains || []} />
    </div>
  )
}
