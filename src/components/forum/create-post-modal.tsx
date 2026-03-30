'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ForumCategory, PostType } from './forum-types'
import { X, MapPin, Search, Package } from 'lucide-react'

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

  // Load packing sets on mount
  useEffect(() => {
    loadPackingSets()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = async () => {
    if (!title.trim()) return
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

      const { data: post, error } = await supabase
        .from('forum_posts')
        .insert(insertData)
        .select('id')
        .single()

      if (error || !post) {
        alert('Ошибка: ' + (error?.message ?? 'Не удалось создать пост'))
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
      if (attachments.length > 0) await supabase.from('forum_attachments').insert(attachments)

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
          <p className="text-xs text-mountain-muted">
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
          <div className="space-y-2">
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
