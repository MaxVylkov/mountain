'use client'

import { useState, useEffect } from 'react'
import { Check, Target } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface RegionStatusButtonsProps {
  region: string
}

export function RegionStatusButtons({ region }: RegionStatusButtonsProps) {
  const [userId, setUserId] = useState<string | null>(null)
  const [status, setStatus] = useState<{ want_to_go: boolean; visited: boolean }>({
    want_to_go: false,
    visited: false,
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      setUserId(data.user.id)
      supabase
        .from('user_region_status')
        .select('want_to_go, visited')
        .eq('user_id', data.user.id)
        .eq('region', region)
        .maybeSingle()
        .then(({ data: s }) => {
          if (s) setStatus({ want_to_go: s.want_to_go, visited: s.visited })
        })
    })
  }, [region])

  async function toggle(field: 'want_to_go' | 'visited') {
    if (!userId) return
    const newValue = !status[field]
    setStatus(prev => ({ ...prev, [field]: newValue }))
    const supabase = createClient()
    const { error } = await supabase
      .from('user_region_status')
      .upsert({ user_id: userId, region, [field]: newValue }, { onConflict: 'user_id,region' })
    if (error) {
      setStatus(prev => ({ ...prev, [field]: !newValue }))
    }
  }

  if (!userId) return null

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => toggle('want_to_go')}
        aria-label={status.want_to_go ? 'Убрать из запланированных' : 'Хочу съездить'}
        aria-pressed={status.want_to_go}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
          status.want_to_go
            ? 'bg-mountain-accent/20 text-mountain-accent border border-mountain-accent/30'
            : 'bg-mountain-surface text-mountain-muted border border-mountain-border hover:text-mountain-text'
        }`}
      >
        <Target size={14} />
        Хочу съездить
      </button>
      <button
        onClick={() => toggle('visited')}
        aria-label={status.visited ? 'Убрать отметку "Был"' : 'Отметить как посещённый'}
        aria-pressed={status.visited}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
          status.visited
            ? 'bg-mountain-success/20 text-mountain-success border border-mountain-success/30'
            : 'bg-mountain-surface text-mountain-muted border border-mountain-border hover:text-mountain-text'
        }`}
      >
        <Check size={14} />
        Был
      </button>
    </div>
  )
}
