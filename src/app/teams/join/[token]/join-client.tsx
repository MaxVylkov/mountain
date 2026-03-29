'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Mountain, User } from 'lucide-react'

interface JoinTeamClientProps {
  team: {
    id: string
    name: string
    description: string | null
    mountain: { name: string } | null
    leader: { display_name: string } | null
  }
  userId: string
}

export function JoinTeamClient({ team, userId }: JoinTeamClientProps) {
  const router = useRouter()
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleJoin = async () => {
    setJoining(true)
    setError(null)

    const supabase = createClient()
    const { error: insertError } = await supabase
      .from('team_members')
      .insert({ team_id: team.id, user_id: userId, role: 'member' })

    if (insertError) {
      setError('Не удалось присоединиться. Попробуйте ещё раз.')
      setJoining(false)
      return
    }

    router.push('/teams/' + team.id)
  }

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-full max-w-md">
        <Card>
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-mountain-primary/20 mb-2">
                <Users className="w-6 h-6 text-mountain-primary" />
              </div>
              <h1 className="text-xl font-bold text-mountain-text">
                Вступить в отделение
              </h1>
              <p className="text-mountain-muted text-sm">
                Вас приглашают присоединиться
              </p>
            </div>

            <div className="space-y-3">
              <div className="text-center">
                <p className="text-lg font-semibold text-mountain-text">{team.name}</p>
              </div>

              {team.description && (
                <p className="text-sm text-mountain-muted text-center">{team.description}</p>
              )}

              <div className="flex flex-col gap-2 text-sm">
                {team.mountain && (
                  <div className="flex items-center gap-2 text-mountain-muted">
                    <Mountain className="w-4 h-4 shrink-0" />
                    <span>{team.mountain.name}</span>
                  </div>
                )}
                {team.leader && (
                  <div className="flex items-center gap-2 text-mountain-muted">
                    <User className="w-4 h-4 shrink-0" />
                    <span>Руководитель: {team.leader.display_name}</span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <p className="text-sm text-mountain-danger text-center">{error}</p>
            )}

            <Button
              onClick={handleJoin}
              disabled={joining}
              className="w-full"
            >
              {joining ? 'Присоединение...' : 'Присоединиться к отделению'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
