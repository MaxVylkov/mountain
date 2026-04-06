'use client'

import { useEffect, useState } from 'react'
import { Users, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface TeamInvite {
  id: string
  team: { id: string; name: string; description: string | null }
  inviter: { display_name: string | null }
  created_at: string
}

export function TeamInvites({ userId }: { userId: string }) {
  const [invites, setInvites] = useState<TeamInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('team_invites')
      .select('id, created_at, team:teams(id, name, description), inviter:profiles!team_invites_inviter_id_fkey(display_name)')
      .eq('invitee_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setInvites(data.map((row: any) => ({
            id: row.id,
            team: Array.isArray(row.team) ? row.team[0] : row.team,
            inviter: Array.isArray(row.inviter) ? row.inviter[0] : row.inviter,
            created_at: row.created_at,
          })))
        }
        setLoading(false)
      })
  }, [userId])

  async function handleAccept(inviteId: string, teamId: string) {
    setActionId(inviteId)
    const supabase = createClient()

    // Accept invite
    await supabase.from('team_invites').update({ status: 'accepted' }).eq('id', inviteId)

    // Add to team members
    await supabase.from('team_members').insert({
      team_id: teamId,
      user_id: userId,
      role: 'member',
    })

    setInvites(prev => prev.filter(i => i.id !== inviteId))
    setActionId(null)
  }

  async function handleDecline(inviteId: string) {
    setActionId(inviteId)
    const supabase = createClient()
    await supabase.from('team_invites').update({ status: 'declined' }).eq('id', inviteId)
    setInvites(prev => prev.filter(i => i.id !== inviteId))
    setActionId(null)
  }

  if (loading || invites.length === 0) return null

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <Users size={18} className="text-mountain-accent" />
        <h2 className="font-semibold">Приглашения в отделения ({invites.length})</h2>
      </div>
      <div className="space-y-2">
        {invites.map(invite => (
          <div key={invite.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-mountain-bg border border-mountain-border">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{invite.team?.name || 'Отделение'}</p>
              <p className="text-xs text-mountain-muted">
                {invite.inviter?.display_name || 'Участник'} приглашает
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                onClick={() => handleAccept(invite.id, invite.team.id)}
                disabled={actionId === invite.id}
                className="text-xs px-3 py-1.5 h-auto"
              >
                <Check size={12} className="mr-1" /> Принять
              </Button>
              <button
                onClick={() => handleDecline(invite.id)}
                disabled={actionId === invite.id}
                className="p-1.5 text-mountain-muted hover:text-mountain-danger transition-colors disabled:opacity-50"
                aria-label="Отклонить"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
