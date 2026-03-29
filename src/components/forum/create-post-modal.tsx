'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ForumCategory, PostType } from './forum-types'
import { X } from 'lucide-react'

interface PreAttached {
  type: 'route'
  ref_id: string
  label: string
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

  // Packing set picker state
  const [packingSets, setPackingSets] = useState<{ id: string; name: string }[]>([])
  const [packingLoaded, setPackingLoaded] = useState(false)
  const [selectedPackingId, setSelectedPackingId] = useState<string | null>(null)

  const loadPackingSets = async () => {
    if (packingLoaded) return
    const supabase = createClient()
    const { data } = await supabase.from('packing_sets').select('id, name').eq('user_id', currentUserId)
    setPackingSets(data ?? [])
    setPackingLoaded(true)
  }

  const submit = async () => {
    if (!title.trim()) return
    setSubmitting(true)
    try {
      const supabase = createClient()

      const { data: post, error } = await supabase
        .from('forum_posts')
        .insert({ author_id: currentUserId, category, type, title: title.trim(), body: body.trim() })
        .select('id')
        .single()

      if (error || !post) {
        alert('Ошибка: ' + (error?.message ?? 'Не удалось создать пост'))
        return
      }

      // Insert attachments
      const attachments: { post_id: string; type: string; ref_id: string; position: number }[] = []
      if (preAttached) attachments.push({ post_id: post.id, type: preAttached.type, ref_id: preAttached.ref_id, position: 0 })
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
      <div className="w-full max-w-lg bg-mountain-bg border border-mountain-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-mountain-border">
          <h2 className="font-semibold text-mountain-text">Новый пост</h2>
          <button onClick={onClose} className="text-mountain-muted hover:text-mountain-text transition-colors">
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
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  type === t ? 'bg-mountain-primary text-white' : 'text-mountain-muted hover:text-mountain-text'
                }`}
              >
                {t === 'thread' ? 'Тред' : 'Отчёт'}
              </button>
            ))}
          </div>

          {/* Title */}
          <input
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
            rows={6}
            className="w-full rounded-xl border border-mountain-border bg-mountain-bg px-4 py-2.5 text-mountain-text text-sm resize-none focus:outline-none focus:border-mountain-primary placeholder:text-mountain-muted"
          />

          {/* Pre-attached route */}
          {preAttached && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-mountain-surface border border-mountain-border text-sm">
              <span className="text-mountain-muted text-xs">Маршрут:</span>
              <span className="text-mountain-text">{preAttached.label}</span>
            </div>
          )}

          {/* Packing set picker */}
          <div>
            <button
              onClick={loadPackingSets}
              className="text-xs text-mountain-primary hover:underline"
            >
              + Прикрепить сборку снаряжения
            </button>
            {packingLoaded && packingSets.length > 0 && (
              <select
                value={selectedPackingId ?? ''}
                onChange={e => setSelectedPackingId(e.target.value || null)}
                className="mt-2 w-full rounded-xl border border-mountain-border bg-mountain-bg px-3 py-2 text-sm text-mountain-text focus:outline-none focus:border-mountain-primary"
              >
                <option value="">— Не прикреплять —</option>
                {packingSets.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
            {packingLoaded && packingSets.length === 0 && (
              <p className="mt-1 text-xs text-mountain-muted">У вас пока нет сборок в кладовке</p>
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
