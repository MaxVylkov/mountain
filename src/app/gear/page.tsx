import { createClient } from '@/lib/supabase/server'
import { Backpack } from 'lucide-react'
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
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <Backpack className="text-mountain-primary" />
        Кладовка
      </h1>
      <GearModule catalog={catalog || []} />
    </div>
  )
}
