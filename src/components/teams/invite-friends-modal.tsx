'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Search, UserPlus, Check, Users } from 'lucide-react'

interface Friend {
  id: string
  display_name: string
}

interface Props {
  teamId: string
  currentUserId: string
  onClose: () => void
}

export function InviteFriendsModal({ teamId, currentUserId, onClose }: Props) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState<string | null>(null)
  const [added, setAdded] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const [{ data: fs }, { data: members }] = await Promise.all([
        supabase
          .from('friendships')
          .select('requester_id, addressee_id, requester:profiles!friendships_requester_id_fkey(id, display_name), addressee:profiles!friendships_addressee_id_fkey(id, display_name)')
          .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`)
          .eq('status', 'accepted'),
        supabase
          .from('team_members')
          .select('user_id')
          .eq('team_id', teamId),
      ])

      const memberIds = new Set((members ?? []).map((m: any) => m.user_id))

      const list: Friend[] = (fs ?? [])
        .map((f: any) => {
          const isRequester = f.requester_id === currentUserId
          const other = isRequester
            ? (Array.isArray(f.addressee) ? f.addressee[0] : f.addressee)
            : (Array.isArray(f.requester) ? f.requester[0] : f.requester)
          return other ? { id: other.id, display_name: other.display_name ?? 'Без имени' } : null
        })
        .filter((f: Friend | null): f is Friend => f !== null && !memberIds.has(f.id))

      setFriends(list)
      setLoading(false)
    }
    load()
  }, [teamId, currentUserId])

  async function handleAdd(friend: Friend) {
    setAdding(friend.id)
    const supabase = createClient()
    await supabase.from('team_members').insert({
      team_id: teamId,
      user_id: friend.id,
      role: 'member',
    })
    setAdded(prev => new Set([...prev, friend.id]))
    setAdding(null)
  }

  const filtered = friends.filter(f =>
    f.display_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-mountain-surface border border-mountain-border rounded-2xl overflow-hidden shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-mountain-border">
          <div className="flex items-center gap-2">
            <UserPlus size={16} className="text-mountain-primary" />
            <span className="text-sm font-semibold text-mountain-text">Пригласить друга</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-mountain-muted hover:text-mountain-text hover:bg-mountain-border/60 transition-colors"
            aria-label="Закрыть"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mountain-muted pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по имени..."
              className="w-full pl-8 pr-3 py-2 bg-mountain-bg border border-mountain-border rounded-lg text-sm text-mountain-text placeholder:text-mountain-muted focus:outline-none focus:border-mountain-primary transition-colors"
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto max-h-72 px-2 pb-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-mountain-primary border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Users size={28} className="text-mountain-muted/50" />
              <p className="text-sm text-mountain-muted">
                {friends.length === 0
                  ? 'Все друзья уже в отделении или друзей нет'
                  : 'Никого не найдено'}
              </p>
            </div>
          ) : (
            filtered.map(friend => {
              const isAdded = added.has(friend.id)
              const isAdding = adding === friend.id
              return (
                <div
                  key={friend.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-mountain-border/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-mountain-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-mountain-primary">
                        {friend.display_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm text-mountain-text truncate">{friend.display_name}</span>
                  </div>
                  <button
                    onClick={() => !isAdded && handleAdd(friend)}
                    disabled={isAdding || isAdded}
                    className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isAdded
                        ? 'bg-mountain-success/15 text-mountain-success cursor-default'
                        : 'bg-mountain-primary text-white hover:bg-mountain-primary/80 disabled:opacity-60'
                    }`}
                  >
                    {isAdded ? (
                      <><Check size={13} />Добавлен</>
                    ) : isAdding ? (
                      'Добавление...'
                    ) : (
                      'Добавить'
                    )}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
