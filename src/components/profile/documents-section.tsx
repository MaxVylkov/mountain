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
    async function fetchDocs() {
      const { data, error } = await supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) {
        setUploadError('Не удалось загрузить список документов')
      } else {
        setDocuments((data as UserDocument[]) ?? [])
      }
      setIsLoading(false)
    }
    fetchDocs()
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
    if (error || !data?.signedUrl) {
      setUploadError('Не удалось получить ссылку для скачивания')
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  async function handleDelete(doc: UserDocument) {
    const supabase = createClient()
    const { error: dbError } = await supabase.from('user_documents').delete().eq('id', doc.id)
    if (dbError) {
      setUploadError('Не удалось удалить документ')
      setConfirmDeleteId(null)
      return
    }
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
          accept="*/*"
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
                    {CATEGORY_LABELS[doc.category] ?? doc.category}
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
