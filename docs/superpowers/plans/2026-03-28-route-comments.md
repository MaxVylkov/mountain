# Route Comments System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a comment system to routes with hashtag categories (#впечатление, #описание, #альтернативное_описание, #снаряжение), likes/dislikes, ability to adopt alternative descriptions into route descriptions with author credit, and a "guru rating" leaderboard.

**Architecture:** New database tables for comments, likes, and adopted descriptions. Comments component embedded in the route detail view (route-list.tsx expanded section). Hashtags parsed from comment text. Alternative descriptions can be "adopted" by any user into the route's description section. Guru stats calculated from adopted descriptions and net likes.

**Tech Stack:** Next.js 15, React 19, Supabase (RLS), Tailwind CSS 4

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `supabase/migrations/008_route_comments.sql` | Create | Tables: route_comments, comment_likes, adopted_descriptions |
| `src/components/mountains/route-comments.tsx` | Create | Comment list, add comment form, hashtag display |
| `src/components/mountains/comment-card.tsx` | Create | Single comment with like/dislike, adopt button |
| `src/components/mountains/route-list.tsx` | Modify | Add comments section to expanded route view |
| `src/components/mountains/guru-badge.tsx` | Create | Small guru rating badge for comment authors |

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/008_route_comments.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Route comments with hashtag support
CREATE TABLE route_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid REFERENCES routes ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  text text NOT NULL,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER route_comments_updated_at
  BEFORE UPDATE ON route_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Likes/dislikes on comments
CREATE TABLE comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES route_comments ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  value smallint NOT NULL CHECK (value IN (-1, 1)),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(comment_id, user_id)
);

-- Adopted alternative descriptions
CREATE TABLE adopted_descriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid REFERENCES routes ON DELETE CASCADE NOT NULL,
  comment_id uuid REFERENCES route_comments ON DELETE CASCADE NOT NULL,
  adopted_by uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  text text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE route_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments are public to read" ON route_comments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated users can create comments" ON route_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON route_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON route_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes are public to read" ON comment_likes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated users can manage own likes" ON comment_likes FOR ALL TO authenticated USING (auth.uid() = user_id);

ALTER TABLE adopted_descriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Adopted descriptions are public" ON adopted_descriptions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated users can adopt descriptions" ON adopted_descriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = adopted_by);

-- Indexes
CREATE INDEX idx_route_comments_route ON route_comments(route_id);
CREATE INDEX idx_route_comments_user ON route_comments(user_id);
CREATE INDEX idx_route_comments_tags ON route_comments USING GIN(tags);
CREATE INDEX idx_comment_likes_comment ON comment_likes(comment_id);
CREATE INDEX idx_adopted_descriptions_author ON adopted_descriptions(author_id);
```

- [ ] **Step 2: Apply via Supabase SQL Editor**

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/008_route_comments.sql
git commit -m "feat: add route comments, likes, adopted descriptions tables"
```

---

### Task 2: Comment Card Component

**Files:**
- Create: `src/components/mountains/comment-card.tsx`

- [ ] **Step 1: Create comment card component**

`'use client'` component displaying a single comment.

Props:
```typescript
{
  comment: {
    id: string
    text: string
    tags: string[]
    created_at: string
    user_id: string
    profile: { display_name: string }
    likes: { user_id: string; value: number }[]
  }
  currentUserId: string | null
  onLike: (commentId: string, value: 1 | -1) => void
  onAdopt: (commentId: string, text: string, authorId: string) => void
  guruScore?: number
}
```

Display:
- Author name + guru badge (if guruScore > 0) + relative time ("2 часа назад")
- Comment text
- Hashtags as colored pills: `#впечатление` (blue), `#описание` (green), `#альтернативное_описание` (amber), `#снаряжение` (purple), other (gray)
- Like/dislike buttons with net score: ThumbsUp / ThumbsDown icons from lucide-react
- If comment has tag `#альтернативное_описание` — show "Добавить к описанию" button
- Current user's like/dislike highlighted

