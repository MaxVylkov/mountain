# Барахолка — Design Spec

**Date:** 2026-04-05
**Scope:** Peer-to-peer marketplace for alpinist gear — sell, swap, and give away equipment. Integrated with Кладовка. No in-app chat in v1 (phase 2).

---

## Problem Statement

There is no convenient platform for the Russian alpinist community to exchange gear. Авито lacks seller context; Risk.ru and Горняшка have forum-era UX. Mountaine users already have their gear catalogued in Кладовка and verified profiles — the trust and data infrastructure exists.

---

## Design Goals

1. **Seller trust** — buyer sees experience level and completed routes, not just a username
2. **Кладовка integration** — list gear already in your profile in one click
3. **Alpinist categories** — gear taxonomy that matches real alpinist vocabulary
4. **Mobile-first** — most use happens on the go
5. **No new auth complexity** — uses existing profiles, no separate seller registration

---

## Pages

| Route | Description |
|-------|-------------|
| `/marketplace` | Main feed — 2×N grid, pill filters, search |
| `/marketplace/[id]` | Listing detail — photo, description, seller profile, contact |
| `/marketplace/new` | Create listing — from Кладовка or from scratch |
| `/marketplace/my` | My listings — active / sold / archived tabs |

Барахолка is added to the tools grid for both beginner and expert tool sets.

---

## Layout

### Feed page (`/marketplace`)

```
[Search bar]
[Pill filters: Все | Продам | Обмен | Отдам | Категория ▾ | Город ▾]
[2×N card grid]
[+ Объявление button — top right]
```

Responsive: `grid-cols-2` on all sizes (cards are compact enough). Filters scroll horizontally on mobile.

### Listing card (2×N grid)

```
┌─────────────────┐
│   [photo/emoji] │  ← 52px tall, type badge top-left
│ [tag: Продам]   │
├─────────────────┤
│ Title           │
│ 3 500 ₽         │
│ М · 2р · Москва │  ← seller bar (blue tint)
└─────────────────┘
```

- `transaction_type = sell` → price shown, green tag
- `transaction_type = swap` → "обмен", amber tag
- `transaction_type = free` → "бесплатно", indigo tag
- Seller bar always shown: first initial · level label · city

### Listing detail page (`/marketplace/[id]`)

Top to bottom:
```
[type tag] [date · city]
[Photo gallery — swipeable, up to 5 images]
[Title]
[Price / "обмен" / "бесплатно"]
[Meta chips: category · condition · seasons of use]
[Description]
─────────────────────────────
[Seller card — blue tint]
  Avatar · Name · Level · N восхождений · on platform N months
  [Recent routes chips]
─────────────────────────────
[Contact block — only if show_contact = true]
  Telegram: @username  OR  Phone: +7...
[Write message button — links to /messages/[listingId] in phase 2]
```

Contact block is visible to all authenticated users if `show_contact = true`. If `show_contact = false`, only the "Написать сообщение" button is shown (phase 2 feature — in v1 this button is disabled with label "Скоро").

Owner sees: Edit · Mark as sold · Archive buttons instead of contact/message.

### Create listing (`/marketplace/new`)

Two entry points:
1. **From Кладовка** — `gear_id` passed as query param; title and category pre-filled from `user_gear`
2. **From scratch** — all fields empty

Form fields (in order):
1. Transaction type — radio: Продам / Обмен / Отдам даром
2. Title — text input (pre-filled if from Кладовка)
3. Category — select (pre-filled if from Кладовка)
4. Condition — select: Новое / Отличное / Хорошее / Удовлетворительное
5. Price — number input (hidden if swap/free)
6. City — text input (pre-filled from `profiles.city` if exists)
7. Description — textarea
8. Photos — up to 5 images (Supabase Storage, bucket `marketplace`)
9. Contact options:
   - Telegram input (optional)
   - Phone input (optional)
   - Toggle: "Показывать контакт посетителям"

### My listings (`/marketplace/my`)

Three tabs: **Активные** · **Проданы** · **Архив**

