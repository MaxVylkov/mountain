'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import CreateTeamModal from '@/components/teams/create-team-modal'

interface TeamData {
  id: string
  name: string
  description: string | null
  start_date: string | null
  end_date: string | null
  leader_id: string
  mountain: { name: string } | null
}

interface TeamMemberRow {
  team_id: string
  role: string
  team: TeamData
}

interface TeamWithCount extends TeamMemberRow {
  memberCount: number
}

interface TeamListProps {
  userId: string
  mountains: { id: string; name: string }[]
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}.${month}`
}

export default function TeamList({ userId, mountains }: TeamListProps) {
  const router = useRouter()
  const [teams, setTeams] = useState<TeamWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const loadTeams = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data } = await supabase
      .from('team_members')
      .select('team_id, role, team:teams(id, name, description, start_date, end_date, leader_id, mountain:mountains(name))')
      .eq('user_id', userId)

    if (!data || data.length === 0) {
      setTeams([])
      setLoading(false)
      return
    }

    const teamsWithCounts: TeamWithCount[] = await Promise.all(
      (data as unknown as TeamMemberRow[]).map(async (row) => {
        const { count } = await supabase
          .from('team_members')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', row.team_id)

        return { ...row, memberCount: count ?? 0 }
      })
    )

    setTeams(teamsWithCounts)
    setLoading(false)
  }

  useEffect(() => {
    loadTeams()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-mountain-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-mountain-text">
          Мои отделения
        </h2>
        <Button onClick={() => setShowModal(true)}>
          Создать отделение
        </Button>
      </div>

      {teams.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-mountain-muted text-lg mb-2">
            У вас пока нет отделений.
          </p>
          <p className="text-mountain-muted mb-6">
            Создайте первое!
          </p>
          <Button onClick={() => setShowModal(true)}>
            Создать отделение
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((item) => (
            <Card
              key={item.team_id}
              hover
              onClick={() => router.push(`/teams/${item.team.id}`)}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-mountain-text truncate">
                    {item.team.name}
                  </h3>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      item.role === 'leader'
                        ? 'bg-mountain-accent/20 text-mountain-accent'
                        : 'bg-mountain-primary/20 text-mountain-primary'
                    }`}
                  >
                    {item.role === 'leader' ? 'Руководитель' : 'Участник'}
                  </span>
                </div>

                {item.team.mountain && (
                  <p className="text-sm text-mountain-muted">
                    {item.team.mountain.name}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm text-mountain-muted">
                  {item.team.start_date && item.team.end_date ? (
                    <span>
                      {formatDate(item.team.start_date)} &mdash; {formatDate(item.team.end_date)}
                    </span>
                  ) : (
                    <span>Даты не указаны</span>
                  )}

                  <span>
                    {item.memberCount}{' '}
                    {item.memberCount === 1
                      ? 'участник'
                      : item.memberCount >= 2 && item.memberCount <= 4
                        ? 'участника'
                        : 'участников'}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <CreateTeamModal
          userId={userId}
          mountains={mountains}
          onClose={() => setShowModal(false)}
          onCreate={() => {
            setShowModal(false)
            loadTeams()
          }}
        />
      )}
    </div>
  )
}
