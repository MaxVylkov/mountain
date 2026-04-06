import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ListingDetail } from '@/components/marketplace/listing-detail'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ListingPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: listing } = await supabase
    .from('marketplace_listings')
    .select(`
      id, title, description, category, condition, transaction_type, price,
      city, images, contact_telegram, contact_phone, show_contact, created_at,
      user_id,
      profiles!user_id ( display_name, experience_level, created_at )
    `)
    .eq('id', id)
    .single()

  if (!listing) notFound()

  // Seller stats (parallel)
  const [{ count: completedRoutes }, { data: recentRouteRows }] = await Promise.all([
    supabase
      .from('user_route_status')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', listing.user_id)
      .eq('completed', true),
    supabase
      .from('user_route_status')
      .select('routes!route_id ( name )')
      .eq('user_id', listing.user_id)
      .eq('completed', true)
      .order('updated_at', { ascending: false })
      .limit(3),
  ])

  const recentRoutes = (recentRouteRows ?? [])
    .map((r: any) => r.routes?.name)
    .filter(Boolean) as string[]

  return (
    <ListingDetail
      listing={{
        ...listing,
        completed_routes: completedRoutes ?? 0,
        recent_routes: recentRoutes,
      } as any}
      isOwner={user?.id === listing.user_id}
      isAuthenticated={!!user}
    />
  )
}
