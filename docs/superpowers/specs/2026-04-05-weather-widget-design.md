# Weather Widget — Design Spec

**Date:** 2026-04-05
**Scope:** Replace static link list on mountain detail page with a compact weather widget; combine description + weather into a single 60/40 row to reduce vertical space.

---

## Problem Statement

The current `WeatherSection` component is a grid of 8 external link cards across 3 groups. It takes a lot of vertical space and gives users zero actual weather data — they must click out to see anything useful. Mountaineers need to quickly assess conditions before committing to a route.

---

## Design Goals

1. **Real data on the page** — current temperature (base + summit), wind, 3-day forecast without leaving the site
2. **Compact** — combined with the mountain description in a single row, not a separate full-width block
3. **Alpine-relevant** — show both base and summit temperatures (altitude-adjusted via Open-Meteo elevation parameter)
4. **Fast links** — quick access to detailed external sources in a single compact row

---

## Layout Change

### Before
```
[Mountain header]
[Description paragraph — full width]
[WeatherSection — full width, 8 cards in 3 groups]
[RouteList]
```

### After
```
[Mountain header]
[Description 60%  |  Weather widget 40%]   ← single row, same height
[RouteList]
```

On mobile (`< md`): stacks vertically — description on top, weather below.

Both panels are enclosed in matching surface cards (`background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px`).

If mountain has no description: weather widget renders full-width.
If mountain has no coordinates: description renders full-width (no widget).

---

## Weather Widget

### Component

**File:** `src/components/mountains/weather-widget.tsx`
**Type:** `'use client'` — fetches data on mount

**Props:**
```ts
interface Props {
  latitude: number
  longitude: number
  height: number   // mountain summit height in metres
  name: string     // used to build Mountain-Forecast link
}
```

### Data Source: Open-Meteo API

No API key required. Two parallel fetches:

**Base-level fetch** (terrain elevation from DEM):
```
GET https://api.open-meteo.com/v1/forecast
  ?latitude={lat}
  &longitude={lon}
  &current=temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,weather_code,relative_humidity_2m
  &daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum
  &timezone=auto
  &forecast_days=3
```

**Summit-level fetch** (altitude-adjusted via `elevation` override):
```
GET https://api.open-meteo.com/v1/forecast
  ?latitude={lat}
  &longitude={lon}
  &elevation={height}
  &current=temperature_2m,apparent_temperature
  &timezone=auto
  &forecast_days=1
```

Only performed when `height > 0`. If `height <= 0`, summit row is omitted entirely (a mountain with elevation 0 would produce sea-level data, which is misleading).

Both fetches run in `Promise.all`. If summit fetch fails, only base data is shown (summit row hidden). If base fetch fails, show error state with links only.

### State

```ts
type WeatherState = 'loading' | 'loaded' | 'error'

interface WeatherData {
  base: {
    temp: number           // °C, rounded to integer
    feelsLike: number
    windSpeed: number      // km/h
    windDir: number        // degrees 0-360
    humidity: number       // %
    weatherCode: number    // WMO code
  }
  summit: {
    temp: number
    feelsLike: number
  } | null
  forecast: Array<{
    date: string           // ISO date
    weatherCode: number
    tempMax: number
    tempMin: number
    precipitation: number  // mm
  }>
  updatedAt: string        // HH:MM local time — client-generated at fetch time via new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }), NOT from the API response
}
```

### WMO Weather Code → Emoji + Label

```ts
function weatherLabel(code: number): { emoji: string; label: string } {
  if (code === 0)           return { emoji: '☀️',  label: 'Ясно' }
  if (code <= 2)            return { emoji: '⛅',  label: 'Переменная облачность' }
  if (code === 3)           return { emoji: '☁️',  label: 'Пасмурно' }
  if (code <= 39)           return { emoji: '🌫',  label: 'Дымка / видимость снижена' }  // WMO 4–39: obscuration, haze, dust
  if (code <= 49)           return { emoji: '🌫',  label: 'Туман' }                       // WMO 40–49: fog
  if (code <= 57)           return { emoji: '🌧',  label: 'Морось' }
  if (code <= 67)           return { emoji: '🌧',  label: 'Дождь' }
  if (code <= 77)           return { emoji: '🌨',  label: 'Снег' }
  if (code <= 82)           return { emoji: '🌦',  label: 'Ливень' }
  if (code <= 86)           return { emoji: '🌨',  label: 'Снегопад' }
  if (code <= 99)           return { emoji: '⛈',  label: 'Гроза' }
  return { emoji: '❓', label: '—' }
}
```

