'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, MessageSquare, Search, X } from 'lucide-react'
import { ForumPost, ForumCategory } from './forum-types'
import { ForumPostCard } from './forum-post-card'
import { CreatePostModal } from './create-post-modal'
import { EmptyState } from '@/components/ui/empty-state'

interface Props {
  posts: ForumPost[]
  category: ForumCategory
  currentUserId: string | null
}

export function ForumPostList({ posts, category, currentUserId }: Props) {
  const searchParams = useSearchParams()
  const sort = searchParams.get('sort') ?? 'new'
  const [showModal, setShowModal] = useState(false)
  const [routeFilter, setRouteFilter] = useState('')

  const filteredPosts = routeFilter.trim()
    ? posts.filter(p => {
        const q = routeFilter.toLowerCase()
        return p.route_note?.toLowerCase().includes(q) ||
          p.attached_route?.name.toLowerCase().includes(q) ||
          p.attached_route?.mountainName.toLowerCase().includes(q)
      })
    : posts

  return (
    <div className="space-y-4">
      {/* Header: sort + write button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-mountain-border overflow-hidden">
          {(['new', 'popular', 'discussed'] as const).map(s => (
            <a
              key={s}
              href={`?sort=${s}`}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                sort === s ? 'bg-mountain-primary/10 text-mountain-primary font-semibold' : 'text-mountain-muted hover:text-mountain-text'
              }`}
            >
              {s === 'new' ? 'Новые' : s === 'popular' ? 'Популярные' : 'Обсуждаемые'}
            </a>
          ))}
        </div>
        <button
          onClick={() => {
            if (!currentUserId) { window.location.href = '/login'; return }
            setShowModal(true)
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-mountain-primary text-white text-sm font-medium hover:bg-mountain-primary/80 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Написать пост
        </button>
      </div>

      {/* Route filter */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mountain-muted pointer-events-none" />
        <input
          type="text"
          value={routeFilter}
          onChange={e => setRouteFilter(e.target.value)}
          placeholder="Фильтр по маршруту..."
          className="w-full rounded-xl border border-mountain-border bg-mountain-surface/40 pl-9 pr-8 py-2 text-sm text-mountain-text focus:outline-none focus:border-mountain-primary placeholder:text-mountain-muted"
        />
        {routeFilter && (
          <button
            onClick={() => setRouteFilter('')}
            aria-label="Очистить фильтр"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-mountain-muted hover:text-mountain-text"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Постов пока нет"
          description="Начните обсуждение — задайте вопрос или поделитесь опытом с сообществом."
          action={
            currentUserId
              ? { label: 'Написать пост', onClick: () => setShowModal(true) }
              : { label: 'Войти и написать', href: '/login' }
          }
        />
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-8 text-sm text-mountain-muted">
          Постов с маршрутом «{routeFilter}» не найдено
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map(post => <ForumPostCard key={post.id} post={post} />)}
        </div>
      )}

      {/* Post creation modal */}
      {showModal && currentUserId && (
        <CreatePostModal
          category={category}
          currentUserId={currentUserId}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
