'use client'

import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { GuruBadge } from './guru-badge'

interface CommentCardProps {
  comment: {
    id: string
    text: string
    tags: string[]
    created_at: string
    user_id: string
    profile: { display_name: string }
  }
  likes: { user_id: string; value: number }[]
  currentUserId: string | null
  onLike: (commentId: string, value: 1 | -1) => void
  onAdopt: (commentId: string, text: string, authorId: string) => void
  guruScore: number
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then

  const minutes = Math.floor(diffMs / 60_000)
  const hours = Math.floor(diffMs / 3_600_000)
  const days = Math.floor(diffMs / 86_400_000)

  if (minutes < 1) return 'только что'
  if (minutes < 60) return `${minutes} мин. назад`
  if (hours < 24) return `${hours} ч. назад`
  if (days < 7) return `${days} дн. назад`

  const d = new Date(dateStr)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

const TAG_COLORS: Record<string, string> = {
  'впечатление': 'bg-blue-500/20 text-blue-400',
  'описание': 'bg-green-500/20 text-green-400',
  'альтернативное_описание': 'bg-amber-500/20 text-amber-400',
  'снаряжение': 'bg-purple-500/20 text-purple-400',
}

export function CommentCard({
  comment,
  likes,
  currentUserId,
  onLike,
  onAdopt,
  guruScore,
}: CommentCardProps) {
  const netScore = likes.reduce((sum, l) => sum + l.value, 0)
  const currentVote = likes.find((l) => l.user_id === currentUserId)?.value ?? 0

  return (
    <div className="bg-mountain-surface/50 border border-mountain-border rounded-lg p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-mountain-text">
            {comment.profile.display_name}
          </span>
          {guruScore > 0 && <GuruBadge score={guruScore} />}
        </div>
        <span className="text-xs text-mountain-muted">
          {relativeTime(comment.created_at)}
        </span>
      </div>

      {/* Tags */}
      {comment.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {comment.tags.map((tag) => (
            <span
              key={tag}
              className={`text-xs px-2 py-0.5 rounded-full ${TAG_COLORS[tag] ?? 'bg-mountain-muted/20 text-mountain-muted'}`}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Text */}
      <p className="text-sm text-mountain-text mt-2 whitespace-pre-wrap">
        {comment.text}
      </p>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onLike(comment.id, 1)}
            className={`p-1 transition-colors ${
              currentVote === 1
                ? 'text-mountain-primary'
                : 'text-mountain-muted hover:text-mountain-text'
            }`}
          >
            <ThumbsUp
              className="w-4 h-4"
              fill={currentVote === 1 ? 'currentColor' : 'none'}
            />
          </button>
          <span className="text-xs text-mountain-muted min-w-[1ch] text-center">
            {netScore}
          </span>
          <button
            type="button"
            onClick={() => onLike(comment.id, -1)}
            className={`p-1 transition-colors ${
              currentVote === -1
                ? 'text-mountain-danger'
                : 'text-mountain-muted hover:text-mountain-text'
            }`}
          >
            <ThumbsDown
              className="w-4 h-4"
              fill={currentVote === -1 ? 'currentColor' : 'none'}
            />
          </button>
        </div>

        {comment.tags.includes('альтернативное_описание') && currentUserId && (
          <button
            type="button"
            onClick={() => onAdopt(comment.id, comment.text, comment.user_id)}
            className="text-xs text-mountain-muted hover:text-mountain-text p-1 transition-colors"
          >
            Добавить к описанию
          </button>
        )}
      </div>
    </div>
  )
}
