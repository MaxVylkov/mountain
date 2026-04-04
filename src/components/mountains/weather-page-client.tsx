'use client'

import { useState } from 'react'
import { WeatherSection } from './weather-section'
import { Mountain, MapPin } from 'lucide-react'

interface MountainItem {
  id: string
  name: string
  height: number
  region: string | null
  latitude: number
  longitude: number
}

interface WeatherPageClientProps {
  regions: Record<string, MountainItem[]>
}

export function WeatherPageClient({ regions }: WeatherPageClientProps) {
  const regionNames = Object.keys(regions)
  const [selectedRegion, setSelectedRegion] = useState<string>(regionNames[0] || '')
  const [selectedMountainId, setSelectedMountainId] = useState<string | null>(null)

  const mountains = regions[selectedRegion] || []
  const selectedMountain = mountains.find(m => m.id === selectedMountainId) || null

  return (
    <div className="space-y-6">
      {/* Фильтр по регионам */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-mountain-muted" />
          <span className="text-sm font-medium text-mountain-muted">Регион</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {regionNames.map(region => (
            <button
              key={region}
              onClick={() => { setSelectedRegion(region); setSelectedMountainId(null) }}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                selectedRegion === region
                  ? 'bg-mountain-primary text-white'
                  : 'bg-mountain-surface text-mountain-muted hover:text-mountain-text border border-mountain-border'
              }`}
            >
              {region}
              <span className="ml-1.5 text-xs opacity-60">{regions[region].length}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Список вершин региона */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Mountain className="w-4 h-4 text-mountain-muted" />
          <span className="text-sm font-medium text-mountain-muted">Вершина</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {mountains.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedMountainId(selectedMountainId === m.id ? null : m.id)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                selectedMountainId === m.id
                  ? 'bg-mountain-primary text-white'
                  : 'bg-mountain-surface text-mountain-muted hover:text-mountain-text border border-mountain-border'
              }`}
            >
              {m.name}
              {m.height > 0 && <span className="ml-1.5 text-xs opacity-60">{m.height} м</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Погода для выбранной вершины */}
      {selectedMountain ? (
        <div className="pt-2 border-t border-mountain-border">
          <WeatherSection
            name={selectedMountain.name}
            latitude={selectedMountain.latitude}
            longitude={selectedMountain.longitude}
            height={selectedMountain.height}
          />
        </div>
      ) : (
        <div className="text-center py-12 text-mountain-muted text-sm">
          Выбери вершину, чтобы увидеть ссылки на погоду
        </div>
      )}
    </div>
  )
}
