# Profile Documents — Design Spec

**Date:** 2026-03-30
**Scope:** Supabase Storage setup + profile documents section

---

## Problem Statement

Users need to store personal documents (grade books, medical certificates, any files) attached to their profile. No file storage infrastructure exists yet in the project.

---

## Design Goals

1. **Private storage** — only the owner can access their documents
2. **Minimal UI** — section in the existing profile page, no separate page
3. **Categories** — pre-defined types for common alpine documents
4. **Any file type** — no format restrictions, 10 MB max per file

---

## Architecture

### Supabase Storage bucket

Bucket name: `user-documents`
Visibility: **private** (public = false)
File size limit: 10 MB (10 485 760 bytes)
Allowed MIME types: null (any type accepted)

File path structure: `{user_id}/{timestamp}_{sanitized_filename}`
Example: `abc-123/1743342600000_razryadnaya_knizhka.pdf`

All storage operations are performed from the **client** using the user's authenticated Supabase session — no server API route needed. RLS policies on `storage.objects` enforce ownership.

### Database table: `user_documents`

Stores metadata about uploaded files. The actual file lives in Storage; this table holds the reference.

Note: `profiles.id` equals `auth.uid()` — confirmed by existing profile queries in `src/app/profile/page.tsx` (`.eq('id', data.user.id)`). The FK `user_id → profiles(id)` is therefore consistent with the RLS check `user_id = auth.uid()`.

```sql
CREATE TABLE user_documents (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name    text NOT NULL,           -- original filename shown in UI
  category     text NOT NULL CHECK (category IN ('grade_book', 'medical', 'other')),
  storage_path text NOT NULL UNIQUE,    -- path in Storage bucket
  file_size    bigint NOT NULL,         -- bytes
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own documents"
  ON user_documents FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### Supabase Storage bucket creation

The bucket must be created in the same migration via an INSERT into `storage.buckets`:

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('user-documents', 'user-documents', false, 10485760, NULL);
```

### RLS on Storage

Uses `name LIKE (auth.uid()::text || '/%')` for path matching — unambiguous across all Supabase versions, avoids `foldername()` indexing inconsistencies.

```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users upload own documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user-documents'
    AND name LIKE (auth.uid()::text || '/%')
  );

-- Allow authenticated users to read their own files
CREATE POLICY "Users read own documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'user-documents'
    AND name LIKE (auth.uid()::text || '/%')
  );

-- Allow authenticated users to delete their own files
CREATE POLICY "Users delete own documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'user-documents'
    AND name LIKE (auth.uid()::text || '/%')
  );
```

---

## Categories

| value | Label |
|-------|-------|
| `grade_book` | Разрядная / значкистская книжка |
| `medical` | Медицинская справка |
| `other` | Другое |

---

## UI Design

New `<Card>` added to `src/app/profile/page.tsx` below the Friends card.

Extracted to: `src/components/profile/documents-section.tsx`

### Empty state (loading)

While `isLoading = true`, show one skeleton row: `<div className="h-10 rounded-lg bg-mountain-surface animate-pulse" />` — consistent with the page-level skeleton pattern.

### Empty state (no documents)

```
┌─ Card ─────────────────────────────────────────────────────┐
│  Мои документы                    [+ Загрузить документ]   │
│                                                             │
│  Загрузите справки, разрядные книжки и другие документы.   │
└────────────────────────────────────────────────────────────┘
```

### With documents

```
┌─ Card ─────────────────────────────────────────────────────┐
│  Мои документы                    [+ Загрузить документ]   │
│                                                             │
│  razr_kniga.pdf        [Разрядная книжка]   12.03.2026     │
│  1.2 МБ                                   [↓]  [Удалить]   │
│                                                             │
│  med_spravka.pdf       [Медицинская]        01.02.2026     │
│  0.8 МБ                                   [↓]  [Удалить]   │
└────────────────────────────────────────────────────────────┘
```

### Upload flow

1. User clicks «+ Загрузить документ»
2. Hidden `<input type="file" accept="*">` fires → user picks file
3. **Category selector appears inline** below the upload button: three pill-buttons «Разрядная книжка» / «Медицинская справка» / «Другое» (default: «Другое» pre-selected). A «Подтвердить загрузку» button becomes active.
4. User selects category (optional, default used if unchanged) and clicks «Подтвердить загрузку»
5. Client validates: file size ≤ 10 MB — if over limit, show error `"Файл превышает 10 МБ"`, abort
6. Show `isUploading = true`: «Подтвердить» button disabled with spinner, category pills hidden
7. Upload to Storage: `supabase.storage.from('user-documents').upload(path, file)`
8. On success: insert row to `user_documents` table with `{ user_id, file_name, category, storage_path, file_size }`
9. Add new doc to local list, reset `pendingCategory` to `'other'`, hide category selector
10. On error: show `uploadError = "Не удалось загрузить файл"` inline below the button

### Download flow

1. User clicks download icon [↓]
2. Client calls `supabase.storage.from('user-documents').createSignedUrl(path, 60)`
3. Open signed URL in new tab — browser handles download/preview
4. URL expires in 60 seconds (security: prevents link sharing)

### Delete flow

1. User clicks «Удалить»
2. Inline confirm appears: «Удалить? [Да] [Отмена]»
3. «Да»: delete from Storage (`supabase.storage.from('user-documents').remove([path])`) → delete DB row
4. Remove from local list on success

---

## Component: `documents-section.tsx`

**Props:**
```tsx
interface DocumentsSectionProps {
  userId: string
}
```

**State:**
```tsx
const [documents, setDocuments] = useState<UserDocument[]>([])
const [isLoading, setIsLoading] = useState(true)
const [isUploading, setIsUploading] = useState(false)
const [uploadError, setUploadError] = useState<string | null>(null)
const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
const [pendingFile, setPendingFile] = useState<File | null>(null)        // file selected, awaiting confirm
const [pendingCategory, setPendingCategory] = useState<Category>('other')
```

**Type:**
```tsx
type Category = 'grade_book' | 'medical' | 'other'

interface UserDocument {
  id: string
  file_name: string
  category: Category
  storage_path: string
  file_size: number
  created_at: string
}
```

**Initial data fetch (on mount):**
```tsx
useEffect(() => {
  const supabase = createClient()
  supabase
    .from('user_documents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .then(({ data }) => {
      setDocuments(data ?? [])
      setIsLoading(false)
    })
}, [userId])
```

**Category selector:** Three inline pill-buttons rendered when `pendingFile !== null`. Clicking a pill sets `pendingCategory`. Active pill gets `bg-mountain-primary/20 text-mountain-primary` class (same as level badge style). Default selection: `'other'`.

---

## Profile page integration

In `src/app/profile/page.tsx`:
1. Import `DocumentsSection` from `@/components/profile/documents-section`
2. Add `<DocumentsSection userId={user.id} />` after the Friends card and before the closing `</div>`
3. No new props or state needed in the page itself

---

## Files

| File | Change | Note |
|------|--------|------|
| `supabase/migrations/019_user_documents.sql` | Create bucket, table, RLS policies | `018_team_telegram_link.sql` already exists — 019 is the correct next number. Apply manually (project has a pre-existing `005_*` numbering collision and does not use supabase db push auto-runner). |
| `src/components/profile/documents-section.tsx` | New component | Create `src/components/profile/` directory |
| `src/app/profile/page.tsx` | Import and render DocumentsSection | |

---

## What Is NOT In Scope

- Forum file attachments (separate spec)
- Sharing documents with team leaders
- Image preview inline (view in new tab via signed URL is sufficient)
- Pagination (if user has many files — deferred)
- Virus scanning / content moderation
