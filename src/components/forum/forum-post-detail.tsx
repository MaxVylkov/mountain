'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ForumPost, ForumReply, typeLabel, categoryLabel, formatRelativeTime } from './forum-types'
import { AttachmentRouteCard } from './attachment-route-card'
import { AttachmentPackingCard } from './attachment-packing-card'
import { AttachmentGearChips } from './attachment-gear-chips'
import { ForumReplyList } from './forum-reply-list'
import { ThumbsUp, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

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

      <div className="glass-card p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                post.type === 'thread' ? 'bg-blue-500/15 text-blue-400' : 'bg-emerald-500/15 text-emerald-400'
              }`}>
                {typeLabel(post.type)}
              </span>
            </div>
            <h1 className="text-xl font-bold text-mountain-text">{post.title}</h1>
            <p className="text-xs text-mountain-muted">
              {post.author?.display_name ?? 'Участник'} · {formatRelativeTime(post.created_at)}
            </p>
          </div>
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

        {post.body && (
          <div className="text-sm text-mountain-text leading-relaxed whitespace-pre-wrap border-t border-mountain-border/40 pt-4">
            {post.body}
          </div>
        )}

        {/* Attachments */}
        {(routeData.length > 0 || packingData.length > 0 || gearChips.length > 0) && (
          <div className="space-y-3 border-t border-mountain-border/40 pt-4">
            {routeData.map(r => (
              <AttachmentRouteCard key={r.routeId} data={r} currentUserId={currentUserId} />
            ))}
            {packingData.map(p => (
              <AttachmentPackingCard key={p.setId} data={p} currentUserId={currentUserId} />
            ))}
            <AttachmentGearChips chips={gearChips} />
          </div>
        )}
      </div>

      <ForumReplyList replies={replies} postId={post.id} currentUserId={currentUserId} />
    </div>
  )
}
