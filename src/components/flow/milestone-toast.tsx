'use client'

import { useEffect, useState, useCallback } from 'react'
import { Trophy, Star, Mountain, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { checkMilestones, type Milestone } from '@/lib/flow-engine'

const ICONS = {
  trophy: Trophy,
  star: Star,
  mountain: Mountain,
  check: Check,
}

const STORAGE_KEY = 'mountaine:seen-milestones'

function getSeenMilestones(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function markSeen(id: string) {
  const seen = getSeenMilestones()
  seen.add(id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]))
}

export function MilestoneToast() {
  const [milestone, setMilestone] = useState<Milestone | null>(null)
  const [visible, setVisible] = useState(false)

  const dismiss = useCallback(() => {
    setVisible(false)
    setTimeout(() => setMilestone(null), 300)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const userId = data.user.id

      // Fetch current stats
      const [kgTotalRes, kgStudiedRes, knotTotalRes, knotMasteredRes, gearRes, routesRes] = await Promise.all([
        supabase.from('kg_nodes').select('*', { count: 'exact', head: true }),
        supabase.from('kg_progress').select('*', { count: 'exact', head: true })
          .eq('user_id', userId).eq('studied', true),
        supabase.from('knots').select('*', { count: 'exact', head: true }),
        supabase.from('knot_progress').select('*', { count: 'exact', head: true })
          .eq('user_id', userId).eq('status', 'mastered'),
        supabase.from('user_gear').select('*', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase.from('user_route_status').select('*', { count: 'exact', head: true })
          .eq('user_id', userId).eq('completed', true),
      ])

      const kgStats = { studied: kgStudiedRes.count ?? 0, total: kgTotalRes.count ?? 0 }
      const knotStats = { mastered: knotMasteredRes.count ?? 0, total: knotTotalRes.count ?? 0 }
      const completedRoutes = routesRes.count ?? 0

      // Use "zero" as previous state to detect any achieved milestones
      // Then filter out already-seen ones
      const allMilestones = checkMilestones(
        kgStats,
        knotStats,
        gearRes.count ?? 0,
        completedRoutes,
        { kgStudied: 0, knotsMastered: 0, gearCount: 0, completedRoutes: 0 },
      )

      const seen = getSeenMilestones()
      const unseen = allMilestones.filter(m => !seen.has(m.id))

      if (unseen.length > 0) {
        const m = unseen[0]
        markSeen(m.id)
        setMilestone(m)
        // Small delay so it feels like a reveal
        setTimeout(() => setVisible(true), 600)
        // Auto-dismiss after 5s
        setTimeout(() => dismiss(), 6000)
      }
    })
  }, [dismiss])

  if (!milestone) return null

  const Icon = ICONS[milestone.icon]

  return (
    <div
      className={`
        fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[calc(100%-2rem)]
        rounded-xl border border-mountain-accent/30 bg-mountain-surface shadow-lg shadow-mountain-accent/10
        px-4 py-3 flex items-center gap-3
        transition-all duration-300
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
      role="status"
      aria-live="polite"
    >
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-mountain-accent/15 flex items-center justify-center">
        <Icon size={18} className="text-mountain-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-mountain-text">{milestone.title}</p>
        <p className="text-xs text-mountain-muted">{milestone.description}</p>
      </div>
      <button
        onClick={dismiss}
        className="p-1 text-mountain-muted hover:text-mountain-text transition-colors shrink-0"
        aria-label="Закрыть"
      >
        <X size={14} />
      </button>
    </div>
  )
}
