import { CloudSun, ExternalLink, Map, Eye } from 'lucide-react'

interface WeatherSectionProps {
  name: string
  latitude: number
  longitude: number
  height: number
}

interface WeatherSource {
  name: string
  desc: string
  url: string
}

interface WeatherGroup {
  title: string
  icon: React.ReactNode
  sources: WeatherSource[]
}

export function WeatherSection({ name, latitude, longitude, height }: WeatherSectionProps) {
  const groups: WeatherGroup[] = [
    {
      title: 'Прогноз погоды',
      icon: <CloudSun className="w-4 h-4 text-mountain-accent" />,
      sources: [
        {
          name: 'Windy',
          desc: 'Ветер, осадки, облачность — интерактивная карта',
          url: `https://www.windy.com/${latitude}/${longitude}?${latitude},${longitude},12`,
        },
        {
          name: 'Yr.no',
          desc: 'Норвежская метеослужба — точный табличный прогноз',
          url: `https://www.yr.no/en/forecast/daily-table/${latitude},${longitude}`,
        },
        {
          name: 'Mountain-Forecast',
          desc: 'Прогноз по высотам — на базе, в середине, на вершине',
          url: `https://www.mountain-forecast.com/peaks/${encodeURIComponent(name.replace(/\s+/g, '-'))}/forecasts/${height}`,
        },
        {
          name: 'Open-Meteo',
          desc: 'Почасовой прогноз — температура, ветер, осадки',
          url: `https://open-meteo.com/en/docs#latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,wind_speed_10m,precipitation`,
        },
      ],
    },
    {
      title: 'Карты и визуализация',
      icon: <Map className="w-4 h-4 text-mountain-accent" />,
      sources: [
        {
          name: 'Ventusky',
          desc: 'Карта ветра, температуры и осадков',
          url: `https://www.ventusky.com/?p=${latitude};${longitude};12&l=temperature-2m`,
        },
        {
          name: 'Meteoblue',
          desc: 'Метеограмма — графики погоды по часам и дням',
          url: `https://www.meteoblue.com/en/weather/week/${latitude}N${longitude}E`,
        },
      ],
    },
    {
      title: 'Наблюдения',
      icon: <Eye className="w-4 h-4 text-mountain-accent" />,
      sources: [
        {
          name: 'Windy Webcams',
          desc: 'Ближайшие веб-камеры по координатам',
          url: `https://www.windy.com/webcams/map?${latitude},${longitude},12`,
        },
        {
          name: 'Zoom Earth',
          desc: 'Спутник — облачность и осадки в реальном времени',
          url: `https://zoom.earth/#view=${latitude},${longitude},10z`,
        },
      ],
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <CloudSun className="w-5 h-5 text-mountain-accent" />
        <h2 className="text-lg font-semibold">Погода</h2>
      </div>

      {groups.map(group => (
        <div key={group.title} className="space-y-2.5">
          <div className="flex items-center gap-1.5">
            {group.icon}
            <h3 className="text-sm font-medium text-mountain-muted">{group.title}</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.sources.map(source => (
              <a
                key={source.name}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group surface-card p-4 space-y-1.5 hover:border-mountain-accent/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-mountain-text group-hover:text-mountain-accent transition-colors">
                    {source.name}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-mountain-muted group-hover:text-mountain-accent transition-colors" />
                </div>
                <p className="text-xs text-mountain-muted">{source.desc}</p>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
