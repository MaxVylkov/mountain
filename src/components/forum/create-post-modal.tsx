'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ForumCategory, PostType } from './forum-types'
import { X, MapPin, Search, Package, ChefHat, Dumbbell, Paperclip, ChevronDown, AlertCircle, Image as ImageIcon } from 'lucide-react'
import templates from '@/lib/data/ration-templates.json'

const WORKOUTS_SUMMARY = [
  { id: '1', title: 'Тренировка пальцев на хангборде' },
  { id: '2', title: 'Длинный бег в горах' },
  { id: '3', title: 'Интервальный бег' },
  { id: '4', title: 'Силовая на турнике' },
  { id: '5', title: 'Тренировка кора' },
  { id: '6', title: 'Тренировка ног' },
  { id: '7', title: 'Скалолазание на стенде' },
  { id: '8', title: 'Поход с рюкзаком' },
  { id: '9', title: 'Тренировка равновесия и проприоцепции' },
  { id: '10', title: 'Растяжка и восстановление' },
]

interface PreAttached {
  type: 'route'
  ref_id: string
  label: string
}

interface RouteResult {
  id: string
  name: string
  mountainName: string
}

interface Props {
  category: ForumCategory
  currentUserId: string
  preAttached?: PreAttached
  onClose: () => void
}

