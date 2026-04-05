# User Journey Dashboard — Design Spec

**Date:** 2026-04-05
**Scope:** Replace the current static homepage with a personalized dashboard that shows progress, last activity, and active trip. Unauthenticated users see the existing landing page unchanged.

---

## Problem Statement

The current homepage is a static landing page with links. Returning users have no signal of where they left off, what to do next, or how far along they are. There is no reason to return to the app independently.

---

## Design Goals

1. **Return signal** — user sees immediately where they stopped and continues from there
2. **Progress visibility** — the four-stage path (Подножие → База → Штурм → Вершина) shows real data from the database
3. **Goal anchor** — active trip is always visible and one tap away
4. **No new schema** — all data comes from existing tables; no migrations required

---

## Layout

### Authenticated user

Three zones, top to bottom:

```
[Hero: greeting + level]
[Top row: Resume card | Trip card]  ← 50/50 grid
[Stages row: 4 cells]
[Divider]
[Tools grid]                        ← same as today, adapted by level
```

### Unauthenticated user

Existing landing page, no changes.

---

## Zone 1 — Hero

```tsx
<section>
  <p className="eyebrow">Платформа для альпинистов</p>
  <h1>Привет, {firstName}</h1>
  <p className="sub">{levelLabel} · {completedCount} восхождений</p>
</section>
```

`firstName` from `profiles.display_name` (first word, split on space). `levelLabel` mapped from `experience_level`: `beginner → "Новичок"`, `intermediate → "Значкист"`, `advanced → "Разрядник"`.

`completedCount` = COUNT of `user_route_status` rows where `completed = true`.

---

## Zone 2 — Top Row (two cards)

### Card A: Resume

Shows the module with the most recent activity. Source: `MAX(updated_at)` across four tables:

| Module | Table | Column |
|--------|-------|--------|
| Граф знаний | `kg_progress` | `created_at` |
| Узлы | `knot_progress` | `updated_at` |
| Тренировки | `training_log` | `completed_at` |
| Маршруты | `user_route_status` | `updated_at` |

Winner = row with the most recent timestamp. Link goes to the module's root page (`/knowledge`, `/knots`, `/training`, `/mountains`).

If no activity at all: show "Начать обучение" card with link to `/knowledge`.

**Visual:**
- Border: `rgba(245,158,11, 0.2)`, background: `rgba(245,158,11, 0.04)`
- Progress bar filled to module's overall %:
  - Граф знаний: `studiedKG / totalKG * 100`
  - Узлы: `masteredKnots / totalKnots * 100`
  - Тренировки: no meaningful %; bar is omitted (or shown at 100% if any log exists)
  - Маршруты: no meaningful %; bar is omitted (or shown at 100% if any status row exists)
- Label: amber `"ПРОДОЛЖИТЬ"`

### Card B: Active Trip

Source: `trips` WHERE `user_id = auth.uid()` AND `status IN ('planning', 'packing', 'active')` ORDER BY `updated_at` DESC LIMIT 1.

If trip exists:
- Title: `trip.name`
- Detail: `trip.status` label + packing %
- Packing %: if `trip.packing_set_id` is null → show "сборы не начаты"; otherwise `COUNT(packing_items WHERE packing_set_id = trip.packing_set_id AND packed = true) / COUNT(packing_items WHERE packing_set_id = trip.packing_set_id) * 100`. If packing set has 0 items → show 0%.
- Progress bar: packing % (0 if no packing set)
- CTA: "Открыть поездку" → `/trips/{id}`
- Border: `rgba(59,130,246, 0.2)`, background: `rgba(59,130,246, 0.04)`

If no trip:
- Title: "Нет активной поездки" (muted)
- CTA: "+ Создать поездку" → `/trips`
- Border: dashed `rgba(255,255,255, 0.07)`

---

## Zone 3 — Stages Row

Four cells in a single horizontal row. Each cell: stage name (tiny uppercase), big value, small hint.

### Подножие
- Value: `Math.round((studiedKG / totalKG * 0.6 + masteredKnots / totalKnots * 0.4) * 100)`%
- `totalKG` = `COUNT(*) FROM kg_nodes`; `studiedKG` = COUNT of `kg_progress` rows where `studied = true`
- `totalKnots` = `COUNT(*) FROM knots`; `masteredKnots` = COUNT of `knot_progress` rows where `status = 'mastered'`
- If both totals are 0, show 0%
- Color: green (`#22c55e`)
- Hint: "KG + узлы"

