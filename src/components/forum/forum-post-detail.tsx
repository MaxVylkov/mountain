'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ForumPost, ForumReply, typeLabel, categoryLabel, formatRelativeTime } from './forum-types'
import { AttachmentRouteCard } from './attachment-route-card'
import { AttachmentPackingCard } from './attachment-packing-card'
import { AttachmentGearChips } from './attachment-gear-chips'
import { AttachmentRationCard } from './attachment-ration-card'
import { AttachmentWorkoutCard } from './attachment-workout-card'
import { ForumReplyList } from './forum-reply-list'
import { ThumbsUp, ArrowLeft, MapPin, Pencil, X, Check, Package, ChefHat, File, Download } from 'lucide-react'
import Link from 'next/link'
import templates from '@/lib/data/ration-templates.json'
import { storageUrl } from '@/lib/storage-url'

interface RouteData { routeId: string; routeName: string; mountainName: string; difficulty: number | null; season: string | null }
interface PackingData { setId: string; setName: string; itemCount: number; totalWeightG: number; items: { gear_name: string; backpack_name: string | null }[] }
interface GearChip { gearId: string; gearName: string; category: string }

interface Props {
  post: ForumPost
  replies: ForumReply[]
  routeData: RouteData[]
  packingData: PackingData[]
  gearChips: GearChip[]
  workoutIds: string[]
  currentUserId: string | null
  fileAttachments: { id: string; file_name: string; storage_path: string; mime_type: string; file_size: number }[]
}

