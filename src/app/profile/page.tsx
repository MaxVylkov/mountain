'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Copy, Check, Users, UserCheck, Clock, Search, UserPlus, X } from 'lucide-react'
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

interface SearchResult {
  id: string
  email: string
  display_name: string | null
}

function copyToClipboard(text: string): boolean {
  // Prefer modern API (requires HTTPS)
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(() => {})
    return true
  }
  // Fallback for HTTP
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.left = '-9999px'
  document.body.appendChild(ta)
  ta.focus()
  ta.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(ta)
  return ok
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<{ experience_level: string | null; invite_token: string | null } | null>(null)
  const [friends, setFriends] = useState<Friend[]>([])
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [actionInFlightId, setActionInFlightId] = useState<string | null>(null)

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // User search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      try {
        setUser(data.user)

        const { data: prof } = await supabase
          .from('profiles')
          .select('experience_level, invite_token')
          .eq('id', data.user.id)
          .single()
        setProfile(prof ?? null)
        setIsLoading(false)

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
      } finally {
        setIsLoading(false) // safety net: dismisses skeleton if profile fetch throws before line 81
      }
    })
  }, [router])

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (searchQuery.length < 3) { setSearchResults([]); return }
    setSearching(true)
    searchTimeout.current = setTimeout(async () => {
      const res = await fetch(`/api/users/search?email=${encodeURIComponent(searchQuery)}`)
      const json = await res.json()
      setSearchResults(json.users ?? [])
      setSearching(false)
    }, 400)
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [searchQuery])

  async function handleSendRequest(targetId: string) {
    if (!user) return
    const supabase = createClient()
    await supabase.from('friendships').insert({
      requester_id: user.id,
      addressee_id: targetId,
      status: 'pending',
    })
    setAddedIds(prev => new Set([...prev, targetId]))
  }

  async function handleAccept(friendshipId: string) {
    setActionInFlightId(friendshipId)
    try {
      const supabase = createClient()
      await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId)
      setFriends(prev => prev.map(f => f.id === friendshipId ? { ...f, status: 'accepted' } : f))
    } finally {
      setActionInFlightId(null)
    }
  }

  async function handleRemove(friendshipId: string) {
    setActionInFlightId(friendshipId)
    try {
      const supabase = createClient()
      await supabase.from('friendships').delete().eq('id', friendshipId)
      setFriends(prev => prev.filter(f => f.id !== friendshipId))
    } finally {
      setActionInFlightId(null)
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  function handleCopyInvite() {
    if (!profile?.invite_token) return
    const link = `${window.location.origin}/invite/${profile.invite_token}`
    copyToClipboard(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-lg bg-mountain-surface animate-pulse" />
          <div className="h-4 w-32 rounded-lg bg-mountain-surface animate-pulse" />
        </div>
        <div className="h-24 rounded-xl bg-mountain-surface animate-pulse" />
        <div className="h-24 rounded-xl bg-mountain-surface animate-pulse" />
        <div className="h-24 rounded-xl bg-mountain-surface animate-pulse" />
      </div>
    )
  }
  if (!user) return null

  const accepted = friends.filter(f => f.status === 'accepted')
  const pending = friends.filter(f => f.status === 'pending' && !f.isRequester)
  const sent = friends.filter(f => f.status === 'pending' && f.isRequester)
  const level = profile?.experience_level as ExperienceLevel | null
  const existingFriendIds = new Set(friends.map(f => f.other?.id))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.15em] uppercase text-mountain-muted mb-2">Профиль</p>
          <h1 className="text-3xl font-bold">{user.user_metadata?.display_name || 'Альпинист'}</h1>
          <div className="flex items-center gap-2 mt-1">
            {level && (
              <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-mountain-primary/20 text-mountain-primary">
                {levelLabels[level]}
              </span>
            )}
            <p className="text-sm text-mountain-muted">{user.email}</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleLogout} className="shrink-0 mt-1">
          Выйти
        </Button>
      </div>

      {/* Find friend */}
      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <Search size={18} className="text-mountain-primary" />
          <h2 className="font-semibold">Найти альпиниста</h2>
        </div>
        <div className="relative">
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Email или имя..."
            className="w-full pl-4 pr-9 py-3 bg-mountain-bg border border-mountain-border rounded-xl text-sm text-mountain-text placeholder:text-mountain-muted focus:outline-none focus:border-mountain-primary transition-colors"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchResults([]) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-mountain-muted hover:text-mountain-text">
              <X size={14} />
            </button>
          )}
        </div>
        {searchQuery.length > 0 && searchQuery.length < 3 && (
          <p className="text-xs text-mountain-muted">Введите минимум 3 символа</p>
        )}

        {searching && <p className="text-xs text-mountain-muted">Ищем...</p>}

        {searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map(u => {
              const alreadyFriend = existingFriendIds.has(u.id) || addedIds.has(u.id)
              return (
                <div key={u.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-mountain-bg border border-mountain-border">
                  <div>
                    <p className="text-sm font-medium">{u.display_name || 'Пользователь'}</p>
                    <p className="text-xs text-mountain-muted">{u.email}</p>
                  </div>
                  {alreadyFriend ? (
                    <span className="text-xs text-mountain-muted flex items-center gap-1">
                      <Check size={12} /> Добавлен
                    </span>
                  ) : (
                    <Button onClick={() => handleSendRequest(u.id)} className="text-xs px-3 py-1.5 h-auto shrink-0">
                      <UserPlus size={12} className="mr-1" /> Добавить
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {searchQuery.length >= 3 && !searching && searchResults.length === 0 && (
          <p className="text-xs text-mountain-muted">Пользователи не найдены</p>
        )}
      </Card>

      {/* Invite link */}
      {profile?.invite_token && (
      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-mountain-primary" />
          <h2 className="font-semibold">Пригласить по ссылке</h2>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 min-w-0 truncate text-xs bg-mountain-bg px-3 py-2 rounded-lg text-mountain-muted border border-mountain-border">
            {`${window.location.origin}/invite/${profile.invite_token}`}
          </code>
          <Button variant="outline" onClick={handleCopyInvite} className="shrink-0">
            {copied ? (
              <><Check size={14} className="mr-1 text-mountain-success" /><span className="text-xs">Скопировано</span></>
            ) : (
              <><Copy size={14} className="mr-1" /><span className="text-xs">Скопировать</span></>
            )}
          </Button>
        </div>
      </Card>
      )}

      {/* Incoming requests */}
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
                  <Button
                    onClick={() => handleAccept(f.id)}
                    disabled={actionInFlightId === f.id}
                    className="text-xs px-3 py-1.5 h-auto"
                  >Принять</Button>
                  <Button
                    variant="outline"
                    onClick={() => handleRemove(f.id)}
                    disabled={actionInFlightId === f.id}
                    className="text-xs px-3 py-1.5 h-auto"
                  >Отклонить</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Friends */}
      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <UserCheck size={18} className="text-mountain-success" />
          <h2 className="font-semibold">Друзья {accepted.length > 0 && `(${accepted.length})`}</h2>
        </div>
        {accepted.length === 0 && sent.length === 0 ? (
          <p className="text-sm text-mountain-muted">Найдите коллег по email или поделитесь ссылкой-приглашением.</p>
        ) : (
          <div className="space-y-2">
            {accepted.map(f => (
              <div key={f.id} className="flex items-center justify-between gap-3">
                <span className="text-sm">{f.other?.display_name || 'Пользователь'}</span>
                {confirmDeleteId === f.id ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-mountain-muted">Удалить?</span>
                    <button
                      onClick={() => { handleRemove(f.id); setConfirmDeleteId(null) }}
                      disabled={actionInFlightId === f.id}
                      className="text-mountain-danger hover:underline font-medium disabled:opacity-50"
                    >
                      Да
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-mountain-muted hover:text-mountain-text"
                    >
                      Отмена
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(f.id)}
                    className="text-xs text-mountain-muted hover:text-mountain-danger transition-colors"
                  >
                    Удалить
                  </button>
                )}
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

    </div>
  )
}
