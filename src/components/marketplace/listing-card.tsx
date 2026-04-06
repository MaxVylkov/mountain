// src/components/marketplace/listing-card.tsx
import Link from 'next/link'
import { getCategoryEmoji, transactionTypeLabel, formatPrice } from '@/lib/marketplace-data'
import { getLevelLabel } from '@/lib/dashboard-data'

interface ListingCardProps {
  listing: {
    id: string
    title: string
    category: string
    transaction_type: string
    price: number | null
    city: string
    images: string[]
    created_at: string
    profiles: {
      display_name: string | null
      experience_level: string | null
    } | null
  }
}

const TYPE_STYLES = {
  sell: { tag: 'bg-green-500/10 text-green-400', bar: 'bg-blue-500/5 border-blue-500/10' },
  swap: { tag: 'bg-amber-500/10 text-amber-400', bar: 'bg-amber-500/5 border-amber-500/10' },
  free: { tag: 'bg-indigo-500/10 text-indigo-400', bar: 'bg-indigo-500/5 border-indigo-500/10' },
}

export function ListingCard({ listing }: ListingCardProps) {
  const type = listing.transaction_type as 'sell' | 'swap' | 'free'
  const styles = TYPE_STYLES[type] ?? TYPE_STYLES.sell
  const emoji = getCategoryEmoji(listing.category)
  const hasPhoto = listing.images.length > 0
  const sellerInitial = listing.profiles?.display_name?.[0]?.toUpperCase() ?? '?'
  const levelLabel = getLevelLabel(listing.profiles?.experience_level ?? null)
  const priceDisplay = formatPrice(listing.transaction_type, listing.price)

  return (
    <Link
      href={`/marketplace/${listing.id}`}
      className="block rounded-xl border border-mountain-border bg-mountain-surface overflow-hidden hover:border-mountain-primary/30 transition-colors"
    >
      {/* Photo area */}
      <div className="relative h-28 bg-gradient-to-br from-[#1a2535] to-[#0f1923] flex items-center justify-center">
        {hasPhoto ? (
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-3xl">{emoji}</span>
        )}
        <span className={`absolute top-2 left-2 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${styles.tag}`}>
          {transactionTypeLabel(type)}
        </span>
      </div>

      {/* Info */}
      <div className="px-3 pt-2 pb-1">
        <div className="text-xs font-semibold text-mountain-text truncate mb-0.5">{listing.title}</div>
        <div className={`text-xs font-bold ${type === 'sell' ? 'text-mountain-text' : type === 'swap' ? 'text-amber-400' : 'text-indigo-400'}`}>
          {priceDisplay}
        </div>
      </div>

      {/* Seller bar */}
      <div className={`mx-2 mb-2 px-2 py-1 rounded border text-[9px] text-mountain-muted flex items-center gap-1 ${styles.bar}`}>
        <span className="font-bold text-mountain-text">{sellerInitial}</span>
        {levelLabel && <span>· {levelLabel}</span>}
        <span>· {listing.city}</span>
      </div>
    </Link>
  )
}
