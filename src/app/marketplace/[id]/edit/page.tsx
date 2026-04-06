// src/app/marketplace/[id]/edit/page.tsx
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ListingForm } from '@/components/marketplace/listing-form'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditListingPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: listing } = await supabase
    .from('marketplace_listings')
    .select('id, user_id, title, category, condition, transaction_type, price, city, description, contact_telegram, contact_phone, show_contact')
    .eq('id', id)
    .single()

  if (!listing) notFound()
  if (listing.user_id !== user.id) redirect(`/marketplace/${id}`)

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <p className="text-xs font-semibold tracking-[0.15em] uppercase text-mountain-muted mb-1">Барахолка</p>
        <h1 className="text-2xl font-bold text-mountain-text">Редактировать объявление</h1>
      </div>
      <ListingForm
        editId={id}
        defaultCity={listing.city}
        initialValues={{
          type: listing.transaction_type as 'sell' | 'swap' | 'free',
          title: listing.title,
          category: listing.category,
          condition: listing.condition,
          price: listing.price?.toString() ?? '',
          city: listing.city,
          description: listing.description ?? '',
          telegram: listing.contact_telegram ?? '',
          phone: listing.contact_phone ?? '',
          showContact: listing.show_contact,
        }}
      />
    </div>
  )
}
