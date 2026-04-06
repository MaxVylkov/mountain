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
      // kg_nodes is a global catalog — no user_id filter intended
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
      // knots is a global catalog — no user_id filter intended
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

    const picked = pickLastActivity(candidates)
    if (!picked) return null
    return { module: picked.module, href: picked.href, progressPercent: picked.progressPercent }
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

// ─── Streak calculation ──────────────────────────────────────────────────────

export interface StreakInfo {
  current: number    // consecutive days with activity
  isActiveToday: boolean
}

/**
 * Computes the user's activity streak by collecting distinct activity dates
 * from kg_progress, knot_progress, and training_log tables.
 */
export async function fetchStreak(supabase: SupabaseClient, userId: string): Promise<StreakInfo> {
  try {
    const [kgRows, knotRows, trainingRows] = await Promise.all([
      supabase.from('kg_progress').select('created_at').eq('user_id', userId),
      supabase.from('knot_progress').select('updated_at').eq('user_id', userId).neq('status', 'locked'),
      supabase.from('training_log').select('completed_at').eq('user_id', userId),
    ])

    const dates = new Set<string>()
    for (const r of kgRows.data ?? []) {
      if (r.created_at) dates.add(r.created_at.slice(0, 10))
    }
    for (const r of knotRows.data ?? []) {
      if (r.updated_at) dates.add(r.updated_at.slice(0, 10))
    }
    for (const r of trainingRows.data ?? []) {
      if (r.completed_at) dates.add(r.completed_at.slice(0, 10))
    }

    return computeStreak(Array.from(dates))
  } catch {
    return { current: 0, isActiveToday: false }
  }
}

export function computeStreak(dateStrings: string[]): StreakInfo {
  if (dateStrings.length === 0) return { current: 0, isActiveToday: false }

  const sorted = dateStrings.sort().reverse()
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  const isActiveToday = sorted[0] === today
  // Streak must start from today or yesterday to be "current"
  if (sorted[0] !== today && sorted[0] !== yesterday) {
    return { current: 0, isActiveToday: false }
  }

  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1])
    const curr = new Date(sorted[i])
    const diff = (prev.getTime() - curr.getTime()) / 86400000
    if (diff === 1) {
      streak++
    } else if (diff > 1) {
      break
    }
    // diff === 0 means same day, skip
  }

  return { current: streak, isActiveToday }
}