Each listing row: title · price/type · date · status badge · Edit / Закрыть actions.

---

## Data Model

### Table: `marketplace_listings`

```sql
create table marketplace_listings (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  gear_id         uuid references user_gear(id) on delete set null,

  title           text not null,
  description     text,
  category        text not null,  -- enum enforced in app
  condition       text not null,  -- enum enforced in app
  transaction_type text not null, -- 'sell' | 'swap' | 'free'
  price           integer,        -- null for swap/free

  city            text not null,
  contact_telegram text,
  contact_phone   text,
  show_contact    boolean not null default false,

  images          text[] not null default '{}',
  status          text not null default 'active', -- 'active' | 'reserved' | 'sold' | 'archived'

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
```

RLS: anyone can read `status = 'active'`; only owner can insert/update/delete.

### Кладовка badge

No schema change. The badge is derived at query time:
```sql
select exists (
  select 1 from marketplace_listings
  where gear_id = $1 and status = 'active'
) as on_sale
```

### Supabase Storage

Bucket: `marketplace` (public).
Path pattern: `{user_id}/{listing_id}/{filename}`.
Images uploaded from the create/edit form; paths stored in `images[]`.

---

## Categories (enum, app-enforced)

- Страховочные системы
- Верёвки и оттяжки
- Ледовый инструмент
- Каски
- Обувь
- Одежда (верхняя)
- Рюкзаки
- Палатки и бивак
- Железо (закладки, якоря, крюки)
- Разное

---

## Condition levels

- Новое (не использовалось)
- Отличное (1 сезон)
- Хорошее (2–3 сезона)
- Удовлетворительное (видны следы использования)

---

## Кладовка Integration

Button **"Выставить на продажу"** added to each gear item detail page (`/gear/[id]`).

Behaviour:
- Navigates to `/marketplace/new?gear_id=[id]`
- Form pre-fills `title` from `user_gear.name` (brand + model), `category` mapped from gear tags
- After submission: gear item shows **"На продаже"** badge (derived query, no schema change)
- When listing status changes to `sold` or `archived`: badge disappears automatically
- No forced removal from Кладовка — user decides independently

---

## Seller Profile on Listing

Fetched from `profiles` + aggregates:

```ts
{
  displayName: profiles.display_name,
  experienceLevel: profiles.experience_level,   // → level label
  completedRoutes: count(user_route_status where completed = true),
  memberSince: profiles.created_at,             // → "на платформе N месяцев"
  recentRoutes: last 3 route names from user_route_status joined routes
}
```

---

## Filters (feed page)

| Filter | Implementation |
|--------|---------------|
| Тип | `transaction_type` WHERE clause |
| Категория | `category` WHERE clause |
| Город | `city` ILIKE `%query%` |
| Поиск | `title` ILIKE `%query%` |
| Сортировка | `created_at DESC` (default) |

All filters applied server-side via URL search params (`?type=sell&category=...&city=...&q=...`).

---

## Navigation Integration

**beginnerTools** and **expertTools** in `page.tsx` both get:
```ts
{ href: '/marketplace', label: 'Барахолка', sub: 'Купить и продать снаряжение' }
```

Added after Форум in beginner list; after Кладовка in expert list.

---

## Edge Cases

| Case | Behaviour |
|------|-----------|
| `show_contact = false` | Contact block hidden; "Написать" button shown as disabled ("Скоро") |
| No photos uploaded | Placeholder emoji based on category shown in card and detail |
| `gear_id` set but gear deleted | `on delete set null` — listing stays, no badge on gear |
| User deletes account | `on delete cascade` — all listings removed |
| `price` with swap/free | Ignored at read time; form hides price field |
| Unauthenticated visitor | Can browse feed and detail, cannot see contact, cannot create listing |

---

## What Is NOT In Scope (v1)

- In-app messaging / chat (phase 2)
- Seller ratings and reviews
- Payment processing
- Delivery integration
- "Куплю" (wanted) listings
- Listing moderation / admin panel
- Push notifications for new listings
