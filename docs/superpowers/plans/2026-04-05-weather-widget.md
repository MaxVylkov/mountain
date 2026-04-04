# Weather Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static 8-link weather card grid on mountain detail pages with a compact widget showing real Open-Meteo data (base + summit temperatures, wind, 3-day forecast) laid out side-by-side with the mountain description in a 60/40 grid.

**Architecture:** A new `'use client'` component `WeatherWidget` makes two parallel `fetch()` calls to Open-Meteo on mount — one at terrain elevation (base), one altitude-adjusted to the summit. Pure utility functions (`weatherLabel`, `windCompass`) are extracted and unit-tested separately. The mountain detail page RSC is updated to render the 60/40 grid, and the old `WeatherSection` is deleted.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS (`mountain-*` design tokens), Vitest (jsdom), Open-Meteo public API (no key required).

---

## File Map

| File | Action |
|------|--------|
| `src/lib/weather-utils.ts` | Create — pure utility functions (`weatherLabel`, `windCompass`) |
| `src/__tests__/weather-utils.test.ts` | Create — unit tests for both utilities |
| `src/components/mountains/weather-widget.tsx` | Create — `'use client'` component, fetches Open-Meteo, renders widget |
| `src/app/mountains/[id]/page.tsx` | Modify — replace old description + WeatherSection with 60/40 grid |
| `src/components/mountains/weather-section.tsx` | Delete — replaced by WeatherWidget |

---

### Task 1: Utility functions + tests

**Files:**
- Create: `src/lib/weather-utils.ts`
- Create: `src/__tests__/weather-utils.test.ts`

**Context:** These are pure functions with no dependencies — perfect for TDD. The project uses Vitest with globals (`describe`, `it`, `expect`) enabled in `vitest.config.ts`. Tests live in `src/__tests__/`. The `@/` alias resolves to `src/`.

`weatherLabel(code)` maps a WMO weather code (integer) to `{ emoji: string; label: string }`.
`windCompass(degrees)` maps wind direction in degrees (0–360) to a Russian compass abbreviation string.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/weather-utils.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { weatherLabel, windCompass } from '@/lib/weather-utils'

describe('weatherLabel', () => {
  it('returns Ясно for code 0', () => {
    expect(weatherLabel(0)).toEqual({ emoji: '☀️', label: 'Ясно' })
  })

  it('returns Переменная облачность for codes 1–2', () => {
    expect(weatherLabel(1).label).toBe('Переменная облачность')
    expect(weatherLabel(2).label).toBe('Переменная облачность')
  })

  it('returns Пасмурно for code 3', () => {
    expect(weatherLabel(3).label).toBe('Пасмурно')
  })

  it('returns Дымка for codes 4–39', () => {
    expect(weatherLabel(4).label).toBe('Дымка / видимость снижена')
    expect(weatherLabel(39).label).toBe('Дымка / видимость снижена')
  })

  it('returns Туман for codes 40–49', () => {
    expect(weatherLabel(40).label).toBe('Туман')
    expect(weatherLabel(49).label).toBe('Туман')
  })

  it('returns Морось for codes 50–57', () => {
    expect(weatherLabel(50).label).toBe('Морось')
    expect(weatherLabel(57).label).toBe('Морось')
  })

  it('returns Дождь for codes 58–67', () => {
    expect(weatherLabel(58).label).toBe('Дождь')
    expect(weatherLabel(67).label).toBe('Дождь')
  })

  it('returns Снег for codes 68–77', () => {
    expect(weatherLabel(68).label).toBe('Снег')
    expect(weatherLabel(77).label).toBe('Снег')
  })

  it('returns Ливень for codes 78–82', () => {
    expect(weatherLabel(78).label).toBe('Ливень')
    expect(weatherLabel(82).label).toBe('Ливень')
  })

  it('returns Снегопад for codes 83–86', () => {
    expect(weatherLabel(83).label).toBe('Снегопад')
    expect(weatherLabel(86).label).toBe('Снегопад')
  })

  it('returns Гроза for codes 87–99', () => {
    expect(weatherLabel(87).label).toBe('Гроза')
    expect(weatherLabel(99).label).toBe('Гроза')
  })

  it('returns fallback for unknown codes', () => {
    expect(weatherLabel(200)).toEqual({ emoji: '❓', label: '—' })
  })
})

