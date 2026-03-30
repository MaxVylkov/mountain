'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Users, Wrench, UtensilsCrossed, CheckSquare, Crown, Edit2, Check, X, Send } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { TeamMembers } from '@/components/teams/team-members'
import { TeamGearTab } from '@/components/teams/team-gear-tab'
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
    telegram_link: string | null
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
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('members')
  const [members, setMembers] = useState<{ user_id: string; display_name: string }[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editData, setEditData] = useState({
    name: team.name,
    description: team.description ?? '',
    start_date: team.start_date ?? '',
    end_date: team.end_date ?? '',
    telegram_link: team.telegram_link ?? '',
  })

  const isLeader = currentUserId === team.leader_id

  const startEdit = () => {
    setEditData({
      name: team.name,
      description: team.description ?? '',
      start_date: team.start_date ?? '',
      end_date: team.end_date ?? '',
      telegram_link: team.telegram_link ?? '',
    })
    setIsEditing(true)
  }

  const cancelEdit = () => setIsEditing(false)

  const saveEdit = async () => {
    if (!editData.name.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('teams')
      .update({
        name: editData.name.trim(),
        description: editData.description.trim() || null,
        start_date: editData.start_date || null,
        end_date: editData.end_date || null,
        telegram_link: editData.telegram_link.trim() || null,
      })
      .eq('id', teamId)
    setSaving(false)
    if (error) { alert('Ошибка сохранения: ' + error.message); return }
    setIsEditing(false)
    router.refresh()
  }

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
        {isEditing ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-semibold text-mountain-muted uppercase tracking-wide">Редактирование отделения</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={saveEdit}
                  disabled={saving || !editData.name.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-mountain-primary text-white text-xs font-medium hover:bg-mountain-primary/80 disabled:opacity-50 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Сохранить
                </button>
                <button
                  onClick={cancelEdit}
                  disabled={saving}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-mountain-border text-mountain-muted text-xs hover:text-mountain-text transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Отмена
                </button>
              </div>
            </div>
            <input
              type="text"
              value={editData.name}
              onChange={e => setEditData(d => ({ ...d, name: e.target.value }))}
              placeholder="Название отделения"
              className="w-full rounded-lg border border-mountain-border bg-mountain-bg px-3 py-2 text-mountain-text text-base font-semibold focus:outline-none focus:border-mountain-primary"
            />
            <textarea
              value={editData.description}
              onChange={e => setEditData(d => ({ ...d, description: e.target.value }))}
              placeholder="Описание (необязательно)"
              rows={2}
              className="w-full rounded-lg border border-mountain-border bg-mountain-bg px-3 py-2 text-mountain-text text-sm resize-none focus:outline-none focus:border-mountain-primary placeholder:text-mountain-muted"
            />
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1 text-xs text-mountain-muted">
                Начало похода
                <input
                  type="date"
                  value={editData.start_date}
                  onChange={e => setEditData(d => ({ ...d, start_date: e.target.value }))}
                  className="rounded-lg border border-mountain-border bg-mountain-bg px-3 py-1.5 text-mountain-text text-sm focus:outline-none focus:border-mountain-primary"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-mountain-muted">
                Конец похода
                <input
                  type="date"
                  value={editData.end_date}
                  onChange={e => setEditData(d => ({ ...d, end_date: e.target.value }))}
                  className="rounded-lg border border-mountain-border bg-mountain-bg px-3 py-1.5 text-mountain-text text-sm focus:outline-none focus:border-mountain-primary"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs text-mountain-muted">
              Ссылка на беседу в Telegram
              <input
                type="url"
                value={editData.telegram_link}
                onChange={e => setEditData(d => ({ ...d, telegram_link: e.target.value }))}
                placeholder="https://t.me/joinchat/..."
                className="rounded-lg border border-mountain-border bg-mountain-bg px-3 py-1.5 text-mountain-text text-sm focus:outline-none focus:border-mountain-primary placeholder:text-mountain-muted font-normal"
              />
            </label>
            {(team.mountain || team.route) && (
              <p className="text-xs text-mountain-muted">
                Гора и маршрут задаются при создании отделения.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl font-bold text-mountain-text">{team.name}</h2>
              <div className="flex items-center gap-2 shrink-0">
                {isLeader && (
                  <>
                    <button
                      onClick={startEdit}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-mountain-border text-mountain-muted text-xs hover:text-mountain-text hover:border-mountain-primary transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Изменить
                    </button>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-medium">
                      <Crown className="w-3.5 h-3.5" />
                      Руководитель
                    </span>
                  </>
                )}
              </div>
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

            {team.telegram_link && (
              <a
                href={team.telegram_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#229ED9]/15 text-[#229ED9] border border-[#229ED9]/25 text-sm font-medium hover:bg-[#229ED9]/25 transition-colors w-fit"
              >
                <Send className="w-4 h-4" />
                Открыть беседу в Telegram
              </a>
            )}
          </div>
        )}
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
          <TeamGearTab teamId={teamId} members={members} currentUserId={currentUserId} isLeader={isLeader} />
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
