import { createClient } from '@/lib/supabase/server'
import { GearModule } from '@/components/gear/gear-module'

export default async function GearPage() {
  const supabase = await createClient()

  const { data: catalog } = await supabase
    .from('gear')
    .select('*')
    .order('category')
    .order('name')

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.15em] uppercase text-mountain-muted mb-2">Снаряжение</p>
        <h1 className="text-3xl font-bold">Кладовка</h1>
      </div>
      <GearModule catalog={catalog || []} />
    </div>
  )
}
