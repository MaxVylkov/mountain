'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { transactionTypeLabel, formatPrice } from '@/lib/marketplace-data'
import { ChevronRight } from 'lucide-react'

interface MyListing {
  id: string
  title: string
  transaction_type: string
  price: number | null
  status: string
  created_at: string
}

interface MyListingsProps {
  listings: MyListing[]
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Активно',
  sold: 'Продано',
  archived: 'Архив',
}

export function MyListings({ listings }: MyListingsProps) {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<'active' | 'sold' | 'archived'>('active')
  const [updating, setUpdating] = useState<string | null>(null)

  const filtered = listings.filter((l) => l.status === tab)

  async function setStatus(id: string, status: 'sold' | 'archived') {
    setUpdating(id)
    const { error } = await supabase.from('marketplace_listings').update({ status }).eq('id', id)
    setUpdating(null)
    if (!error) router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-mountain-border">
        {(['active', 'sold', 'archived'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-mountain-primary text-mountain-text'
                : 'border-transparent text-mountain-muted hover:text-mountain-text'
            }`}
          >
            {STATUS_LABELS[t]}
            <span className="ml-1.5 text-[9px] opacity-60">
              {listings.filter((l) => l.status === t).length}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-10 text-center text-mountain-muted text-sm">
          {tab === 'active' ? (
            <>
              <p className="mb-3">Нет активных объявлений.</p>
              <Link href="/marketplace/new" className="text-mountain-primary hover:underline text-xs font-semibold">
                + Создать объявление
              </Link>
            </>
          ) : (
            <p>Нет объявлений в этом разделе.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((listing) => (
            <div
              key={listing.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-mountain-border bg-mountain-surface"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="text-sm font-semibold text-mountain-text truncate">{listing.title}</div>
                  <span className={`flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    listing.status === 'active'
                      ? 'bg-green-500/10 text-green-400'
                      : listing.status === 'sold'
                      ? 'bg-mountain-primary/10 text-blue-300'
                      : 'bg-mountain-surface text-mountain-muted border border-mountain-border'
                  }`}>
                    {listing.status === 'active' ? 'Активно' : listing.status === 'sold' ? 'Продано' : 'Архив'}
                  </span>
                </div>
                <div className="text-[10px] text-mountain-muted">
                  {transactionTypeLabel(listing.transaction_type)} · {formatPrice(listing.transaction_type, listing.price)} · {new Date(listing.created_at).toLocaleDateString('ru-RU')}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {tab === 'active' && (
                  <Link
                    href={`/marketplace/${listing.id}/edit`}
                    className="text-[10px] font-semibold text-mountain-primary border border-mountain-primary/30 rounded px-2 py-1 hover:border-mountain-primary transition-colors"
                  >
                    Изменить
                  </Link>
                )}
                {tab === 'active' && (
                  <button
                    onClick={() => setStatus(listing.id, 'sold')}
                    disabled={updating === listing.id}
                    className="text-[10px] font-semibold text-mountain-muted border border-mountain-border rounded px-2 py-1 hover:border-mountain-primary/40 transition-colors disabled:opacity-40"
                  >
                    Продано
                  </button>
                )}
                {tab === 'active' && (
                  <button
                    onClick={() => setStatus(listing.id, 'archived')}
                    disabled={updating === listing.id}
                    className="text-[10px] font-semibold text-mountain-muted border border-mountain-border rounded px-2 py-1 hover:border-mountain-primary/40 transition-colors disabled:opacity-40"
                  >
                    Снять
                  </button>
                )}
                <Link href={`/marketplace/${listing.id}`}>
                  <ChevronRight size={14} className="text-mountain-muted" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
