# Forum File Attachments — Design Spec

**Date:** 2026-03-30
**Scope:** Supabase Storage bucket + file/photo attachments in forum posts

---

## Problem Statement

Users need to share photos and documents (route photos, trip reports, scans) in forum posts. Currently only entity references (routes, packing sets) can be attached — no file upload exists.

---

## Design Goals

1. **Upload any file** — images (jpg/png/webp/gif) and documents (pdf), 10 MB max each
2. **Minimal friction** — file picker inside the existing attachments accordion, no separate page
3. **Visual in card view** — image thumbnails visible in post list without opening the post
4. **Full display in post detail** — images as grid, documents as download chips
5. **Author controls** — only the author can upload and delete their post's files

---

## Architecture

### Supabase Storage bucket

Bucket name: `forum-attachments`
Visibility: **public** (forum posts are publicly readable)
File size limit: 10 MB (10 485 760 bytes)
Allowed MIME types: `['image/jpeg','image/png','image/webp','image/gif','application/pdf']` — server-side guard against uploading other file types (e.g. .html)

File path structure: `{user_id}/{post_id}/{timestamp}_{sanitized_filename}`
Example: `abc-123/def-456/1743342600000_elbrus_camp2.jpg`

The user_id prefix enables simple RLS (`name LIKE (auth.uid()::text || '/%')`). The post_id groups all files for a post in one folder. All operations are performed from the client using the user's authenticated session.

### Database table: `forum_file_attachments`

Separate from the existing `forum_attachments` table (which holds entity references). This table stores file upload metadata.

```sql
CREATE TABLE forum_file_attachments (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id      uuid NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- denormalized from post for fast RLS
  file_name    text NOT NULL,         -- original filename shown in UI
  storage_path text NOT NULL UNIQUE,  -- path in Storage bucket
  file_size    bigint NOT NULL,       -- bytes
  mime_type    text NOT NULL,         -- e.g. 'image/jpeg', 'application/pdf'
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX forum_file_attachments_post_id_idx ON forum_file_attachments(post_id);

ALTER TABLE forum_file_attachments ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read file attachment metadata
CREATE POLICY "Anyone reads forum file attachments"
  ON forum_file_attachments FOR SELECT TO anon, authenticated
  USING (true);

-- Only the uploader can insert
CREATE POLICY "Authors insert forum file attachments"
  ON forum_file_attachments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Only the uploader can delete
CREATE POLICY "Authors delete forum file attachments"
  ON forum_file_attachments FOR DELETE TO authenticated
  USING (user_id = auth.uid());
```

### Storage bucket creation

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'forum-attachments',
  'forum-attachments',
  true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf']
);
```

### RLS on Storage

```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users upload forum files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'forum-attachments'
    AND name LIKE (auth.uid()::text || '/%')
  );

-- Allow authenticated users to delete their own files
CREATE POLICY "Users delete forum files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'forum-attachments'
    AND name LIKE (auth.uid()::text || '/%')
  );
```

No SELECT policy needed — the bucket is public, files are served at their public URL without auth.

---

## Constraints

- Max **5 files per post**
- Max **10 MB per file**
- Accepted MIME types (client-side check): `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `application/pdf`
- Sanitize filename: replace all non-alphanumeric chars (including dots) with underscores, collapse consecutive underscores, lowercase — e.g. `Photo 1.JPG` → `photo_1_jpg`

---

## Upload Flow (create-post-modal.tsx)

### State additions

```tsx
const [pendingFiles, setPendingFiles] = useState<File[]>([])
const [fileError, setFileError] = useState<string | null>(null)
const fileInputRef = useRef<HTMLInputElement>(null)
```

`attachmentCount` is updated to include `pendingFiles.length`.

### File picker UI (inside attachments accordion, after workout picker)

```
┌─ Файлы ──────────────────────────────────────────────────────┐
│  [📎 Добавить файлы]                                         │
│                                                               │
│  elbrus_camp2.jpg  1.2 МБ                    [✕]             │
│  marshrut.pdf      0.4 МБ                    [✕]             │
│  ⚠ Максимум 5 файлов (если превышено)                       │
└──────────────────────────────────────────────────────────────┘
```

- Hidden `<input type="file" ref={fileInputRef} multiple accept="image/jpeg,image/png,image/webp,image/gif,application/pdf">`
- Clicking «Добавить файлы» triggers `fileInputRef.current?.click()`
- On file selection: validate each file (size ≤ 10 MB, accepted type); validate total count ≤ 5. Show `fileError` inline if any constraint violated. Valid files are appended to `pendingFiles`.
- Each pending file row shows: `file.name` + formatted size + ✕ button to remove

### Upload in submit()

After `forum_attachments` inserts, and only if `pendingFiles.length > 0`:

```ts
const uploadResults = await Promise.all(
  pendingFiles.map(async (file) => {
    const sanitized = file.name.replace(/[^a-zA-Z0-9-]/g, '_').replace(/_+/g, '_').toLowerCase()
    const path = `${currentUserId}/${post.id}/${Date.now()}_${sanitized}`
    const { error } = await supabase.storage
      .from('forum-attachments')
      .upload(path, file)
    if (error) return null
    return { file_name: file.name, storage_path: path, file_size: file.size, mime_type: file.type }
  })
)

const successfulUploads = uploadResults.filter(Boolean)
if (successfulUploads.length > 0) {
  const { error: dbError } = await supabase.from('forum_file_attachments').insert(
    successfulUploads.map(u => ({ post_id: post.id, user_id: currentUserId, ...u }))
  )
  if (dbError) {
    // DB insert failed — delete already-uploaded files to avoid orphans in Storage
    await supabase.storage
      .from('forum-attachments')
      .remove(successfulUploads.map(u => u!.storage_path))
  }
}
```

