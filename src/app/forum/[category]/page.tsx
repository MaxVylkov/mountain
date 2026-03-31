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

  const postList = rawPosts ?? []
  const postIds = postList.map((p: any) => p.id)

  // Batch: counts + route attachments
  const [likeCounts, replyCounts, routeAttachments, imageAttachments] = await Promise.all([
    postIds.length > 0
      ? supabase.from('forum_likes').select('post_id').in('post_id', postIds)
          .then(({ data }) => {
            const map: Record<string, number> = {}
            ;(data ?? []).forEach((r: any) => { map[r.post_id] = (map[r.post_id] ?? 0) + 1 })
            return map
          })
      : Promise.resolve({} as Record<string, number>),
    postIds.length > 0
      ? supabase.from('forum_replies').select('post_id').in('post_id', postIds)
          .then(({ data }) => {
            const map: Record<string, number> = {}
            ;(data ?? []).forEach((r: any) => { map[r.post_id] = (map[r.post_id] ?? 0) + 1 })
            return map
          })
      : Promise.resolve({} as Record<string, number>),
    postIds.length > 0
      ? supabase.from('forum_attachments').select('post_id, ref_id').eq('type', 'route').in('post_id', postIds)
          .then(async ({ data: atts }) => {
            if (!atts || atts.length === 0) return {} as Record<string, { name: string; mountainName: string }>
            const routeIds = [...new Set(atts.map((a: any) => a.ref_id))]
            const { data: routes } = await supabase
              .from('routes')
              .select('id, name, mountain:mountains(name)')
              .in('id', routeIds)
            const routeMap: Record<string, { name: string; mountainName: string }> = {}
            ;(routes ?? []).forEach((r: any) => {
              routeMap[r.id] = {
                name: r.name,
                mountainName: Array.isArray(r.mountain) ? r.mountain[0]?.name ?? '' : r.mountain?.name ?? '',
              }
            })
            const postRouteMap: Record<string, { name: string; mountainName: string }> = {}
            atts.forEach((a: any) => {
              if (!postRouteMap[a.post_id] && routeMap[a.ref_id]) {
                postRouteMap[a.post_id] = routeMap[a.ref_id]
              }
            })
            return postRouteMap
          })
      : Promise.resolve({} as Record<string, { name: string; mountainName: string }>),
    // Fetch image attachments for card thumbnail strips
    postIds.length > 0
      ? supabase
          .from('forum_file_attachments')
          .select('post_id, storage_path')
          .in('post_id', postIds)
          .like('mime_type', 'image/%')
          .then(({ data }) => {
            const map: Record<string, { storage_path: string }[]> = {}
            ;(data ?? []).forEach((a: any) => {
              if (!map[a.post_id]) map[a.post_id] = []
              if (map[a.post_id].length < 4) map[a.post_id].push({ storage_path: a.storage_path })
            })
            return map
          })
      : Promise.resolve({} as Record<string, { storage_path: string }[]>),
  ])

  const posts: ForumPost[] = postList.map((p: any) => ({
    ...p,
    author: Array.isArray(p.author) ? p.author[0] : p.author,
    like_count: likeCounts[p.id] ?? 0,
    reply_count: replyCounts[p.id] ?? 0,
    liked_by_me: false,
    attached_route: routeAttachments[p.id] ?? null,
    image_attachments: imageAttachments[p.id] ?? [],
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
