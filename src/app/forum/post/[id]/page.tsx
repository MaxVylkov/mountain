import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ForumPostDetail } from '@/components/forum/forum-post-detail'
import { ForumPost, ForumReply } from '@/components/forum/forum-types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ForumPostPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch post with author
  const { data: rawPost } = await supabase
    .from('forum_posts')
    .select('*, author:profiles(display_name)')
    .eq('id', id)
    .single()

  if (!rawPost) notFound()

  // Fetch counts separately
  const [{ count: likeCount }, { count: replyCount }] = await Promise.all([
    supabase.from('forum_likes').select('*', { count: 'exact', head: true }).eq('post_id', id)
      .then(r => ({ count: r.count ?? 0 })),
    supabase.from('forum_replies').select('*', { count: 'exact', head: true }).eq('post_id', id)
      .then(r => ({ count: r.count ?? 0 })),
  ])

  // Check if current user liked this post
  const liked_by_me = user
    ? (await supabase.from('forum_likes').select('id').eq('user_id', user.id).eq('post_id', id).maybeSingle()).data !== null
    : false

  const post: ForumPost = {
    ...rawPost,
    author: Array.isArray(rawPost.author) ? rawPost.author[0] : rawPost.author,
    like_count: likeCount,
    reply_count: replyCount,
    liked_by_me,
    ration_template_id: rawPost.ration_template_id ?? null,
  }

  // Fetch replies with authors
  const { data: rawReplies } = await supabase
    .from('forum_replies')
    .select('*, author:profiles(display_name)')
    .eq('post_id', id)
    .order('created_at', { ascending: true })

  // Fetch reply like counts and liked_by_me with 2 batch queries instead of 2N
  const replyIds = (rawReplies ?? []).map((r: any) => r.id)

  const [replyLikesAll, replyLikedByMe] = replyIds.length > 0
    ? await Promise.all([
        supabase.from('forum_likes').select('reply_id').in('reply_id', replyIds)
          .then(({ data }) => data ?? []),
        user
          ? supabase.from('forum_likes').select('reply_id').eq('user_id', user.id).in('reply_id', replyIds)
              .then(({ data }) => new Set((data ?? []).map((r: any) => r.reply_id)))
          : Promise.resolve(new Set<string>()),
      ])
    : [[], new Set<string>()]

  const replyLikeCountMap = (replyLikesAll as { reply_id: string }[]).reduce<Record<string, number>>((acc, row) => {
    acc[row.reply_id] = (acc[row.reply_id] ?? 0) + 1
    return acc
  }, {})

  const replies: ForumReply[] = (rawReplies ?? []).map((r: any) => ({
    ...r,
    author: Array.isArray(r.author) ? r.author[0] : r.author,
    like_count: replyLikeCountMap[r.id] ?? 0,
    liked_by_me: (replyLikedByMe as Set<string>).has(r.id),
  }))

  // Fetch attachments
  const { data: attachments } = await supabase
    .from('forum_attachments')
    .select('*')
    .eq('post_id', id)
    .order('position', { ascending: true })

  const { data: fileAttachments } = await supabase
    .from('forum_file_attachments')
    .select('id, file_name, storage_path, mime_type, file_size')
    .eq('post_id', id)
    .order('created_at', { ascending: true })

  const routeIds = (attachments ?? []).filter((a: any) => a.type === 'route').map((a: any) => a.ref_id)
  const packingIds = (attachments ?? []).filter((a: any) => a.type === 'packing_set').map((a: any) => a.ref_id)
  const gearIds = (attachments ?? []).filter((a: any) => a.type === 'gear_item').map((a: any) => a.ref_id)
  const workoutIds = (attachments ?? []).filter((a: any) => a.type === 'workout').map((a: any) => a.ref_id)

  // Resolve route attachments
  const routeData = routeIds.length > 0
    ? await supabase.from('routes').select('id, name, difficulty, season, mountain:mountains(name)').in('id', routeIds)
        .then(({ data }) => (data ?? []).map((r: any) => ({
          routeId: r.id,
          routeName: r.name,
          mountainName: Array.isArray(r.mountain) ? r.mountain[0]?.name : r.mountain?.name ?? '',
          difficulty: r.difficulty,
          season: r.season,
        })))
    : []

  // Resolve packing set attachments
  const packingData = packingIds.length > 0
    ? await Promise.all(packingIds.map(async (setId: string) => {
        const { data: set } = await supabase.from('packing_sets').select('id, name').eq('id', setId).single()
        const { data: items } = await supabase
          .from('packing_items')
          .select('gear:gear(name, weight), backpack:packing_backpacks(name)')
          .eq('packing_set_id', setId)
        const itemList = (items ?? []).map((i: any) => ({
          gear_name: Array.isArray(i.gear) ? i.gear[0]?.name : i.gear?.name ?? '',
          backpack_name: Array.isArray(i.backpack) ? i.backpack[0]?.name : i.backpack?.name ?? null,
        }))
        const totalWeightG = (items ?? []).reduce((s: number, i: any) => {
          const w = Array.isArray(i.gear) ? i.gear[0]?.weight : i.gear?.weight
          return s + (w ?? 0)
        }, 0)
        return { setId, setName: set?.name ?? '', itemCount: itemList.length, totalWeightG, items: itemList }
      }))
    : []

  // Resolve gear item chips
  const gearChips = gearIds.length > 0
    ? await supabase.from('gear').select('id, name, category').in('id', gearIds)
        .then(({ data }) => (data ?? []).map((g: any) => ({ gearId: g.id, gearName: g.name, category: g.category })))
    : []

  return (
    <ForumPostDetail
      post={post}
      replies={replies}
      routeData={routeData}
      packingData={packingData}
      gearChips={gearChips}
      workoutIds={workoutIds}
      currentUserId={user?.id ?? null}
      fileAttachments={fileAttachments ?? []}
    />
  )
}