describe('windCompass', () => {
  it('returns С for 0°', () => {
    expect(windCompass(0)).toBe('С')
  })

  it('returns С for 360°', () => {
    expect(windCompass(360)).toBe('С')
  })

  it('returns СВ for 45°', () => {
    expect(windCompass(45)).toBe('СВ')
  })

  it('returns В for 90°', () => {
    expect(windCompass(90)).toBe('В')
  })

  it('returns Ю for 180°', () => {
    expect(windCompass(180)).toBe('Ю')
  })

  it('returns З for 270°', () => {
    expect(windCompass(270)).toBe('З')
  })

  it('rounds to nearest direction for intermediate values', () => {
    expect(windCompass(22)).toBe('С')   // 22° rounds to 0 = С
    expect(windCompass(23)).toBe('СВ')  // 23° rounds to 45 = СВ
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/maksimvalkov/Desktop/Mountaine
npm run test -- --run src/__tests__/weather-utils.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/weather-utils'`

- [ ] **Step 3: Create the utility functions**

Create `src/lib/weather-utils.ts`:

```ts
export function weatherLabel(code: number): { emoji: string; label: string } {
  if (code === 0)  return { emoji: '☀️', label: 'Ясно' }
  if (code <= 2)   return { emoji: '⛅', label: 'Переменная облачность' }
  if (code === 3)  return { emoji: '☁️', label: 'Пасмурно' }
  if (code <= 39)  return { emoji: '🌫', label: 'Дымка / видимость снижена' }
  if (code <= 49)  return { emoji: '🌫', label: 'Туман' }
  if (code <= 57)  return { emoji: '🌧', label: 'Морось' }
  if (code <= 67)  return { emoji: '🌧', label: 'Дождь' }
  if (code <= 77)  return { emoji: '🌨', label: 'Снег' }
  if (code <= 82)  return { emoji: '🌦', label: 'Ливень' }
  if (code <= 86)  return { emoji: '🌨', label: 'Снегопад' }
  if (code <= 99)  return { emoji: '⛈', label: 'Гроза' }
  return { emoji: '❓', label: '—' }
}

export function windCompass(degrees: number): string {
  const dirs = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ']
  return dirs[Math.round(degrees / 45) % 8]
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- --run src/__tests__/weather-utils.test.ts
```

Expected: All 18 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/weather-utils.ts src/__tests__/weather-utils.test.ts
git commit -m "feat(weather): add weatherLabel and windCompass utilities with tests"
```

---

### Task 2: WeatherWidget component

**Files:**
- Create: `src/components/mountains/weather-widget.tsx`

**Context:** This is a `'use client'` component — it must fetch data in the browser because Open-Meteo requests are made at render time (no server-side caching needed at MVP). The project uses Tailwind with `mountain-*` tokens: `mountain-border`, `mountain-surface`, `mountain-muted`, `mountain-text`, `mountain-primary`, `mountain-accent`. The `animate-pulse` Tailwind class produces the skeleton shimmer. External links always use `target="_blank" rel="noopener noreferrer"`.

Two parallel `fetch()` calls run inside `useEffect`. The base fetch always runs; the summit fetch only runs when `height > 0`. If both succeed, both temperature rows render. If summit fails or is skipped, only base renders. If base fails, error state renders (links still shown).

The `updatedAt` timestamp is generated client-side at fetch time: `new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })`.

**Forecast day names:** Use `new Date(date).toLocaleDateString('ru-RU', { weekday: 'short' })` to get short Russian weekday names (Сб, Вс, etc.) from the ISO date string. The API returns dates in the local timezone when `timezone=auto` is used.

- [ ] **Step 1: Create the component**

Create `src/components/mountains/weather-widget.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { weatherLabel, windCompass } from '@/lib/weather-utils'

interface Props {
  latitude: number
  longitude: number
  height: number
  name: string
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

export function WeatherWidget({ latitude, longitude, height, name }: Props) {
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
      fetch(baseUrl).then(r => r.json()),
      height > 0 ? fetch(summitUrl).then(r => r.json()) : Promise.resolve(null),
    ]

    Promise.all(fetches)
      .then(([base, summit]: [any, any]) => {
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
      .catch(() => setState('error'))
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
          {emoji} Погода
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
              {height > 0 ? `${height} м` : 'Вершина'}
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
          const weekday = new Date(day.date).toLocaleDateString('ru-RU', { weekday: 'short' })
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors in `weather-widget.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/mountains/weather-widget.tsx
git commit -m "feat(weather): add WeatherWidget client component with Open-Meteo integration"
```

---

### Task 3: Update mountain detail page + delete WeatherSection

**Files:**
- Modify: `src/app/mountains/[id]/page.tsx`
- Delete: `src/components/mountains/weather-section.tsx`

**Context:** `src/app/mountains/[id]/page.tsx` is a Next.js RSC (server component, no `'use client'`). It currently:
1. Renders `{mountain.description && <p className="text-sm text-mountain-muted ...">{mountain.description}</p>}` — a full-width paragraph with a left border
2. Renders `{mountain.latitude && mountain.longitude && <WeatherSection ... />}` — the old static link grid

Both need to be replaced with the new 60/40 grid. The `WeatherSection` import at the top of the file must be removed and replaced with `WeatherWidget`.

The `tag` CSS class is used in the description panel. Check `src/app/globals.css` to confirm it exists — if not, use inline Tailwind: `text-xs px-2 py-0.5 rounded-full bg-mountain-surface border border-mountain-border text-mountain-muted`.

- [ ] **Step 1: Update the mountain detail page**

In `src/app/mountains/[id]/page.tsx`:

**a) Replace import:**
```tsx
// Remove:
import { WeatherSection } from '@/components/mountains/weather-section'
// Add:
import { WeatherWidget } from '@/components/mountains/weather-widget'
```

**b) Replace the description + weather section:**

The description is inside `<div className="space-y-4">` which closes before `WeatherSection`. The replacement removes the description from that div and replaces `WeatherSection` with the new 60/40 grid.

Find this exact block (spans the closing `</div>` of `space-y-4` and the WeatherSection below it):
```tsx
        {mountain.description && (
          <p className="text-sm text-mountain-muted leading-relaxed max-w-2xl border-l-2 border-mountain-border pl-4">
            {mountain.description}
          </p>
        )}
      </div>

      {mountain.latitude && mountain.longitude && (
        <WeatherSection
          name={mountain.name}
          latitude={mountain.latitude}
          longitude={mountain.longitude}
          height={mountain.height}
        />
      )}
```

Replace with:
```tsx
      </div>

      {(mountain.description || (mountain.latitude && mountain.longitude)) && (
        <div className={`grid gap-3 items-start ${
          mountain.description && mountain.latitude && mountain.longitude
            ? 'md:grid-cols-[3fr_2fr]'
            : 'grid-cols-1'
        }`}>
          {mountain.description && (
            <div className="rounded-xl border border-mountain-border bg-mountain-surface/30 p-4 space-y-3">
              <p className="text-xs font-semibold tracking-widest uppercase text-mountain-muted">О горе</p>
              <p className="text-sm text-mountain-muted leading-relaxed">{mountain.description}</p>
              {mountain.region && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-mountain-surface border border-mountain-border text-mountain-muted">
                    {mountain.region}
                  </span>
                </div>
              )}
            </div>
          )}
          {mountain.latitude && mountain.longitude && (
            <WeatherWidget
              latitude={mountain.latitude}
              longitude={mountain.longitude}
              height={mountain.height ?? 0}  {/* Supabase may return null; coerce to 0 so Props type (number) is satisfied */}
              name={mountain.name}
            />
          )}
        </div>
      )}
```

Note: The closing `</div>` in the replacement is the closing tag for `space-y-4` (now without the description inside it). The new 60/40 grid sits outside `space-y-4`, same position as the old `WeatherSection`.

- [ ] **Step 2: Delete WeatherSection**

```bash
git rm src/components/mountains/weather-section.tsx
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors. (If there are errors about missing `WeatherSection`, ensure the import was removed.)

- [ ] **Step 4: Run all tests**

```bash
npm run test -- --run
```

Expected: All tests pass including `weather-utils.test.ts`.

- [ ] **Step 5: Manual test**

```bash
npm run dev
```

Navigate to any mountain page that has coordinates (e.g. from `/mountains`, click on any Caucasus mountain). Verify:
- Description and weather widget appear side-by-side (60/40) on desktop
- Weather widget shows loading skeleton briefly, then real data
- Both base and summit temperatures appear (for mountains with height > 0)
- 3-day forecast with weekday names in Russian
- Links row at the bottom works (opens external sites)
- On mobile: description stacks above widget
- Mountain with no description: weather fills full width
- Mountain with no coordinates: description fills full width (no widget)

- [ ] **Step 6: Commit**

```bash
git add src/app/mountains/[id]/page.tsx
# weather-section.tsx deletion was already staged by git rm in Step 2
git commit -m "feat(weather): replace WeatherSection with WeatherWidget in 60/40 layout"
```
