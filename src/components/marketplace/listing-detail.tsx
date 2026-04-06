'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, MapPin, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getCategoryEmoji, transactionTypeLabel, marketplaceConditionLabel, formatPrice, getConditionSeasons } from '@/lib/marketplace-data'
import { getLevelLabel } from '@/lib/dashboard-data'

// --- PhotoGallery ---
function PhotoGallery({ images, alt, emoji }: { images: string[]; alt: string; emoji: string }) {
  const [idx, setIdx] = useState(0)
  const touchStartX = useRef<number | null>(null)

  function handleTouchStart(e: React.TouchEvent) {
    if (!e.touches[0]) return
    touchStartX.current = e.touches[0].clientX
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (delta > 40 && idx > 0) setIdx(idx - 1)
    else if (delta < -40 && idx < images.length - 1) setIdx(idx + 1)
    touchStartX.current = null
  }

  if (images.length === 0) {
    return (
      <div className="rounded-xl border border-mountain-border bg-gradient-to-br from-[#1a2535] to-[#0f1923] h-52 flex items-center justify-center">
        <span className="text-5xl">{emoji}</span>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <div
        className="rounded-xl border border-mountain-border bg-gradient-to-br from-[#1a2535] to-[#0f1923] h-52 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img src={images[idx]} alt={alt} className="w-full h-full object-cover select-none" draggable={false} />
      </div>
      {images.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border transition-colors ${i === idx ? 'border-mountain-primary' : 'border-mountain-border'}`}
            >
              <img src={src} alt={`фото ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// --- OwnerActions ---
function OwnerActions({ listingId }: { listingId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [updating, setUpdating] = useState(false)

  async function setStatus(status: 'sold' | 'archived') {
    setUpdating(true)
    const { error } = await supabase.from('marketplace_listings').update({ status }).eq('id', listingId)
    if (!error) router.refresh()
    setUpdating(false)
  }

  return (
    <div className="flex gap-2 pt-2">
      <Link
        href={`/marketplace/${listingId}/edit`}
        className="flex-1 text-center text-xs font-semibold py-2.5 rounded-lg border border-mountain-primary/30 text-mountain-primary hover:border-mountain-primary transition-colors"
      >
        Изменить
      </Link>
      <button
        onClick={() => setStatus('sold')}
        disabled={updating}
        className="flex-1 text-xs font-semibold py-2.5 rounded-lg border border-mountain-border text-mountain-muted hover:border-mountain-primary/40 transition-colors disabled:opacity-40"
      >
        Продано
      </button>
      <button
        onClick={() => setStatus('archived')}
        disabled={updating}
        className="flex-1 text-xs font-semibold py-2.5 rounded-lg border border-mountain-border text-mountain-muted hover:border-mountain-primary/40 transition-colors disabled:opacity-40"
      >
        Снять
      </button>
    </div>
  )
}

interface Listing {
  id: string
  title: string
  description: string | null
  category: string
  condition: string
  transaction_type: string
  price: number | null
  city: string
  images: string[]
  contact_telegram: string | null
  contact_phone: string | null
  show_contact: boolean
  created_at: string
  profiles: {
    display_name: string | null
    experience_level: string | null
    created_at: string
  } | null
  completed_routes: number
  recent_routes: string[]
}

interface ListingDetailProps {
  listing: Listing
  isOwner: boolean
  isAuthenticated: boolean
}

const TYPE_TAG_STYLES = {
  sell: 'bg-green-500/10 text-green-400',
  swap: 'bg-amber-500/10 text-amber-400',
  free: 'bg-indigo-500/10 text-indigo-400',
}

export function ListingDetail({ listing, isOwner, isAuthenticated }: ListingDetailProps) {
  const emoji = getCategoryEmoji(listing.category)
  const typeStyle = TYPE_TAG_STYLES[listing.transaction_type as keyof typeof TYPE_TAG_STYLES] ?? TYPE_TAG_STYLES.sell
  const levelLabel = getLevelLabel(listing.profiles?.experience_level ?? null)
  const sellerInitial = listing.profiles?.display_name?.[0]?.toUpperCase() ?? '?'
  const [memberMonths, setMemberMonths] = useState<number | null>(null)
  useEffect(() => {
    if (!listing.profiles?.created_at) return
    setMemberMonths(Math.max(1, Math.round((Date.now() - new Date(listing.profiles.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30))))
  }, [listing.profiles?.created_at])
  const dateLabel = new Date(listing.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })

  return (
    <div className="space-y-4 max-w-lg">
      {/* Back */}
      <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-xs text-mountain-muted hover:text-mountain-text transition-colors">
        <ArrowLeft size={13} />
        Все объявления
      </Link>

      {/* Type + date */}
      <div className="flex items-center gap-2">
        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded ${typeStyle}`}>
          {transactionTypeLabel(listing.transaction_type)}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-mountain-muted">
          <MapPin size={10} />
          {listing.city}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-mountain-muted">
          <Calendar size={10} />
          {dateLabel}
        </span>
      </div>

      {/* Photo gallery */}
      <PhotoGallery images={listing.images} alt={listing.title} emoji={emoji} />

      {/* Title + price */}
      <div>
        <h1 className="text-xl font-bold text-mountain-text mb-1">{listing.title}</h1>
        <div className={`text-2xl font-bold ${listing.transaction_type === 'sell' ? 'text-mountain-text' : listing.transaction_type === 'swap' ? 'text-amber-400' : 'text-indigo-400'}`}>
          {formatPrice(listing.transaction_type, listing.price)}
        </div>
      </div>

      {/* Meta chips: category · condition · seasons of use */}
      <div className="flex flex-wrap gap-2">
        <span className="text-[10px] text-mountain-muted bg-mountain-surface border border-mountain-border rounded px-2 py-1">
          {listing.category}
        </span>
        <span className="text-[10px] text-mountain-muted bg-mountain-surface border border-mountain-border rounded px-2 py-1">
          {marketplaceConditionLabel(listing.condition)}
        </span>
        {getConditionSeasons(listing.condition) && (
          <span className="text-[10px] text-mountain-muted bg-mountain-surface border border-mountain-border rounded px-2 py-1">
            {getConditionSeasons(listing.condition)}
          </span>
        )}
      </div>

      {/* Description */}
      {listing.description && (
        <p className="text-sm text-mountain-muted leading-relaxed">{listing.description}</p>
      )}

      <hr className="border-mountain-border" />

      {/* Seller card */}
      <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-300 flex-shrink-0">
            {sellerInitial}
          </div>
          <div>
            <div className="text-sm font-semibold text-mountain-text">
              {listing.profiles?.display_name ?? 'Пользователь'}
            </div>
            <div className="text-[10px] text-mountain-muted">
              {[levelLabel, listing.completed_routes > 0 && `${listing.completed_routes} восхождений`, memberMonths && `на платформе ${memberMonths} мес.`].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>
        {listing.recent_routes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {listing.recent_routes.map((name) => (
              <span key={name} className="text-[9px] text-mountain-muted border border-mountain-border rounded px-1.5 py-0.5">
                {name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Contact block */}
      {listing.show_contact && isAuthenticated && (listing.contact_telegram || listing.contact_phone) && (
        <div className="bg-green-500/5 border border-green-500/15 rounded-xl p-4 space-y-2">
          {listing.contact_telegram && (
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-green-400 mb-0.5">Telegram</div>
              <a
                href={`https://t.me/${listing.contact_telegram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-mountain-text hover:text-mountain-primary transition-colors"
              >
                {listing.contact_telegram.startsWith('@') ? listing.contact_telegram : `@${listing.contact_telegram}`}
              </a>
            </div>
          )}
          {listing.contact_phone && (
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-green-400 mb-0.5">Телефон</div>
              <a href={`tel:${listing.contact_phone}`} className="text-sm font-semibold text-mountain-text hover:text-mountain-primary transition-colors">
                {listing.contact_phone}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Owner actions — Edit / Продано / Снять */}
      {isOwner && <OwnerActions listingId={listing.id} />}
    </div>
  )
}
