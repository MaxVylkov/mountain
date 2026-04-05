# User Journey Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static homepage with a personalized dashboard showing last activity, active trip, and four-stage progress path for authenticated users.

**Architecture:** Server component `page.tsx` fetches all data in parallel via `dashboard-data.ts` helper functions, then renders three new presentational components (`ResumeCard`, `TripCard`, `StagesRow`). Unauthenticated users see the unchanged landing page. `BeginnerDashboard` is deleted; `OnboardingGuide` and `JourneyMap` are kept (used by unauthenticated landing page).

**Tech Stack:** Next.js 15 (App Router, server components), Supabase JS client (`@/lib/supabase/server`), Tailwind CSS, Vitest for unit tests.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/dashboard-data.ts` | Create | All Supabase fetches + pure calculation functions |
| `src/components/dashboard/resume-card.tsx` | Create | "Продолжить" card — last active module |
| `src/components/dashboard/trip-card.tsx` | Create | Active trip card or "create trip" CTA |
| `src/components/dashboard/stages-row.tsx` | Create | Four-cell progress row (Подножие/База/Штурм/Вершина) |
| `src/app/page.tsx` | Modify | Wire new dashboard zones for auth users |
| `src/components/beginner-dashboard.tsx` | Delete | Replaced by new dashboard |
| `src/__tests__/dashboard-data.test.ts` | Create | Unit tests for pure calculation functions |

---

## Task 1: Pure calculation functions + tests

**Files:**
- Create: `src/lib/dashboard-data.ts`
- Create: `src/__tests__/dashboard-data.test.ts`

These are pure functions — no Supabase, no side effects. Tests first.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/dashboard-data.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  calcFoothillsPercent,
  getFirstName,
  getLevelLabel,
  getTripStatusLabel,
  getPackingPercent,
  pickLastActivity,
} from '@/lib/dashboard-data'

describe('calcFoothillsPercent', () => {
  it('returns 0 when both totals are 0', () => {
    expect(calcFoothillsPercent(0, 0, 0, 0)).toBe(0)
  })

  it('returns 60 when all KG studied and no knots', () => {
    expect(calcFoothillsPercent(10, 10, 0, 0)).toBe(60)
  })

  it('returns 40 when all knots mastered and no KG', () => {
    expect(calcFoothillsPercent(0, 0, 5, 5)).toBe(40)
  })

  it('returns 100 when both fully complete', () => {
    expect(calcFoothillsPercent(10, 10, 5, 5)).toBe(100)
  })

  it('rounds to integer', () => {
    // 7/10 * 60 + 3/5 * 40 = 42 + 24 = 66
    expect(calcFoothillsPercent(7, 10, 3, 5)).toBe(66)
  })
})

describe('getFirstName', () => {
  it('returns first word of display_name', () => {
    expect(getFirstName('Максим Вялков')).toBe('Максим')
  })

  it('returns the name if single word', () => {
    expect(getFirstName('Максим')).toBe('Максим')
  })

  it('returns null when display_name is null', () => {
    expect(getFirstName(null)).toBeNull()
  })

  it('returns null when display_name is empty string', () => {
    expect(getFirstName('')).toBeNull()
  })
})

describe('getLevelLabel', () => {
  it('maps beginner', () => {
    expect(getLevelLabel('beginner')).toBe('Новичок')
  })

  it('maps intermediate', () => {
    expect(getLevelLabel('intermediate')).toBe('Значкист')
  })

  it('maps advanced', () => {
    expect(getLevelLabel('advanced')).toBe('Разрядник')
  })

  it('returns empty string for null', () => {
    expect(getLevelLabel(null)).toBe('')
  })
})

describe('getTripStatusLabel', () => {
  it('maps planning', () => {
    expect(getTripStatusLabel('planning')).toBe('планирование')
  })

  it('maps packing', () => {
    expect(getTripStatusLabel('packing')).toBe('сборы')
  })

  it('maps active', () => {
    expect(getTripStatusLabel('active')).toBe('в пути')
  })

  it('returns the status as-is for unknown values', () => {
    expect(getTripStatusLabel('completed')).toBe('completed')
  })
})

describe('getPackingPercent', () => {
  it('returns 0 when total is 0', () => {
    expect(getPackingPercent(0, 0)).toBe(0)
  })

  it('returns 0 when nothing packed', () => {
    expect(getPackingPercent(0, 10)).toBe(0)
  })

  it('returns 100 when all packed', () => {
    expect(getPackingPercent(10, 10)).toBe(100)
  })

  it('rounds to integer', () => {
    expect(getPackingPercent(1, 3)).toBe(33)
  })
})

describe('pickLastActivity', () => {
  it('returns the activity with the most recent timestamp', () => {
    const activities = [
      { module: 'Граф знаний', href: '/knowledge', updatedAt: '2026-01-01T10:00:00Z', progressPercent: 34 },
      { module: 'Узлы', href: '/knots', updatedAt: '2026-03-01T10:00:00Z', progressPercent: 60 },
      { module: 'Тренировки', href: '/training', updatedAt: '2026-02-01T10:00:00Z', progressPercent: null },
    ]
    expect(pickLastActivity(activities)?.module).toBe('Узлы')
  })

  it('returns null when all timestamps are null', () => {
    const activities = [
      { module: 'Граф знаний', href: '/knowledge', updatedAt: null, progressPercent: 0 },
    ]
    expect(pickLastActivity(activities)).toBeNull()
  })

  it('skips null timestamps', () => {
    const activities = [
      { module: 'Граф знаний', href: '/knowledge', updatedAt: '2026-01-01T10:00:00Z', progressPercent: 34 },
      { module: 'Узлы', href: '/knots', updatedAt: null, progressPercent: null },
    ]
    expect(pickLastActivity(activities)?.module).toBe('Граф знаний')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/maksimvalkov/Desktop/Mountaine && npx vitest run src/__tests__/dashboard-data.test.ts
```