### База
- Value: COUNT of `user_gear` rows for this user
- Color: blue (`#3B82F6`)
- Hint: "позиций" (снаряжение)

### Штурм
- If active trip: show trip `status` label (`planning → "планирование"`, `packing → "сборы"`, `active → "в пути"`)
- Color: amber (`#F59E0B`)
- If no trip: dim `"—"`

### Вершина
- Value: COUNT of `user_route_status` where `completed = true`
- Color: green if > 0, dim if 0
- Hint: "восхождений"

---

## Zone 4 — Tools Grid

Same `ToolGrid` component as today. Content adapts by `experience_level`:
- `beginner`: learning tools first (Граф знаний, Узлы, Тренировки, Кладовка, Маршруты, Форум)
- `intermediate/advanced`: expedition tools first (Маршруты, Отделения, Кладовка, Поездки, Раскладка, Форум)

No change to the grid's visual design.

---

## Data Fetching

All fetches in `page.tsx` (server component), parallel via `Promise.all`:

```ts
const [kgStats, knotStats, lastActivity, activeTrip, gearCount, completedRoutes] =
  await Promise.all([
    fetchKGStats(supabase, userId),
    fetchKnotStats(supabase, userId),
    fetchLastActivity(supabase, userId),   // MAX across 4 tables
    fetchActiveTrip(supabase, userId),
    fetchGearCount(supabase, userId),
    fetchCompletedRoutes(supabase, userId),
  ])
```

No new database tables. No migrations.

---

## Component Files

| File | Action |
|------|--------|
| `src/app/page.tsx` | Modify — add dashboard zones for auth users |
| `src/components/dashboard/resume-card.tsx` | Create — "Продолжить" card |
| `src/components/dashboard/trip-card.tsx` | Create — active trip card |
| `src/components/dashboard/stages-row.tsx` | Create — four-cell progress row |
| `src/lib/dashboard-data.ts` | Create — all data fetching functions |

The existing `BeginnerDashboard` component is **removed** — its function is replaced by the new dashboard zones.

`OnboardingGuide` and `JourneyMap` are **kept** — they are used in the unauthenticated landing page sections (lines ~164, ~217, ~246 of `page.tsx`). Only their usage inside the authenticated path is replaced.

---

## Edge Cases

| Case | Behaviour |
|------|-----------|
| No activity anywhere | Resume card shows "Начать с Графа знаний" CTA |
| No gear added | База shows "0 позиций" |
| No trips | Штурм shows dim "—"; Trip card shows create CTA |
| No completed routes | Вершина shows dim "—" |
| `profiles.display_name` is null | Greeting omits name: "Добро пожаловать" |
| `experience_level` is null | Tools grid shows beginner set |

---

## Responsive Behaviour

- Top row: `grid-cols-1 md:grid-cols-2` — stacks vertically on mobile
- Stages row: `grid-cols-2 md:grid-cols-4` — 2×2 on mobile, 4-across on md+
- Tools grid: unchanged from current (already responsive)

## Loading & Error States

**Loading:** page.tsx is a server component — no client-side loading state. If Supabase queries are slow, Next.js streaming can be added later. For now, the page waits for all queries before rendering.

**Query error:** if any individual fetch fails, that zone falls back gracefully:
- Resume card → show "Начать с Графа знаний" CTA (same as no-activity state)
- Trip card → show "Нет активной поездки" (same as no-trip state)
- Stages → show `"—"` for the affected cell

Errors are caught per-fetch with try/catch; a failed fetch returns `null` and the component renders its empty state.

---

## Tools Grid Content

Exact arrays (mirrors current `page.tsx`):

**beginner tools (6 items):** Граф знаний `/knowledge`, Узлы `/knots`, Тренировки `/training`, Кладовка `/gear`, Маршруты `/mountains`, Форум `/forum`

**expert tools (6 items):** Маршруты `/mountains`, Отделения `/teams`, Кладовка `/gear`, Поездки `/trips`, Раскладка `/rations`, Форум `/forum`

`experience_level = null` → use beginner tools.

---

## What Is NOT In Scope

- Push notifications or email reminders
- Activity feed / history
- Streak tracking
- Social features (friends' activity)
- `/dashboard` separate route (main page IS the dashboard)
- Changes to any module pages (knowledge, knots, trips, etc.)