export function CreatePostModal({ category, currentUserId, preAttached, onClose }: Props) {
  const router = useRouter()
  const [type, setType] = useState<PostType>('thread')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Attachments accordion
  const [showAttachments, setShowAttachments] = useState(false)

  // Route picker state
  const [routeMode, setRouteMode] = useState<'search' | 'custom'>('search')
  const [routeQuery, setRouteQuery] = useState('')
  const [routeResults, setRouteResults] = useState<RouteResult[]>([])
  const [routeSearching, setRouteSearching] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<RouteResult | null>(null)
  const [routeNote, setRouteNote] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Packing set picker state
  const [packingSets, setPackingSets] = useState<{ id: string; name: string }[]>([])
  const [packingLoaded, setPackingLoaded] = useState(false)
  const [selectedPackingId, setSelectedPackingId] = useState<string | null>(null)

  // Ration and workout pickers
  const [selectedRationId, setSelectedRationId] = useState<string | null>(null)
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null)

  // File attachments
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Count of active attachments for badge
  const attachmentCount = [
    !preAttached && (selectedRoute || routeNote.trim()),
    selectedPackingId,
    selectedRationId,
    selectedWorkoutId,
  ].filter(Boolean).length + pendingFiles.length

  const searchRoutes = (q: string) => {
    setRouteQuery(q)
    setShowDropdown(true)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (q.length < 2) { setRouteResults([]); setRouteSearching(false); return }
    setRouteSearching(true)
    searchTimeout.current = setTimeout(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('routes')
        .select('id, name, mountain:mountains(name)')
        .ilike('name', `%${q}%`)
        .limit(8)
      setRouteResults((data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        mountainName: Array.isArray(r.mountain) ? r.mountain[0]?.name ?? '' : r.mountain?.name ?? '',
      })))
      setRouteSearching(false)
    }, 300)
  }

  const selectRoute = (route: RouteResult) => {
    setSelectedRoute(route)
    setRouteQuery(route.name)
    setShowDropdown(false)
  }

  const clearRoute = () => {
    setSelectedRoute(null)
    setRouteQuery('')
    setRouteNote('')
    setShowDropdown(false)
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = () => setShowDropdown(false)
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Escape key handler — close modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const loadPackingSets = async () => {
    if (packingLoaded) return
    const supabase = createClient()
    const { data } = await supabase.from('packing_sets').select('id, name').eq('user_id', currentUserId)
    setPackingSets(data ?? [])
    setPackingLoaded(true)
  }

  useEffect(() => {
    loadPackingSets()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const submit = async () => {
    if (!title.trim()) return
    setError(null)
    setSubmitting(true)
    try {
      const supabase = createClient()

      const insertData: Record<string, unknown> = {
        author_id: currentUserId,
        category,
        type,
        title: title.trim(),
        body: body.trim(),
      }
      if (!preAttached && routeMode === 'custom' && routeNote.trim()) {
        insertData.route_note = routeNote.trim()
      }
      if (selectedRationId) insertData.ration_template_id = selectedRationId

      const { data: post, error: insertError } = await supabase
        .from('forum_posts')
        .insert(insertData)
        .select('id')
        .single()

      if (insertError || !post) {
        setError(insertError?.message ?? 'Не удалось создать пост. Попробуйте ещё раз.')
        return
      }

      // Insert attachments
      const attachments: { post_id: string; type: string; ref_id: string; position: number }[] = []
      if (preAttached) {
        attachments.push({ post_id: post.id, type: preAttached.type, ref_id: preAttached.ref_id, position: 0 })
      } else if (routeMode === 'search' && selectedRoute) {
        attachments.push({ post_id: post.id, type: 'route', ref_id: selectedRoute.id, position: 0 })
      }
      if (selectedPackingId) attachments.push({ post_id: post.id, type: 'packing_set', ref_id: selectedPackingId, position: attachments.length })
      if (selectedWorkoutId) attachments.push({ post_id: post.id, type: 'workout', ref_id: selectedWorkoutId, position: attachments.length })
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
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-post-title"
        className="w-full max-w-lg bg-mountain-bg border border-mountain-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-mountain-border">
          <h2 id="create-post-title" className="font-semibold text-mountain-text">Новый пост</h2>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="text-mountain-muted hover:text-mountain-text transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-xl border border-mountain-border overflow-hidden">
            {(['thread', 'report'] as PostType[]).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                aria-pressed={type === t}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  type === t ? 'bg-mountain-primary text-white' : 'text-mountain-muted hover:text-mountain-text'
                }`}
              >
                {t === 'thread' ? 'Тред' : 'Отчёт'}
              </button>
            ))}
          </div>
          <p className="text-xs text-mountain-muted -mt-2">
            {type === 'thread' ? 'Вопрос или обсуждение с сообществом' : 'Рассказ о пройденном маршруте или восхождении'}
          </p>

          {/* Title */}
          <label htmlFor="post-title" className="sr-only">Заголовок поста</label>
          <input
            id="post-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Заголовок"
            className="w-full rounded-xl border border-mountain-border bg-mountain-bg px-4 py-2.5 text-mountain-text text-sm focus:outline-none focus:border-mountain-primary placeholder:text-mountain-muted"
          />

          {/* Body */}
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder={type === 'report' ? 'Markdown-текст отчёта...' : 'Текст обсуждения...'}
            rows={5}
            className="w-full rounded-xl border border-mountain-border bg-mountain-bg px-4 py-2.5 text-mountain-text text-sm resize-none focus:outline-none focus:border-mountain-primary placeholder:text-mountain-muted"
          />

          {/* Attachments accordion */}
          <div className="rounded-xl border border-mountain-border overflow-hidden">
            <button
              type="button"
              onClick={() => { setShowAttachments(v => !v); if (!packingLoaded) loadPackingSets() }}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-mountain-muted hover:text-mountain-text hover:bg-mountain-surface/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Paperclip className="w-3.5 h-3.5" />
                Прикрепить материалы
                {attachmentCount > 0 && (
                  <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-mountain-primary text-white">
                    {attachmentCount}
                  </span>
                )}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${showAttachments ? 'rotate-180' : ''}`} />
            </button>

            {showAttachments && (
              <div className="px-4 pb-4 space-y-4 border-t border-mountain-border/60 pt-3">

                {/* Route field */}
                {preAttached ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-mountain-surface border border-mountain-border text-sm">
                    <MapPin className="w-3.5 h-3.5 text-mountain-primary shrink-0" />
                    <span className="text-mountain-text">{preAttached.label}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-mountain-muted flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        Маршрут
                      </label>
                      <button
                        type="button"
                        onClick={() => { clearRoute(); setRouteMode(m => m === 'search' ? 'custom' : 'search') }}
                        className="text-xs text-mountain-primary hover:underline"
                      >
                        {routeMode === 'search' ? 'Нет в базе — ввести вручную' : 'Выбрать из базы'}
                      </button>
                    </div>

                    {routeMode === 'search' ? (
                      <div className="relative" onMouseDown={e => e.stopPropagation()}>
                        {selectedRoute ? (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-mountain-surface border border-mountain-primary/40 text-sm">
                            <span className="flex-1 text-mountain-text text-sm">{selectedRoute.mountainName} · {selectedRoute.name}</span>
                            <button onClick={clearRoute} className="text-mountain-muted hover:text-mountain-text">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="relative">
                              <label htmlFor="route-search" className="sr-only">Поиск маршрута</label>
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mountain-muted pointer-events-none" />
                              <input
                                id="route-search"
                                type="text"
                                value={routeQuery}
                                onChange={e => searchRoutes(e.target.value)}
                                onFocus={() => routeQuery.length >= 2 && setShowDropdown(true)}
                                placeholder="Поиск маршрута..."
                                className="w-full rounded-xl border border-mountain-border bg-mountain-bg pl-9 pr-4 py-2.5 text-mountain-text text-sm focus:outline-none focus:border-mountain-primary placeholder:text-mountain-muted"
                              />
                            </div>
                            {showDropdown && (routeResults.length > 0 || routeSearching) && (
                              <div className="absolute z-10 w-full mt-1 rounded-xl border border-mountain-border bg-mountain-bg shadow-lg overflow-hidden">
                                {routeSearching ? (
                                  <p className="px-4 py-3 text-xs text-mountain-muted">Поиск...</p>
                                ) : (
                                  routeResults.map(r => (
                                    <button
                                      key={r.id}
                                      onMouseDown={() => selectRoute(r)}
                                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-mountain-surface transition-colors"
                                    >
                                      <span className="text-mountain-text">{r.name}</span>
                                      {r.mountainName && <span className="text-mountain-muted text-xs ml-2">{r.mountainName}</span>}
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={routeNote}
                        onChange={e => setRouteNote(e.target.value)}
                        placeholder="Название маршрута..."
                        className="w-full rounded-xl border border-mountain-border bg-mountain-bg px-4 py-2.5 text-mountain-text text-sm focus:outline-none focus:border-mountain-primary placeholder:text-mountain-muted"
                      />
                    )}
                  </div>
                )}

                {/* Packing set picker */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-mountain-muted">
                    <Package className="w-3.5 h-3.5" />
                    Сборка снаряжения
                  </label>
                  {!packingLoaded ? (
                    <p className="text-xs text-mountain-muted">Загрузка...</p>
                  ) : packingSets.length > 0 ? (
                    <select
                      value={selectedPackingId ?? ''}
                      onChange={e => setSelectedPackingId(e.target.value || null)}
                      className="w-full rounded-xl border border-mountain-border bg-mountain-bg px-3 py-2 text-sm text-mountain-text focus:outline-none focus:border-mountain-primary"
                    >
                      <option value="">— Не прикреплять —</option>
                      {packingSets.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-mountain-muted">У вас пока нет сборок в кладовке</p>
                  )}
                </div>

                {/* Ration picker */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-mountain-muted">
                    <ChefHat className="w-3.5 h-3.5" />
                    Раскладка питания
                  </label>
                  <select
                    value={selectedRationId ?? ''}
                    onChange={e => setSelectedRationId(e.target.value || null)}
                    className="w-full rounded-xl border border-mountain-border bg-mountain-bg px-3 py-2 text-sm text-mountain-text focus:outline-none focus:border-mountain-primary"
                  >
                    <option value="">— Не прикреплять —</option>
                    {(templates as any[]).map(t => (
                      <option key={t.id} value={t.id}>{t.name} · {t.caloriesPerDay} ккал/день</option>
                    ))}
                  </select>
                </div>

                {/* Workout picker */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-mountain-muted">
                    <Dumbbell className="w-3.5 h-3.5" />
                    Тренировка
                  </label>
                  <select
                    value={selectedWorkoutId ?? ''}
                    onChange={e => setSelectedWorkoutId(e.target.value || null)}
                    className="w-full rounded-xl border border-mountain-border bg-mountain-bg px-3 py-2 text-sm text-mountain-text focus:outline-none focus:border-mountain-primary"
                  >
                    <option value="">— Не прикреплять —</option>
                    {WORKOUTS_SUMMARY.map(w => (
                      <option key={w.id} value={w.id}>{w.title}</option>
                    ))}
                  </select>
                </div>

                {/* File attachments */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-mountain-muted">
                    <ImageIcon className="w-3.5 h-3.5" />
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

              </div>
            )}
          </div>

          {/* Inline error */}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-mountain-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-mountain-border text-mountain-muted text-sm hover:text-mountain-text transition-colors">
            Отмена
          </button>
          <button
            onClick={submit}
            disabled={submitting || !title.trim()}
            className="px-4 py-2 rounded-xl bg-mountain-primary text-white text-sm font-medium hover:bg-mountain-primary/80 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Публикую...' : 'Опубликовать'}
          </button>
        </div>
      </div>
    </div>
  )
}
