import Link from 'next/link'
import { ThumbsUp, MessageCircle } from 'lucide-react'
import { ForumPost, typeLabel, formatRelativeTime } from './forum-types'

interface Props {
  post: ForumPost
}

export function ForumPostCard({ post }: Props) {
  return (
    <Link href={`/forum/post/${post.id}`} className="block">
      <div className="glass-card p-4 hover:border-mountain-primary/40 transition-colors space-y-2">
        <div className="flex items-start gap-2">
          <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full mt-0.5 ${
            post.type === 'thread' ? 'bg-blue-500/15 text-blue-400' : 'bg-emerald-500/15 text-emerald-400'
          }`}>
            {typeLabel(post.type)}
          </span>
          <h3 className="text-sm font-semibold text-mountain-text leading-snug flex-1">{post.title}</h3>
        </div>

        {post.body && (
          <p className="text-xs text-mountain-muted line-clamp-2 leading-relaxed pl-0">{post.body}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-mountain-muted pt-1">
          <span>{post.author?.display_name ?? 'Участник'}</span>
          <span>{formatRelativeTime(post.created_at)}</span>
          <span className="flex items-center gap-1 ml-auto">
            <ThumbsUp className="w-3 h-3" />{post.like_count ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />{post.reply_count ?? 0}
          </span>
        </div>
      </div>
    </Link>
  )
}
