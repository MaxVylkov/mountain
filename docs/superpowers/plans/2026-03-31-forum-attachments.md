# Forum File Attachments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to attach photos and PDF documents to forum posts, with image thumbnails visible in the post list and a full gallery + document list in the post detail view.

**Architecture:** New Supabase Storage bucket `forum-attachments` (public) + `forum_file_attachments` DB table. Files are uploaded during post creation (upload-on-submit). A `storageUrl` helper generates public URLs. `ForumPostCard` shows an image strip; `ForumPostDetail` shows a gallery and document list with author-only deletion in edit mode.

**Tech Stack:** Next.js App Router (RSC + client components), TypeScript, Supabase JS client, Tailwind CSS with `mountain-*` design tokens, `lucide-react`, Vitest for unit tests.

---

## File Map

| File | Action |
|------|--------|
| `supabase/migrations/020_forum_attachments.sql` | Create |
| `src/lib/storage-url.ts` | Create |
| `src/__tests__/storage-url.test.ts` | Create (unit test) |
| `src/components/forum/forum-types.ts` | Modify (extend `ForumPost`) |
| `src/components/forum/create-post-modal.tsx` | Modify (add file picker + upload) |
| `src/components/forum/forum-post-card.tsx` | Modify (add image thumbnail strip) |
| `src/app/forum/[category]/page.tsx` | Modify (batch-fetch image attachments) |
| `src/app/forum/post/[id]/page.tsx` | Modify (fetch file attachments, pass prop) |
| `src/components/forum/forum-post-detail.tsx` | Modify (image gallery, doc list, delete) |

---

### Task 1: Database migration

**Files:**
- Create: `supabase/migrations/020_forum_attachments.sql`