Expected: FAIL — "Cannot find module '@/lib/dashboard-data'"

- [ ] **Step 3: Create `src/lib/dashboard-data.ts` with pure functions**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'

// ─── Pure calculation functions (testable, no Supabase) ───────────────────────

export function calcFoothillsPercent(
  studiedKG: number,
  totalKG: number,
  masteredKnots: number,
  totalKnots: number,
): number {
  if (totalKG === 0 && totalKnots === 0) return 0
  const kgScore = totalKG > 0 ? (studiedKG / totalKG) * 60 : 0
  const knotScore = totalKnots > 0 ? (masteredKnots / totalKnots) * 40 : 0
  return Math.round(kgScore + knotScore)
}

export function getFirstName(displayName: string | null): string | null {
  if (!displayName?.trim()) return null
  return displayName.trim().split(/\s+/)[0]
}

export function getLevelLabel(level: string | null): string {
  if (level === 'beginner') return 'Новичок'
  if (level === 'intermediate') return 'Значкист'
  if (level === 'advanced') return 'Разрядник'
  return ''
}

export function getTripStatusLabel(status: string): string {
  if (status === 'planning') return 'планирование'
  if (status === 'packing') return 'сборы'
  if (status === 'active') return 'в пути'
  return status
}

export function getPackingPercent(packed: number, total: number): number {
  if (total === 0) return 0
  return Math.round((packed / total) * 100)
}

export interface ActivityCandidate {
  module: string
  href: string
  updatedAt: string | null
  progressPercent: number | null
}

export function pickLastActivity(activities: ActivityCandidate[]): ActivityCandidate | null {
  const withDates = activities.filter((a) => a.updatedAt !== null)
  if (withDates.length === 0) return null
  return withDates.reduce((best, curr) =>
    curr.updatedAt! > best.updatedAt! ? curr : best,
  )
}

// ─── Supabase fetch functions ─────────────────────────────────────────────────

export interface KGStats {
  studied: number
  total: number
}

export interface KnotStats {
  mastered: number
  total: number
}

export interface LastActivity {
  module: string
  href: string
  progressPercent: number | null  // null = no bar shown
}

export interface ActiveTrip {
  id: string
  name: string
  status: string
  packingPercent: number
  hasPackingSet: boolean
}

