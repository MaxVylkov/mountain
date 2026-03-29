'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Users, Wrench, UtensilsCrossed, CheckSquare, Crown } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { TeamMembers } from '@/components/teams/team-members'
import { TeamGear } from '@/components/teams/team-gear'
import { TeamRations } from '@/components/teams/team-rations'
import { TeamReadiness } from '@/components/teams/team-readiness'

interface TeamDetailProps {
  teamId: string
  team: {
    id: string
    name: string
    description: string | null
    start_date: string | null
    end_date: string | null
    leader_id: string
    invite_token: string
    mountain: { name: string } | null
    route: { name: string } | null
  }
  currentUserId: string
}

type Tab = 'members' | 'gear' | 'rations' | 'readiness'

const tabs: { key: Tab; label: string; icon: typeof Users }[] = [
  { key: 'members', label: 'Участники', icon: Users },
  { key: 'gear', label: 'Снаряжение', icon: Wrench },
  { key: 'rations', label: 'Раскладка', icon: UtensilsCrossed },
  { key: 'readiness', label: 'Готовность', icon: CheckSquare },
]

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function TeamDetail({ teamId, team, currentUserId }: TeamDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>('members')
  const [members, setMembers] = useState<{ user_id: string; display_name: string }[]>([])

  const isLeader = currentUserId === team.leader_id

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('team_members')
      .select('user_id, profile:profiles(display_name)')
      .eq('team_id', teamId)
      .then(({ data }) => {
        if (data) {
          setMembers(data.map((m: any) => ({
            user_id: m.user_id,
            display_name: m.profile?.display_name || 'Участник',
          })))
        }
      })
  }, [teamId])

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/teams"
        className="inline-flex items-center gap-2 text-mountain-muted hover:text-mountain-text transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Все отделения</span>
      </Link>

      {/* Header */}
      <Card>
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-2xl font-bold text-mountain-text">{team.name}</h2>
            {isLeader && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-medium shrink-0">
                <Crown className="w-3.5 h-3.5" />
                Руководитель
              </span>
            )}
          </div>

          {team.description && (
            <p className="text-mountain-muted text-sm">{team.description}</p>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-mountain-muted">
            {team.mountain && (
              <span>Гора: <span className="text-mountain-text">{team.mountain.name}</span></span>
            )}
            {team.route && (
              <span>Маршрут: <span className="text-mountain-text">{team.route.name}</span></span>
            )}
            {(team.start_date || team.end_date) && (
              <span>
                {formatDate(team.start_date)} — {formatDate(team.end_date)}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-mountain-border overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`
              flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
              border-b-2 transition-colors
              ${activeTab === key
                ? 'border-mountain-primary text-mountain-primary'
                : 'border-transparent text-mountain-muted hover:text-mountain-text'
              }
            `}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'members' && (
          <TeamMembers
            teamId={teamId}
            leaderId={team.leader_id}
            currentUserId={currentUserId}
            inviteToken={team.invite_token}
          />
        )}
        {activeTab === 'gear' && (
          <TeamGear teamId={teamId} members={members} currentUserId={currentUserId} />
        )}
        {activeTab === 'rations' && (
          <TeamRations teamId={teamId} memberCount={members.length} startDate={team.start_date} endDate={team.end_date} />
        )}
        {activeTab === 'readiness' && (
          <TeamReadiness teamId={teamId} members={members} currentUserId={currentUserId} isLeader={isLeader} />
        )}
      </div>
    </div>
  )
}