**Context:** Latest migration is `018_team_telegram_link.sql`. Apply manually (project doesn't use auto-runner due to numbering collisions). The `forum_posts.author_id` references `profiles.id` which equals `auth.uid()`.

- [ ] **Step 1: Create migration file**

`supabase/migrations/020_forum_attachments.sql`:

```sql
-- Public bucket for forum file attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'forum-attachments',
  'forum-attachments',
  true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf']
);

-- Storage RLS: users upload/delete only their own folder (prefixed with user_id)
CREATE POLICY "Users upload forum files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'forum-attachments'
    AND name LIKE (auth.uid()::text || '/%')
  );

CREATE POLICY "Users delete forum files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'forum-attachments'
    AND name LIKE (auth.uid()::text || '/%')
  );

-- Table: file attachment metadata
-- user_id is denormalized from forum_posts for fast RLS (avoids subquery per row)
CREATE TABLE forum_file_attachments (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id      uuid NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name    text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  file_size    bigint NOT NULL,
  mime_type    text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX forum_file_attachments_post_id_idx ON forum_file_attachments(post_id);

ALTER TABLE forum_file_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads forum file attachments"
  ON forum_file_attachments FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Authors insert forum file attachments"
  ON forum_file_attachments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Authors delete forum file attachments"
  ON forum_file_attachments FOR DELETE TO authenticated
  USING (user_id = auth.uid());
```

- [ ] **Step 2: Apply migration**

```bash
supabase db push
# or paste SQL in Supabase dashboard → SQL editor
```

Verify: `forum-attachments` bucket and `forum_file_attachments` table appear in the dashboard.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/020_forum_attachments.sql
git commit -m "feat(storage): add forum-attachments bucket and forum_file_attachments table"
```

---

### Task 2: Storage URL helper + unit test

**Files:**
- Create: `src/lib/storage-url.ts`
- Create: `src/__tests__/storage-url.test.ts`

**Context:** Vitest is set up with jsdom. Existing test: `src/components/forum/__tests__/forum-types.test.ts`. The helper generates public Supabase Storage URLs. `NEXT_PUBLIC_SUPABASE_URL` is always set (the entire app depends on it). Tests use `vi.stubEnv` to inject the env variable.

- [ ] **Step 1: Write the failing test**

`src/__tests__/storage-url.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('storageUrl', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('generates correct public URL for a given bucket and path', async () => {
    const { storageUrl } = await import('@/lib/storage-url')
    const url = storageUrl('forum-attachments', 'abc/def/1234_photo.jpg')
    expect(url).toBe('https://test.supabase.co/storage/v1/object/public/forum-attachments/abc/def/1234_photo.jpg')
  })

  it('works with user-documents bucket', async () => {
    const { storageUrl } = await import('@/lib/storage-url')
    const url = storageUrl('user-documents', 'uid-123/1234_file.pdf')
    expect(url).toBe('https://test.supabase.co/storage/v1/object/public/user-documents/uid-123/1234_file.pdf')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- --run src/__tests__/storage-url.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/storage-url'`

- [ ] **Step 3: Create the helper**

`src/lib/storage-url.ts`:

```ts
export function storageUrl(bucket: string, path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- --run src/__tests__/storage-url.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage-url.ts src/__tests__/storage-url.test.ts
git commit -m "feat(storage): add storageUrl helper with tests"
```

---

### Task 3: Extend ForumPost type

**Files:**
- Modify: `src/components/forum/forum-types.ts`

**Context:** `ForumPost` is used in card list and detail views. Adding `image_attachments` is the only change needed — it carries just enough for the thumbnail strip in `ForumPostCard`. The full file attachment data (including `file_name`, `mime_type`, `file_size`) is passed separately to `ForumPostDetail` to keep `ForumPost` lean.

**Existing tests at `src/components/forum/__tests__/forum-types.test.ts` test `categoryLabel`, `typeLabel`, `formatRelativeTime`, `isValidCategory` — no changes needed there.**

- [ ] **Step 1: Add `image_attachments` to `ForumPost` interface**

In `src/components/forum/forum-types.ts`, inside the `ForumPost` interface (after the last existing optional field):

```ts
  image_attachments?: { storage_path: string }[]
```

The updated interface becomes:

```ts
export interface ForumPost {
  id: string
  author_id: string
  category: ForumCategory
  type: PostType
  title: string
  body: string
  created_at: string
  updated_at: string
  author?: { display_name: string | null } | null
  like_count?: number
  reply_count?: number
  liked_by_me?: boolean
  route_note?: string | null
  ration_template_id?: string | null
  attached_route?: { name: string; mountainName: string } | null
  image_attachments?: { storage_path: string }[]
}
```

- [ ] **Step 2: Verify tests still pass**

```bash
npm run test -- --run src/components/forum/__tests__/forum-types.test.ts
```

Expected: All existing tests pass.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/forum/forum-types.ts
git commit -m "feat(forum): add image_attachments field to ForumPost type"
```

---

### Task 4: File picker in create-post-modal

**Files:**
- Modify: `src/components/forum/create-post-modal.tsx`

**Context:** This is a client component (`'use client'`). The existing `submit()` function creates the post, then inserts entity attachments. We add: (a) state for pending files, (b) a file picker UI section inside the existing `showAttachments` accordion (after the workout picker), and (c) upload logic at the end of `submit()`.

Key constraints: max 5 files per post, 10 MB per file. Accepted MIME types: `image/jpeg,image/png,image/webp,image/gif,application/pdf`. Filename sanitization: `file.name.replace(/[^a-zA-Z0-9-]/g, '_').replace(/_+/g, '_').toLowerCase()`.

Upload-on-submit: post is created first (existing code), then files are uploaded in parallel, then DB rows inserted. If DB insert fails, uploaded files are cleaned up. Post navigation happens regardless of file upload success.

- [ ] **Step 1: Add `Image` icon import from lucide-react**

In `src/components/forum/create-post-modal.tsx`, the import line currently reads:
```tsx
import { X, MapPin, Search, Package, ChefHat, Dumbbell, Paperclip, ChevronDown, AlertCircle } from 'lucide-react'
```

Add `Image` to this import.

- [ ] **Step 2: Add state for pending files**

In the component function, after the existing `const [selectedWorkoutId, ...]` state, add:

```tsx
  // File attachments
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
```

- [ ] **Step 3: Update `attachmentCount` to include files**

The existing `attachmentCount` computation is:
```tsx
  const attachmentCount = [
    !preAttached && (selectedRoute || routeNote.trim()),
    selectedPackingId,
    selectedRationId,
    selectedWorkoutId,
  ].filter(Boolean).length
```

Replace with:
```tsx
  const attachmentCount = [
    !preAttached && (selectedRoute || routeNote.trim()),
    selectedPackingId,
    selectedRationId,
    selectedWorkoutId,
  ].filter(Boolean).length + pendingFiles.length
```

- [ ] **Step 4: Add file handling function**

After the `loadPackingSets` function, add:

```tsx
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (!selected.length) return

    const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
    const valid = selected.filter(f => ACCEPTED.includes(f.type) && f.size <= 10 * 1024 * 1024)
    const invalidCount = selected.length - valid.length
    const newFiles = [...pendingFiles, ...valid]

    if (newFiles.length > 5) {
      setFileError(`Максимум 5 файлов на пост`)
      const allowed = valid.slice(0, 5 - pendingFiles.length)
      setPendingFiles([...pendingFiles, ...allowed])
    } else {
      setPendingFiles(newFiles)
      setFileError(invalidCount > 0 ? `${invalidCount} файл(а) пропущено: превышен размер или неверный тип` : null)
    }
    e.target.value = ''
  }

  function removeFile(index: number) {
    setPendingFiles(prev => prev.filter((_, i) => i !== index))
    setFileError(null)
  }
```

- [ ] **Step 5: Add file upload logic at end of `submit()`**

In the `submit()` function, find the block:
```tsx
      if (attachments.length > 0) await supabase.from('forum_attachments').insert(attachments)

      onClose()
      router.push(`/forum/post/${post.id}`)
```

Replace with:
```tsx
      if (attachments.length > 0) await supabase.from('forum_attachments').insert(attachments)

      // Upload files if any were selected
      if (pendingFiles.length > 0) {
        const uploadResults = await Promise.all(
          pendingFiles.map(async (file) => {
            const sanitized = file.name.replace(/[^a-zA-Z0-9-]/g, '_').replace(/_+/g, '_').toLowerCase()
            const path = `${currentUserId}/${post.id}/${Date.now()}_${sanitized}`
            const { error } = await supabase.storage.from('forum-attachments').upload(path, file)
            if (error) return null
            return { file_name: file.name, storage_path: path, file_size: file.size, mime_type: file.type }
          })
        )
        const successfulUploads = uploadResults.filter(Boolean) as { file_name: string; storage_path: string; file_size: number; mime_type: string }[]
        if (successfulUploads.length > 0) {
          const { error: dbError } = await supabase.from('forum_file_attachments').insert(
            successfulUploads.map(u => ({ post_id: post.id, user_id: currentUserId, ...u }))
          )
          if (dbError) {
            // DB insert failed — clean up uploaded files to avoid orphans
            await supabase.storage.from('forum-attachments').remove(successfulUploads.map(u => u.storage_path))
          }
        }
      }

      onClose()
      router.push(`/forum/post/${post.id}`)
```

- [ ] **Step 6: Add file picker UI section inside the accordion**

In the attachments accordion, find the closing of the workout picker `</div>` (the last `</div>` before the closing of the `{showAttachments && (` block). Add the following section after the workout picker div:

```tsx
                {/* File attachments */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-mountain-muted">
                    <Image className="w-3.5 h-3.5" />
                    Файлы и фото
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  {pendingFiles.length < 5 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-dashed border-mountain-border text-mountain-muted hover:text-mountain-text hover:border-mountain-primary transition-colors w-full"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      Добавить файлы (макс. 5, до 10 МБ)
                    </button>
                  )}
                  {pendingFiles.length > 0 && (
                    <div className="space-y-1">
                      {pendingFiles.map((file, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-mountain-surface text-xs">
                          <span className="truncate text-mountain-text">{file.name}</span>
                          <div className="flex items-center gap-2 shrink-0 text-mountain-muted">
                            <span>{(file.size / (1024 * 1024)).toFixed(1)} МБ</span>
                            <button onClick={() => removeFile(i)} className="hover:text-mountain-danger transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {fileError && (
                    <p className="text-xs text-mountain-danger">{fileError}</p>
                  )}
                </div>
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 8: Manual test**

```bash
npm run dev
```

Navigate to `/forum/routes`, open «Новый пост», expand «Прикрепить материалы». Verify «Файлы и фото» section appears at the bottom. Select 1-2 images and a PDF. Verify they appear in the list with sizes and ✕ buttons. Submit post and verify the post detail page loads.

- [ ] **Step 9: Commit**

```bash
git add src/components/forum/create-post-modal.tsx
git commit -m "feat(forum): add file picker and upload to create-post-modal"
```

---

### Task 5: Image thumbnail strip in ForumPostCard

**Files:**
- Modify: `src/components/forum/forum-post-card.tsx`

**Context:** `ForumPostCard` is a server component (no `'use client'`). It receives a `ForumPost` prop. The new `image_attachments` field was added in Task 3. The `storageUrl` helper was created in Task 2. Thumbnails are 40×40px, shown as a flex row. The entire card is a `<Link>` — thumbnails are non-interactive (no click handler needed).

- [ ] **Step 1: Add import for storageUrl**

In `src/components/forum/forum-post-card.tsx`, add:
```tsx
import { storageUrl } from '@/lib/storage-url'
```

- [ ] **Step 2: Add thumbnail strip to the JSX**

In the card JSX, find the block that renders the body preview:
```tsx
        {post.body && (
          <p className="text-xs text-mountain-muted line-clamp-2 leading-relaxed pl-0">{post.body}</p>
        )}
```

After this block, add:
```tsx
        {post.image_attachments && post.image_attachments.length > 0 && (
          <div className="flex items-center gap-1.5 pt-0.5">
            {post.image_attachments.slice(0, 3).map((att, i) => (
              <img
                key={i}
                src={storageUrl('forum-attachments', att.storage_path)}
                alt=""
                className="w-10 h-10 rounded-md object-cover shrink-0"
              />
            ))}
            {post.image_attachments.length > 3 && (
              <span className="w-10 h-10 rounded-md bg-mountain-surface border border-mountain-border flex items-center justify-center text-xs text-mountain-muted font-medium shrink-0">
                +{post.image_attachments.length - 3}
              </span>
            )}
          </div>
        )}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/forum/forum-post-card.tsx
git commit -m "feat(forum): add image thumbnail strip to ForumPostCard"
```

---

### Task 6: Batch-fetch image attachments in category page

**Files:**
- Modify: `src/app/forum/[category]/page.tsx`

**Context:** This is a Next.js RSC (server component). It already batch-fetches `likeCounts`, `replyCounts`, `routeAttachments` in a `Promise.all`. We add a 4th batch query for image attachments. Result is a `Record<post_id, { storage_path: string }[]>` limited to 4 images per post (in-memory). The `posts` mapping already sets `attached_route` from `routeAttachments` — add `image_attachments` the same way.

- [ ] **Step 1: Destructure the 4th result from Promise.all**

Find the existing:
```ts
  const [likeCounts, replyCounts, routeAttachments] = await Promise.all([
```

Change to:
```ts
  const [likeCounts, replyCounts, routeAttachments, imageAttachments] = await Promise.all([
```

- [ ] **Step 2: Add the 4th query as the last item inside the Promise.all array**

After the `routeAttachments` promise (which ends with `: Promise.resolve({} as Record<string, { name: string; mountainName: string }>)`), add a comma and this 4th entry:

```ts
    // Fetch image attachments for card thumbnail strips
    postIds.length > 0
      ? supabase
          .from('forum_file_attachments')
          .select('post_id, storage_path')
          .in('post_id', postIds)
          .like('mime_type', 'image/%')
          .then(({ data }) => {
            const map: Record<string, { storage_path: string }[]> = {}
            ;(data ?? []).forEach((a: any) => {
              if (!map[a.post_id]) map[a.post_id] = []
              if (map[a.post_id].length < 4) map[a.post_id].push({ storage_path: a.storage_path })
            })
            return map
          })
      : Promise.resolve({} as Record<string, { storage_path: string }[]>),
```

- [ ] **Step 3: Add `image_attachments` to the posts mapping**

Find the `const posts: ForumPost[] = postList.map((p: any) => ({` block. After `attached_route: routeAttachments[p.id] ?? null,` add:

```ts
    image_attachments: imageAttachments[p.id] ?? [],
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/forum/[category]/page.tsx
git commit -m "feat(forum): batch-fetch image attachments for card thumbnail strips"
```

---

### Task 7: Fetch file attachments in post detail page

**Files:**
- Modify: `src/app/forum/post/[id]/page.tsx`

**Context:** This RSC already fetches `forum_attachments` for entity references. We add a parallel fetch for `forum_file_attachments`. The result is passed to `ForumPostDetail` as a new `fileAttachments` prop. The component currently takes: `post`, `replies`, `routeData`, `packingData`, `gearChips`, `workoutIds`, `currentUserId`. We add `fileAttachments`.

- [ ] **Step 1: Add file attachments fetch (parallel with existing queries)**

In `src/app/forum/post/[id]/page.tsx`, find the existing `forum_attachments` fetch:
```ts
  // Fetch attachments
  const { data: attachments } = await supabase
    .from('forum_attachments')
    .select('*')
    .eq('post_id', id)
    .order('position', { ascending: true })
```

Add a parallel fetch directly after (or wrap both in `Promise.all` — parallel is fine, sequential is also fine since we need `id` which is already available):
```ts
  const { data: fileAttachments } = await supabase
    .from('forum_file_attachments')
    .select('id, file_name, storage_path, mime_type, file_size')
    .eq('post_id', id)
    .order('created_at', { ascending: true })
```

- [ ] **Step 2: Pass fileAttachments to the component**

Find the JSX return:
```tsx
  return (
    <ForumPostDetail
      post={post}
      replies={replies}
      routeData={routeData}
      packingData={packingData}
      gearChips={gearChips}
      workoutIds={workoutIds}
      currentUserId={user?.id ?? null}
    />
  )
```

Add the new prop:
```tsx
  return (
    <ForumPostDetail
      post={post}
      replies={replies}
      routeData={routeData}
      packingData={packingData}
      gearChips={gearChips}
      workoutIds={workoutIds}
      currentUserId={user?.id ?? null}
      fileAttachments={fileAttachments ?? []}
    />
  )
```

- [ ] **Step 3: Verify TypeScript compiles** (will fail until Task 8 updates the Props)

```bash
npx tsc --noEmit
```

Expected: TypeScript error about unknown prop `fileAttachments` on `ForumPostDetail`. This is expected — Task 8 will fix it.

- [ ] **Step 4: Commit (before Task 8 fixes the type)**

```bash
git add src/app/forum/post/[id]/page.tsx
git commit -m "feat(forum): fetch and pass fileAttachments to ForumPostDetail"
```

---

### Task 8: Image gallery and document list in ForumPostDetail

**Files:**
- Modify: `src/components/forum/forum-post-detail.tsx`

**Context:** `forum-post-detail.tsx` is a client component (`'use client'`). It currently takes 7 props (post, replies, routeData, packingData, gearChips, workoutIds, currentUserId). We add `fileAttachments` as the 8th prop. The component manages local state for likes, editing, etc. — `fileAttachments` needs local state too so deletions update the UI.

The new file attachments section renders:
- **Image gallery** — grid of `aspect-square` images above the entity attachment cards
- **Document list** — rows with download link
- **Delete** — only when `editing === true && isAuthor`, ✕ button per file (no confirm dialog)

`storageUrl` helper generates public URLs. Images open in new tab on click. Documents open in new tab (browser handles download).

- [ ] **Step 1: Add imports**

In `src/components/forum/forum-post-detail.tsx`, add to existing lucide-react import:
- Add `File, Download` (note: the icon is `File`, not `FileIcon` — that's what lucide-react exports)

Add at the top:
```tsx
import { storageUrl } from '@/lib/storage-url'
```

- [ ] **Step 2: Add `fileAttachments` to the Props interface**

Find the `interface Props {` block. It currently ends with `currentUserId: string | null`. Add:

```ts
  fileAttachments: { id: string; file_name: string; storage_path: string; mime_type: string; file_size: number }[]
```

- [ ] **Step 3: Destructure `fileAttachments` from props**

Find the `export function ForumPostDetail({ post, replies, routeData, packingData, gearChips, workoutIds, currentUserId }: Props) {` line. Add `fileAttachments` to the destructuring.

- [ ] **Step 4: Add local state for fileAttachments**

After the `const isAuthor = ...` line, add:
```tsx
  const [localFileAttachments, setLocalFileAttachments] = useState(fileAttachments)
```

- [ ] **Step 5: Add delete file handler**

After the `cancelEdit` function, add:

```tsx
  async function handleDeleteFile(fileId: string, storagePath: string) {
    const supabase = createClient()
    await supabase.from('forum_file_attachments').delete().eq('id', fileId)
    await supabase.storage.from('forum-attachments').remove([storagePath])
    setLocalFileAttachments(prev => prev.filter(f => f.id !== fileId))
  }
```

- [ ] **Step 6: Add file attachments section to the JSX**

In the JSX, find the section that renders attachment cards. It starts with something like `{routeData.map(...)}` or a block of attachment cards. Place the new file section **before** the entity attachment cards.

The section to add:

```tsx
          {/* File attachments: images */}
          {localFileAttachments.some(f => f.mime_type.startsWith('image/')) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {localFileAttachments
                .filter(f => f.mime_type.startsWith('image/'))
                .map(f => (
                  <div key={f.id} className="relative group">
                    <img
                      src={storageUrl('forum-attachments', f.storage_path)}
                      alt={f.file_name}
                      className="aspect-square w-full object-cover rounded-xl cursor-pointer"
                      onClick={() => window.open(storageUrl('forum-attachments', f.storage_path), '_blank')}
                    />
                    {editing && isAuthor && (
                      <button
                        onClick={() => handleDeleteFile(f.id, f.storage_path)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Удалить"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
            </div>
          )}

          {/* File attachments: documents */}
          {localFileAttachments.some(f => f.mime_type === 'application/pdf') && (
            <div className="space-y-1">
              {localFileAttachments
                .filter(f => f.mime_type === 'application/pdf')
                .map(f => (
                  <div key={f.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-mountain-surface border border-mountain-border">
                    <div className="flex items-center gap-2 min-w-0">
                      <File className="w-4 h-4 text-mountain-muted shrink-0" />
                      <span className="text-sm text-mountain-text truncate">{f.file_name}</span>
                      <span className="text-xs text-mountain-muted shrink-0">{(f.file_size / (1024 * 1024)).toFixed(1)} МБ</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={storageUrl('forum-attachments', f.storage_path)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-mountain-primary hover:underline flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        Скачать
                      </a>
                      {editing && isAuthor && (
                        <button
                          onClick={() => handleDeleteFile(f.id, f.storage_path)}
                          className="text-mountain-muted hover:text-mountain-danger transition-colors"
                          aria-label="Удалить"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors (this also resolves the error from Task 7).

- [ ] **Step 8: Manual end-to-end test**

```bash
npm run dev
```

1. Create a new forum post with 2 images and 1 PDF attached
2. Verify post detail shows images in a 2/3-column grid and the PDF as a download row
3. Navigate to the category list — verify image thumbnails appear in the post card
4. In post detail, click «Редактировать» — verify ✕ buttons appear on images and documents
5. Delete an image — verify it disappears from the grid
6. Click «Сохранить» to exit edit mode

- [ ] **Step 9: Commit**

```bash
git add src/components/forum/forum-post-detail.tsx
git commit -m "feat(forum): add image gallery and document list to ForumPostDetail"
```
