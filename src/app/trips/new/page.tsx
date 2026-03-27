import { createClient } from '@/lib/supabase/server'
import { TripWizard } from '@/components/trips/trip-wizard'

export default async function NewTripPage() {
  const supabase = await createClient()

  const { data: mountains } = await supabase
    .from('mountains')
    .select('id, name, region, height, description')
    .order('name')

  return <TripWizard mountains={mountains || []} />
}
