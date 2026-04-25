'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Users, Wrench, UtensilsCrossed, CheckSquare, Crown, Edit2, Check, X, Send, UserPlus, Trash2, AlertTriangle } from 'lucide-react'
import { InviteFriendsModal } from '@/components/teams/invite-friends-modal'
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

const READINESS_ITEMS_COUNT = 6

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

interface PrepSummaryProps {
  teamId: string
  members: { user_id: string; display_name: string }[]
  onOpenTab: (tab: Tab) => void
}

interface RequiredGearRow {
  id: string
  norm_per_person: number | null
  norm_per_team: number | null
}

interface MemberGearRow {
  required_gear_id: string
  quantity: number
}

interface ReadinessRow {
  checked: boolean
}

function TeamPrepSummary({ teamId, members, onOpenTab }: PrepSummaryProps) {
  const [loading, setLoading] = useState(true)
  const [requiredGear, setRequiredGear] = useState<RequiredGearRow[]>([])
  const [memberGear, setMemberGear] = useState<MemberGearRow[]>([])
  const [readinessRows, setReadinessRows] = useState<ReadinessRow[]>([])

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('team_required_gear').select('id, norm_per_person, norm_per_team').eq('team_id', teamId),
      supabase.from('team_member_gear').select('required_gear_id, quantity').eq('team_id', teamId),
      supabase.from('team_readiness').select('checked').eq('team_id', teamId),
    ]).then(([gearRes, memberGearRes, readinessRes]) => {
      setRequiredGear((gearRes.data ?? []) as RequiredGearRow[])
      setMemberGear((memberGearRes.data ?? []) as MemberGearRow[])
      setReadinessRows((readinessRes.data ?? []) as ReadinessRow[])
      setLoading(false)
    })
  }, [teamId, members.length])

  const memberCount = members.length
  const gearReady = requiredGear.filter(item => {
    const total = memberGear
      .filter(row => row.required_gear_id === item.id)
      .reduce((sum, row) => sum + row.quantity, 0)
    const required =
      item.norm_per_person != null
        ? item.norm_per_person * memberCount
        : item.norm_per_team
    return required == null ? total > 0 : total >= required
  }).length
  const gearPercent = requiredGear.length > 0 ? Math.round((gearReady / requiredGear.length) * 100) : 0
  const readinessTotal = memberCount * READINESS_ITEMS_COUNT
  const readinessChecked = readinessRows.filter(row => row.checked).length
  const readinessPercent = readinessTotal > 0 ? Math.round((readinessChecked / readinessTotal) * 100) : 0

  const cards = [
    {
      label: 'Участники',
      value: memberCount,
      detail: memberCount > 0 ? 'человек в отделении' : 'добавьте участников',
      action: 'Управлять',
      tab: 'members' as Tab,
      tone: memberCount > 0 ? 'text-mountain-text' : 'text-mountain-accent',
    },
    {
      label: 'Снаряжение',
      value: requiredGear.length > 0 ? `${gearPercent}%` : '—',
      detail: requiredGear.length > 0 ? `${gearReady}/${requiredGear.length} позиций закрыто` : 'список не задан',
      action: requiredGear.length > 0 ? 'Проверить' : 'Задать список',
      tab: 'gear' as Tab,
      tone: requiredGear.length > 0 && gearPercent < 100 ? 'text-mountain-accent' : 'text-mountain-text',
    },
    {
      label: 'Раскладка',
      value: 'план',
      detail: 'выберите рацион и список покупок',
      action: 'Открыть',
      tab: 'rations' as Tab,
      tone: 'text-mountain-text',
    },
    {
      label: 'Готовность',
      value: `${readinessPercent}%`,
      detail: readinessTotal > 0 ? `${readinessChecked}/${readinessTotal} отметок` : 'нет участников',
      action: 'Отметить',
      tab: 'readiness' as Tab,
      tone: readinessPercent < 100 ? 'text-mountain-accent' : 'text-mountain-success',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(card => (
        <Card key={card.label} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-mountain-muted">{card.label}</p>
              <p className={`text-2xl font-bold mt-1 ${card.tone}`}>{loading ? '…' : card.value}</p>
              <p className="text-xs text-mountain-muted mt-1">{loading ? 'считаю состояние' : card.detail}</p>
            </div>
            {!loading && (card.label === 'Снаряжение' && requiredGear.length === 0 || card.label === 'Готовность' && readinessPercent < 100) && (
              <AlertTriangle className="w-4 h-4 text-mountain-accent shrink-0 mt-1" />
            )}
          </div>
          <button
            onClick={() => onOpenTab(card.tab)}
            className="mt-3 text-xs font-medium text-mountain-primary hover:text-mountain-text transition-colors"
          >
            {card.action}
          </button>
        </Card>
      ))}
    </div>
  )
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
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function deleteTeam() {
    const supabase = createClient()
    await supabase.from('teams').delete().eq('id', teamId)
    router.push('/teams')
  }

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
                      onClick={() => setShowInviteModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-mountain-primary text-white hover:bg-mountain-primary/80 transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Пригласить
                    </button>
                    <button
                      onClick={startEdit}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-mountain-border text-mountain-muted text-xs hover:text-mountain-text hover:border-mountain-primary transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Изменить
                    </button>
                    {confirmDelete ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-mountain-danger">Удалить?</span>
                        <button onClick={deleteTeam} className="px-2.5 py-1 rounded-lg border border-mountain-danger text-mountain-danger text-xs hover:bg-mountain-danger/10 transition-colors">Да</button>
                        <button onClick={() => setConfirmDelete(false)} className="px-2.5 py-1 rounded-lg border border-mountain-border text-mountain-muted text-xs hover:text-mountain-text transition-colors">Нет</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="p-1.5 rounded-lg text-mountain-muted hover:text-mountain-danger hover:bg-mountain-danger/10 transition-colors"
                        aria-label="Удалить отделение"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
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

      <TeamPrepSummary
        teamId={teamId}
        members={members}
        onOpenTab={setActiveTab}
      />

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

      {showInviteModal && (
        <InviteFriendsModal
          teamId={teamId}
          currentUserId={currentUserId}
          onClose={() => setShowInviteModal(false)}
        />
      )}

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
