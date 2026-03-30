'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Target, Check } from 'lucide-react'

const DIFFICULTY_LABELS: Record<number, string> = {
  1: '1Б', 2: '2А-2Б', 3: '3А-3Б', 4: '4А-4Б', 5: '5А-5Б',
}
const DIFFICULTY_COLORS: Record<number, string> = {
  1: 'bg-mountain-success/20 text-mountain-success border-mountain-success/30',
  2: 'bg-mountain-accent/20 text-mountain-accent border-mountain-accent/30',
  3: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  4: 'bg-mountain-danger/20 text-mountain-danger border-mountain-danger/30',
  5: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

interface RouteData {
  routeId: string
  routeName: string
  mountainName: string
  difficulty: number | null
  season: string | null
}

interface Props {
  data: RouteData
  currentUserId: string | null
}

export function AttachmentRouteCard({ data, currentUserId }: Props) {
  const router = useRouter()
  const [wishlist, setWishlist] = useState(false)
  const [visited, setVisited] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!currentUserId) return
    const supabase = createClient()
    supabase
      .from('user_route_status')
      .select('want_to_do, completed')
      .eq('user_id', currentUserId)
      .eq('route_id', data.routeId)
      .maybeSingle()
      .then(({ data: s }) => {
        if (s) {
          setWishlist(s.want_to_do)
          setVisited(s.completed)
        }
      })
  }, [currentUserId, data.routeId])

  const upsertStatus = async (field: 'want_to_do' | 'completed', value: boolean) => {
    if (!currentUserId) { router.push('/login'); return }
    setSaving(true)
    const supabase = createClient()
    await supabase.from('user_route_status').upsert(
      { user_id: currentUserId, route_id: data.routeId, [field]: value },
      { onConflict: 'user_id,route_id' }
    )
    setSaving(false)
  }

  const toggleWishlist = async () => {
    const next = !wishlist
    setWishlist(next)
    await upsertStatus('want_to_do', next)
  }

  const toggleVisited = async () => {
    const next = !visited
    setVisited(next)
    await upsertStatus('completed', next)
  }

  return (
    <div className="rounded-xl border border-mountain-border bg-mountain-surface/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-mountain-muted">{data.mountainName}</p>
          <p className="text-sm font-semibold text-mountain-text">{data.routeName}</p>
        </div>
        {data.difficulty !== null && DIFFICULTY_LABELS[data.difficulty] && (
          <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${DIFFICULTY_COLORS[data.difficulty]}`}>
            {DIFFICULTY_LABELS[data.difficulty]}
          </span>
        )}
      </div>
      {data.season && (
        <p className="text-xs text-mountain-muted">Сезон: {data.season}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={toggleWishlist}
          disabled={saving}
          aria-pressed={wishlist}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 ${
            wishlist ? 'border-mountain-primary text-mountain-primary' : 'border-mountain-border text-mountain-muted hover:border-mountain-primary hover:text-mountain-text'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          Хочу пройти
        </button>
        <button
          onClick={toggleVisited}
          disabled={saving}
          aria-pressed={visited}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 ${
            visited ? 'border-mountain-success text-mountain-success' : 'border-mountain-border text-mountain-muted hover:border-mountain-success hover:text-mountain-text'
          }`}
        >
          <Check className="w-3.5 h-3.5" />
          Ходил
        </button>
      </div>
    </div>
  )
}
