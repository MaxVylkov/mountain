'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageCircle, Send } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { CommentCard } from './comment-card'

const TAG_COLORS: Record<string, string> = {
  'впечатление':             'bg-sky-500/15 text-sky-600 border-sky-500/30',
  'описание':                'bg-mountain-success/15 text-mountain-success border-mountain-success/30',
  'альтернативное_описание': 'bg-mountain-accent/15 text-mountain-accent border-mountain-accent/30',
  'снаряжение':              'bg-purple-600/15 text-purple-600 border-purple-600/30',
}

const AVAILABLE_TAGS = ['впечатление', 'описание', 'альтернативное_описание', 'снаряжение'] as const

const TAG_DISPLAY: Record<string, string> = {
  'впечатление': '#впечатление',
  'описание': '#описание',
  'альтернативное_описание': '#альтернативное',
  'снаряжение': '#снаряжение',
}

const FILTER_TAGS = [
  { key: null as string | null, label: 'Все' },
  { key: 'впечатление', label: '#впечатление' },
  { key: 'описание', label: '#описание' },
  { key: 'альтернативное_описание', label: '#альтернативное_описание' },
  { key: 'снаряжение', label: '#снаряжение' },
]

interface CommentWithProfile {
  id: string
  text: string
  tags: string[]
  created_at: string
  user_id: string
  route_id: string
  profile: { display_name: string }
}

interface Like {
  comment_id: string
  user_id: string
  value: number
}

interface RouteCommentsProps {
  routeId: string
  currentUserId: string | null
}

