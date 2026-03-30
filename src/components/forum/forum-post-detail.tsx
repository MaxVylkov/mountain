'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ForumPost, ForumReply, typeLabel, categoryLabel, formatRelativeTime } from './forum-types'
import { AttachmentRouteCard } from './attachment-route-card'
import { AttachmentPackingCard } from './attachment-packing-card'
import { AttachmentGearChips } from './attachment-gear-chips'
import { AttachmentRationCard } from './attachment-ration-card'
import { ForumReplyList } from './forum-reply-list'
import { ThumbsUp, ArrowLeft, MapPin, Pencil, X, Check, Package, ChefHat } from 'lucide-react'
import Link from 'next/link'
import templates from '@/lib/data/ration-templates.json'

interface RouteData { routeId: string; routeName: string; mountainName: string; difficulty: number | null; season: string | null }
interface PackingData { setId: string; setName: string; itemCount: number; totalWeightG: number; items: { gear_name: string; backpack_name: string | null }[] }
interface GearChip { gearId: string; gearName: string; category: string }

interface Props {
  post: ForumPost
  replies: ForumReply[]
  routeData: RouteData[]
  packingData: PackingData[]
  gearChips: GearChip[]
  currentUserId: string | null
}

export function ForumPostDetail({ post, replies, routeData, packingData, gearChips, currentUserId }: Props) {
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
    if (!currentUserId) { window.location.href = '/login'; return }
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
                post.type === 'thread' ? 'bg-blue-500/15 text-blue-400' : 'bg-emerald-500/15 text-emerald-400'
              }`}>
                {typeLabel(post.type)}
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
        {!editing && (routeData.length > 0 || packingData.length > 0 || gearChips.length > 0 || rationTemplateId) && (
          <div className="space-y-3 border-t border-mountain-border/40 pt-4">
            {routeData.map(r => (
              <AttachmentRouteCard key={r.routeId} data={r} currentUserId={currentUserId} />
            ))}
            {packingData.map(p => (
              <AttachmentPackingCard key={p.setId} data={p} currentUserId={currentUserId} />
            ))}
            <AttachmentGearChips chips={gearChips} />
            {rationTemplateId && <AttachmentRationCard templateId={rationTemplateId} />}
          </div>
        )}
      </div>

      <ForumReplyList replies={replies} postId={post.id} currentUserId={currentUserId} />
    </div>
  )
}