export async function fetchKGStats(supabase: SupabaseClient, userId: string): Promise<KGStats> {
  try {
    const [{ count: total }, { count: studied }] = await Promise.all([
      supabase.from('kg_nodes').select('*', { count: 'exact', head: true }),
      supabase.from('kg_progress').select('*', { count: 'exact', head: true })
        .eq('user_id', userId).eq('studied', true),
    ])
    return { studied: studied ?? 0, total: total ?? 0 }
  } catch {
    return { studied: 0, total: 0 }
  }
}

export async function fetchKnotStats(supabase: SupabaseClient, userId: string): Promise<KnotStats> {
  try {
    const [{ count: total }, { count: mastered }] = await Promise.all([
      supabase.from('knots').select('*', { count: 'exact', head: true }),
      supabase.from('knot_progress').select('*', { count: 'exact', head: true })
        .eq('user_id', userId).eq('status', 'mastered'),
    ])
    return { mastered: mastered ?? 0, total: total ?? 0 }
  } catch {
    return { mastered: 0, total: 0 }
  }
}

export async function fetchLastActivity(
  supabase: SupabaseClient,
  userId: string,
  kgStats: KGStats,
  knotStats: KnotStats,
): Promise<LastActivity | null> {
  try {
    const [kgRow, knotRow, trainingRow, routeRow] = await Promise.all([
      supabase.from('kg_progress').select('created_at')
        .eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('knot_progress').select('updated_at')
        .eq('user_id', userId).neq('status', 'locked').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('training_log').select('completed_at')
        .eq('user_id', userId).order('completed_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('user_route_status').select('updated_at')
        .eq('user_id', userId).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    const kgPercent = kgStats.total > 0
      ? Math.round((kgStats.studied / kgStats.total) * 100)
      : null

    const knotPercent = knotStats.total > 0
      ? Math.round((knotStats.mastered / knotStats.total) * 100)
      : null

    const candidates: ActivityCandidate[] = [
      { module: 'Граф знаний', href: '/knowledge', updatedAt: kgRow.data?.created_at ?? null, progressPercent: kgPercent },
      { module: 'Узлы', href: '/knots', updatedAt: knotRow.data?.updated_at ?? null, progressPercent: knotPercent },
      { module: 'Тренировки', href: '/training', updatedAt: trainingRow.data?.completed_at ?? null, progressPercent: null },
      { module: 'Маршруты', href: '/mountains', updatedAt: routeRow.data?.updated_at ?? null, progressPercent: null },
    ]

    return pickLastActivity(candidates)
  } catch {
    return null
  }
}

export async function fetchActiveTrip(supabase: SupabaseClient, userId: string): Promise<ActiveTrip | null> {
  try {
    const { data: trip } = await supabase
      .from('trips')
      .select('id, name, status, packing_set_id')
      .eq('user_id', userId)
      .in('status', ['planning', 'packing', 'active'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!trip) return null

    if (!trip.packing_set_id) {
      return { id: trip.id, name: trip.name, status: trip.status, packingPercent: 0, hasPackingSet: false }
    }

    const [{ count: total }, { count: packed }] = await Promise.all([
      supabase.from('packing_items').select('*', { count: 'exact', head: true })
        .eq('packing_set_id', trip.packing_set_id),
      supabase.from('packing_items').select('*', { count: 'exact', head: true })
        .eq('packing_set_id', trip.packing_set_id).eq('packed', true),
    ])

    return {
      id: trip.id,
      name: trip.name,
      status: trip.status,
      packingPercent: getPackingPercent(packed ?? 0, total ?? 0),
      hasPackingSet: true,
    }
  } catch {
    return null
  }
}

export async function fetchGearCount(supabase: SupabaseClient, userId: string): Promise<number> {
  try {
    const { count } = await supabase
      .from('user_gear')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    return count ?? 0
  } catch {
    return 0
  }
}

export async function fetchCompletedRoutes(supabase: SupabaseClient, userId: string): Promise<number> {
  try {
    const { count } = await supabase
      .from('user_route_status')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('completed', true)
    return count ?? 0
  } catch {
    return 0
  }
}
```

- [ ] **Step 4: Run tests — all should pass**

```bash
cd /Users/maksimvalkov/Desktop/Mountaine && npx vitest run src/__tests__/dashboard-data.test.ts
```

Expected: all 22 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dashboard-data.ts src/__tests__/dashboard-data.test.ts
git commit -m "feat(dashboard): add dashboard data helpers with tests"
```

---

## Task 2: ResumeCard component

**Files:**
- Create: `src/components/dashboard/resume-card.tsx`

Server component. Receives pre-fetched data as props.

- [ ] **Step 1: Create `src/components/dashboard/resume-card.tsx`**

```tsx
import Link from 'next/link'
import type { LastActivity } from '@/lib/dashboard-data'

interface Props {
  activity: LastActivity | null
}

export function ResumeCard({ activity }: Props) {
  if (!activity) {
    return (
      <div className="rounded-xl border border-mountain-border bg-mountain-surface/30 p-4">
        <p className="text-xs font-semibold tracking-widest uppercase text-mountain-muted mb-2">
          Начать
        </p>
        <p className="text-sm font-bold text-mountain-text mb-1">Граф знаний</p>
        <p className="text-xs text-mountain-muted mb-4">Основы альпинизма — с самого начала</p>
        <Link
          href="/knowledge"
          className="text-xs font-semibold text-mountain-accent hover:text-mountain-accent/80 transition-colors"
        >
          Начать с основ →
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-mountain-accent/20 bg-mountain-accent/[0.04] p-4">
      <p className="text-xs font-semibold tracking-widest uppercase text-mountain-accent/60 mb-2">
        Продолжить
      </p>
      <p className="text-sm font-bold text-mountain-text mb-1">{activity.module}</p>
      {activity.progressPercent !== null && (
        <>
          <div className="h-1 rounded-full bg-mountain-border mb-1 overflow-hidden">
            <div
              className="h-1 rounded-full bg-mountain-accent transition-all"
              style={{ width: `${activity.progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-mountain-muted mb-3">{activity.progressPercent}%</p>
        </>
      )}
      {activity.progressPercent === null && <div className="mb-3" />}
      <Link
        href={activity.href}
        className="text-xs font-semibold text-mountain-accent hover:text-mountain-accent/80 transition-colors"
      >
        Продолжить →
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd /Users/maksimvalkov/Desktop/Mountaine && npx tsc --noEmit 2>&1 | grep resume-card
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/resume-card.tsx
git commit -m "feat(dashboard): add ResumeCard component"
```

---

## Task 3: TripCard component

**Files:**
- Create: `src/components/dashboard/trip-card.tsx`

- [ ] **Step 1: Create `src/components/dashboard/trip-card.tsx`**

```tsx
import Link from 'next/link'
import type { ActiveTrip } from '@/lib/dashboard-data'
import { getTripStatusLabel } from '@/lib/dashboard-data'

interface Props {
  trip: ActiveTrip | null
}

export function TripCard({ trip }: Props) {
  if (!trip) {
    return (
      <div className="rounded-xl border border-dashed border-mountain-border bg-mountain-surface/20 p-4">
        <p className="text-xs font-semibold tracking-widest uppercase text-mountain-muted mb-2">
          Поездка
        </p>
        <p className="text-sm font-bold text-mountain-muted mb-1">Нет активной поездки</p>
        <p className="text-xs text-mountain-muted mb-4">Создай свой первый выход</p>
        <Link
          href="/trips"
          className="text-xs font-semibold text-mountain-muted hover:text-mountain-text transition-colors"
        >
          + Создать поездку
        </Link>
      </div>
    )
  }

  const statusLabel = getTripStatusLabel(trip.status)

  return (
    <div className="rounded-xl border border-mountain-primary/20 bg-mountain-primary/[0.04] p-4">
      <p className="text-xs font-semibold tracking-widest uppercase text-mountain-primary/60 mb-2">
        Активная поездка
      </p>
      <p className="text-sm font-bold text-mountain-text mb-1">{trip.name}</p>
      <p className="text-xs text-mountain-muted mb-2">
        {statusLabel}
        {trip.hasPackingSet && ` · сборы ${trip.packingPercent}%`}
        {!trip.hasPackingSet && ' · сборы не начаты'}
      </p>
      {trip.hasPackingSet && (
        <div className="h-1 rounded-full bg-mountain-border mb-3 overflow-hidden">
          <div
            className="h-1 rounded-full bg-mountain-primary transition-all"
            style={{ width: `${trip.packingPercent}%` }}
          />
        </div>
      )}
      {!trip.hasPackingSet && <div className="mb-3" />}
      <Link
        href={`/trips/${trip.id}`}
        className="text-xs font-semibold text-mountain-primary hover:text-mountain-primary/80 transition-colors"
      >
        Открыть поездку →
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd /Users/maksimvalkov/Desktop/Mountaine && npx tsc --noEmit 2>&1 | grep trip-card
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/trip-card.tsx
git commit -m "feat(dashboard): add TripCard component"
```

---

## Task 4: StagesRow component

**Files:**
- Create: `src/components/dashboard/stages-row.tsx`

- [ ] **Step 1: Create `src/components/dashboard/stages-row.tsx`**

```tsx
import { getTripStatusLabel } from '@/lib/dashboard-data'

interface Props {
  foothillsPercent: number
  gearCount: number
  activeTrip: { status: string } | null
  completedRoutes: number
}

interface CellProps {
  name: string
  value: string
  hint: string
  color: 'green' | 'blue' | 'amber' | 'dim'
}

function StageCell({ name, value, hint, color }: CellProps) {
  const colorClass = {
    green: 'text-mountain-success',
    blue: 'text-mountain-primary',
    amber: 'text-mountain-accent',
    dim: 'text-mountain-border',
  }[color]

  return (
    <div className="bg-mountain-surface/30 border border-mountain-border rounded-lg p-2 text-center">
      <p className="text-[9px] text-mountain-muted uppercase tracking-wider mb-1">{name}</p>
      <p className={`text-base font-bold leading-none mb-1 ${colorClass}`}>{value}</p>
      <p className="text-[9px] text-mountain-muted">{hint}</p>
    </div>
  )
}

export function StagesRow({ foothillsPercent, gearCount, activeTrip, completedRoutes }: Props) {
  const stormValue = activeTrip ? getTripStatusLabel(activeTrip.status) : '—'
  const stormColor = activeTrip ? 'amber' : 'dim'

  const summitColor = completedRoutes > 0 ? 'green' : 'dim'
  const summitValue = completedRoutes > 0 ? String(completedRoutes) : '—'

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <StageCell
        name="Подножие"
        value={`${foothillsPercent}%`}
        hint="KG + узлы"
        color={foothillsPercent > 0 ? 'green' : 'dim'}
      />
      <StageCell
        name="База"
        value={`${gearCount} позиций`}
        hint="снаряжение"
        color={gearCount > 0 ? 'blue' : 'dim'}
      />
      <StageCell
        name="Штурм"
        value={stormValue}
        hint={activeTrip ? 'поездка' : 'нет поездки'}
        color={stormColor}
      />
      <StageCell
        name="Вершина"
        value={summitValue}
        hint="восхождений"
        color={summitColor}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd /Users/maksimvalkov/Desktop/Mountaine && npx tsc --noEmit 2>&1 | grep stages-row
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/stages-row.tsx
git commit -m "feat(dashboard): add StagesRow component"
```

---

## Task 5: Wire dashboard in page.tsx + delete BeginnerDashboard

**Files:**
- Modify: `src/app/page.tsx`
- Delete: `src/components/beginner-dashboard.tsx`

This is the largest task. Read `src/app/page.tsx` in full before editing.

The current `page.tsx` has three conditional layouts (`isBeginner`, `isExpert`, `!isBeginner && !isExpert`). The new authenticated user layout replaces all three. The unauthenticated layout (`!isBeginner && !isExpert` when `user` is null) stays for logged-out visitors.

- [ ] **Step 1: Read the full current `page.tsx`**

Open `src/app/page.tsx` and understand the structure before making changes.

- [ ] **Step 2: Replace the entire `page.tsx`**

```tsx
import Link from 'next/link'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { OnboardingGuide } from '@/components/onboarding-guide'
import { ResumeCard } from '@/components/dashboard/resume-card'
import { TripCard } from '@/components/dashboard/trip-card'
import { StagesRow } from '@/components/dashboard/stages-row'
import {
  fetchKGStats,
  fetchKnotStats,
  fetchLastActivity,
  fetchActiveTrip,
  fetchGearCount,
  fetchCompletedRoutes,
  calcFoothillsPercent,
  getFirstName,
  getLevelLabel,
} from '@/lib/dashboard-data'

// ─── Tool grids ──────────────────────────────────────────────────────────────

const beginnerTools = [
  { href: '/knowledge', label: 'Граф знаний', sub: 'Основы и теория' },
  { href: '/knots', label: 'Узлы', sub: 'Пошаговое изучение' },
  { href: '/training', label: 'Тренировки', sub: 'Физподготовка' },
  { href: '/gear', label: 'Кладовка', sub: 'Учёт снаряжения' },
  { href: '/mountains', label: 'Маршруты', sub: 'КГ, ТС, 1Б–6Б' },
  { href: '/forum', label: 'Форум', sub: 'Вопросы и опыт' },
]

const expertTools = [
  { href: '/mountains', label: 'Маршруты', sub: 'КГ, ТС, 1Б–6Б' },
  { href: '/teams', label: 'Отделения', sub: 'Состав, снаряжение' },
  { href: '/gear', label: 'Кладовка', sub: 'Учёт и сборы' },
  { href: '/trips', label: 'Поездки', sub: 'Планирование выхода' },
  { href: '/rations', label: 'Раскладка', sub: 'Питание на маршруте' },
  { href: '/forum', label: 'Форум', sub: 'Вопросы и опыт' },
]

// ─── Landing page tool grid (reused for logged-out visitors) ─────────────────

const landingExpertTools = [
  { href: '/mountains', label: 'Маршруты', sub: 'КГ, ТС, 1Б–6Б' },
  { href: '/trips', label: 'Поездки', sub: 'Планирование выхода' },
  { href: '/teams', label: 'Отделения', sub: 'Состав, снаряжение' },
  { href: '/gear', label: 'Кладовка', sub: 'Учёт и сборы' },
  { href: '/rations', label: 'Раскладка', sub: 'Питание на маршруте' },
  { href: '/forum', label: 'Форум', sub: 'Вопросы и опыт' },
]

const learningTools = [
  { href: '/knowledge', label: 'Граф знаний', sub: 'Основы и теория' },
  { href: '/knots', label: 'Узлы', sub: 'Пошаговое изучение' },
  { href: '/training', label: 'Тренировки', sub: 'Физподготовка' },
  { href: '/resources', label: 'Ресурсы', sub: 'Статьи и организации' },
]

const beginnerLandingSteps = [
  {
    href: '/knowledge',
    step: '01',
    title: 'Граф знаний',
    detail: 'Интерактивная карта альпинистских знаний — от снаряжения до тактики',
    tag: 'Основы',
  },
  {
    href: '/knots',
    step: '02',
    title: 'Узлы',
    detail: 'Пошаговое изучение — от простых к сложным. Практика с проверкой',
    tag: 'Навыки',
  },
  {
    href: '/training',
    step: '03',
    title: 'Тренировки',
    detail: 'Упражнения и рекомендации для физической подготовки к восхождениям',
    tag: 'Подготовка',
  },
]

function ToolGrid({ tools, cols = '3' }: { tools: typeof expertTools; cols?: '2' | '3' | '4' }) {
  const colClass =
    cols === '2' ? 'grid-cols-2' : cols === '4' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'
  return (
    <div
      className={`grid ${colClass} gap-px bg-mountain-border rounded-lg overflow-hidden border border-mountain-border`}
    >
      {tools.map((tool) => (
        <Link
          key={tool.href + tool.label}
          href={tool.href}
          className="group bg-mountain-surface px-4 py-4 hover:bg-mountain-border/60 transition-colors duration-150"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="font-semibold text-mountain-text text-sm group-hover:text-mountain-text transition-colors">
                {tool.label}
              </div>
              <div className="text-xs text-mountain-muted mt-0.5">{tool.sub}</div>
            </div>
            <ChevronRight
              size={13}
              className="text-mountain-border group-hover:text-mountain-primary mt-0.5 shrink-0 transition-colors"
            />
          </div>
        </Link>
      ))}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ── Authenticated dashboard ─────────────────────────────────────────────
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, experience_level')
      .eq('id', user.id)
      .single()

    const experienceLevel = profile?.experience_level ?? null
    const isExpert = experienceLevel === 'intermediate' || experienceLevel === 'advanced'
    const tools = isExpert ? expertTools : beginnerTools

    const [kgStats, knotStats, activeTrip, gearCount, completedRoutes] = await Promise.all([
      fetchKGStats(supabase, user.id),
      fetchKnotStats(supabase, user.id),
      fetchActiveTrip(supabase, user.id),
      fetchGearCount(supabase, user.id),
      fetchCompletedRoutes(supabase, user.id),
    ])

    const lastActivity = await fetchLastActivity(supabase, user.id, kgStats, knotStats)
    const foothillsPercent = calcFoothillsPercent(
      kgStats.studied,
      kgStats.total,
      knotStats.mastered,
      knotStats.total,
    )

    const firstName = getFirstName(profile?.display_name ?? null)
    const levelLabel = getLevelLabel(experienceLevel)

    return (
      <div className="min-h-[calc(100vh-4rem)]">
        {/* Hero */}
        <section
          aria-label="Приветствие"
          className="pt-14 pb-10 border-b border-mountain-border"
        >
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-mountain-accent mb-3">
            Платформа для альпинистов
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-mountain-text mb-1">
            {firstName ? `Привет, ${firstName}` : 'Добро пожаловать'}
          </h1>
          {(levelLabel || completedRoutes > 0) && (
            <p className="text-sm text-mountain-muted">
              {levelLabel}
              {levelLabel && completedRoutes > 0 && ' · '}
              {completedRoutes > 0 && `${completedRoutes} восхождений`}
            </p>
          )}
        </section>

        {/* Top row: Resume + Trip */}
        <section aria-label="Быстрый доступ" className="pt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <ResumeCard activity={lastActivity} />
            <TripCard trip={activeTrip} />
          </div>

          {/* Stages */}
          <div className="mb-2">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-mountain-muted mb-3">
              Твой путь
            </p>
            <StagesRow
              foothillsPercent={foothillsPercent}
              gearCount={gearCount}
              activeTrip={activeTrip}
              completedRoutes={completedRoutes}
            />
          </div>
        </section>

        {/* Tools */}
        <section
          aria-label="Инструменты"
          className="mt-10 pt-8 border-t border-mountain-border"
        >
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-mountain-muted mb-5">
            Инструменты
          </p>
          <ToolGrid tools={tools} />
        </section>
      </div>
    )
  }

  // ── Unauthenticated landing page (unchanged) ────────────────────────────
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero */}
      <section aria-label="Заголовок" className="pt-14 pb-12 border-b border-mountain-border">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-mountain-accent mb-5">
            Платформа для альпинистов
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] text-mountain-text mb-5">
            Подготовка к горам —<br />
            <span className="text-mountain-muted font-normal">
              от первого узла до сложного маршрута
            </span>
          </h1>
          <p className="text-mountain-muted text-base max-w-xl leading-relaxed">
            Единая среда для обучения, планирования и командной работы. Для новичков и опытных
            альпинистов — каждый найдёт своё.
          </p>
        </div>
      </section>

      {/* Two-column landing */}
      <section className="pt-12 grid grid-cols-1 lg:grid-cols-[1fr_2px_1fr] gap-0">
        {/* Beginner path */}
        <div className="pb-12 lg:pb-0 lg:pr-12">
          <div className="mb-8">
            <span className="inline-block text-xs font-semibold tracking-[0.18em] uppercase text-mountain-accent mb-3">
              Начинаю ходить в горы
            </span>
            <h2 className="text-xl font-semibold text-mountain-text">Учись последовательно</h2>
            <p className="text-sm text-mountain-muted mt-1">
              Три шага, с которых начинает каждый альпинист
            </p>
            <OnboardingGuide level="beginner" />
          </div>

          <ol className="relative">
            {beginnerLandingSteps.map((item, idx) => (
              <li key={item.href} className="relative">
                {idx < 2 && (
                  <div className="absolute left-5 top-[40px] bottom-0 w-px bg-mountain-border" />
                )}
                <Link
                  href={item.href}
                  className="group flex gap-5 items-start py-5 transition-opacity duration-150 hover:opacity-100 opacity-95"
                >
                  <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full border border-mountain-accent/40 bg-mountain-surface flex items-center justify-center group-hover:border-mountain-accent group-hover:bg-mountain-accent/10 transition-colors duration-200">
                    <span className="text-xs font-bold text-mountain-accent">{item.step}</span>
                  </div>
                  <div className="pt-1 flex-1 min-w-0">
                    <span className="text-xs font-semibold tracking-[0.15em] uppercase text-mountain-muted block mb-1">
                      {item.tag}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-mountain-text group-hover:text-mountain-text transition-colors">
                        {item.title}
                      </span>
                      <ChevronRight
                        size={14}
                        className="text-mountain-border group-hover:text-mountain-accent group-hover:translate-x-0.5 transition-all duration-200"
                      />
                    </div>
                    <p className="text-sm text-mountain-muted mt-1 leading-relaxed">{item.detail}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>

          <div className="mt-4 pl-[60px]">
            <Link
              href="/knowledge"
              className="inline-flex items-center gap-2 text-sm font-medium text-mountain-accent hover:text-mountain-accent/80 transition-colors"
            >
              Начать с основ
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="hidden lg:block w-px bg-mountain-border mx-0" />
        <div className="lg:hidden h-px bg-mountain-border mb-12" />

        {/* Expert path */}
        <div className="lg:pl-12">
          <div className="mb-8">
            <span className="inline-block text-xs font-semibold tracking-[0.18em] uppercase text-mountain-primary mb-3">
              Планирую маршрут / команду
            </span>
            <h2 className="text-xl font-semibold text-mountain-text">Инструменты под рукой</h2>
            <p className="text-sm text-mountain-muted mt-1">
              Быстрый доступ ко всему нужному перед выходом
            </p>
            <OnboardingGuide level="advanced" />
          </div>
          <ToolGrid tools={landingExpertTools} cols="2" />
        </div>
      </section>

      {/* Bottom strip */}
      <section className="mt-16 pt-8 border-t border-mountain-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm text-mountain-muted">
            Горы Кавказа, Крыма и других регионов · Маршруты 1Б–6Б · Команды и снаряжение
          </p>
          <Link
            href="/mountains"
            className="text-sm text-mountain-primary hover:text-mountain-primary/80 transition-colors flex items-center gap-1.5"
          >
            Смотреть базу маршрутов
            <ArrowRight size={13} />
          </Link>
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 3: Delete `src/components/beginner-dashboard.tsx`**

```bash
git rm src/components/beginner-dashboard.tsx
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/maksimvalkov/Desktop/Mountaine && npx tsc --noEmit
```

Expected: no errors. If errors appear, fix them before continuing.

- [ ] **Step 5: Run all tests**

```bash
cd /Users/maksimvalkov/Desktop/Mountaine && npx vitest run
```

Expected: all tests PASS (22 dashboard-data + existing tests).

- [ ] **Step 6: Smoke test in browser**

```bash
cd /Users/maksimvalkov/Desktop/Mountaine && npm run dev
```

Open http://localhost:3000. Verify:
1. Logged-out: landing page shows (two-column layout with beginner steps + expert tools)
2. Logged-in as beginner: hero with name, two cards, stages row, beginner tools
3. Logged-in as expert: hero with name, two cards, stages row, expert tools
4. No console errors

- [ ] **Step 7: Commit**

```bash
git add src/app/page.tsx src/components/dashboard/
git commit -m "feat(dashboard): wire personalized dashboard on homepage"
```