Hashtag color mapping:
```typescript
const TAG_COLORS: Record<string, string> = {
  'впечатление': 'bg-blue-500/20 text-blue-400',
  'описание': 'bg-green-500/20 text-green-400',
  'альтернативное_описание': 'bg-amber-500/20 text-amber-400',
  'снаряжение': 'bg-purple-500/20 text-purple-400',
}
```

Relative time helper: use simple function (minutes/hours/days ago in Russian).

- [ ] **Step 2: Commit**

```bash
git add src/components/mountains/comment-card.tsx
git commit -m "feat: add comment card component with likes and hashtags"
```

---

### Task 3: Guru Badge Component

**Files:**
- Create: `src/components/mountains/guru-badge.tsx`

- [ ] **Step 1: Create guru badge**

Small inline component showing guru rating.

Props: `{ score: number }` — number of adopted descriptions + net likes from adopted descriptions.

Display:
- If score >= 1: small badge "🏔 {score}" with tooltip "Гуру: {score} принятых описаний"
- Styling: `text-xs px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400`
- If score >= 10: gold style, >= 50: diamond style

- [ ] **Step 2: Commit**

```bash
git add src/components/mountains/guru-badge.tsx
git commit -m "feat: add guru badge component"
```

---

### Task 4: Route Comments Component

**Files:**
- Create: `src/components/mountains/route-comments.tsx`

- [ ] **Step 1: Create route comments component**

`'use client'` component that handles the full comment section for a route.

Props: `{ routeId: string; currentUserId: string | null }`

Features:
- Load comments from `route_comments` joined with `profiles(display_name)` and `comment_likes`
- Load guru scores: count of `adopted_descriptions` per author_id + sum of likes on adopted comments
- Display comments sorted by created_at desc
- Filter tabs: Все | #впечатление | #описание | #альтернативное_описание | #снаряжение
- Comment count badge next to section header

**Add comment form** (only if authenticated):
- Textarea for comment text
- Hashtag selector: clickable pills to toggle tags (multi-select)
- Available tags: впечатление, описание, альтернативное_описание, снаряжение
- Submit button
- On submit: insert into `route_comments` with `{ route_id, user_id, text, tags }`

**Like/dislike handler:**
- Upsert into `comment_likes` with `{ comment_id, user_id, value }`
- If user clicks same value again — delete the like (toggle off)
- Optimistic UI update

**Adopt handler:**
- Insert into `adopted_descriptions` with `{ route_id, comment_id, adopted_by, author_id, text }`
- Show success toast/message

- [ ] **Step 2: Commit**

```bash
git add src/components/mountains/route-comments.tsx
git commit -m "feat: add route comments component with hashtags and likes"
```

---

### Task 5: Integrate Comments into Route List

**Files:**
- Modify: `src/components/mountains/route-list.tsx`

- [ ] **Step 1: Read the current route-list.tsx to understand the expanded route section**

The component has expandable routes. When a route is expanded, it shows the description. We need to add the comments section below the description in the expanded view.

- [ ] **Step 2: Add RouteComments to expanded route view**

Import `RouteComments` from `./route-comments`.

In the expanded route section (after the description text), add:
```tsx
<RouteComments routeId={route.id} currentUserId={userId} />
```

Also add a comment count indicator on the collapsed route card (small chat icon with count).

To get comment counts efficiently: fetch counts for all routes in one query on component mount:
```typescript
const { data: commentCounts } = await supabase
  .from('route_comments')
  .select('route_id')
  .in('route_id', routes.map(r => r.id))
```
Group by route_id and count.

- [ ] **Step 3: Show adopted alternative descriptions in the route description area**

Query `adopted_descriptions` for each route. If any exist, show them below the main description with a visual separator and author credit:
```
--- Альтернативное описание ---
(текст)
— Автор: display_name
```

- [ ] **Step 4: Commit**

```bash
git add src/components/mountains/route-list.tsx
git commit -m "feat: integrate comments and adopted descriptions into route view"
```
