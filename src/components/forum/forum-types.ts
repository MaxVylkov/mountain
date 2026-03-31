// src/components/forum/forum-types.ts

export type ForumCategory = 'routes' | 'gear' | 'learning' | 'training' | 'rations' | 'beginners'
export type PostType = 'thread' | 'report'

export interface ForumPost {
  id: string
  author_id: string
  category: ForumCategory
  type: PostType
  title: string
  body: string
  created_at: string
  updated_at: string
  author?: { display_name: string | null } | null
  like_count?: number
  reply_count?: number
  liked_by_me?: boolean
  route_note?: string | null
  ration_template_id?: string | null
  attached_route?: { name: string; mountainName: string } | null
  image_attachments?: { storage_path: string }[]
}

export interface ForumReply {
  id: string
  post_id: string
  parent_reply_id: string | null
  author_id: string
  body: string
  created_at: string
  author?: { display_name: string | null } | null
  like_count: number
  liked_by_me: boolean
}

export interface ForumAttachment {
  id: string
  post_id: string
  type: 'route' | 'packing_set' | 'gear_item'
  ref_id: string
  position: number
}

export function categoryLabel(category: ForumCategory): string {
  const labels: Record<ForumCategory, string> = {
    routes: 'Маршруты',
    gear: 'Снаряжение',
    learning: 'Обучение',
    training: 'Тренировки',
    rations: 'Раскладка',
    beginners: 'Новичкам',
  }
  return labels[category]
}

export function typeLabel(type: PostType): string {
  return type === 'thread' ? 'Тред' : 'Отчёт'
}

export function formatRelativeTime(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffSeconds = Math.floor((now - then) / 1000)

  if (diffSeconds < 60) return 'только что'
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} мин назад`
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} ч назад`
  if (diffSeconds < 2592000) return `${Math.floor(diffSeconds / 86400)} дн назад`
  return new Date(isoString).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

export function isValidCategory(s: string): s is ForumCategory {
  return ['routes', 'gear', 'learning', 'training', 'rations', 'beginners'].includes(s)
}
