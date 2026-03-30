'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Copy, Check, Trash2, LogOut } from 'lucide-react'

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

export function TeamMembers({ teamId, leaderId, currentUserId, inviteToken }: TeamMembersProps) {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

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
        <div className="space-y-3">
          <h3 className="text-mountain-text font-semibold">Пригласить участника</h3>

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

          <p className="text-mountain-muted text-xs">
            Отправьте эту ссылку участнику для вступления в отделение
          </p>
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
