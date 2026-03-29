'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Star, BookmarkPlus, CheckCircle } from 'lucide-react'

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
  const [wishlist, setWishlist] = useState(false)
  const [visited, setVisited] = useState(false)
  const [saving, setSaving] = useState(false)

  const upsertStatus = async (field: 'want_to_do' | 'completed', value: boolean) => {
    if (!currentUserId) { window.location.href = '/login'; return }
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
        {data.difficulty !== null && (
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-3.5 h-3.5 ${i < data.difficulty! ? 'text-amber-400 fill-amber-400' : 'text-mountain-border'}`}
              />
            ))}
          </div>
        )}
      </div>
      {data.season && (
        <p className="text-xs text-mountain-muted">Сезон: {data.season}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={toggleWishlist}
          disabled={saving}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 ${
            wishlist ? 'border-mountain-primary text-mountain-primary' : 'border-mountain-border text-mountain-muted hover:border-mountain-primary hover:text-mountain-text'
          }`}
        >
          <BookmarkPlus className="w-3.5 h-3.5" />
          В вишлист
        </button>
        <button
          onClick={toggleVisited}
          disabled={saving}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 ${
            visited ? 'border-emerald-500 text-emerald-400' : 'border-mountain-border text-mountain-muted hover:border-emerald-500 hover:text-mountain-text'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          Был здесь
        </button>
      </div>
    </div>
  )
}
