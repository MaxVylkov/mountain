'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Package, ChevronDown, ChevronUp, Copy } from 'lucide-react'

interface PackingData {
  setId: string
  setName: string
  itemCount: number
  totalWeightG: number
  items: { gear_name: string; backpack_name: string | null }[]
}

interface Props {
  data: PackingData
  currentUserId: string | null
}

export function AttachmentPackingCard({ data, currentUserId }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyToStash = async () => {
    if (!currentUserId) { window.location.href = '/login'; return }
    setCopying(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('copy_packing_set_for_user', {
      source_set_id: data.setId,
      target_user_id: currentUserId,
    })
    setCopying(false)
    if (!error) {
      setCopied(true)
      // Show success state for 3 seconds
      setTimeout(() => setCopied(false), 3000)
    }
  }

  const weightKg = (data.totalWeightG / 1000).toFixed(1)

  // Group items by backpack
  const grouped = data.items.reduce<Record<string, string[]>>((acc, item) => {
    const key = item.backpack_name ?? 'Без рюкзака'
    ;(acc[key] ??= []).push(item.gear_name)
    return acc
  }, {})

  return (
    <div className="rounded-xl border border-mountain-border bg-mountain-surface/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-mountain-primary" />
          <div>
            <p className="text-sm font-semibold text-mountain-text">{data.setName}</p>
            <p className="text-xs text-mountain-muted">{data.itemCount} предметов · {weightKg} кг</p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-mountain-muted hover:text-mountain-text transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="space-y-2 pt-1 border-t border-mountain-border/40">
          {Object.entries(grouped).map(([backpack, items]) => (
            <div key={backpack}>
              <p className="text-xs font-medium text-mountain-muted mb-1">{backpack}</p>
              <ul className="space-y-0.5">
                {items.map((name, i) => (
                  <li key={i} className="text-xs text-mountain-text pl-2">· {name}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={copyToStash}
        disabled={copying || copied}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 ${
          copied
            ? 'border-emerald-500 text-emerald-400'
            : 'border-mountain-border text-mountain-muted hover:border-mountain-primary hover:text-mountain-text'
        }`}
      >
        <Copy className="w-3.5 h-3.5" />
        {copied ? 'Добавлено в кладовку ✓' : copying ? 'Копирую...' : 'Скопировать в кладовку'}
      </button>
    </div>
  )
}
