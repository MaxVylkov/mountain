import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { TripDetail } from '@/components/trips/trip-detail'

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: trip } = await supabase
    .from('trips')
    .select('*, mountains(name, region, height), alpine_camps(name, region)')
    .eq('id', id)
    .single()

  if (!trip) notFound()

  return <TripDetail trip={trip} />
}
