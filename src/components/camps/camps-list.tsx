'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Ruler, Calendar, Globe, Phone, Route } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { StaggerList, StaggerItem } from '@/components/ui/motion'

interface Camp {
  id: string
  name: string
  full_name: string | null
  region: string
  sub_region: string | null
  description: string | null
  altitude: number | null
  season: string | null
  website: string | null
  phone: string | null
  latitude: number | null
  longitude: number | null
  route_count: number | null
  difficulty_range: string | null
  founded: number | null
}

export function CampsList({ camps }: { camps: Camp[] }) {
  const regions = [...new Set(camps.map(c => c.region))]
  const [activeRegion, setActiveRegion] = useState<string | null>(null)

  const filtered = activeRegion ? camps.filter(c => c.region === activeRegion) : camps

  return (
    <div className="space-y-6">
      {/* Region filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveRegion(null)}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            !activeRegion
              ? 'bg-mountain-primary text-white'
              : 'bg-mountain-surface text-mountain-muted hover:text-mountain-text'
          }`}
        >
          Все ({camps.length})
        </button>
        {regions.map(r => {
          const count = camps.filter(c => c.region === r).length
          return (
            <button
              key={r}
              onClick={() => setActiveRegion(r)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                activeRegion === r
                  ? 'bg-mountain-primary text-white'
                  : 'bg-mountain-surface text-mountain-muted hover:text-mountain-text'
              }`}
            >
              {r} ({count})
            </button>
          )
        })}
      </div>

      {/* Camp cards */}
      <StaggerList className="grid gap-4 sm:grid-cols-2">
        {filtered.map(camp => (
          <StaggerItem key={camp.id}>
            <Link href={`/camps/${camp.id}`}>
              <Card className="h-full hover:border-mountain-primary/40 transition-colors">
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-semibold tracking-wider uppercase text-mountain-primary">
                      {camp.region}
                    </p>
                    <h3 className="text-lg font-semibold mt-0.5">{camp.name}</h3>
                    {camp.sub_region && (
                      <p className="text-xs text-mountain-muted">{camp.sub_region}</p>
                    )}
                  </div>

                  {camp.description && (
                    <p className="text-sm text-mountain-muted line-clamp-2">{camp.description}</p>
                  )}

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-mountain-muted pt-1">
                    {camp.altitude && (
                      <span className="flex items-center gap-1">
                        <Ruler size={12} /> {camp.altitude} м
                      </span>
                    )}
                    {camp.route_count && (
                      <span className="flex items-center gap-1">
                        <Route size={12} /> {camp.route_count} маршрутов{camp.difficulty_range ? ` (${camp.difficulty_range})` : ''}
                      </span>
                    )}
                    {camp.season && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> {camp.season}
                      </span>
                    )}
                    {camp.founded && (
                      <span>с {camp.founded} г.</span>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          </StaggerItem>
        ))}
      </StaggerList>
    </div>
  )
}
