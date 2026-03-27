import { createClient } from '@/lib/supabase/server'
import { Grip } from 'lucide-react'
import { KnotsModule } from '@/components/knots/knots-module'

export default async function KnotsPage() {
  const supabase = await createClient()

  const { data: knots } = await supabase
    .from('knots')
    .select('*')
    .order('difficulty_level')
    .order('name')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <Grip className="text-mountain-primary" />
        Узлы
      </h1>
      <p className="text-mountain-muted">
        Изучай альпинистские узлы пошагово — от простых к сложным.
      </p>
      <KnotsModule knots={knots || []} />
    </div>
  )
}
