# Profile Documents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a private document storage section to the user profile — users can upload, download, and delete personal documents (grade books, medical certificates, any files up to 10 MB).

**Architecture:** Supabase Storage bucket `user-documents` (private) + DB table `user_documents` with RLS. A new `DocumentsSection` React client component fetches and renders documents using the user's authenticated Supabase session. The component is embedded in the existing profile page.

**Tech Stack:** Next.js App Router, TypeScript, Supabase JS client (browser), Tailwind CSS with `mountain-*` design tokens, `lucide-react` icons.

---

## File Map

| File | Action |
|------|--------|
| `supabase/migrations/019_user_documents.sql` | Create (new migration) |
| `src/components/profile/documents-section.tsx` | Create (new component) |
| `src/app/profile/page.tsx` | Modify (import + render DocumentsSection) |

---

### Task 1: Database migration

**Files:**
- Create: `supabase/migrations/019_user_documents.sql`

**Context:** The project has a pre-existing `005_*` numbering collision (two files named `005_*.sql`). Migrations are applied manually — not via `supabase db push` auto-runner. The latest migration is `018_team_telegram_link.sql`.

- [ ] **Step 1: Create the migration file**

`supabase/migrations/019_user_documents.sql`:

```sql
-- Bucket for private user documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('user-documents', 'user-documents', false, 10485760, NULL);

-- Storage RLS: users can only access files in their own folder (path starts with their user_id)
CREATE POLICY "Users upload own documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user-documents'
    AND name LIKE (auth.uid()::text || '/%')
  );

CREATE POLICY "Users read own documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'user-documents'
    AND name LIKE (auth.uid()::text || '/%')
  );

CREATE POLICY "Users delete own documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'user-documents'
    AND name LIKE (auth.uid()::text || '/%')
  );

-- Table: metadata for uploaded documents
-- Note: profiles.id = auth.uid() — confirmed by existing profile queries
CREATE TABLE user_documents (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name    text NOT NULL,
  category     text NOT NULL CHECK (category IN ('grade_book', 'medical', 'other')),
  storage_path text NOT NULL UNIQUE,
  file_size    bigint NOT NULL,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own documents"
  ON user_documents FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

- [ ] **Step 2: Apply the migration to Supabase**

Apply manually via the Supabase SQL editor or CLI:
```bash
supabase db push
# or paste the SQL directly in Supabase dashboard → SQL editor
```

Verify: the `user-documents` bucket and `user_documents` table appear in the Supabase dashboard.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/019_user_documents.sql
git commit -m "feat(storage): add user-documents bucket and user_documents table with RLS"
```

---

### Task 2: DocumentsSection component

**Files:**
- Create: `src/components/profile/documents-section.tsx`

**Context:** This is a new directory (`src/components/profile/`). The profile page uses Tailwind classes with `mountain-*` design tokens. Supabase client is imported from `@/lib/supabase/client`. `createClient()` is called inside handlers (not at module level). All Supabase storage operations use the authenticated browser session — RLS enforces ownership.

The component:
- Fetches `user_documents` for the current user on mount
- Manages file selection (pick → category → confirm)
- Uploads to `user-documents` bucket, then inserts a row into `user_documents`
- Renders documents as rows with download and delete actions
- Uses inline confirm for delete

**Category labels:**
| value | Label |
|-------|-------|
| `grade_book` | Разрядная / значкистская книжка |
| `medical` | Медицинская справка |
| `other` | Другое |

- [ ] **Step 1: Create the component file**

`src/components/profile/documents-section.tsx`:

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { FileText, Download, Trash2, Upload } from 'lucide-react'

type Category = 'grade_book' | 'medical' | 'other'

const CATEGORY_LABELS: Record<Category, string> = {
  grade_book: 'Разрядная / значкистская книжка',
  medical: 'Медицинская справка',
  other: 'Другое',
}

interface UserDocument {
  id: string
  file_name: string
  category: Category
  storage_path: string
  file_size: number
  created_at: string
}

interface Props {
  userId: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric', year: 'numeric' })
}

