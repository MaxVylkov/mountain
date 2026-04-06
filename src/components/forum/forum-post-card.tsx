import Link from 'next/link'
import { ThumbsUp, MessageCircle, MapPin } from 'lucide-react'
import { ForumPost, typeLabel, formatRelativeTime } from './forum-types'
import { storageUrl } from '@/lib/storage-url'

interface Props {
  post: ForumPost
}

export function ForumPostCard({ post }: Props) {
  return (
    <Link href={`/forum/post/${post.id}`} className="block">
      <div className="surface-card interactive-card p-4 space-y-2">
        <div className="flex items-start gap-2">
          <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full mt-0.5 ${
            post.type === 'thread' ? 'bg-mountain-primary/15 text-mountain-primary' : 'bg-mountain-success/15 text-mountain-success'
          }`}>
            {post.type === 'thread' ? 'Обсуждение' : 'Отчёт'}
          </span>
          <h3 className="text-[15px] font-semibold text-mountain-text leading-snug tracking-tight flex-1">{post.title}</h3>
        </div>

        {(post.attached_route || post.route_note) && (
          <p className="flex items-center gap-1 text-xs text-mountain-muted">
            <MapPin className="w-3 h-3 shrink-0 text-mountain-primary" />
            {post.attached_route
              ? <><span className="text-mountain-text font-medium">{post.attached_route.name}</span>{post.attached_route.mountainName && <span className="text-mountain-muted"> · {post.attached_route.mountainName}</span>}</>
              : post.route_note
            }
          </p>
        )}

        {post.body && (
          <p className="text-xs text-mountain-muted line-clamp-2 leading-relaxed pl-0">{post.body}</p>
        )}

        {post.image_attachments && post.image_attachments.length > 0 && (
          <div className="flex items-center gap-1.5 pt-0.5">
            {post.image_attachments.slice(0, 3).map((att, i) => (
              <img
                key={i}
                src={storageUrl('forum-attachments', att.storage_path)}
                alt=""
                className="w-10 h-10 rounded-md object-cover shrink-0"
              />
            ))}
            {post.image_attachments.length > 3 && (
              <span className="w-10 h-10 rounded-md bg-mountain-surface border border-mountain-border flex items-center justify-center text-xs text-mountain-muted font-medium shrink-0">
                +{post.image_attachments.length - 3}
              </span>
            )}
          </div>
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
