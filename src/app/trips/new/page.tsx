import { createClient } from '@/lib/supabase/server'
import { TripWizard } from '@/components/trips/trip-wizard'

export default async function NewTripPage() {
  const supabase = await createClient()

  const [{ data: mountains }, { data: camps }] = await Promise.all([
    supabase
      .from('mountains')
      .select('id, name, region, height, description')
      .order('name'),
    supabase
      .from('alpine_camps')
      .select('id, name, region, sub_region, altitude, route_count, difficulty_range')
      .order('region')
      .order('name'),
  ])

  return <TripWizard mountains={mountains || []} camps={camps || []} />
}
