# Барахолка Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a peer-to-peer alpinist gear marketplace (sell / swap / free) integrated with Кладовка and seller profiles.

**Architecture:** Server components for feed and detail pages (URL-param filtering, no client state); a client component for the create/edit form (file uploads, form state); Supabase Storage bucket `marketplace` for photos. The gear-detail-modal gets a "Выставить на продажу" link; a "На продаже" badge is derived at query time with no schema changes to `user_gear`.

**Tech Stack:** Next.js 15 App Router, Supabase (server + client SDK), Tailwind, Vitest, Lucide icons.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/028_marketplace.sql` | Table + RLS |
| Create | `src/lib/marketplace-data.ts` | Pure functions: tag→category, labels, emojis |
| Create | `src/__tests__/marketplace-data.test.ts` | Tests for pure functions |
| Create | `src/app/marketplace/page.tsx` | Feed — server, reads searchParams |
| Create | `src/app/marketplace/[id]/page.tsx` | Detail — server |
| Create | `src/app/marketplace/new/page.tsx` | Create wrapper — server, auth check |
| Create | `src/app/marketplace/[id]/edit/page.tsx` | Edit wrapper — server, auth + ownership check |
| Create | `src/app/marketplace/my/page.tsx` | My listings — server |
| Create | `src/components/marketplace/listing-card.tsx` | Card in 2×N grid |
| Create | `src/components/marketplace/feed-filters.tsx` | Pill filters — client (URL navigation) |
| Create | `src/components/marketplace/listing-detail.tsx` | Detail view — server |
| Create | `src/components/marketplace/listing-form.tsx` | Create/edit form — client |
| Create | `src/components/marketplace/my-listings.tsx` | Tabs + status actions — client |
| Modify | `src/components/gear/gear-detail-modal.tsx` | Add "Выставить" link + "На продаже" badge |
| Modify | `src/components/gear/gear-inventory.tsx` | Fetch on-sale map, pass to GearDetailModal |
| Modify | `src/app/page.tsx` | Add Барахолка to beginnerTools + expertTools |

---

## Shared context for all tasks

**Supabase client patterns:**
```ts
// Server component
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()

// Client component
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
```

**Tailwind design tokens:** `mountain-border`, `mountain-surface`, `mountain-muted`, `mountain-text`, `mountain-accent` (amber), `mountain-primary` (blue), `mountain-success` (green).

**`getLevelLabel`** already exists in `src/lib/dashboard-data.ts` — import it, don't duplicate.

**gear.category values:** `clothing | footwear | hardware | ropes | bivouac | electronics | other`

**user_gear.condition values:** `new | good | worn | needs_repair`

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrations/028_marketplace.sql`

- [ ] **Step 1: Write migration**

```sql
-- supabase/migrations/028_marketplace.sql

create table marketplace_listings (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete cascade,
  gear_id          uuid references user_gear(id) on delete set null,

  title            text not null,
  description      text,
  category         text not null,
  condition        text not null,
  transaction_type text not null check (transaction_type in ('sell', 'swap', 'free')),
  price            integer,

  city             text not null default '',
  contact_telegram text,
  contact_phone    text,
  show_contact     boolean not null default false,

  images           text[] not null default '{}',
  status           text not null default 'active'
                     check (status in ('active', 'sold', 'archived')),

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Auto-update updated_at
create trigger marketplace_listings_updated_at
  before update on marketplace_listings
  for each row execute function update_updated_at();

-- Indexes
create index idx_marketplace_listings_user on marketplace_listings(user_id);
create index idx_marketplace_listings_status on marketplace_listings(status);
create index idx_marketplace_listings_created on marketplace_listings(created_at desc);

-- RLS
alter table marketplace_listings enable row level security;

-- Anyone can read active listings
create policy "Public read active listings"
  on marketplace_listings for select
  using (status = 'active');

-- Owner can read all their own listings (including sold/archived)
create policy "Owner reads own listings"
  on marketplace_listings for select
  using (auth.uid() = user_id);

-- Owner can insert
create policy "Owner inserts listings"
  on marketplace_listings for insert
  with check (auth.uid() = user_id);

-- Owner can update
create policy "Owner updates listings"
  on marketplace_listings for update
  using (auth.uid() = user_id);

-- Owner can delete
create policy "Owner deletes listings"
  on marketplace_listings for delete
  using (auth.uid() = user_id);
```