export function ForumPostDetail({ post, replies, routeData, packingData, gearChips, workoutIds, currentUserId, fileAttachments }: Props) {
  const router = useRouter()
  const [liked, setLiked] = useState(post.liked_by_me ?? false)
  const [likeCount, setLikeCount] = useState(post.like_count ?? 0)

  // View state (updated on save)
  const [title, setTitle] = useState(post.title)
  const [body, setBody] = useState(post.body ?? '')
  const [rationTemplateId, setRationTemplateId] = useState(post.ration_template_id ?? null)

  // Edit state
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(post.title)
  const [editBody, setEditBody] = useState(post.body ?? '')
  const [saving, setSaving] = useState(false)

  // Attachment edit state
  const [packingSets, setPackingSets] = useState<{ id: string; name: string }[]>([])
  const [packingSetsLoaded, setPackingSetsLoaded] = useState(false)
  const [editPackingId, setEditPackingId] = useState<string | null>(null)
  const [editRationId, setEditRationId] = useState<string | null>(null)

  const isAuthor = !!(currentUserId && currentUserId === post.author_id)
  const [localFileAttachments, setLocalFileAttachments] = useState(fileAttachments)

  const enterEditMode = async () => {
    setEditTitle(title)
    setEditBody(body)
    setEditRationId(rationTemplateId)

    if (currentUserId && !packingSetsLoaded) {
      const supabase = createClient()
      const { data } = await supabase.from('packing_sets').select('id, name').eq('user_id', currentUserId)
      setPackingSets(data ?? [])
      setPackingSetsLoaded(true)

      // Pre-select current packing attachment
      const { data: atts } = await supabase
        .from('forum_attachments')
        .select('ref_id')
        .eq('post_id', post.id)
        .eq('type', 'packing_set')
        .maybeSingle()
      setEditPackingId(atts?.ref_id ?? null)
    }

    setEditing(true)
  }

  const cancelEdit = () => {
    setEditTitle(title)
    setEditBody(body)
    setEditing(false)
  }

  async function handleDeleteFile(fileId: string, storagePath: string) {
    const supabase = createClient()
    const { error: dbError } = await supabase.from('forum_file_attachments').delete().eq('id', fileId)
    if (dbError) return
    await supabase.storage.from('forum-attachments').remove([storagePath])
    setLocalFileAttachments(prev => prev.filter(f => f.id !== fileId))
  }

  const saveEdit = async () => {
    const t = editTitle.trim()
    const b = editBody.trim()
    if (!t) return
    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('forum_posts')
      .update({ title: t, body: b, ration_template_id: editRationId ?? null, updated_at: new Date().toISOString() })
      .eq('id', post.id)

    if (error) { setSaving(false); return }

    // Update packing set attachment: delete existing, insert new if selected
    await supabase.from('forum_attachments').delete().eq('post_id', post.id).eq('type', 'packing_set')
    if (editPackingId) {
      await supabase.from('forum_attachments').insert({ post_id: post.id, type: 'packing_set', ref_id: editPackingId, position: 10 })
    }

    setTitle(t)
    setBody(b)
    setRationTemplateId(editRationId)
    setSaving(false)
    setEditing(false)
  }

  const toggleLike = async () => {
    if (!currentUserId) { router.push('/login'); return }
    const supabase = createClient()
    if (liked) {
      await supabase.from('forum_likes').delete().eq('user_id', currentUserId).eq('post_id', post.id)
      setLikeCount(c => c - 1)
    } else {
      await supabase.from('forum_likes').insert({ user_id: currentUserId, post_id: post.id })
      setLikeCount(c => c + 1)
    }
    setLiked(v => !v)
  }

  return (
    <div className="space-y-6">
      <Link href={`/forum/${post.category}`} className="inline-flex items-center gap-2 text-sm text-mountain-muted hover:text-mountain-text transition-colors">
        <ArrowLeft className="w-4 h-4" />
        {categoryLabel(post.category)}
      </Link>

      <div className="surface-card p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                post.type === 'thread' ? 'bg-mountain-primary/15 text-mountain-primary' : 'bg-mountain-success/15 text-mountain-success'
              }`}>
                {post.type === 'thread' ? 'Обсуждение' : 'Отчёт'}
              </span>
            </div>

            {editing ? (
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="w-full text-xl font-bold bg-mountain-surface border border-mountain-border rounded-lg px-3 py-2 text-mountain-text focus:outline-none focus:border-mountain-primary"
              />
            ) : (
              <h1 className="text-xl font-bold text-mountain-text">{title}</h1>
            )}

            <p className="text-xs text-mountain-muted">
              {post.author?.display_name ?? 'Участник'} · {formatRelativeTime(post.created_at)}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAuthor && !editing && (
              <button
                onClick={enterEditMode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-mountain-border text-sm text-mountain-muted hover:text-mountain-text hover:border-mountain-primary transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Изменить
              </button>
            )}
            {editing && (
              <>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-mountain-primary text-white text-sm disabled:opacity-50 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  {saving ? 'Сохраняю...' : 'Сохранить'}
                </button>
                <button
                  onClick={cancelEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-mountain-border text-sm text-mountain-muted hover:text-mountain-text transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            <button
              onClick={toggleLike}
              aria-label={liked ? 'Убрать лайк' : 'Поставить лайк'}
              aria-pressed={liked}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                liked
                  ? 'border-mountain-primary text-mountain-primary'
                  : 'border-mountain-border text-mountain-muted hover:border-mountain-primary hover:text-mountain-text'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              {likeCount}
            </button>
          </div>
        </div>

        {/* Route note */}
        {post.route_note && routeData.length === 0 && (
          <div className="flex items-center gap-1.5 text-xs text-mountain-muted border-t border-mountain-border/40 pt-3">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>Маршрут: {post.route_note}</span>
          </div>
        )}

        {/* Body */}
        {editing ? (
          <textarea
            value={editBody}
            onChange={e => setEditBody(e.target.value)}
            rows={6}
            className="w-full bg-mountain-surface border border-mountain-border rounded-lg px-3 py-2 text-sm text-mountain-text focus:outline-none focus:border-mountain-primary resize-none"
            placeholder="Текст поста..."
          />
        ) : (
          body && (
            <div className="text-sm text-mountain-text leading-relaxed whitespace-pre-wrap border-t border-mountain-border/40 pt-4">
              {body}
            </div>
          )
        )}

        {/* Edit: attachment pickers */}
        {editing && (
          <div className="space-y-4 border-t border-mountain-border/40 pt-4">
            {/* Packing set picker */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-medium text-mountain-muted">
                <Package className="w-3.5 h-3.5" />
                Набор снаряжения
              </label>
              {packingSets.length > 0 ? (
                <select
                  value={editPackingId ?? ''}
                  onChange={e => setEditPackingId(e.target.value || null)}
                  className="w-full rounded-xl border border-mountain-border bg-mountain-surface px-3 py-2 text-sm text-mountain-text focus:outline-none focus:border-mountain-primary"
                >
                  <option value="">— Не прикреплять —</option>
                  {packingSets.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-mountain-muted">У вас нет сборок в кладовке</p>
              )}
            </div>

            {/* Ration template picker */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-medium text-mountain-muted">
                <ChefHat className="w-3.5 h-3.5" />
                Раскладка питания
              </label>
              <select
                value={editRationId ?? ''}
                onChange={e => setEditRationId(e.target.value || null)}
                className="w-full rounded-xl border border-mountain-border bg-mountain-surface px-3 py-2 text-sm text-mountain-text focus:outline-none focus:border-mountain-primary"
              >
                <option value="">— Не прикреплять —</option>
                {(templates as any[]).map(t => (
                  <option key={t.id} value={t.id}>{t.name} · {t.caloriesPerDay} ккал/день</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* View: attachments */}
        {!editing && (localFileAttachments.length > 0 || routeData.length > 0 || packingData.length > 0 || gearChips.length > 0 || rationTemplateId || workoutIds.length > 0) && (
          <div className="space-y-3 border-t border-mountain-border/40 pt-4">
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
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center transition-opacity"
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

            {routeData.map(r => (
              <AttachmentRouteCard key={r.routeId} data={r} currentUserId={currentUserId} />
            ))}
            {packingData.map(p => (
              <AttachmentPackingCard key={p.setId} data={p} currentUserId={currentUserId} />
            ))}
            <AttachmentGearChips chips={gearChips} />
            {rationTemplateId && <AttachmentRationCard templateId={rationTemplateId} />}
            {workoutIds.map(wId => (
              <AttachmentWorkoutCard key={wId} workoutId={wId} />
            ))}
          </div>
        )}
      </div>

      <ForumReplyList replies={replies} postId={post.id} currentUserId={currentUserId} />
    </div>
  )
}
