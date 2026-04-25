'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, MessageCircle, PenLine, ThumbsUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime, typeLabel } from '@/components/forum/forum-types'

interface RouteForumPanelProps {
  routeId: string
  routeName: string
  mountainName?: string | null
}

interface ForumPostPreview {
  id: string
  title: string
  type: 'thread' | 'report'
  created_at: string
  author?: { display_name: string | null } | null
  like_count: number
  reply_count: number
}

export function RouteForumPanel({ routeId, routeName, mountainName }: RouteForumPanelProps) {
  const [posts, setPosts] = useState<ForumPostPreview[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const cleanRouteName = routeName.replace(/^№\d+\.\s*/, '')
  const routeLabel = mountainName ? `${mountainName} · ${cleanRouteName}` : cleanRouteName
  const createHref = useMemo(() => {
    const params = new URLSearchParams({
      create: '1',
      route_id: routeId,
      route_label: routeLabel,
    })
    return `/forum/routes?${params.toString()}`
  }, [routeId, routeLabel])
  const forumHref = `/forum/routes?route=${encodeURIComponent(cleanRouteName)}`

  useEffect(() => {
    const supabase = createClient()

    supabase
      .from('forum_attachments')
      .select('post_id')
      .eq('type', 'route')
      .eq('ref_id', routeId)
      .then(async ({ data: attachments }) => {
        const postIds = [...new Set((attachments ?? []).map((item: any) => item.post_id))]
        setTotalCount(postIds.length)
        if (postIds.length === 0) {
          setPosts([])
          return
        }

        const { data: rawPosts } = await supabase
          .from('forum_posts')
          .select('id, type, title, created_at, author:profiles(display_name)')
          .in('id', postIds)
          .order('created_at', { ascending: false })
          .limit(3)

        const previews = await Promise.all((rawPosts ?? []).map(async (post: any) => {
          const [{ count: likeCount }, { count: replyCount }] = await Promise.all([
            supabase.from('forum_likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
            supabase.from('forum_replies').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
          ])

          return {
            ...post,
            author: Array.isArray(post.author) ? post.author[0] : post.author,
            like_count: likeCount ?? 0,
            reply_count: replyCount ?? 0,
          }
        }))

        setPosts(previews as ForumPostPreview[])
      })
  }, [routeId])

  return (
    <div className="mt-5 rounded-xl border border-mountain-border bg-mountain-bg/40 p-4 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-mountain-text">
            <MessageCircle className="h-4 w-4 text-mountain-primary" />
            Обсуждение на форуме
          </h4>
          <p className="mt-1 text-xs text-mountain-muted">
            Вопросы, отчёты, фото и свежий опыт по маршруту живут в форуме.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={createHref}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-mountain-primary px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-mountain-primary/90"
          >
            <PenLine className="h-3.5 w-3.5" />
            Обсудить
          </Link>
          {totalCount > 0 && (
            <Link
              href={forumHref}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-mountain-border px-3 py-2 text-xs font-medium text-mountain-text transition-colors hover:border-mountain-primary hover:text-mountain-primary"
            >
              Все {totalCount}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      {posts.length > 0 ? (
        <div className="space-y-2">
          {posts.map(post => (
            <Link key={post.id} href={`/forum/post/${post.id}`} className="block rounded-lg border border-mountain-border bg-mountain-surface/50 p-3 transition-colors hover:border-mountain-primary/50">
              <div className="flex items-start gap-2">
                <span className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  post.type === 'thread' ? 'bg-mountain-primary/15 text-mountain-primary' : 'bg-mountain-success/15 text-mountain-success'
                }`}>
                  {typeLabel(post.type)}
                </span>
                <span className="flex-1 text-sm font-medium leading-snug text-mountain-text">{post.title}</span>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-mountain-muted">
                <span>{post.author?.display_name ?? 'Участник'}</span>
                <span>{formatRelativeTime(post.created_at)}</span>
                <span className="ml-auto flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3" />
                  {post.like_count}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {post.reply_count}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-mountain-border p-3 text-sm text-mountain-muted">
          Обсуждений пока нет. Можно первым спросить про состояние маршрута или оставить отчёт.
        </div>
      )}
    </div>
  )
}