- [ ] **Step 2: Apply migration**

```bash
npx supabase db push
```

Expected: migration applied with no errors.

- [ ] **Step 3: Create Storage bucket**

In Supabase dashboard → Storage → New bucket:
- Name: `marketplace`
- Public: ✅ (photos must be publicly readable)

OR via SQL:
```sql
insert into storage.buckets (id, name, public)
values ('marketplace', 'marketplace', true)
on conflict do nothing;

create policy "Public read marketplace images"
  on storage.objects for select
  using (bucket_id = 'marketplace');

create policy "Authenticated upload marketplace images"
  on storage.objects for insert
  with check (bucket_id = 'marketplace' and auth.role() = 'authenticated');

create policy "Owner delete marketplace images"
  on storage.objects for delete
  using (bucket_id = 'marketplace' and auth.uid()::text = (storage.foldername(name))[1]);
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/028_marketplace.sql
git commit -m "feat(marketplace): add marketplace_listings table and RLS"
```

---

## Task 2: Pure functions + tests

**Files:**
- Create: `src/lib/marketplace-data.ts`
- Create: `src/__tests__/marketplace-data.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/__tests__/marketplace-data.test.ts
import { describe, it, expect } from 'vitest'
import {
  gearCategoryToMarketplace,
  getCategoryEmoji,
  transactionTypeLabel,
  marketplaceConditionLabel,
  userGearConditionToMarketplace,
  formatPrice,
} from '@/lib/marketplace-data'

describe('gearCategoryToMarketplace', () => {
  it('maps hardware to Железо', () => {
    expect(gearCategoryToMarketplace('hardware')).toBe('Железо (закладки, якоря, крюки)')
  })
  it('maps ropes to Верёвки', () => {
    expect(gearCategoryToMarketplace('ropes')).toBe('Верёвки и оттяжки')
  })
  it('maps clothing to Одежда', () => {
    expect(gearCategoryToMarketplace('clothing')).toBe('Одежда (верхняя)')
  })
  it('maps footwear to Обувь', () => {
    expect(gearCategoryToMarketplace('footwear')).toBe('Обувь')
  })
  it('maps bivouac to Палатки', () => {
    expect(gearCategoryToMarketplace('bivouac')).toBe('Палатки и бивак')
  })
  it('maps electronics to Разное', () => {
    expect(gearCategoryToMarketplace('electronics')).toBe('Разное')
  })
  it('maps other to Разное', () => {
    expect(gearCategoryToMarketplace('other')).toBe('Разное')
  })
  it('maps unknown to Разное', () => {
    expect(gearCategoryToMarketplace('unknown')).toBe('Разное')
  })
})

describe('getCategoryEmoji', () => {
  it('returns emoji for страховочные', () => {
    expect(getCategoryEmoji('Страховочные системы')).toBe('🧗')
  })
  it('returns emoji for верёвки', () => {
    expect(getCategoryEmoji('Верёвки и оттяжки')).toBe('🪢')
  })
  it('returns 📦 for unknown category', () => {
    expect(getCategoryEmoji('something unknown')).toBe('📦')
  })
})

describe('transactionTypeLabel', () => {
  it('sell → Продам', () => {
    expect(transactionTypeLabel('sell')).toBe('Продам')
  })
  it('swap → Обмен', () => {
    expect(transactionTypeLabel('swap')).toBe('Обмен')
  })
  it('free → Отдам', () => {
    expect(transactionTypeLabel('free')).toBe('Отдам')
  })
})

describe('marketplaceConditionLabel', () => {
  it('maps Новое', () => {
    expect(marketplaceConditionLabel('Новое (не использовалось)')).toBe('Новое')
  })
  it('returns the string unchanged if short', () => {
    expect(marketplaceConditionLabel('Хорошее')).toBe('Хорошее')
  })
})

describe('userGearConditionToMarketplace', () => {
  it('new → Новое (не использовалось)', () => {
    expect(userGearConditionToMarketplace('new')).toBe('Новое (не использовалось)')
  })
  it('good → Хорошее (2–3 сезона)', () => {
    expect(userGearConditionToMarketplace('good')).toBe('Хорошее (2–3 сезона)')
  })
  // Note: 'Отличное (1 сезон)' has no corresponding user_gear.condition value.
  // It is intentionally unreachable from the pre-fill — users select it manually in the form.
  it('worn → Удовлетворительное', () => {
    expect(userGearConditionToMarketplace('worn')).toBe('Удовлетворительное (видны следы использования)')
  })
  it('needs_repair → Удовлетворительное', () => {
    expect(userGearConditionToMarketplace('needs_repair')).toBe('Удовлетворительное (видны следы использования)')
  })
})

describe('formatPrice', () => {
  it('formats sell price', () => {
    expect(formatPrice('sell', 3500)).toBe('3 500 ₽')
  })
  it('returns обмен for swap', () => {
    expect(formatPrice('swap', null)).toBe('обмен')
  })
  it('returns бесплатно for free', () => {
    expect(formatPrice('free', null)).toBe('бесплатно')
  })
  it('returns 0 ₽ if sell with null price', () => {
    expect(formatPrice('sell', null)).toBe('0 ₽')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/__tests__/marketplace-data.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement pure functions**

```ts
// src/lib/marketplace-data.ts

