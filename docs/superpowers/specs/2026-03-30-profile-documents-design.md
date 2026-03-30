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

### RLS on Storage

```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users upload own documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to read their own files
CREATE POLICY "Users read own documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'user-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own files
CREATE POLICY "Users delete own documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'user-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
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

### Empty state

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
3. Client validates: file size ≤ 10 MB (client-side check only)
4. Show `isUploading = true` state: button disabled, spinner inline
5. Upload to Storage: `supabase.storage.from('user-documents').upload(path, file)`
6. On success: insert row to `user_documents` table
7. Add new doc to local list (optimistic update after both steps succeed)
8. On error: show inline error message `"Не удалось загрузить файл"`

### Download flow

1. User clicks download icon [↓]
2. Client calls `supabase.storage.from('user-documents').createSignedUrl(path, 60)`
3. Open signed URL in new tab — browser handles download/preview
4. URL expires in 60 seconds (security: prevents link sharing)

### Delete flow

1. User clicks «Удалить»
2. Inline confirm appears: «Удалить? [Да] [Отмена]»
3. «Да»: delete from Storage → delete DB row
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
const [pendingCategory, setPendingCategory] = useState<Category>('other')
```

**Type:**
```tsx
interface UserDocument {
  id: string
  file_name: string
  category: 'grade_book' | 'medical' | 'other'
  storage_path: string
  file_size: number
  created_at: string
}
```

**Category selector:** Shown inline after file is selected (before upload starts). A simple `<select>` or three pill-buttons (grade_book / medical / other).

---

## Profile page integration

In `src/app/profile/page.tsx`:
1. Import `DocumentsSection`
2. Add `<DocumentsSection userId={user.id} />` after the Friends card and before the closing `</div>`
3. No new props or state needed in the page itself

---

## Files

| File | Change |
|------|--------|
| `supabase/migrations/018_storage.sql` | Create bucket, table, RLS policies |
| `src/components/profile/documents-section.tsx` | New component |
| `src/app/profile/page.tsx` | Import and render DocumentsSection |

---

## What Is NOT In Scope

- Forum file attachments (separate spec)
- Sharing documents with team leaders
- Image preview inline (view in new tab via signed URL is sufficient)
- Pagination (if user has many files — deferred)
- Virus scanning / content moderation
