import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Globe, Phone, Mail, MapPin, Mountain, Calendar, Ruler, Route, Building, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CampDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: camp } = await supabase
    .from('alpine_camps')
    .select('*')
    .eq('id', id)
    .single()

  if (!camp) notFound()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/camps"
        className="inline-flex items-center gap-1.5 text-sm text-mountain-muted hover:text-mountain-text transition-colors"
      >
        <ArrowLeft size={16} /> Все лагеря
      </Link>

      <div>
        <p className="text-xs font-semibold tracking-[0.15em] uppercase text-mountain-primary mb-1">
          {camp.region}{camp.sub_region ? ` · ${camp.sub_region}` : ''}
        </p>
        <h1 className="text-3xl font-bold">{camp.full_name || camp.name}</h1>
      </div>

      {/* Key info row */}
      <div className="flex flex-wrap gap-4 text-sm">
        {camp.altitude && (
          <div className="flex items-center gap-1.5 text-mountain-muted">
            <Ruler size={14} />
            <span>{camp.altitude} м</span>
          </div>
        )}
        {camp.season && (
          <div className="flex items-center gap-1.5 text-mountain-muted">
            <Calendar size={14} />
            <span>{camp.season}</span>
          </div>
        )}
        {camp.founded && (
          <div className="flex items-center gap-1.5 text-mountain-muted">
            <Clock size={14} />
            <span>с {camp.founded} г.</span>
          </div>
        )}
        {camp.route_count && (
          <div className="flex items-center gap-1.5 text-mountain-muted">
            <Route size={14} />
            <span>{camp.route_count} маршрутов{camp.difficulty_range ? ` (${camp.difficulty_range})` : ''}</span>
          </div>
        )}
        {camp.latitude && camp.longitude && (
          <div className="flex items-center gap-1.5 text-mountain-muted">
            <MapPin size={14} />
            <span>{camp.latitude.toFixed(4)}°N, {camp.longitude.toFixed(4)}°E</span>
          </div>
        )}
      </div>

      {/* Description */}
      {camp.description && (
        <Card>
          <h2 className="font-semibold mb-2 flex items-center gap-2">
            <Mountain size={16} className="text-mountain-primary" />
            О лагере
          </h2>
          <p className="text-sm text-mountain-muted leading-relaxed">{camp.description}</p>
        </Card>
      )}

      {/* Facilities */}
      {camp.facilities && camp.facilities.length > 0 && (
        <Card>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Building size={16} className="text-mountain-primary" />
            Инфраструктура
          </h2>
          <div className="flex flex-wrap gap-2">
            {camp.facilities.map((f: string) => (
              <span key={f} className="px-2.5 py-1 rounded-md bg-mountain-surface text-sm text-mountain-muted">
                {f}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Rock lab */}
      {camp.rock_lab && (
        <Card>
          <h2 className="font-semibold mb-2">Скальная лаборатория</h2>
          <p className="text-sm text-mountain-muted leading-relaxed">{camp.rock_lab}</p>
        </Card>
      )}

      {/* How to get there */}
      {camp.how_to_get && (
        <Card>
          <h2 className="font-semibold mb-2">Как добраться</h2>
          <p className="text-sm text-mountain-muted leading-relaxed">{camp.how_to_get}</p>
        </Card>
      )}

      {/* Contacts */}
      {(camp.website || camp.phone || camp.email) && (
        <Card>
          <h2 className="font-semibold mb-3">Контакты</h2>
          <div className="space-y-2">
            {camp.website && (
              <a
                href={camp.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-mountain-primary hover:underline"
              >
                <Globe size={14} />
                {camp.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            {camp.phone && (
              <a
                href={`tel:${camp.phone}`}
                className="flex items-center gap-2 text-sm text-mountain-primary hover:underline"
              >
                <Phone size={14} />
                {camp.phone}
              </a>
            )}
            {camp.email && (
              <a
                href={`mailto:${camp.email}`}
                className="flex items-center gap-2 text-sm text-mountain-primary hover:underline"
              >
                <Mail size={14} />
                {camp.email}
              </a>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