export const MARKETPLACE_CATEGORIES = [
  'Страховочные системы',
  'Верёвки и оттяжки',
  'Ледовый инструмент',
  'Каски',
  'Обувь',
  'Одежда (верхняя)',
  'Рюкзаки',
  'Палатки и бивак',
  'Железо (закладки, якоря, крюки)',
  'Разное',
] as const

export const MARKETPLACE_CONDITIONS = [
  'Новое (не использовалось)',
  'Отличное (1 сезон)',
  'Хорошее (2–3 сезона)',
  'Удовлетворительное (видны следы использования)',
] as const

// Maps gear catalog category → marketplace listing category.
// gear.category values: clothing | footwear | hardware | ropes | bivouac | electronics | other
// Note: alpinist-specific categories (Каски, Ледовый инструмент, Рюкзаки, Страховочные системы)
// have no corresponding gear.category enum value. Users must select these manually in the form.
// The form pre-fill is a starting suggestion, not an authoritative mapping.
export function gearCategoryToMarketplace(gearCategory: string): string {
  const map: Record<string, string> = {
    hardware: 'Железо (закладки, якоря, крюки)',
    ropes: 'Верёвки и оттяжки',
    clothing: 'Одежда (верхняя)',
    footwear: 'Обувь',
    bivouac: 'Палатки и бивак',
  }
  return map[gearCategory] ?? 'Разное'
}

// Returns emoji for display in card thumbnail when no photo uploaded
export function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    'Страховочные системы': '🧗',
    'Верёвки и оттяжки': '🪢',
    'Ледовый инструмент': '⛏️',
    'Каски': '⛑️',
    'Обувь': '🥾',
    'Одежда (верхняя)': '🧥',
    'Рюкзаки': '🎒',
    'Палатки и бивак': '⛺',
    'Железо (закладки, якоря, крюки)': '🔩',
    'Разное': '📦',
  }
  return map[category] ?? '📦'
}

export function transactionTypeLabel(type: string): string {
  if (type === 'sell') return 'Продам'
  if (type === 'swap') return 'Обмен'
  if (type === 'free') return 'Отдам'
  return type
}

// Shortens full condition string to first word for compact display
export function marketplaceConditionLabel(condition: string): string {
  return condition.split(' (')[0]
}

// Maps user_gear.condition to marketplace listing condition
export function userGearConditionToMarketplace(condition: string): string {
  const map: Record<string, string> = {
    new: 'Новое (не использовалось)',
    good: 'Хорошее (2–3 сезона)',
    worn: 'Удовлетворительное (видны следы использования)',
    needs_repair: 'Удовлетворительное (видны следы использования)',
  }
  return map[condition] ?? 'Хорошее (2–3 сезона)'
}

export function formatPrice(transactionType: string, price: number | null): string {
  if (transactionType === 'swap') return 'обмен'
  if (transactionType === 'free') return 'бесплатно'
  const amount = price ?? 0
  return `${amount.toLocaleString('ru-RU')} ₽`
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/__tests__/marketplace-data.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/marketplace-data.ts src/__tests__/marketplace-data.test.ts
git commit -m "feat(marketplace): add pure data helpers with tests"
```

---

## Task 3: Listing card + feed page

**Files:**
- Create: `src/components/marketplace/listing-card.tsx`
- Create: `src/components/marketplace/feed-filters.tsx`
- Create: `src/app/marketplace/page.tsx`

- [ ] **Step 1: Create listing card component**

```tsx
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
```

- [ ] **Step 2: Create feed filters component**

```tsx
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

  const typeOptions = [
    { value: 'all', label: 'Все' },
    { value: 'sell', label: 'Продам' },
    { value: 'swap', label: 'Обмен' },
    { value: 'free', label: 'Отдам' },
  ]

  return (
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
    </div>
  )
}
```

- [ ] **Step 3: Create feed page**

```tsx
// src/app/marketplace/page.tsx
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ListingCard } from '@/components/marketplace/listing-card'
import { FeedFilters } from '@/components/marketplace/feed-filters'
import { Suspense } from 'react'

