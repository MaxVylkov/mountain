'use client'

import { useState, useEffect } from 'react'
import { weatherLabel, windCompass } from '@/lib/weather-utils'

interface Props {
  latitude: number
  longitude: number
  height: number
}

type WeatherState = 'loading' | 'loaded' | 'error'

interface WeatherData {
  base: {
    temp: number
    feelsLike: number
    windSpeed: number
    windDir: number
    humidity: number
    weatherCode: number
  }
  summit: { temp: number; feelsLike: number } | null
  forecast: Array<{
    date: string
    weatherCode: number
    tempMax: number
    tempMin: number
    precipitation: number
  }>
  updatedAt: string
}

export function WeatherWidget({ latitude, longitude, height }: Props) {
  const [state, setState] = useState<WeatherState>('loading')
  const [data, setData] = useState<WeatherData | null>(null)

  const links = [
    { label: 'Windy',      url: `https://www.windy.com/${latitude}/${longitude}?${latitude},${longitude},12` },
    { label: 'Yr.no',      url: `https://www.yr.no/en/forecast/daily-table/${latitude},${longitude}` },
    { label: 'Meteoblue',  url: `https://www.meteoblue.com/en/weather/week/${latitude}N${longitude}E` },
    { label: 'Ventusky',   url: `https://www.ventusky.com/?p=${latitude};${longitude};12&l=temperature-2m` },
    { label: 'Zoom Earth', url: `https://zoom.earth/#view=${latitude},${longitude},10z`, accent: true },
  ]

  useEffect(() => {
    setState('loading')
    const controller = new AbortController()

    const baseUrl =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,weather_code,relative_humidity_2m` +
      `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum` +
      `&timezone=auto&forecast_days=3`

    const summitUrl =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${latitude}&longitude=${longitude}` +
      `&elevation=${height}` +
      `&current=temperature_2m,apparent_temperature` +
      `&timezone=auto&forecast_days=1`

    const fetches = [
      fetch(baseUrl, { signal: controller.signal }).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() }),
      height > 0 ? fetch(summitUrl, { signal: controller.signal }).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() }) : Promise.resolve(null),
    ]

    Promise.all(fetches)
      .then((results) => {
        const [base, summit] = results as [any, any]
        if (controller.signal.aborted) return
        if (!base?.current) { setState('error'); return }

        const c = base.current
        const daily = base.daily

        setData({
          base: {
            temp: Math.round(c.temperature_2m),
            feelsLike: Math.round(c.apparent_temperature),
            windSpeed: Math.round(c.wind_speed_10m),
            windDir: c.wind_direction_10m,
            humidity: Math.round(c.relative_humidity_2m),
            weatherCode: c.weather_code,
          },
          summit: summit?.current
            ? {
                temp: Math.round(summit.current.temperature_2m),
                feelsLike: Math.round(summit.current.apparent_temperature),
              }
            : null,
          forecast: (daily.time as string[]).map((date: string, i: number) => ({
            date,
            weatherCode: daily.weather_code[i],
            tempMax: Math.round(daily.temperature_2m_max[i]),
            tempMin: Math.round(daily.temperature_2m_min[i]),
            precipitation: Math.round((daily.precipitation_sum[i] ?? 0) * 10) / 10,
          })),
          updatedAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        })
        setState('loaded')
      })
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return
        setState('error')
      })

    return () => controller.abort()
  }, [latitude, longitude, height])

  const linkRow = (
    <div className="flex flex-wrap gap-1.5 mt-auto pt-3">
      {links.map(link => (
        <a
          key={link.label}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
            link.accent
              ? 'border-mountain-accent/30 text-mountain-accent/70 hover:text-mountain-accent hover:border-mountain-accent/60'
              : 'border-mountain-border text-mountain-muted hover:text-mountain-text hover:border-mountain-primary/40'
          }`}
        >
          {link.label}
        </a>
      ))}
    </div>
  )

  if (state === 'error') {
    return (
      <div className="rounded-xl border border-mountain-border bg-mountain-surface/30 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-widest uppercase text-mountain-muted">⛅ Погода</span>
        </div>
        <p className="text-sm text-mountain-muted">Не удалось получить прогноз</p>
        {linkRow}
      </div>
    )
  }

  if (state === 'loading') {
    return (
      <div className="rounded-xl border border-mountain-border bg-mountain-surface/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-widest uppercase text-mountain-muted">⛅ Погода</span>
        </div>
        <div className="space-y-2">
          <div className="h-5 w-3/4 rounded bg-mountain-surface animate-pulse" />
          <div className="h-5 w-2/3 rounded bg-mountain-surface animate-pulse" />
        </div>
        <div className="h-3 w-full rounded bg-mountain-surface animate-pulse" />
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-14 rounded-lg bg-mountain-surface animate-pulse" />
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {links.map(l => (
            <div key={l.label} className="h-6 w-14 rounded-md bg-mountain-surface animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // loaded
  const d = data!
  const { emoji, label } = weatherLabel(d.base.weatherCode)

  return (
    <div className="rounded-xl border border-mountain-border bg-mountain-surface/30 p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-widest uppercase text-mountain-muted">
          <span aria-hidden="true">{emoji}</span>{' '}Погода
        </span>
        <span className="text-[10px] text-mountain-muted/50">{d.updatedAt}</span>
      </div>

      {/* Temperatures */}
      <div className="space-y-1.5">
        <div className="flex items-baseline gap-3">
          <span className="text-[10px] text-mountain-muted w-14 shrink-0">Подножие</span>
          <span className="text-xl font-bold text-mountain-text leading-none">
            {d.base.temp > 0 ? `+${d.base.temp}` : d.base.temp}°
          </span>
          <span className="text-[10px] text-mountain-muted">
            ощущ. {d.base.feelsLike > 0 ? `+${d.base.feelsLike}` : d.base.feelsLike}°
          </span>
        </div>
        {d.summit && (
          <div className="flex items-baseline gap-3">
            <span className="text-[10px] text-mountain-muted w-14 shrink-0">
              {height} м
            </span>
            <span className="text-xl font-bold text-blue-400 leading-none">
              {d.summit.temp > 0 ? `+${d.summit.temp}` : d.summit.temp}°
            </span>
            <span className="text-[10px] text-mountain-muted">
              ощущ. {d.summit.feelsLike > 0 ? `+${d.summit.feelsLike}` : d.summit.feelsLike}°
            </span>
          </div>
        )}
      </div>

      {/* Wind + humidity + condition */}
      <div className="border-t border-mountain-border/50 pt-2 space-y-1">
        <div className="flex items-center gap-4 text-xs text-mountain-muted">
          <span>💨 <span className="text-mountain-text font-medium">{d.base.windSpeed}</span> км/ч {windCompass(d.base.windDir)}</span>
          <span>💧 <span className="text-mountain-text font-medium">{d.base.humidity}</span>%</span>
        </div>
        <div className="text-[11px] text-mountain-muted">{label}</div>
      </div>

      {/* 3-day forecast */}
      <div className="grid grid-cols-3 gap-1.5">
        {d.forecast.map(day => {
          const { emoji: dayEmoji } = weatherLabel(day.weatherCode)
          const weekday = new Date(day.date + 'T12:00:00').toLocaleDateString('ru-RU', { weekday: 'short' })
          return (
            <div
              key={day.date}
              className="bg-mountain-surface/50 border border-mountain-border/50 rounded-lg p-2 text-center space-y-0.5"
            >
              <div className="text-[10px] text-mountain-muted uppercase tracking-wider">{weekday}</div>
              <div className="text-base leading-none">{dayEmoji}</div>
              <div className="text-[11px]">
                <span className="text-mountain-text font-semibold">
                  {day.tempMax > 0 ? `+${day.tempMax}` : day.tempMax}°
                </span>
                {' '}
                <span className="text-mountain-muted">
                  {day.tempMin > 0 ? `+${day.tempMin}` : day.tempMin}°
                </span>
              </div>
              {day.precipitation > 0 && (
                <div className="text-[10px] text-blue-400">{day.precipitation} мм</div>
              )}
            </div>
          )
        })}
      </div>

      {linkRow}
    </div>
  )
}
