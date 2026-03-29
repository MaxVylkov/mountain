import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ForumPostList } from '@/components/forum/forum-post-list'
import { ForumPost, ForumCategory, isValidCategory } from '@/components/forum/forum-types'

interface Props {
  params: Promise<{ category: string }>
  searchParams: Promise<{ sort?: string }>
}

export default async function ForumCategoryPage({ params, searchParams }: Props) {
  const { category } = await params
  const { sort } = await searchParams

  if (!isValidCategory(category)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch posts for this category
  let query = supabase
    .from('forum_posts')
    .select('*, author:profiles(display_name)')
    .eq('category', category as ForumCategory)

  // Apply sort
  if (sort === 'popular') {
    query = query.order('created_at', { ascending: false }) // will re-sort after counts
  } else if (sort === 'discussed') {
    query = query.order('created_at', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data: rawPosts } = await query.limit(50)

  // Fetch counts for each post separately (reliable pattern)
  const posts: ForumPost[] = await Promise.all((rawPosts ?? []).map(async (p: any) => {
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
      liked_by_me: false,
    }
  }))

  // Apply sort after counts are fetched
  if (sort === 'popular') {
    posts.sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0))
  } else if (sort === 'discussed') {
    posts.sort((a, b) => (b.reply_count ?? 0) - (a.reply_count ?? 0))
  }

  return (
    <Suspense fallback={<div className="text-mountain-muted text-sm">Загрузка...</div>}>
      <ForumPostList posts={posts} category={category as ForumCategory} currentUserId={user?.id ?? null} />
    </Suspense>
  )
}