interface PageProps {
  searchParams: Promise<{
    type?: string
    category?: string
    city?: string
    q?: string
    cursor?: string
  }>
}

export default async function MarketplacePage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const PAGE_SIZE = 20

  let query = supabase
    .from('marketplace_listings')
    .select(`
      id, title, category, transaction_type, price, city, images, created_at,
      profiles!user_id ( display_name, experience_level )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE + 1)

  if (params.type && params.type !== 'all') {
    query = query.eq('transaction_type', params.type)
  }
  if (params.category) {
    query = query.eq('category', params.category)
  }
  if (params.city) {
    query = query.ilike('city', `%${params.city}%`)
  }
  if (params.q) {
    query = query.ilike('title', `%${params.q}%`)
  }
  if (params.cursor) {
    query = query.lt('created_at', params.cursor)
  }

  const { data: rows } = await query
  const listings = rows ?? []
  const hasMore = listings.length > PAGE_SIZE
  const displayListings = hasMore ? listings.slice(0, PAGE_SIZE) : listings
  const nextCursor = hasMore ? displayListings[displayListings.length - 1].created_at : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.15em] uppercase text-mountain-muted mb-1">Снаряжение</p>
          <h1 className="text-2xl font-bold text-mountain-text">Барахолка</h1>
        </div>
        {user && (
          <Link
            href="/marketplace/new"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-mountain-primary text-white hover:bg-mountain-primary/90 transition-colors"
          >
            <Plus size={13} />
            Объявление
          </Link>
        )}
      </div>

      <Suspense>
        <FeedFilters />
      </Suspense>

      {displayListings.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-mountain-muted text-sm mb-3">Объявлений пока нет. Будь первым — выставь снаряжение.</p>
          {user && (
            <Link href="/marketplace/new" className="text-sm font-semibold text-mountain-primary hover:underline">
              + Создать объявление
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {displayListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing as any} />
            ))}
          </div>
          {hasMore && nextCursor && (
            <div className="text-center pt-2">
              <Link
                href={`/marketplace?${new URLSearchParams({ ...params, cursor: nextCursor }).toString()}`}
                className="text-xs font-semibold text-mountain-primary hover:underline"
              >
                Загрузить ещё
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run
```

Expected: existing tests pass, no regressions.

- [ ] **Step 5: Commit**

```bash
git add src/components/marketplace/listing-card.tsx \
        src/components/marketplace/feed-filters.tsx \
        src/app/marketplace/page.tsx
git commit -m "feat(marketplace): feed page with listing cards and filters"
```

---

## Task 4: Listing detail page

**Files:**
- Create: `src/app/marketplace/[id]/page.tsx`
- Create: `src/components/marketplace/listing-detail.tsx`

- [ ] **Step 1: Create detail component**

```tsx
// src/components/marketplace/listing-detail.tsx
import Link from 'next/link'
import { ArrowLeft, MapPin, Calendar } from 'lucide-react'
import { getCategoryEmoji, transactionTypeLabel, marketplaceConditionLabel, formatPrice } from '@/lib/marketplace-data'
import { getLevelLabel } from '@/lib/dashboard-data'

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
  seller_id: string
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
  const memberMonths = listing.profiles?.created_at
    ? Math.max(1, Math.round((Date.now() - new Date(listing.profiles.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)))
    : null
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
      <div className="rounded-xl border border-mountain-border bg-gradient-to-br from-[#1a2535] to-[#0f1923] h-52 flex items-center justify-center overflow-hidden">
        {listing.images.length > 0 ? (
          <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl">{emoji}</span>
        )}
      </div>

      {/* Title + price */}
      <div>
        <h1 className="text-xl font-bold text-mountain-text mb-1">{listing.title}</h1>
        <div className={`text-2xl font-bold ${listing.transaction_type === 'sell' ? 'text-mountain-text' : listing.transaction_type === 'swap' ? 'text-amber-400' : 'text-indigo-400'}`}>
          {formatPrice(listing.transaction_type, listing.price)}
        </div>
      </div>

      {/* Meta chips */}
      <div className="flex flex-wrap gap-2">
        <span className="text-[10px] text-mountain-muted bg-mountain-surface border border-mountain-border rounded px-2 py-1">
          {listing.category}
        </span>
        <span className="text-[10px] text-mountain-muted bg-mountain-surface border border-mountain-border rounded px-2 py-1">
          {marketplaceConditionLabel(listing.condition)}
        </span>
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

      {/* Contact block — only if show_contact = true AND authenticated */}
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

      {/* Owner actions — manage status from My Listings page */}
      {isOwner && (
        <div className="pt-2">
          <Link
            href="/marketplace/my"
            className="flex items-center justify-center gap-2 w-full text-xs font-semibold py-2.5 rounded-lg border border-mountain-border text-mountain-muted hover:border-mountain-primary/40 hover:text-mountain-text transition-colors"
          >
            Управлять объявлением →
          </Link>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create detail page**

```tsx
// src/app/marketplace/[id]/page.tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ListingDetail } from '@/components/marketplace/listing-detail'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ListingPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: listing } = await supabase
    .from('marketplace_listings')
    .select(`
      id, title, description, category, condition, transaction_type, price,
      city, images, contact_telegram, contact_phone, show_contact, created_at,
      user_id,
      profiles!user_id ( display_name, experience_level, created_at )
    `)
    .eq('id', id)
    .single()

  if (!listing) notFound()

  // Seller stats (parallel)
  const [{ count: completedRoutes }, { data: recentRouteRows }] = await Promise.all([
    supabase
      .from('user_route_status')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', listing.user_id)
      .eq('completed', true),
    supabase
      .from('user_route_status')
      .select('routes!route_id ( name )')
      .eq('user_id', listing.user_id)
      .eq('completed', true)
      .order('updated_at', { ascending: false })
      .limit(3),
  ])

  const recentRoutes = (recentRouteRows ?? [])
    .map((r: any) => r.routes?.name)
    .filter(Boolean) as string[]

  return (
    <ListingDetail
      listing={{
        ...listing,
        seller_id: listing.user_id,
        completed_routes: completedRoutes ?? 0,
        recent_routes: recentRoutes,
      } as any}
      isOwner={user?.id === listing.user_id}
      isAuthenticated={!!user}
    />
  )
}
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/marketplace/[id]/page.tsx \
        src/components/marketplace/listing-detail.tsx