If some uploads fail: the post is still created and navigation proceeds. Files that succeeded AND were inserted into the DB are attached. If the DB insert fails entirely, the storage files are cleaned up. No error is shown to the user — partial upload of files is acceptable since the post was created successfully.

---

## ForumPost Type Extension

```ts
// Add to ForumPost interface in forum-types.ts
image_attachments?: { storage_path: string }[]  // images only, for card thumbnail strip
```

`file_attachments` for the detail view is passed as a separate prop to `ForumPostDetail` (not stored in `ForumPost` to keep the type lean). The existing Props interface in `forum-post-detail.tsx` is extended:

```ts
interface Props {
  post: ForumPost
  replies: ForumReply[]
  routeData: RouteData[]
  packingData: PackingData[]
  gearChips: GearChip[]
  workoutIds: string[]
  currentUserId: string | null
  fileAttachments: { id: string; file_name: string; storage_path: string; mime_type: string; file_size: number }[]  // NEW
}
```

### Public URL helper

```ts
// src/lib/storage-url.ts
export function storageUrl(bucket: string, path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
}
```

---

## Category Page Changes (src/app/forum/[category]/page.tsx)

Add a 4th batch query to the existing `Promise.all`:

```ts
// Fetch image attachments for thumbnail strips
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
  : Promise.resolve({} as Record<string, { storage_path: string }[]>)
```

In the `posts` mapping: `image_attachments: imageAttachments[p.id] ?? []`

---

## Post Detail Page Changes (src/app/forum/post/[id]/page.tsx)

Add a fetch for file attachments. Run it in the existing `Promise.all` alongside counts, or as a separate parallel fetch after the post is confirmed to exist:

```ts
const { data: fileAttachments } = await supabase
  .from('forum_file_attachments')
  .select('id, file_name, storage_path, mime_type, file_size')
  .eq('post_id', id)
  .order('created_at', { ascending: true })
```

Pass to component: `<ForumPostDetail ... fileAttachments={fileAttachments ?? []} />`

---

## ForumPostCard Changes

Add image thumbnail strip below the body text, before the meta row:

```
┌─ Post Card ─────────────────────────────────────────────────┐
│  [Обсуждение]  Как выбрать кошки для 4Б?                   │
│  📍 Эльбрус · Западный маршрут                             │
│  Собираюсь на Эльбрус в июле, нужен совет по...            │
│  ┌──┐ ┌──┐ ┌──┐  +2                                        │
│  └──┘ └──┘ └──┘  (image thumbnails 40×40px)                │
│  Иван · 3 дн назад                   👍 12  💬 4           │
└─────────────────────────────────────────────────────────────┘
```

- Only shown when `post.image_attachments && post.image_attachments.length > 0`
- Show max 3 thumbnails (40×40px, `object-cover rounded-md`)
- If `image_attachments.length > 3`: show a `+{N}` pill after the 3rd thumbnail
- Thumbnails are not interactive in card view (the whole card is a link)
- Use `<img>` with `src={storageUrl('forum-attachments', attachment.storage_path)}`

---

## ForumPostDetail Changes

New section rendered between the post body and the attachment cards (routes, packing sets etc.).

### Image gallery

Shown when `fileAttachments` has entries with `mime_type.startsWith('image/')`:

```
┌─ Images ────────────────────────────────────────────────────┐
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │              │  │              │  │              │     │
│  │   image 1    │  │   image 2    │  │   image 3    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

- CSS grid: `grid-cols-2 sm:grid-cols-3`, `gap-2`
- Each image: `aspect-square object-cover rounded-xl cursor-pointer`
- Click: `window.open(url, '_blank')`

### Document list

Shown when `fileAttachments` has PDF entries:

```
┌─ Documents ─────────────────────────────────────────────────┐
│  📄 marshrut_elbrus.pdf  0.4 МБ          [Скачать ↓]       │
│  📄 spravka.pdf          1.1 МБ          [Скачать ↓]       │
└─────────────────────────────────────────────────────────────┘
```

- Each row: file icon + name + formatted size + «Скачать» link (`target="_blank"`)

### Delete files (edit mode)

When `editing === true` and `isAuthor`:
- Each image thumbnail and document row shows an ✕ button
- Click: delete DB row first (`supabase.from('forum_file_attachments').delete().eq('id', fileId)`), then delete from Storage (`supabase.storage.from('forum-attachments').remove([path])`), then remove from local state. DB-first order ensures metadata is gone even if Storage removal fails.
- No confirmation dialog needed (files can be re-uploaded)

`ForumPostDetail` manages `fileAttachments` in local state (initialized from the `fileAttachments` prop).

---

## Files

| File | Change |
|------|--------|
| `supabase/migrations/019_forum_attachments.sql` | Bucket, table, RLS policies |
| `src/lib/storage-url.ts` | Public URL helper (new file) |
| `src/components/forum/forum-types.ts` | Add `image_attachments` to `ForumPost` |
| `src/components/forum/create-post-modal.tsx` | File picker section + upload in submit() |
| `src/components/forum/forum-post-card.tsx` | Image thumbnail strip |
| `src/components/forum/forum-post-detail.tsx` | Image gallery, document list, delete in edit mode |
| `src/app/forum/[category]/page.tsx` | Batch-fetch image attachments |
| `src/app/forum/post/[id]/page.tsx` | Fetch file attachments, pass as prop |

---

## What Is NOT In Scope

- Video uploads
- Attachments on replies (post-level only)
- Image compression / resizing
- Light-box / full-screen gallery
- Editing files after post creation (only deletion in edit mode)
- Pagination of files per post
- Cleanup of Storage files when a forum post is deleted (ON DELETE CASCADE removes DB rows, but Storage files become orphaned — deferred to a future maintenance job)
