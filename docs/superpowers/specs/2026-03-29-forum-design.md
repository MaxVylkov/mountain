# Forum — Design Spec
**Date:** 2026-03-29
**Status:** Approved

---

## Problem

The app has no community layer. Users accumulate routes, gear lists, and knowledge in isolation. There is no place to share trip reports, ask gear questions, or post packing lists for others to reuse. Route comments exist but are limited to a single route page with no cross-cutting discovery.

---

## Solution Overview

A standalone forum at `/forum` with three categories (routes, gear, learning), two post types (thread and report), and smart embeds that turn app data into interactive cards inside posts. Posts tagged with a route surface on the route detail page as a compact "Обсуждения" block.

A "Лента" (social feed) tab is reserved in the navigation and shown as "Скоро" — it is out of scope for this version.

---

## 1. Routes and Navigation

```
/forum                — main page: latest posts + category tabs
/forum/routes         — Маршруты
/forum/gear           — Снаряжение
/forum/learning       — Обучение
/forum/post/[id]      — single post page
```

**Main page layout:**
- Category tabs at the top: Маршруты · Снаряжение · Обучение · Лента *(скоро)*
- Below tabs: feed of posts for the active category
- Sort options per category: Новые / Популярные / Обсуждаемые
- "Написать пост" button — visible to all, triggers auth redirect if not logged in

**Access:**
- Read (browse posts, read replies): public, no login required
- Write (create posts, reply, like, copy packing sets): requires authenticated account

---

## 2. Post Types

### Thread (тред)
Short-form discussion. Reddit-style.
- Fields: title, body (plain text, max 2000 chars), category, attachments
- Replies: flat list, 1 level of nesting (reply to top-level reply shows as indented)
- Use case: "Что взять на НП в Безенги?", "Отзыв о кошках Grivel G12"

### Report (отчёт)
Long-form post. Markdown body.
- Fields: title, body (markdown, no hard limit), category, attachments
- Replies: same structure as thread
- Use case: Trip reports, gear guides, technique notes, educational content

Post type is chosen at creation time and cannot be changed.

---

## 3. Smart Attachments

A post can have multiple attachments. At creation, author clicks **«Прикрепить»** and selects from:

### Route card
- Source: `routes` table joined with `mountains`
- Displayed fields: mountain name, route name, difficulty (1–5 stars), recommended season
- Interactive buttons (for logged-in readers):
  - «В вишлист» — upserts `user_route_status` with `want_to_do = true`
  - «Был здесь» — upserts `user_route_status` with `completed = true`
- Attaching a route sets `category = 'routes'` on the post automatically

### Packing set card
- Source: author's `packing_sets` joined with `packing_items` and `gear` catalog
- Displayed fields: set name, item count, total weight (sum of `gear.weight_g`)
- Collapsed by default; expand to see full item list grouped by backpack
- Interactive button (for logged-in readers):
  - **«Скопировать в кладовку»** — creates a new `packing_set` for the reader with the same items; shows toast "Сборка добавлена в вашу кладовку"
- Only the author's own packing sets can be attached

### Gear item chip
- Source: `gear` catalog
- Rendered as an inline chip/tag inside the post body: `[🎿 Ледоруб Petzl Gully]`
- Author types `@` in the body to trigger gear search autocomplete
- Chip links to the gear item in the catalog

---

## 4. Route Page Integration

On the route detail page (`/mountains/[id]` or `/routes/[id]`), a **«Обсуждения»** block is added at the bottom:

- Shows the 3 most recent forum posts that have this route attached (via `forum_attachments`)
- If no posts exist for this route: block is hidden entirely (no empty state shown)
- Each post shows: type badge (Тред/Отчёт), title, author name, reply count, time ago
- **«Смотреть все обсуждения →»** — links to `/forum/routes?route_id=[id]`
- **«Написать отчёт»** — opens post creation with the route pre-attached and category pre-set to "routes"

---

## 5. Database Schema

