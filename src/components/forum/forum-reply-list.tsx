'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ForumReply, formatRelativeTime } from './forum-types'
import { ThumbsUp, Send, Pencil, Trash2, Check, X } from 'lucide-react'

interface Props {
  replies: ForumReply[]
  postId: string
  currentUserId: string | null
}

export function ForumReplyList({ replies: initialReplies, postId, currentUserId }: Props) {
  const router = useRouter()
  const [replies, setReplies] = useState(initialReplies)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null)

  const submit = async () => {
    if (!body.trim() || !currentUserId) return
    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('forum_replies')
        .insert({ post_id: postId, author_id: currentUserId, body: body.trim() })
        .select('*, author:profiles(display_name)')
        .single()
      if (data) {
        setReplies(prev => [...prev, {
          ...data,
          author: Array.isArray(data.author) ? data.author[0] : data.author,
          like_count: 0,
          liked_by_me: false,
        }])
        setBody('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (reply: ForumReply) => {
    setEditingReplyId(reply.id)
    setEditBody(reply.body)
  }

  const saveEdit = async (replyId: string) => {
    if (!editBody.trim() || !currentUserId) return
    const supabase = createClient()
    const { error } = await supabase
      .from('forum_replies')
      .update({ body: editBody.trim() })
      .eq('id', replyId)
      .eq('author_id', currentUserId)
    if (!error) {
      setReplies(prev => prev.map(r => r.id === replyId ? { ...r, body: editBody.trim() } : r))
      setEditingReplyId(null)
    }
  }

  const deleteReply = async (replyId: string) => {
    if (!currentUserId) return
    const supabase = createClient()
    const { error } = await supabase
      .from('forum_replies')
      .delete()
      .eq('id', replyId)
      .eq('author_id', currentUserId)
    if (!error) {
      setReplies(prev => prev.filter(r => r.id !== replyId))
      setDeletingReplyId(null)
    }
  }

  const toggleLike = async (replyId: string, liked: boolean) => {
    if (!currentUserId) { router.push('/login'); return }
    // Optimistic update
    setReplies(prev => prev.map(r =>
      r.id === replyId
        ? { ...r, liked_by_me: !liked, like_count: r.like_count + (liked ? -1 : 1) }
        : r
    ))
    try {
      const supabase = createClient()
      if (liked) {
        await supabase.from('forum_likes').delete().eq('user_id', currentUserId).eq('reply_id', replyId)
      } else {
        await supabase.from('forum_likes').insert({ user_id: currentUserId, reply_id: replyId })
      }
    } catch {
      // Revert on error
      setReplies(prev => prev.map(r =>
        r.id === replyId
          ? { ...r, liked_by_me: liked, like_count: r.like_count + (liked ? 1 : -1) }
          : r
      ))
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-mountain-muted uppercase tracking-wide">
        Комментарии ({replies.length})
      </h3>

      {replies.map(reply => {
        const isOwn = !!(currentUserId && currentUserId === reply.author_id)
        const isEditing = editingReplyId === reply.id
        const isDeleting = deletingReplyId === reply.id

        return (
          <div key={reply.id} className="surface-card p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-mountain-text">{reply.author?.display_name ?? 'Участник'}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-mountain-muted">{formatRelativeTime(reply.created_at)}</span>
                {isOwn && !isEditing && !isDeleting && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(reply)}
                      aria-label="Редактировать"
                      className="text-mountain-muted hover:text-mountain-text transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setDeletingReplyId(reply.id)}
                      aria-label="Удалить"
                      className="text-mountain-muted hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editBody}
                  onChange={e => setEditBody(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-mountain-border bg-mountain-bg px-3 py-2 text-sm text-mountain-text resize-none focus:outline-none focus:border-mountain-primary"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(reply.id)}
                    disabled={!editBody.trim()}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-mountain-primary text-white text-xs font-medium hover:bg-mountain-primary/80 disabled:opacity-50 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    Сохранить
                  </button>
                  <button
                    onClick={() => setEditingReplyId(null)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-mountain-border text-mountain-muted text-xs hover:text-mountain-text transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Отмена
                  </button>
                </div>
              </div>
            ) : isDeleting ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-mountain-muted text-xs">Удалить этот комментарий?</span>
                <button
                  onClick={() => deleteReply(reply.id)}
                  className="px-2 py-1 rounded-lg bg-red-500/15 text-red-400 text-xs hover:bg-red-500/25 transition-colors"
                >
                  Удалить
                </button>
                <button
                  onClick={() => setDeletingReplyId(null)}
                  className="px-2 py-1 rounded-lg border border-mountain-border text-mountain-muted text-xs hover:text-mountain-text transition-colors"
                >
                  Отмена
                </button>
              </div>
            ) : (
              <p className="text-sm text-mountain-text leading-relaxed whitespace-pre-wrap">{reply.body}</p>
            )}

            {!isEditing && !isDeleting && (
              <button
                onClick={() => toggleLike(reply.id, reply.liked_by_me)}
                aria-label={reply.liked_by_me ? 'Убрать лайк' : 'Поставить лайк'}
                aria-pressed={reply.liked_by_me}
                className={`flex items-center gap-1 text-xs transition-colors ${
                  reply.liked_by_me ? 'text-mountain-primary' : 'text-mountain-muted hover:text-mountain-text'
                }`}
              >
                <ThumbsUp className="w-3 h-3" />
                {reply.like_count}
              </button>
            )}
          </div>
        )
      })}

      {/* Reply form */}
      {currentUserId ? (
        <div className="flex gap-2">
          <label htmlFor="reply-body" className="sr-only">Написать комментарий</label>
          <textarea
            id="reply-body"
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Написать комментарий..."
            rows={2}
            className="flex-1 rounded-xl border border-mountain-border bg-mountain-bg px-3 py-2 text-sm text-mountain-text resize-none focus:outline-none focus:border-mountain-primary placeholder:text-mountain-muted"
          />
          <button
            onClick={submit}
            disabled={submitting || !body.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-mountain-primary text-white text-sm font-medium hover:bg-mountain-primary/80 disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <p className="text-xs text-mountain-muted text-center py-3">
          <a href="/login" className="text-mountain-primary hover:underline">Войдите</a>, чтобы оставить комментарий
        </p>
      )}
    </div>
  )
}
