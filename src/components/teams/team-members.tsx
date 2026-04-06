'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Copy, Check, Trash2, LogOut, Search, UserPlus, X } from 'lucide-react'

interface TeamMembersProps {
  teamId: string
  leaderId: string
  currentUserId: string
  inviteToken: string
}

interface Member {
  id: string
  user_id: string
  team_id: string
  role: string
  joined_at: string
  profile: { display_name: string } | null
}

function copyToClipboard(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(() => {})
    return
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.left = '-9999px'
  document.body.appendChild(ta)
  ta.focus()
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

interface InviteSearchResult {
  id: string
  display_name: string | null
  email: string
}

export function TeamMembers({ teamId, leaderId, currentUserId, inviteToken }: TeamMembersProps) {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  // Invite by name search
  const [inviteQuery, setInviteQuery] = useState('')
  const [inviteResults, setInviteResults] = useState<InviteSearchResult[]>([])
  const [inviteSearching, setInviteSearching] = useState(false)
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set())
  const inviteTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isLeader = currentUserId === leaderId

  const loadMembers = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('team_members')
      .select('*, profile:profiles(display_name)')
      .eq('team_id', teamId)
      .order('joined_at')
    if (data) setMembers(data as Member[])
    setLoading(false)
  }, [teamId])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  // Debounced invite search
  useEffect(() => {
    if (inviteTimeout.current) clearTimeout(inviteTimeout.current)
    if (inviteQuery.length < 3) { setInviteResults([]); return }
    setInviteSearching(true)
    inviteTimeout.current = setTimeout(async () => {
      const res = await fetch(`/api/users/search?email=${encodeURIComponent(inviteQuery)}`)
      const json = await res.json()
      setInviteResults(json.users ?? [])
      setInviteSearching(false)
    }, 400)
    return () => { if (inviteTimeout.current) clearTimeout(inviteTimeout.current) }
  }, [inviteQuery])

  const handleInviteUser = async (targetId: string) => {
    const supabase = createClient()
    await supabase.from('team_invites').insert({
      team_id: teamId,
      inviter_id: currentUserId,
      invitee_id: targetId,
    })
    setInvitedIds(prev => new Set([...prev, targetId]))
  }

  const handleCopyInvite = () => {
    const link = `${window.location.origin}/teams/join/${inviteToken}`
    copyToClipboard(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRemoveMember = async (memberId: string) => {
    setRemoving(memberId)
    const supabase = createClient()
    await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId)
    setMembers((prev) => prev.filter((m) => m.id !== memberId))
    setRemoving(null)
  }

  const handleLeaveTeam = async () => {
    const supabase = createClient()
    await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', currentUserId)
    router.push('/teams')
  }

  if (loading) {
    return (
      <div className="text-mountain-muted text-center py-12">Загрузка...</div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Members list */}
      <div className="space-y-3">
        {members.map((member) => {
          const isMemberLeader = member.user_id === leaderId
          return (
            <Card key={member.id}>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-mountain-text font-medium truncate">
                      {member.profile?.display_name ?? 'Без имени'}
                    </span>
                    {isMemberLeader ? (
                      <span className="inline-flex px-2 py-0.5 rounded-md bg-mountain-accent/20 text-mountain-accent text-xs font-medium">
                        Руководитель
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-md bg-mountain-primary/20 text-mountain-primary text-xs font-medium">
                        Участник
                      </span>
                    )}
                  </div>
                  <p className="text-mountain-muted text-xs mt-1">
                    Присоединился {formatDate(member.joined_at)}
                  </p>
                </div>

                {isLeader && !isMemberLeader && (
                  <Button
                    variant="ghost"
                    onClick={() => handleRemoveMember(member.id)}
                    disabled={removing === member.id}
                    className="text-mountain-danger hover:text-mountain-danger hover:bg-mountain-danger/10 shrink-0"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    <span className="text-xs">Удалить</span>
                  </Button>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Invite section */}
      <Card>
        <div className="space-y-4">
          <h3 className="text-mountain-text font-semibold">Пригласить участника</h3>

          {/* Search by name */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-mountain-muted">
              <Search size={12} />
              <span>По имени или email</span>
            </div>
            <div className="relative">
              <input
                value={inviteQuery}
                onChange={e => setInviteQuery(e.target.value)}
                placeholder="Введите имя или email..."
                className="w-full pl-4 pr-9 py-2.5 bg-mountain-bg border border-mountain-border rounded-lg text-sm text-mountain-text placeholder:text-mountain-muted focus:outline-none focus:border-mountain-primary transition-colors"
              />
              {inviteQuery && (
                <button onClick={() => { setInviteQuery(''); setInviteResults([]) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-mountain-muted hover:text-mountain-text">
                  <X size={14} />
                </button>
              )}
            </div>
            {inviteQuery.length > 0 && inviteQuery.length < 3 && (
              <p className="text-xs text-mountain-muted">Минимум 3 символа</p>
            )}
            {inviteSearching && <p className="text-xs text-mountain-muted">Ищем...</p>}
            {inviteResults.length > 0 && (
              <div className="space-y-1.5">
                {inviteResults.filter(u => {
                  const memberIds = new Set(members.map(m => m.user_id))
                  return u.id !== currentUserId && !memberIds.has(u.id)
                }).map(u => (
                  <div key={u.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-mountain-bg border border-mountain-border">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.display_name || 'Пользователь'}</p>
                      <p className="text-xs text-mountain-muted">{u.email}</p>
                    </div>
                    {invitedIds.has(u.id) ? (
                      <span className="text-xs text-mountain-muted flex items-center gap-1 shrink-0">
                        <Check size={12} /> Приглашён
                      </span>
                    ) : (
                      <Button onClick={() => handleInviteUser(u.id)} className="text-xs px-3 py-1.5 h-auto shrink-0">
                        <UserPlus size={12} className="mr-1" /> Пригласить
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {inviteQuery.length >= 3 && !inviteSearching && inviteResults.length === 0 && (
              <p className="text-xs text-mountain-muted">Не найдено</p>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-mountain-border" />
            <span className="text-xs text-mountain-muted">или по ссылке</span>
            <div className="flex-1 h-px bg-mountain-border" />
          </div>

          {/* Invite link */}
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 truncate text-xs bg-mountain-bg px-3 py-2 rounded-lg text-mountain-muted border border-mountain-border">
              {typeof window !== 'undefined'
                ? `${window.location.origin}/teams/join/${inviteToken}`
                : `/teams/join/${inviteToken}`}
            </code>
            <Button
              variant="outline"
              onClick={handleCopyInvite}
              className="shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-1 text-mountain-success" />
                  <span className="text-xs">Скопировано!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1" />
                  <span className="text-xs">Копировать</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Leave button (non-leaders only) */}
      {!isLeader && (
        <div className="pt-4">
          <Button
            variant="ghost"
            onClick={handleLeaveTeam}
            className="w-full text-mountain-danger hover:text-mountain-danger hover:bg-mountain-danger/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Покинуть отделение
          </Button>
        </div>
      )}
    </div>
  )
}
