'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import { ForumPost, ForumCategory } from './forum-types'
import { ForumPostCard } from './forum-post-card'

interface Props {
  posts: ForumPost[]
  category: ForumCategory
  currentUserId: string | null
}

export function ForumPostList({ posts, category, currentUserId }: Props) {
  const searchParams = useSearchParams()
  const sort = searchParams.get('sort') ?? 'new'
  const [showModal, setShowModal] = useState(false)

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
                sort === s ? 'bg-mountain-surface text-mountain-text' : 'text-mountain-muted hover:text-mountain-text'
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

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="text-center py-12 text-mountain-muted">
          <p className="text-sm">Постов пока нет</p>
          <p className="text-xs mt-1">Будьте первым!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => <ForumPostCard key={post.id} post={post} />)}
        </div>
      )}

      {/* Modal placeholder — wired in Task 7 */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowModal(false)}
        >
          <div className="glass-card p-6 text-mountain-text" onClick={e => e.stopPropagation()}>
            Создание поста — скоро
          </div>
        </div>
      )}
    </div>
  )
}