git commit -m "feat(marketplace): listing detail page with seller profile"
```

---

## Task 5: Create listing form

**Files:**
- Create: `src/app/marketplace/new/page.tsx`
- Create: `src/components/marketplace/listing-form.tsx`

- [ ] **Step 1: Create the server wrapper page**

```tsx
// src/app/marketplace/new/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ListingForm } from '@/components/marketplace/listing-form'

interface PageProps {
  searchParams: Promise<{ gear_id?: string }>
}

export default async function NewListingPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { gear_id } = await searchParams

  // Pre-fetch gear if coming from Кладовка
  let prefill: { title: string; category: string; condition: string; gearId: string } | null = null
  if (gear_id) {
    const { data: userGear } = await supabase
      .from('user_gear')
      .select('id, condition, gear!gear_id ( name, brand, category )')
      .eq('id', gear_id)
      .eq('user_id', user.id)
      .single()

    if (userGear) {
      const g = userGear.gear as any
      const { gearCategoryToMarketplace, userGearConditionToMarketplace } = await import('@/lib/marketplace-data')
      prefill = {
        gearId: gear_id,
        title: [g.brand, g.name].filter(Boolean).join(' '),
        category: gearCategoryToMarketplace(g.category),
        condition: userGearConditionToMarketplace(userGear.condition),
      }
    }
  }

  // Pre-fill city from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('city, display_name')
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <p className="text-xs font-semibold tracking-[0.15em] uppercase text-mountain-muted mb-1">Барахолка</p>
        <h1 className="text-2xl font-bold text-mountain-text">Новое объявление</h1>
      </div>
      <ListingForm
        prefill={prefill}
        defaultCity={profile?.city ?? ''}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create listing form client component**

