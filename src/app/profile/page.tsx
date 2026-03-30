'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mountain, ChevronRight, Copy, Check, Users, UserCheck, Clock } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'

const levelLabels: Record<ExperienceLevel, string> = {
  beginner: 'Новичок',
  intermediate: 'Значкист',
  advanced: 'Разрядник',
}

interface Friend {
  id: string
  status: string
  other: { id: string; display_name: string | null }
  isRequester: boolean
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<{ experience_level: string | null; invite_token: string | null } | null>(null)
  const [friends, setFriends] = useState<Friend[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)

      const { data: prof } = await supabase
        .from('profiles')
        .select('experience_level, invite_token')
        .eq('id', data.user.id)
        .single()
      setProfile(prof ?? null)

      // Load friendships
      const { data: fs } = await supabase
        .from('friendships')
        .select('id, status, requester_id, addressee_id, requester:profiles!friendships_requester_id_fkey(id, display_name), addressee:profiles!friendships_addressee_id_fkey(id, display_name)')
        .or(`requester_id.eq.${data.user.id},addressee_id.eq.${data.user.id}`)

      if (fs) {
        setFriends(fs.map((f: any) => {
          const isRequester = f.requester_id === data.user.id
          const other = isRequester
            ? (Array.isArray(f.addressee) ? f.addressee[0] : f.addressee)
            : (Array.isArray(f.requester) ? f.requester[0] : f.requester)
          return { id: f.id, status: f.status, other, isRequester }
        }))
      }
    })
  }, [router])

  async function handleAccept(friendshipId: string) {
    const supabase = createClient()
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId)
    setFriends(prev => prev.map(f => f.id === friendshipId ? { ...f, status: 'accepted' } : f))
  }

  async function handleRemove(friendshipId: string) {
    const supabase = createClient()
    await supabase.from('friendships').delete().eq('id', friendshipId)
    setFriends(prev => prev.filter(f => f.id !== friendshipId))
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  function handleCopyInvite() {
    if (!profile?.invite_token) return
    navigator.clipboard.writeText(`${window.location.origin}/invite/${profile.invite_token}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!user) return null

  const accepted = friends.filter(f => f.status === 'accepted')
  const pending = friends.filter(f => f.status === 'pending' && !f.isRequester)
  const sent = friends.filter(f => f.status === 'pending' && f.isRequester)
  const level = profile?.experience_level as ExperienceLevel | null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.15em] uppercase text-mountain-muted mb-2">Профиль</p>
        <h1 className="text-3xl font-bold">{user.user_metadata?.display_name || 'Альпинист'}</h1>
        {level && (
          <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-mountain-primary/20 text-mountain-primary">
            {levelLabels[level]}
          </span>
        )}
      </div>

      {/* Invite link */}
      {profile?.invite_token && (
        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-mountain-primary" />
            <h2 className="font-semibold">Пригласить в друзья</h2>
          </div>
          <p className="text-sm text-mountain-muted">Поделись ссылкой — другой пользователь сможет добавить тебя</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 truncate text-xs bg-mountain-bg px-3 py-2 rounded-lg text-mountain-muted border border-mountain-border">
              {`${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${profile.invite_token}`}
            </code>
            <Button variant="outline" onClick={handleCopyInvite} className="shrink-0">
              {copied ? (
                <><Check size={14} className="mr-1 text-mountain-success" /><span className="text-xs">Скопировано</span></>
              ) : (
                <><Copy size={14} className="mr-1" /><span className="text-xs">Копировать</span></>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Incoming friend requests */}
      {pending.length > 0 && (
        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-mountain-accent" />
            <h2 className="font-semibold">Запросы в друзья ({pending.length})</h2>
          </div>
          <div className="space-y-2">
            {pending.map(f => (
              <div key={f.id} className="flex items-center justify-between gap-3">
                <span className="text-sm">{f.other?.display_name || 'Пользователь'}</span>
                <div className="flex gap-2">
                  <Button onClick={() => handleAccept(f.id)} className="text-xs px-3 py-1.5 h-auto">Принять</Button>
                  <Button variant="outline" onClick={() => handleRemove(f.id)} className="text-xs px-3 py-1.5 h-auto">Отклонить</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Friends list */}
      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <UserCheck size={18} className="text-mountain-success" />
          <h2 className="font-semibold">Друзья {accepted.length > 0 && `(${accepted.length})`}</h2>
        </div>
        {accepted.length === 0 && sent.length === 0 ? (
          <p className="text-sm text-mountain-muted">Пока нет друзей. Поделись своей ссылкой выше!</p>
        ) : (
          <div className="space-y-2">
            {accepted.map(f => (
              <div key={f.id} className="flex items-center justify-between gap-3">
                <span className="text-sm">{f.other?.display_name || 'Пользователь'}</span>
                <button onClick={() => handleRemove(f.id)} className="text-xs text-mountain-muted hover:text-mountain-danger transition-colors">
                  Удалить
                </button>
              </div>
            ))}
            {sent.map(f => (
              <div key={f.id} className="flex items-center justify-between gap-3">
                <span className="text-sm text-mountain-muted">{f.other?.display_name || 'Пользователь'}</span>
                <span className="text-xs text-mountain-muted">Ожидает подтверждения</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Account info */}
      <Card className="space-y-3">
        <p className="text-sm text-mountain-muted">{user.email}</p>
        <Button variant="outline" onClick={handleLogout}>Выйти</Button>
      </Card>

      <Link href="/onboard?view=true">
        <div className="bg-mountain-surface border border-mountain-border rounded-xl p-4 hover:border-mountain-primary transition-colors flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mountain size={24} className="text-mountain-primary" />
            <span className="font-medium">Мой путь к вершине</span>
          </div>
          <ChevronRight size={20} className="text-mountain-muted" />
        </div>
      </Link>
    </div>
  )
}