export function DocumentsSection({ userId }: Props) {
  const [documents, setDocuments] = useState<UserDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingCategory, setPendingCategory] = useState<Category>('other')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('user_documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setDocuments((data as UserDocument[]) ?? [])
        setIsLoading(false)
      })
  }, [userId])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Файл превышает 10 МБ')
      e.target.value = ''
      return
    }
    setUploadError(null)
    setPendingFile(file)
    setPendingCategory('other')
  }

  async function handleConfirmUpload() {
    if (!pendingFile) return
    setIsUploading(true)
    setUploadError(null)
    try {
      const supabase = createClient()
      const sanitized = pendingFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${userId}/${Date.now()}_${sanitized}`

      const { error: storageError } = await supabase.storage
        .from('user-documents')
        .upload(path, pendingFile)

      if (storageError) {
        setUploadError('Не удалось загрузить файл')
        return
      }

      const { data: newDoc, error: dbError } = await supabase
        .from('user_documents')
        .insert({
          user_id: userId,
          file_name: pendingFile.name,
          category: pendingCategory,
          storage_path: path,
          file_size: pendingFile.size,
        })
        .select('*')
        .single()

      if (dbError || !newDoc) {
        // Clean up orphaned file
        await supabase.storage.from('user-documents').remove([path])
        setUploadError('Не удалось сохранить файл')
        return
      }

      setDocuments(prev => [newDoc as UserDocument, ...prev])
      setPendingFile(null)
      setPendingCategory('other')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } finally {
      setIsUploading(false)
    }
  }

  async function handleDownload(doc: UserDocument) {
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from('user-documents')
      .createSignedUrl(doc.storage_path, 60)
    if (!error && data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
    }
  }

  async function handleDelete(doc: UserDocument) {
    const supabase = createClient()
    await supabase.from('user_documents').delete().eq('id', doc.id)
    await supabase.storage.from('user-documents').remove([doc.storage_path])
    setDocuments(prev => prev.filter(d => d.id !== doc.id))
    setConfirmDeleteId(null)
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-mountain-primary" />
          <h2 className="font-semibold">Мои документы</h2>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-1.5 text-xs text-mountain-primary hover:text-mountain-primary/80 transition-colors disabled:opacity-50"
        >
          <Upload size={13} />
          Загрузить документ
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {isLoading && (
        <div className="h-10 rounded-lg bg-mountain-surface animate-pulse" />
      )}

      {!isLoading && documents.length === 0 && !pendingFile && (
        <p className="text-sm text-mountain-muted">
          Загрузите справки, разрядные книжки и другие документы.
        </p>
      )}

      {/* Pending file: category selector */}
      {pendingFile && (
        <div className="space-y-2 rounded-xl border border-mountain-border bg-mountain-surface/40 p-3">
          <p className="text-sm font-medium text-mountain-text truncate">{pendingFile.name}</p>
          <p className="text-xs text-mountain-muted">{formatBytes(pendingFile.size)}</p>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(CATEGORY_LABELS) as [Category, string][]).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setPendingCategory(value)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  pendingCategory === value
                    ? 'bg-mountain-primary/20 text-mountain-primary border-mountain-primary/40'
                    : 'border-mountain-border text-mountain-muted hover:text-mountain-text'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleConfirmUpload}
              disabled={isUploading}
              className="text-xs px-3 py-1.5 rounded-lg bg-mountain-primary text-white hover:bg-mountain-primary/80 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {isUploading && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              Подтвердить загрузку
            </button>
            <button
              onClick={() => { setPendingFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
              disabled={isUploading}
              className="text-xs text-mountain-muted hover:text-mountain-text transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {uploadError && (
        <p className="text-xs text-mountain-danger">{uploadError}</p>
      )}

      {/* Document list */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map(doc => (
            <div key={doc.id} className="flex items-start justify-between gap-3 py-2 border-t border-mountain-border/60 first:border-t-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-mountain-text truncate">{doc.file_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-mountain-primary/15 text-mountain-primary">
                    {CATEGORY_LABELS[doc.category]}
                  </span>
                  <span className="text-xs text-mountain-muted">{formatBytes(doc.file_size)}</span>
                  <span className="text-xs text-mountain-muted">{formatDate(doc.created_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDownload(doc)}
                  className="text-mountain-muted hover:text-mountain-primary transition-colors"
                  aria-label="Скачать"
                >
                  <Download size={14} />
                </button>
                {confirmDeleteId === doc.id ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-mountain-muted">Удалить?</span>
                    <button
                      onClick={() => handleDelete(doc)}
                      className="text-mountain-danger hover:underline font-medium"
                    >Да</button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-mountain-muted hover:text-mountain-text"
                    >Отмена</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(doc.id)}
                    className="text-mountain-muted hover:text-mountain-danger transition-colors"
                    aria-label="Удалить"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors in `documents-section.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/profile/documents-section.tsx
git commit -m "feat(profile): add DocumentsSection component"
```

---

### Task 3: Integrate DocumentsSection into profile page

**Files:**
- Modify: `src/app/profile/page.tsx`

**Context:** The profile page is at `src/app/profile/page.tsx`. It fetches `user` via `supabase.auth.getUser()`. The `user.id` is `auth.uid()` — same as `profiles.id`. The DocumentsSection goes after the Friends card, before the closing `</div>` of the main container.

Current structure of the return JSX (bottom):
```tsx
      {/* Friends */}
      <Card className="space-y-3">
        ...
      </Card>

    </div>   ← this is the closing div of the max-w-2xl container
  )
}
```

- [ ] **Step 1: Add import at top of file**

In `src/app/profile/page.tsx`, after the existing imports, add:
```tsx
import { DocumentsSection } from '@/components/profile/documents-section'
```

- [ ] **Step 2: Render DocumentsSection after the Friends card**

In `src/app/profile/page.tsx`, after the Friends `<Card>` closing tag and before the closing `</div>`:

```tsx
      <DocumentsSection userId={user.id} />
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Manual verification**

```bash
npm run dev
```

Navigate to `/profile` while logged in. Verify:
- «Мои документы» card appears below Friends
- Loading skeleton shows briefly then disappears
- «Загрузить документ» button opens file picker
- After selecting a file: category pills appear, «Подтвердить загрузку» button visible
- After confirming: file appears in list with name, category badge, size, date
- Download icon opens signed URL in new tab
- Delete icon → inline confirm → removes from list
- Files > 10 MB: error «Файл превышает 10 МБ» shown inline

- [ ] **Step 5: Commit**

```bash
git add src/app/profile/page.tsx
git commit -m "feat(profile): integrate DocumentsSection into profile page"
```