```tsx
// src/components/marketplace/listing-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MARKETPLACE_CATEGORIES, MARKETPLACE_CONDITIONS } from '@/lib/marketplace-data'
import { Upload, X } from 'lucide-react'

interface ListingFormProps {
  prefill?: {
    gearId: string
    title: string
    category: string
    condition: string
  } | null
  defaultCity: string
}

export function ListingForm({ prefill, defaultCity }: ListingFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [type, setType] = useState<'sell' | 'swap' | 'free'>('sell')
  const [title, setTitle] = useState(prefill?.title ?? '')
  const [category, setCategory] = useState(prefill?.category ?? '')
  const [condition, setCondition] = useState(prefill?.condition ?? MARKETPLACE_CONDITIONS[1])
  const [price, setPrice] = useState('')
  const [city, setCity] = useState(defaultCity)
  const [description, setDescription] = useState('')
  const [telegram, setTelegram] = useState('')
  const [phone, setPhone] = useState('')
  const [showContact, setShowContact] = useState(false)
  const [images, setImages] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Необходима авторизация')

      // Upload photos first (listing ID not yet known).
      // Path: {user_id}/{timestamp}-{random}.{ext} — groups by user in Storage.
      // If the insert below fails, these orphaned files are not cleaned up (acceptable for v1).
      const imagePaths: string[] = []
      for (const file of images) {
        const ext = file.name.split('.').pop()
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('marketplace')
          .upload(path, file)
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage.from('marketplace').getPublicUrl(path)
        imagePaths.push(publicUrl)
      }

      const { data: listing, error: insertError } = await supabase
        .from('marketplace_listings')
        .insert({
          user_id: user.id,
          gear_id: prefill?.gearId ?? null,
          title: title.trim(),
          description: description.trim() || null,
          category,
          condition,
          transaction_type: type,
          price: type === 'sell' ? (parseInt(price) || 0) : null,
          city: city.trim(),
          contact_telegram: telegram.trim() || null,
          contact_phone: phone.trim() || null,
          show_contact: showContact,
          images: imagePaths,
        })
        .select('id')
        .single()

      if (insertError) throw insertError
      router.push(`/marketplace/${listing.id}`)
    } catch (err: any) {
      setError(err.message ?? 'Ошибка при создании объявления')
    } finally {
      setUploading(false)
    }
  }

  const inputClass = 'w-full bg-mountain-surface border border-mountain-border rounded-lg px-3 py-2.5 text-sm text-mountain-text focus:outline-none focus:border-mountain-primary/50'
  const labelClass = 'block text-xs font-semibold text-mountain-muted mb-1.5'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Transaction type */}
      <div>
        <label className={labelClass}>Тип объявления</label>
        <div className="flex gap-2">
          {(['sell', 'swap', 'free'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                type === t
                  ? t === 'sell' ? 'bg-green-500/15 border-green-500/40 text-green-400'
                    : t === 'swap' ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                    : 'bg-indigo-500/15 border-indigo-500/40 text-indigo-400'
                  : 'border-mountain-border text-mountain-muted'
              }`}
            >
              {t === 'sell' ? 'Продам' : t === 'swap' ? 'Обмен' : 'Отдам'}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className={labelClass}>Название</label>
        <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="Petzl Corax 35, размер M" />
      </div>

      {/* Category */}
      <div>
        <label className={labelClass}>Категория</label>
        <select required value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
          <option value="">Выбрать категорию</option>
          {MARKETPLACE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Condition */}
      <div>
        <label className={labelClass}>Состояние</label>
        <select value={condition} onChange={(e) => setCondition(e.target.value)} className={inputClass}>
          {MARKETPLACE_CONDITIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Price — only for sell */}
      {type === 'sell' && (
        <div>
          <label className={labelClass}>Цена (₽)</label>
          <input
            type="number"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputClass}
            placeholder="3500"
          />
        </div>
      )}

      {/* City */}
      <div>
        <label className={labelClass}>Город</label>
        <input required value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} placeholder="Москва" />
      </div>

      {/* Description */}
      <div>
        <label className={labelClass}>Описание</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={inputClass + ' resize-none'}
          placeholder="Состояние, причина продажи, особенности..."
        />
      </div>

      {/* Photos */}
      <div>
        <label className={labelClass}>Фото (до 5)</label>
        <label className="flex items-center justify-center gap-2 border border-dashed border-mountain-border rounded-lg py-4 text-xs text-mountain-muted cursor-pointer hover:border-mountain-primary/40 transition-colors">
          <Upload size={14} />
          Добавить фото
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []).slice(0, 5)
              setImages(files)
            }}
          />
        </label>
        {images.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {images.map((f, i) => (
              <div key={i} className="relative">
                <img src={URL.createObjectURL(f)} className="w-16 h-16 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => setImages(images.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"
                >
                  <X size={8} className="text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contact */}
      <div className="space-y-3">
        <label className={labelClass}>Контакт (необязательно)</label>
        <input value={telegram} onChange={(e) => setTelegram(e.target.value)} className={inputClass} placeholder="@username в Telegram" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+7 900 000-00-00" />
        {(telegram || phone) && (
          <label className="flex items-center gap-2 text-xs text-mountain-muted cursor-pointer">
            <input
              type="checkbox"
              checked={showContact}
              onChange={(e) => setShowContact(e.target.checked)}
              className="rounded"
            />
            Показывать контакт посетителям
          </label>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={uploading}
        className="w-full py-3 rounded-lg bg-mountain-primary text-white text-sm font-semibold hover:bg-mountain-primary/90 transition-colors disabled:opacity-50"
      >
        {uploading ? 'Публикую...' : 'Опубликовать'}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: PASS.

- [ ] **Step 4: Add edit page (reuses ListingForm)**

The `ListingForm` component already handles all fields. Add an `initialValues` prop and an `editId` prop so it can update an existing listing instead of inserting a new one.

Add to `ListingForm` props interface:
```ts
interface ListingFormProps {
  prefill?: { gearId: string; title: string; category: string; condition: string } | null
  defaultCity: string
  editId?: string           // if set, form updates this listing instead of inserting
  initialValues?: {         // pre-fill all fields from existing listing
    type: 'sell' | 'swap' | 'free'
    title: string
    category: string
    condition: string
    price: string
    city: string
    description: string
    telegram: string
    phone: string
    showContact: boolean
  }
}
```

In `ListingForm`, initialise all `useState` calls from `initialValues` if present:
```ts
const [type, setType] = useState<'sell' | 'swap' | 'free'>(initialValues?.type ?? 'sell')
const [title, setTitle] = useState(initialValues?.title ?? prefill?.title ?? '')
// ... same pattern for all fields
```

In `handleSubmit`, branch on `editId`:
```ts
if (editId) {
  const { error } = await supabase
    .from('marketplace_listings')
    .update({
      title: title.trim(),
      description: description.trim() || null,
      category,
      condition,
      transaction_type: type,
      price: type === 'sell' ? (parseInt(price) || 0) : null,
      city: city.trim(),
      contact_telegram: telegram.trim() || null,
      contact_phone: phone.trim() || null,
      show_contact: showContact,
      // images not changed on edit (keep existing) — photo editing is out of v1 scope
    })
    .eq('id', editId)
  if (error) throw error
  router.push(`/marketplace/${editId}`)
  return
}
// existing insert logic below...
```

Create the edit server page:

```tsx
// src/app/marketplace/[id]/edit/page.tsx
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ListingForm } from '@/components/marketplace/listing-form'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditListingPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: listing } = await supabase
    .from('marketplace_listings')
    .select('id, user_id, title, category, condition, transaction_type, price, city, description, contact_telegram, contact_phone, show_contact')
    .eq('id', id)
    .single()

  if (!listing) notFound()
  if (listing.user_id !== user.id) redirect(`/marketplace/${id}`)

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <p className="text-xs font-semibold tracking-[0.15em] uppercase text-mountain-muted mb-1">Барахолка</p>
        <h1 className="text-2xl font-bold text-mountain-text">Редактировать объявление</h1>
      </div>
      <ListingForm
        editId={id}
        defaultCity={listing.city}
        initialValues={{
          type: listing.transaction_type as 'sell' | 'swap' | 'free',
          title: listing.title,
          category: listing.category,
          condition: listing.condition,
          price: listing.price?.toString() ?? '',
          city: listing.city,
          description: listing.description ?? '',
          telegram: listing.contact_telegram ?? '',
          phone: listing.contact_phone ?? '',
          showContact: listing.show_contact,
        }}
      />
    </div>
  )
}
```

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/marketplace/new/page.tsx \
        src/app/marketplace/[id]/edit/page.tsx \
        src/components/marketplace/listing-form.tsx
git commit -m "feat(marketplace): create and edit listing pages"
```

---

## Task 6: My listings page

**Files:**
- Create: `src/app/marketplace/my/page.tsx`
- Create: `src/components/marketplace/my-listings.tsx`

- [ ] **Step 1: Create my-listings client component**

```tsx
// src/components/marketplace/my-listings.tsx
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
    await supabase.from('marketplace_listings').update({ status }).eq('id', id)
    setUpdating(null)
    router.refresh()
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
                <div className="text-sm font-semibold text-mountain-text truncate">{listing.title}</div>
                <div className="text-[10px] text-mountain-muted mt-0.5">
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
```

- [ ] **Step 2: Create my listings server page**

```tsx
// src/app/marketplace/my/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MyListings } from '@/components/marketplace/my-listings'

export default async function MyListingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: listings } = await supabase
    .from('marketplace_listings')
    .select('id, title, transaction_type, price, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <p className="text-xs font-semibold tracking-[0.15em] uppercase text-mountain-muted mb-1">Барахолка</p>
        <h1 className="text-2xl font-bold text-mountain-text">Мои объявления</h1>
      </div>
      <MyListings listings={listings ?? []} />
    </div>
  )
}
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/marketplace/my/page.tsx \
        src/components/marketplace/my-listings.tsx
git commit -m "feat(marketplace): my listings page with status management"
```

---

## Task 7: Gear integration

**Files:**
- Modify: `src/components/gear/gear-detail-modal.tsx`

- [ ] **Step 1: Read the current gear-detail-modal**

Read `src/components/gear/gear-detail-modal.tsx` fully before editing.

- [ ] **Step 2: Add "На продаже" badge and "Выставить" button**

In `gear-detail-modal.tsx`:

1. Add to `GearDetailModalProps`:
```ts
onSaleListingId?: string | null  // passed from parent if listing exists
```

2. Import `Link` from `next/link` and `Tag` from lucide-react (already imported).

3. In the modal header area (after the title), add the badge and button:

```tsx
{/* On-sale badge */}
{props.onSaleListingId && (
  <Link
    href={`/marketplace/${props.onSaleListingId}`}
    className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-400 bg-green-500/10 border border-green-500/20 rounded px-2 py-0.5"
  >
    <Tag size={10} />
    На продаже
  </Link>
)}

{/* List for sale button */}
{!props.onSaleListingId && (
  <Link
    href={`/marketplace/new?gear_id=${item.id}`}
    className="inline-flex items-center gap-1 text-[10px] font-semibold text-mountain-muted border border-mountain-border rounded px-2 py-0.5 hover:border-mountain-primary/40 hover:text-mountain-text transition-colors"
  >
    <Tag size={10} />
    Выставить на продажу
  </Link>
)}
```

- [ ] **Step 3: Update GearInventory to pass onSaleListingId**

In `gear-inventory.tsx`, when fetching user gear, also fetch active marketplace listings:

```ts
// After fetching userGear, fetch on-sale gear IDs
const { data: onSaleRows } = await supabase
  .from('marketplace_listings')
  .select('gear_id, id')
  .eq('user_id', userId)
  .eq('status', 'active')
  .not('gear_id', 'is', null)

const onSaleMap = new Map(
  (onSaleRows ?? []).map((r) => [r.gear_id, r.id])
)
```

Then pass `onSaleListingId={onSaleMap.get(item.id) ?? null}` to `<GearDetailModal>`.

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/gear/gear-detail-modal.tsx \
        src/components/gear/gear-inventory.tsx
git commit -m "feat(marketplace): add На продаже badge and Выставить button to Кладовка"
```

---

## Task 8: Navigation

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add Барахолка to tool arrays**

In `src/app/page.tsx`, update `beginnerTools` and `expertTools`:

```ts
// beginnerTools — add after Форум:
{ href: '/marketplace', label: 'Барахолка', sub: 'Купить и продать снаряжение' },

// expertTools — add after Кладовка:
{ href: '/marketplace', label: 'Барахолка', sub: 'Купить и продать снаряжение' },
```

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Push everything**

```bash
git add src/app/page.tsx
git commit -m "feat(marketplace): add Барахолка to navigation tool grids"
git push origin main
```
