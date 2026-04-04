import { createClient } from '@/lib/supabase/server'
import { CloudSun } from 'lucide-react'
import { WeatherPageClient } from '@/components/mountains/weather-page-client'

export default async function WeatherPage() {
  const supabase = await createClient()

  const { data: mountains } = await supabase
    .from('mountains')
    .select('id, name, height, region, latitude, longitude')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .order('region')
    .order('name')

  // Сгруппировать по регионам
  const regions: Record<string, NonNullable<typeof mountains>> = {}
  for (const m of mountains || []) {
    const region = m.region || 'Другое'
    if (!regions[region]) regions[region] = []
    regions[region].push(m)
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <CloudSun className="w-6 h-6 text-mountain-accent" />
          <h1 className="text-3xl font-bold text-mountain-text">Погода</h1>
        </div>
        <p className="text-sm text-mountain-muted max-w-xl">
          Выбери регион и вершину, чтобы получить ссылки на прогноз погоды из нескольких источников.
        </p>
      </div>

      <WeatherPageClient regions={regions} />
    </div>
  )
}
