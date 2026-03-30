# Profile Page Redesign — Design Spec

**Date:** 2026-03-30
**Scope:** `/src/app/profile/page.tsx` — full redesign
**Approach:** Variant B — differentiated card weights

---

## Problem Statement

The current profile page renders 5 identical-weight cards with no visual hierarchy. The user cannot identify the primary action. Developer error copy is exposed in the UI. No loading state causes a blank-screen flash. A destructive action (remove friend) has no confirmation.

---

## Design Goals

1. **Clear hierarchy** — search is the primary social action, visually dominant
2. **Identity block** — name + level + account info in a single unified header (no card)
3. **Safety** — no destructive actions without confirmation, no developer copy in UI
4. **Reliability** — skeleton loader instead of `return null`
5. Remove "Мой путь к вершине" section (deferred to future iteration)

---

## Page Structure

```
┌─ Header (no card) ─────────────────────────────────────────┐
│  [Name]                                          [Выйти]   │
│  [Level badge]  email@example.com                          │
└────────────────────────────────────────────────────────────┘

┌─ Large card: Find friend ───────────────────────────────────┐
│  Найти альпиниста                                           │
│  [         Email или имя...                    ] [×]       │
│  Введите минимум 3 символа                                  │
│  ┌─ Result row ─────────────────────────────────────────┐  │
│  │ Name  email@...                        [Добавить]    │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘

┌─ Compact card: Invite link ─────────────────────────────────┐
│  Пригласить друга                                           │
│  [https://.../.../token]              [Скопировать]        │
│  (hidden entirely if no invite_token)                       │
└────────────────────────────────────────────────────────────┘

┌─ Conditional card: Incoming requests ──────────────────────┐
│  Запросы в друзья (N)                                      │
│  Name                               [Принять] [Отклонить] │
│  (only rendered when pending.length > 0)                   │
└────────────────────────────────────────────────────────────┘

┌─ Card: Friends ─────────────────────────────────────────────┐
│  Друзья (N)                                                 │
│  Name                               [Удалить]              │
│    → on click: "Удалить?" [Да] [Отмена] inline             │
│  Name (pending sent)                [Ожидает]              │
│  (empty state: "Найдите коллег по email или поделитесь      │
│   ссылкой-приглашением")                                   │
└────────────────────────────────────────────────────────────┘
```

---

## Component Changes

### Header block
- No `<Card>` wrapper — plain `<div>`
- Keep the existing uppercase eyebrow label `<p className="text-xs font-semibold tracking-[0.15em] uppercase text-mountain-muted mb-2">Профиль</p>` above the name
- Layout: `flex items-start justify-between`
- Left: `<h1>` name + level badge (if present) + `<p>` email (`text-sm text-mountain-muted`)
- Right: ghost `<Button variant="outline">` → «Выйти»
- Level badge: `inline-block text-xs px-2 py-0.5 rounded-full bg-mountain-primary/20 text-mountain-primary` (keep existing style)
- **Remove the existing Account card entirely** — email and logout are now in the header, the separate Card at the bottom of the page is deleted

### Find friend card (large)
- Title: «Найти альпиниста» (replaces «Найти по email»)
- Input: `py-3` (larger than current `py-2.5`)
- Placeholder: «Email или имя...» (removes «мин. 3 символа» from placeholder text)
- Hint text below input: `<p className="text-xs text-mountain-muted">Введите минимум 3 символа</p>` — visible when `searchQuery.length < 3`, hidden when `searchQuery.length >= 3` (matches the debounce threshold)
- Note: the search API currently queries by email only. The placeholder «Email или имя...» is intentionally forward-looking copy; no API change is made in this iteration.
- Search results and empty state: no changes to logic, only text

### Invite link card (compact)
- Remove description paragraph entirely
- Layout: title on one line, invite row (`<code>` + copy button) on next line
- If `!profile?.invite_token` → render `null` (no card, no error message)
- Copy success: keep existing `copied` state with Check icon

### Friend requests card
- Conditional render: only when `pending.length > 0` (no change)
- Button labels: «Принять» / «Отклонить» (no change)
- Add `disabled` state on buttons while async action is in flight: use a `actionInFlightId: string | null` state; **both `handleAccept` and the decline handler** set `actionInFlightId` to `f.id` at the start of the async call and reset it to `null` in a `finally` block; buttons for that row are disabled while `actionInFlightId === f.id`

### Friends card
- **Inline confirm for delete:**
  - Local state per friendship: `confirmDeleteId: string | null`
  - Click «Удалить» → sets `confirmDeleteId = f.id` → renders «Удалить?» + «Да» + «Отмена» inline
  - «Да» → calls `handleRemove(f.id)`, resets `confirmDeleteId`
  - «Отмена» → resets `confirmDeleteId`
- Sent pending: show name (muted) + small badge «Ожидает подтверждения» — no change to layout
- Empty state text: «Найдите коллег по email или поделитесь ссылкой-приглашением» (replaces «Пока нет друзей»)

### Skeleton loader
- Replace `if (!user) return null` with loading state
- `isLoading` boolean state, initialised to `true`; set to `false` after `setProfile(...)` resolves (before the friends query runs) so the skeleton disappears as soon as the identity data is ready
- Skeleton:
  - Header placeholder: two rects (`h-8 w-48` + `h-4 w-32`)
  - Three card placeholders: `h-24 rounded-xl animate-pulse bg-mountain-surface`
- No external library needed — pure Tailwind `animate-pulse`

---

## Microcopy Changes

| Location | Before | After |
|----------|--------|-------|
| Search card title | «Найти по email» | «Найти альпиниста» |
| Search placeholder | «Введи email (мин. 3 символа)...» | «Email или имя...» |
| No invite token | «Ссылка недоступна — требуется миграция БД 016» | *(section hidden)* |
| Friends empty state | «Пока нет друзей. Найди по email или поделись ссылкой.» | «Найдите коллег по email или поделитесь ссылкой-приглашением» |
| Delete friend | *(immediate, no confirmation)* | «Удалить?» → «Да» / «Отмена» |

---

## What Is NOT Changing

- Supabase queries and data fetching logic
- Friend request flow (send, accept)
- Debounce logic in search
- Auth redirect on no user
- `copyToClipboard` utility
- `progress-dashboard.tsx` component (used elsewhere, not touched)

---

## Out of Scope

- «Мой путь к вершине» / journey map section — removed entirely for now
- Username search (currently email-only) — future iteration
- Revoke sent friend request — future iteration
- SSR hydration fix for `window.location.origin` — separate ticket

---

## Files to Change

- `src/app/profile/page.tsx` — full rewrite of JSX and state; also **delete the `<Link href="/onboard?view=true">` journey block** at the bottom of the current page (Design Goal 5: section removed entirely)
