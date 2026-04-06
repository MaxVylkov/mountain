// src/components/marketplace/feed-filters.tsx
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { MARKETPLACE_CATEGORIES } from '@/lib/marketplace-data'

export function FeedFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString())
    if (value === null || value === 'all') {
      next.delete(key)
    } else {
      next.set(key, value)
    }
    next.delete('cursor') // reset pagination on filter change
    router.push(`${pathname}?${next.toString()}`)
  }

  const type = params.get('type') ?? 'all'
  const category = params.get('category') ?? ''
  const city = params.get('city') ?? ''
  const q = params.get('q') ?? ''

  const typeOptions = [
    { value: 'all', label: 'Все' },
    { value: 'sell', label: 'Продам' },
    { value: 'swap', label: 'Обмен' },
    { value: 'free', label: 'Отдам' },
  ]

  return (
    <div className="space-y-2">
      {/* Search bar */}
      <input
        type="text"
        placeholder="Поиск по названию..."
        defaultValue={q}
        onBlur={(e) => setParam('q', e.target.value || null)}
        onKeyDown={(e) => e.key === 'Enter' && setParam('q', (e.target as HTMLInputElement).value || null)}
        className="w-full text-sm px-3 py-2 rounded-xl border border-mountain-border bg-mountain-surface text-mountain-text placeholder:text-mountain-muted focus:outline-none focus:border-mountain-primary/50 transition-colors"
      />

      {/* Pill filters row */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {typeOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setParam('type', opt.value)}
            className={`flex-shrink-0 text-[10px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              type === opt.value
                ? 'border-mountain-primary/50 bg-mountain-primary/10 text-blue-300'
                : 'border-mountain-border text-mountain-muted hover:border-mountain-border/80'
            }`}
          >
            {opt.label}
          </button>
        ))}
        <select
          value={category}
          onChange={(e) => setParam('category', e.target.value || null)}
          className="flex-shrink-0 text-[10px] font-semibold px-3 py-1.5 rounded-full border border-mountain-border bg-mountain-surface text-mountain-muted focus:outline-none"
        >
          <option value="">Категория</option>
          {MARKETPLACE_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Город"
          defaultValue={city}
          onBlur={(e) => setParam('city', e.target.value || null)}
          onKeyDown={(e) => e.key === 'Enter' && setParam('city', (e.target as HTMLInputElement).value || null)}
          className="flex-shrink-0 text-[10px] font-semibold px-3 py-1.5 rounded-full border border-mountain-border bg-mountain-surface text-mountain-muted focus:outline-none placeholder:text-mountain-muted w-24"
        />
      </div>
    </div>
  )
}
