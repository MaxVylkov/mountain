// src/app/marketplace/page.tsx
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ListingCard } from '@/components/marketplace/listing-card'
import { FeedFilters } from '@/components/marketplace/feed-filters'
import { Suspense } from 'react'

interface PageProps {
  searchParams: Promise<{
    type?: string
    category?: string
    city?: string
    q?: string
    cursor?: string
  }>
}

export default async function MarketplacePage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const PAGE_SIZE = 20

  let query = supabase
    .from('marketplace_listings')
    .select(`
      id, title, category, transaction_type, price, city, images, created_at,
      profiles!user_id ( display_name, experience_level )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE + 1)

  if (params.type && params.type !== 'all') {
    query = query.eq('transaction_type', params.type)
  }
  if (params.category) {
    query = query.eq('category', params.category)
  }
  if (params.city) {
    query = query.ilike('city', `%${params.city}%`)
  }
  if (params.q) {
    query = query.ilike('title', `%${params.q}%`)
  }
  if (params.cursor) {
    query = query.lt('created_at', params.cursor)
  }

  const { data: rows } = await query
  const listings = rows ?? []
  const hasMore = listings.length > PAGE_SIZE
  const displayListings = hasMore ? listings.slice(0, PAGE_SIZE) : listings
  const nextCursor = hasMore ? displayListings[displayListings.length - 1].created_at : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.15em] uppercase text-mountain-muted mb-1">Снаряжение</p>
          <h1 className="text-2xl font-bold text-mountain-text">Барахолка</h1>
        </div>
        {user && (
          <Link
            href="/marketplace/new"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-mountain-primary text-white hover:bg-mountain-primary/90 transition-colors"
          >
            <Plus size={13} />
            Объявление
          </Link>
        )}
      </div>

      <Suspense>
        <FeedFilters />
      </Suspense>

      {displayListings.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-mountain-muted text-sm mb-3">Объявлений пока нет. Будь первым — выставь снаряжение.</p>
          {user && (
            <Link href="/marketplace/new" className="text-sm font-semibold text-mountain-primary hover:underline">
              + Создать объявление
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {displayListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing as any} />
            ))}
          </div>
          {hasMore && nextCursor && (
            <div className="text-center pt-2">
              <Link
                href={`/marketplace?${new URLSearchParams({ ...params, cursor: nextCursor }).toString()}`}
                className="text-xs font-semibold text-mountain-primary hover:underline"
              >
                Загрузить ещё
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}