export function RouteComments({ routeId, currentUserId }: RouteCommentsProps) {
  const [comments, setComments] = useState<CommentWithProfile[]>([])
  const [likesMap, setLikesMap] = useState<Record<string, Like[]>>({})
  const [guruScores, setGuruScores] = useState<Record<string, number>>({})
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [newText, setNewText] = useState('')
  const [newTags, setNewTags] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [adoptedId, setAdoptedId] = useState<string | null>(null)

  const loadComments = useCallback(async () => {
    const supabase = createClient()

    const { data } = await supabase
      .from('route_comments')
      .select('*, profile:profiles(display_name)')
      .eq('route_id', routeId)
      .order('created_at', { ascending: false })

    if (!data || data.length === 0) {
      setComments([])
      setLikesMap({})
      setGuruScores({})
      return
    }

    setComments(data as CommentWithProfile[])

    const commentIds = data.map((c) => c.id)

    const { data: allLikes } = await supabase
      .from('comment_likes')
      .select('*')
      .in('comment_id', commentIds)

    const grouped: Record<string, Like[]> = {}
    for (const id of commentIds) {
      grouped[id] = []
    }
    if (allLikes) {
      for (const like of allLikes) {
        if (!grouped[like.comment_id]) grouped[like.comment_id] = []
        grouped[like.comment_id].push(like)
      }
    }
    setLikesMap(grouped)

    const { data: adoptions } = await supabase
      .from('adopted_descriptions')
      .select('author_id')

    const scores: Record<string, number> = {}
    if (adoptions) {
      for (const a of adoptions) {
        scores[a.author_id] = (scores[a.author_id] || 0) + 1
      }
    }
    setGuruScores(scores)
  }, [routeId])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  const handleSubmit = async () => {
    if (!newText.trim() || !currentUserId || submitting) return

    setSubmitting(true)
    try {
      const supabase = createClient()
      await supabase.from('route_comments').insert({
        route_id: routeId,
        user_id: currentUserId,
        text: newText,
        tags: newTags,
      })
      setNewText('')
      setNewTags([])
      await loadComments()
    } finally {
      setSubmitting(false)
    }
  }

  const handleLike = async (commentId: string, value: 1 | -1) => {
    if (!currentUserId) return

    const currentLikes = likesMap[commentId] || []
    const existing = currentLikes.find((l) => l.user_id === currentUserId)
    const isToggleOff = existing?.value === value

    // Optimistic update
    setLikesMap((prev) => {
      const updated = { ...prev }
      const commentLikes = [...(updated[commentId] || [])]

      if (isToggleOff) {
        updated[commentId] = commentLikes.filter(
          (l) => l.user_id !== currentUserId
        )
      } else if (existing) {
        updated[commentId] = commentLikes.map((l) =>
          l.user_id === currentUserId ? { ...l, value } : l
        )
      } else {
        updated[commentId] = [
          ...commentLikes,
          { comment_id: commentId, user_id: currentUserId, value },
        ]
      }

      return updated
    })

    const supabase = createClient()

    if (isToggleOff) {
      await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', currentUserId)
    } else {
      await supabase
        .from('comment_likes')
        .upsert(
          { comment_id: commentId, user_id: currentUserId, value },
          { onConflict: 'comment_id,user_id' }
        )
    }
  }

  const handleAdopt = async (
    commentId: string,
    text: string,
    authorId: string
  ) => {
    if (!currentUserId) return

    const supabase = createClient()
    await supabase.from('adopted_descriptions').insert({
      route_id: routeId,
      comment_id: commentId,
      adopted_by: currentUserId,
      author_id: authorId,
      text,
    })

    setAdoptedId(commentId)
    setTimeout(() => setAdoptedId(null), 2000)

    await loadComments()
  }

  const toggleTag = (tag: string) => {
    setNewTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const filteredComments = filterTag
    ? comments.filter((c) => c.tags.includes(filterTag))
    : comments

  return (
    <div className="mt-6 pt-6 border-t border-mountain-border space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-mountain-muted" />
        <h3 className="text-base font-bold text-mountain-text">Обсуждение</h3>
        {comments.length > 0 && (
          <span className="text-xs bg-mountain-primary/20 text-mountain-primary px-2 py-0.5 rounded-full">
            {comments.length}
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {FILTER_TAGS.map(({ key, label }) => {
          const isActive = filterTag === key
          const colorClass =
            isActive && key ? TAG_COLORS[key] : ''

          return (
            <button
              key={label}
              type="button"
              onClick={() => setFilterTag(key)}
              className={`text-xs px-2.5 py-1 rounded-full cursor-pointer transition-colors ${
                isActive
                  ? key
                    ? colorClass
                    : 'bg-mountain-primary/20 text-mountain-primary border border-mountain-primary/30'
                  : 'bg-mountain-surface text-mountain-muted border border-mountain-border hover:text-mountain-text'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Comment list */}
      {filteredComments.length > 0 ? (
        <div className="space-y-3">
          {filteredComments.map((comment) => (
            <div key={comment.id} className="relative">
              <CommentCard
                comment={comment}
                likes={likesMap[comment.id] || []}
                currentUserId={currentUserId}
                onLike={handleLike}
                onAdopt={handleAdopt}
                guruScore={guruScores[comment.user_id] || 0}
              />
              {adoptedId === comment.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-mountain-success/10 rounded-lg border border-mountain-success/30 pointer-events-none">
                  <span className="text-sm font-medium text-mountain-success">
                    Добавлено к описанию!
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center">
          <p className="text-sm font-medium text-mountain-text">Пока нет комментариев</p>
          <p className="text-xs text-mountain-muted mt-1">Поделись опытом по этому маршруту</p>
        </div>
      )}

      {/* Add comment form */}
      {currentUserId ? (
        <div className="space-y-3">
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Поделись опытом по этому маршруту..."
            className="bg-mountain-surface border border-mountain-border rounded-xl px-4 py-2.5 text-sm resize-none h-20 focus:border-mountain-primary focus:outline-none w-full text-mountain-text placeholder:text-mountain-muted"
          />
          <div className="flex flex-wrap gap-1.5">
            {AVAILABLE_TAGS.map((tag) => {
              const selected = newTags.includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`text-xs px-2.5 py-1 rounded-full cursor-pointer transition-colors ${
                    selected
                      ? TAG_COLORS[tag]
                      : 'bg-mountain-surface text-mountain-muted border border-mountain-border hover:text-mountain-text'
                  }`}
                >
                  {TAG_DISPLAY[tag]}
                </button>
              )
            })}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!newText.trim() || submitting}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            {submitting ? 'Отправка...' : 'Отправить'}
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 py-4 rounded-lg border border-mountain-border bg-mountain-surface/50">
          <Link
            href="/login"
            className="text-sm font-medium text-mountain-primary hover:text-mountain-primary/80 transition-colors"
          >
            Войдите
          </Link>
          <span className="text-sm text-mountain-muted">, чтобы оставить комментарий</span>
        </div>
      )}
    </div>
  )
}