### Wind Direction → Russian Compass

```ts
function windCompass(degrees: number): string {
  const dirs = ['С','СВ','В','ЮВ','Ю','ЮЗ','З','СЗ']
  return dirs[Math.round(degrees / 45) % 8]
}
```

### Quick Links

```ts
const links = [
  { label: 'Windy',      url: `https://www.windy.com/${lat}/${lon}?${lat},${lon},12` },
  { label: 'Yr.no',      url: `https://www.yr.no/en/forecast/daily-table/${lat},${lon}` },
  { label: 'Meteoblue',  url: `https://www.meteoblue.com/en/weather/week/${lat}N${lon}E` },
  { label: 'Ventusky',   url: `https://www.ventusky.com/?p=${lat};${lon};12&l=temperature-2m` },
  { label: 'Zoom Earth', url: `https://zoom.earth/#view=${lat},${lon},10z`, accent: true },
]
```

---

## Widget Layout (loaded state)

```
┌─ ⛅ Погода ────────────────────── 14:32 ┐
│  Подножие  +5°   ощущ. +1°              │
│  Вершина  −17°   ощущ. −26°             │
│  ─────────────────────────────          │
│  💨 22 км/ч СЗ   💧 68%                 │
│  ⛅ Переменная облачность                │
│                                          │
│  [Сб ⛅ +6° −1°] [Вс 🌧 +3° −4°] [Пн ☀️ +9° +1°] │
│                                          │
│  Windy  Yr.no  Meteoblue  Ventusky  Zoom Earth │
└──────────────────────────────────────────┘
```

### Loading state

Skeleton placeholders for all rows. Same border/background as loaded state. No spinner — pulse animation on skeleton blocks (`animate-pulse`).

### Error state

```
┌─ ⛅ Погода ──────────────────────────────┐
│  Не удалось получить прогноз             │
│                                          │
│  Windy  Yr.no  Meteoblue  Ventusky  Zoom Earth │
└──────────────────────────────────────────┘
```

Links always render regardless of fetch state.

---

## Mountain Detail Page Changes

**File:** `src/app/mountains/[id]/page.tsx`

Replace the current pattern:
```tsx
{mountain.description && <p>...</p>}
{mountain.latitude && mountain.longitude && <WeatherSection ... />}
```

With a combined layout:
```tsx
{(mountain.description || (mountain.latitude && mountain.longitude)) && (
  <div className={`grid gap-3 items-start ${
    mountain.description && mountain.latitude && mountain.longitude
      ? 'md:grid-cols-[3fr_2fr]'   // 60/40 when both present
      : 'grid-cols-1'               // full width if only one
  }`}>
    {mountain.description && (
      <div className="rounded-xl border border-mountain-border bg-mountain-surface/30 p-4 space-y-3">
        <p className="text-xs font-semibold tracking-widest uppercase text-mountain-muted">О горе</p>
        <p className="text-sm text-mountain-muted leading-relaxed">{mountain.description}</p>
        <div className="flex flex-wrap gap-2">
          {mountain.region && <span className="tag">{mountain.region}</span>}
          {/* season tag if available */}
        </div>
      </div>
    )}
    {mountain.latitude && mountain.longitude && (
      <WeatherWidget
        latitude={mountain.latitude}
        longitude={mountain.longitude}
        height={mountain.height}
        name={mountain.name}
      />
    )}
  </div>
)}
```

The old `WeatherSection` component (`src/components/mountains/weather-section.tsx`) is no longer used and can be deleted.

---

## Files

| File | Action |
|------|--------|
| `src/components/mountains/weather-widget.tsx` | Create (new client component) |
| `src/app/mountains/[id]/page.tsx` | Modify (new 60/40 layout, use WeatherWidget) |
| `src/components/mountains/weather-section.tsx` | Delete (replaced by WeatherWidget) |

---

## What Is NOT In Scope

- Hourly forecast (3-day daily is enough for planning)
- Wind speed at summit (only temperature at summit — the summit fetch uses the cheap `current` endpoint)
- Weather alerts or push notifications
- Caching API responses (stateless client fetch per page load is acceptable at MVP)
- Mountain-Forecast integration (URL included in links but no embedded data)
- `/weather` standalone page changes (out of scope for this spec)