```sql
CREATE TABLE forum_posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  category    text NOT NULL CHECK (category IN ('routes', 'gear', 'learning')),
  type        text NOT NULL CHECK (type IN ('thread', 'report')),
  title       text NOT NULL,
  body        text NOT NULL DEFAULT '',
  likes_count int NOT NULL DEFAULT 0,
  reply_count int NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE forum_replies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         uuid REFERENCES forum_posts ON DELETE CASCADE NOT NULL,
  parent_reply_id uuid REFERENCES forum_replies ON DELETE CASCADE,  -- null = top-level
  author_id       uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  body            text NOT NULL,
  likes_count     int NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE forum_likes (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  post_id   uuid REFERENCES forum_posts ON DELETE CASCADE,
  reply_id  uuid REFERENCES forum_replies ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  CHECK (
    (post_id IS NOT NULL AND reply_id IS NULL) OR
    (post_id IS NULL AND reply_id IS NOT NULL)
  ),
  UNIQUE (user_id, post_id),
  UNIQUE (user_id, reply_id)
);

CREATE TABLE forum_attachments (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES forum_posts ON DELETE CASCADE NOT NULL,
  type    text NOT NULL CHECK (type IN ('route', 'packing_set', 'gear_item')),
  ref_id  uuid NOT NULL  -- references routes.id / packing_sets.id / gear.id
);
```

**RLS policies:**
- `forum_posts`: SELECT public (anon + authenticated); INSERT/UPDATE/DELETE own rows only
- `forum_replies`: SELECT public; INSERT/UPDATE/DELETE own rows only
- `forum_likes`: SELECT public; INSERT/DELETE own rows only
- `forum_attachments`: SELECT public; INSERT/DELETE via post owner only

**Indexes:**
- `forum_posts(category, created_at DESC)` — category feed
- `forum_attachments(type, ref_id)` — route page lookup
- `forum_posts(author_id)`
- `forum_replies(post_id)`

---

## 6. Components

| File | Action |
|------|--------|
| `src/app/forum/page.tsx` | Create — main forum page (server) |
| `src/app/forum/[category]/page.tsx` | Create — category page (server) |
| `src/app/forum/post/[id]/page.tsx` | Create — post detail page (server) |
| `src/components/forum/forum-post-list.tsx` | Create — feed of post cards |
| `src/components/forum/forum-post-card.tsx` | Create — single post card (title, meta, badges) |
| `src/components/forum/forum-post-detail.tsx` | Create — full post with replies (client) |
| `src/components/forum/forum-reply-list.tsx` | Create — replies with nesting |
| `src/components/forum/create-post-modal.tsx` | Create — post creation modal (client) |
| `src/components/forum/attachment-route-card.tsx` | Create — route attachment card |
| `src/components/forum/attachment-packing-card.tsx` | Create — packing set card with copy button |
| `src/components/forum/route-discussions-block.tsx` | Create — compact block for route detail page |
| `src/app/forum/layout.tsx` | Create — forum layout with category tabs |
| `supabase/migrations/011_forum.sql` | Create — all 4 tables + RLS + indexes |

---

## 7. UX Details

**Feed sorting:**
- Новые — `ORDER BY created_at DESC`
- Популярные — `ORDER BY likes_count DESC, created_at DESC`
- Обсуждаемые — `ORDER BY reply_count DESC, created_at DESC`

**Copy packing set flow:**
1. Reader clicks «Скопировать в кладовку»
2. If not logged in: redirect to /login with return URL
3. If logged in: POST creates new `packing_set` with name "[original name] (копия)" and copies all `packing_items`
4. Toast: "Сборка «[name]» добавлена в вашу кладовку" with link to /gear

**"Написать отчёт" from route page:**
- Opens `create-post-modal` with `category = 'routes'`, `type = 'report'`, and the route pre-attached
- Author sees the route card already in the attachment area

**Лента tab:**
- Rendered as a disabled/grayed tab with "Скоро" badge
- Does not navigate anywhere

---

## 8. Out of Scope

- Social media integration (TG, Instagram, VK)
- Photo uploads in posts
- Full-text search across posts
- User reputation / karma system
- Post editing after publish
- Moderation tools / report button
- Real-time reply notifications
- Gear item `@mention` autocomplete in markdown body (gear chip attachment via picker instead)
