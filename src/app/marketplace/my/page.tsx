import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MyListings } from '@/components/marketplace/my-listings'

export default async function MyListingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: listings } = await supabase
    .from('marketplace_listings')
    .select('id, title, transaction_type, price, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <p className="text-xs font-semibold tracking-[0.15em] uppercase text-mountain-muted mb-1">Барахолка</p>
        <h1 className="text-2xl font-bold text-mountain-text">Мои объявления</h1>
      </div>
      <MyListings listings={listings ?? []} />
    </div>
  )
}
