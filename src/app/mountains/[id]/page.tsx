import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Mountain, MapPin, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { RouteList } from '@/components/mountains/route-list'

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
      <Link href="/mountains" className="inline-flex items-center gap-2 text-sm text-mountain-muted hover:text-mountain-text transition-colors">
        <ArrowLeft size={16} />
        Все горы
      </Link>

      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Mountain className="text-mountain-primary" />
              {mountain.name}
            </h1>
            <div className="flex items-center gap-3 mt-2 text-mountain-muted">
              <span className="flex items-center gap-1">
                <MapPin size={16} />
                {mountain.region}
              </span>
              <span className="font-mono text-mountain-accent">{mountain.height} м</span>
            </div>
          </div>
        </div>

        {mountain.description && (
          <Card>
            <p className="text-sm text-mountain-muted leading-relaxed">{mountain.description}</p>
          </Card>
        )}
      </div>

      <RouteList routes={routes || []} mountainId={id} />
    </div>
  )
}
