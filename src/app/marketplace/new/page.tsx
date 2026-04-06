// src/app/marketplace/new/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ListingForm } from '@/components/marketplace/listing-form'

interface PageProps {
  searchParams: Promise<{ gear_id?: string }>
}

export default async function NewListingPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { gear_id } = await searchParams

  // Pre-fetch gear if coming from Кладовка
  let prefill: { title: string; category: string; condition: string; gearId: string } | null = null
  if (gear_id) {
    const { data: userGear } = await supabase
      .from('user_gear')
      .select('id, condition, gear!gear_id ( name, brand, category )')
      .eq('id', gear_id)
      .eq('user_id', user.id)
      .single()

    if (userGear) {
      const g = userGear.gear as any
      const { gearCategoryToMarketplace, userGearConditionToMarketplace } = await import('@/lib/marketplace-data')
      prefill = {
        gearId: gear_id,
        title: [g.brand, g.name].filter(Boolean).join(' '),
        category: gearCategoryToMarketplace(g.category),
        condition: userGearConditionToMarketplace(userGear.condition),
      }
    }
  }

  // Pre-fill city from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('city')
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <p className="text-xs font-semibold tracking-[0.15em] uppercase text-mountain-muted mb-1">Барахолка</p>
        <h1 className="text-2xl font-bold text-mountain-text">Новое объявление</h1>
      </div>
      <ListingForm
        prefill={prefill}
        defaultCity={profile?.city ?? ''}
      />
    </div>
  )
}
