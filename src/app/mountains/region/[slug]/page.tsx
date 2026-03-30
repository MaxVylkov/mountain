import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { RegionRouteList } from '@/components/mountains/region-route-list'

export default async function RegionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const region = decodeURIComponent(slug)

  const supabase = await createClient()

  const { data: mountains } = await supabase
    .from('mountains')
    .select('id, name, height')
    .eq('region', region)
    .order('name')

  if (!mountains || mountains.length === 0) notFound()

  const mountainIds = mountains.map(m => m.id)
  const { data: routes } = await supabase
    .from('routes')
    .select('id, mountain_id, name, difficulty, description, season')
    .in('mountain_id', mountainIds)
    .order('difficulty', { ascending: true })
    .order('name', { ascending: true })

  return (
    <div className="space-y-8">
      <nav className="flex items-center gap-2 text-sm text-mountain-muted">
        <Link href="/mountains" className="hover:text-mountain-text transition-colors">Маршруты</Link>
        <span>/</span>
        <span className="text-mountain-text">{region}</span>
      </nav>

      <div>
        <p className="text-xs font-semibold tracking-[0.15em] uppercase text-mountain-muted mb-2">Регион</p>
        <h1 className="text-3xl font-bold text-mountain-text">{region}</h1>
        <p className="text-mountain-muted mt-1 text-sm">
          {mountains.length} {mountains.length === 1 ? 'вершина' : mountains.length < 5 ? 'вершины' : 'вершин'} · {routes?.length || 0} маршрутов
        </p>
      </div>

      <RegionRouteList mountains={mountains} routes={routes || []} />
    </div>
  )
}
