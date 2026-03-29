'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ForumReply, formatRelativeTime } from './forum-types'
import { ThumbsUp, Send } from 'lucide-react'

interface Props {
  replies: ForumReply[]
  postId: string
  currentUserId: string | null
}

export function ForumReplyList({ replies: initialReplies, postId, currentUserId }: Props) {
  const [replies, setReplies] = useState(initialReplies)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

  const toggleLike = async (replyId: string, liked: boolean) => {
    if (!currentUserId) { window.location.href = '/login'; return }
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

      {replies.map(reply => (
        <div key={reply.id} className="glass-card p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-mountain-text">{reply.author?.display_name ?? 'Участник'}</span>
            <span className="text-xs text-mountain-muted">{formatRelativeTime(reply.created_at)}</span>
          </div>
          <p className="text-sm text-mountain-text leading-relaxed whitespace-pre-wrap">{reply.body}</p>
          <button
            onClick={() => toggleLike(reply.id, reply.liked_by_me)}
            className={`flex items-center gap-1 text-xs transition-colors ${
              reply.liked_by_me ? 'text-mountain-primary' : 'text-mountain-muted hover:text-mountain-text'
            }`}
          >
            <ThumbsUp className="w-3 h-3" />
            {reply.like_count}
          </button>
        </div>
      ))}

      {/* Reply form */}
      {currentUserId ? (
        <div className="flex gap-2">
          <textarea
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
