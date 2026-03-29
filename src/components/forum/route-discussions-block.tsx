// src/components/forum/route-discussions-block.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { MessageCircle, ThumbsUp, ArrowRight, PenLine } from 'lucide-react'
import { typeLabel, formatRelativeTime } from './forum-types'

interface Props {
  mountainId: string
}

export async function RouteDiscussionsBlock({ mountainId }: Props) {
  const supabase = await createClient()

  // Get all route IDs for this mountain
  const { data: routes } = await supabase
    .from('routes')
    .select('id')
    .eq('mountain_id', mountainId)

  const routeIds = (routes ?? []).map((r: any) => r.id)
  if (routeIds.length === 0) return null

  // Find posts attached to any route on this mountain
  const { data: attachments } = await supabase
    .from('forum_attachments')
    .select('post_id')
    .eq('type', 'route')
    .in('ref_id', routeIds)

  const postIds = [...new Set((attachments ?? []).map((a: any) => a.post_id))]
  if (postIds.length === 0) return null

  const { data: rawPosts } = await supabase
    .from('forum_posts')
    .select('id, type, title, created_at, author:profiles(display_name)')
    .in('id', postIds)
    .order('created_at', { ascending: false })
    .limit(3)

  if (!rawPosts || rawPosts.length === 0) return null

  // Fetch counts separately (reliable pattern)
  const postsWithCounts = await Promise.all(rawPosts.map(async (p: any) => {
    const [{ count: likeCount }, { count: replyCount }] = await Promise.all([
      supabase.from('forum_likes').select('*', { count: 'exact', head: true }).eq('post_id', p.id)
        .then(r => ({ count: r.count ?? 0 })),
      supabase.from('forum_replies').select('*', { count: 'exact', head: true }).eq('post_id', p.id)
        .then(r => ({ count: r.count ?? 0 })),
    ])
    return {
      ...p,
      author: Array.isArray(p.author) ? p.author[0] : p.author,
      like_count: likeCount,
      reply_count: replyCount,
    }
  }))

  const allCount = postIds.length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-mountain-muted uppercase tracking-wide flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          Обсуждения на форуме
        </h3>
        <div className="flex items-center gap-2">
          <Link
            href={`/forum/routes?create=1`}
            className="flex items-center gap-1 text-xs text-mountain-primary hover:underline"
          >
            <PenLine className="w-3 h-3" />
            Написать отчёт
          </Link>
          {allCount > 3 && (
            <Link
              href={`/forum/routes`}
              className="flex items-center gap-1 text-xs text-mountain-muted hover:text-mountain-text transition-colors"
            >
              Все {allCount} <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {postsWithCounts.map(post => (
          <Link key={post.id} href={`/forum/post/${post.id}`} className="block">
            <div className="glass-card p-3 hover:border-mountain-primary/40 transition-colors">
              <div className="flex items-start gap-2">
                <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 ${
                  post.type === 'thread' ? 'bg-blue-500/15 text-blue-400' : 'bg-emerald-500/15 text-emerald-400'
                }`}>
                  {typeLabel(post.type)}
                </span>
                <span className="text-sm text-mountain-text flex-1 leading-snug">{post.title}</span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-mountain-muted">
                <span>{post.author?.display_name ?? 'Участник'}</span>
                <span>{formatRelativeTime(post.created_at)}</span>
                <span className="flex items-center gap-1 ml-auto">
                  <ThumbsUp className="w-3 h-3" />{post.like_count}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />{post.reply_count}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
