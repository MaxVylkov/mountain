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
- Replies: flat list, no nesting (v1)
- Use case: "Что взять на НП в Безенги?", "Отзыв о кошках Grivel G12"

### Report (отчёт)
Long-form post. Markdown body.
- Fields: title, body (markdown, no hard limit), category, attachments
- Replies: flat list, no nesting (v1)
- Use case: Trip reports, gear guides, technique notes, educational content

Post type is chosen at creation time and cannot be changed.

**Replies are flat in v1.** `parent_reply_id` column exists in the schema for future nesting but is always NULL in v1. No nesting UI is built.

---

## 3. Smart Attachments

A post can have multiple attachments. At creation, author clicks **«Прикрепить»** and selects from:

### Route card
- Source: `routes` table joined with `mountains`
- Displayed fields: mountain name, route name, difficulty (1–5 stars), recommended season
- Rendered below the post body in an attachment area
- Interactive buttons (for logged-in readers):
  - «В вишлист» — upserts `user_route_status` with `want_to_do = true`
  - «Был здесь» — upserts `user_route_status` with `completed = true`
- Attaching a route sets `category = 'routes'` on the post automatically

### Packing set card
- Source: author's `packing_sets` joined with `packing_items` and `gear` catalog
- Displayed fields: set name, item count, total weight (sum of `gear.weight` in grams)
- Rendered below the post body in an attachment area
- Collapsed by default; expand to see full item list grouped by backpack
- Interactive button (for logged-in readers):
  - **«Скопировать в кладовку»** — calls a Supabase `SECURITY DEFINER` function `copy_packing_set_for_user(source_set_id, target_user_id)` that reads the source set (bypassing RLS) and creates a new `packing_set` + `packing_items` for the reader
  - Shows toast: "Сборка добавлена в вашу кладовку"
- Only the author's own packing sets can be attached

### Gear item chip
- Source: `gear` catalog
- Rendered as chips in a dedicated attachment area below the post body (not inline in text)
- Each chip shows: gear category icon + gear name
- Chip links to the gear item in the catalog
- Author selects gear items via a picker (search by name), not `@mention` autocomplete

All attachment cards render in order defined by `forum_attachments.position`.

---

## 4. Route Page Integration

The `route-discussions-block.tsx` component is added to **`src/app/mountains/[id]/page.tsx`** (the existing mountain/route detail page). It renders at the bottom of the page.

- Shows the 3 most recent forum posts that have this route attached (via `forum_attachments WHERE type = 'route' AND ref_id = route_id`)
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
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE forum_replies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         uuid REFERENCES forum_posts ON DELETE CASCADE NOT NULL,
  parent_reply_id uuid REFERENCES forum_replies ON DELETE CASCADE,  -- always NULL in v1
  author_id       uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  body            text NOT NULL,
  created_at      timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE forum_likes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  post_id    uuid REFERENCES forum_posts ON DELETE CASCADE,
  reply_id   uuid REFERENCES forum_replies ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  CHECK (
    (post_id IS NOT NULL AND reply_id IS NULL) OR
    (post_id IS NULL AND reply_id IS NOT NULL)
  ),
  UNIQUE (user_id, post_id),
  UNIQUE (user_id, reply_id)
);

CREATE TABLE forum_attachments (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id  uuid REFERENCES forum_posts ON DELETE CASCADE NOT NULL,
  type     text NOT NULL CHECK (type IN ('route', 'packing_set', 'gear_item')),
  ref_id   uuid NOT NULL,  -- references routes.id / packing_sets.id / gear.id
  position smallint NOT NULL DEFAULT 0,
  UNIQUE (post_id, type, ref_id)  -- prevent duplicate attachments
);
```

**Counters:** `likes_count` and `reply_count` are computed via `COUNT()` queries at read time — no denormalized counter columns. Sort queries:
- Популярные: `ORDER BY (SELECT COUNT(*) FROM forum_likes WHERE post_id = p.id) DESC, p.created_at DESC`
- Обсуждаемые: `ORDER BY (SELECT COUNT(*) FROM forum_replies WHERE post_id = p.id) DESC, p.created_at DESC`

**Copy packing set — SECURITY DEFINER function:**
```sql
CREATE FUNCTION copy_packing_set_for_user(source_set_id uuid, target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_set_id   uuid;
  source_name  text;
  old_bp_id    uuid;
  new_bp_id    uuid;
BEGIN
  SELECT name INTO source_name FROM packing_sets WHERE id = source_set_id;

  INSERT INTO packing_sets (user_id, name)
    VALUES (target_user_id, source_name || ' (копия)')
    RETURNING id INTO new_set_id;

  -- Copy backpacks, building an id mapping via a temp table
  CREATE TEMP TABLE _bp_map (old_id uuid, new_id uuid) ON COMMIT DROP;

  FOR old_bp_id IN
    SELECT id FROM packing_backpacks WHERE packing_set_id = source_set_id
  LOOP
    INSERT INTO packing_backpacks (packing_set_id, name, volume_liters)
      SELECT new_set_id, name, volume_liters
      FROM packing_backpacks WHERE id = old_bp_id
      RETURNING id INTO new_bp_id;
    INSERT INTO _bp_map VALUES (old_bp_id, new_bp_id);
  END LOOP;

  -- Copy items, mapping backpack ids; items with no backpack stay null
  INSERT INTO packing_items (packing_set_id, gear_id, packed, backpack_id)
    SELECT new_set_id, gear_id, false,
           (SELECT new_id FROM _bp_map WHERE old_id = pi.backpack_id)
    FROM packing_items pi
    WHERE packing_set_id = source_set_id;

  RETURN new_set_id;
END;
$$;
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
| `src/app/forum/layout.tsx` | Create — forum layout with category tabs |
| `src/app/forum/page.tsx` | Create — main forum page (server), redirects to /forum/routes |
| `src/app/forum/[category]/page.tsx` | Create — category feed page (server) |
| `src/app/forum/post/[id]/page.tsx` | Create — post detail page (server) |
| `src/components/forum/forum-post-list.tsx` | Create — feed of post cards with sort toggle |
| `src/components/forum/forum-post-card.tsx` | Create — single post card (title, meta, badges, like count) |
| `src/components/forum/forum-post-detail.tsx` | Create — full post with replies (client) |
| `src/components/forum/forum-reply-list.tsx` | Create — flat reply list |
| `src/components/forum/create-post-modal.tsx` | Create — post creation modal (client) |
| `src/components/forum/attachment-route-card.tsx` | Create — route attachment card with wishlist/visited buttons |
| `src/components/forum/attachment-packing-card.tsx` | Create — packing set card with copy button |
| `src/components/forum/attachment-gear-chips.tsx` | Create — row of gear item chips |
| `src/components/forum/route-discussions-block.tsx` | Create — compact discussions block |
| `src/app/mountains/[id]/page.tsx` | Modify — add RouteDiscussionsBlock at the bottom |
| `supabase/migrations/011_forum.sql` | Create — 4 tables + SECURITY DEFINER function + RLS + indexes |

---

## 7. UX Details

**Feed sorting:**
- Новые — `ORDER BY p.created_at DESC`
- Популярные — sorted by like count (COUNT subquery)
- Обсуждаемые — sorted by reply count (COUNT subquery)

**Copy packing set flow:**
1. Reader clicks «Скопировать в кладовку»
2. If not logged in: redirect to /login with return URL
3. If logged in: call `copy_packing_set_for_user(source_set_id, auth.uid())`
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
- Nested replies (schema supports it via `parent_reply_id`, UI is flat in v1)
- Gear item `@mention` autocomplete in markdown body
