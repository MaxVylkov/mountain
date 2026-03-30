import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { RouteList } from '@/components/mountains/route-list'
import { RouteDiscussionsBlock } from '@/components/forum/route-discussions-block'

export default async function MountainDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: mountain } = await supabase
    .from('mountains')
    .select('*')
    .eq('id', id)
    .single()

  if (!mountain) notFound()

  const { data: routes } = await supabase
    .from('routes')
    .select('*')
    .eq('mountain_id', id)
    .order('difficulty', { ascending: true })
    .order('name', { ascending: true })

  return (
    <div className="space-y-8">
      <nav className="flex items-center gap-2 text-sm text-mountain-muted">
        <Link href="/mountains" className="hover:text-mountain-text transition-colors">
          Маршруты
        </Link>
        {mountain.region && (
          <>
            <span>/</span>
            <Link
              href={`/mountains/region/${encodeURIComponent(mountain.region)}`}
              className="hover:text-mountain-text transition-colors"
            >
              {mountain.region}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-mountain-text">{mountain.name}</span>
      </nav>

      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] uppercase text-mountain-muted mb-2">Вершина</p>
              <h1 className="text-4xl font-bold text-mountain-text">{mountain.name}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm">
              <span className="text-mountain-muted">{mountain.region}</span>
              {mountain.height > 0 && (
                <span className="font-mono font-semibold text-mountain-accent">{mountain.height} м</span>
              )}
              {mountain.difficulty && (
                <span className="text-mountain-muted">Сложность {mountain.difficulty}/5</span>
              )}
            </div>
          </div>
        </div>

        {mountain.description && (
          <p className="text-sm text-mountain-muted leading-relaxed max-w-2xl border-l-2 border-mountain-border pl-4">
            {mountain.description}
          </p>
        )}
      </div>

      <RouteList routes={routes || []} mountainId={id} />

      <RouteDiscussionsBlock mountainId={id} />
    </div>
  )
}
