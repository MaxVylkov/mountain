import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { JoinTeamClient } from './join-client'

export default async function JoinTeamPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Find team by invite token
  const { data: team } = await supabase
    .from('teams')
    .select('id, name, description, mountain:mountains(name), leader:profiles!teams_leader_id_fkey(display_name)')
    .eq('invite_token', token)
    .single()

  if (!team) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-2">
          <p className="text-xl font-bold text-mountain-text">Ссылка недействительна</p>
          <p className="text-sm text-mountain-muted">Отделение не найдено или ссылка устарела</p>
        </div>
      </div>
    )
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', team.id)
    .eq('user_id', user.id)
    .single()

  if (existing) redirect(`/teams/${team.id}`)

  // Normalize joined relations (Supabase returns arrays for joins)
  const mountain = Array.isArray(team.mountain) ? team.mountain[0] ?? null : team.mountain
  const leader = Array.isArray(team.leader) ? team.leader[0] ?? null : team.leader

  return (
    <JoinTeamClient
      team={{
        id: team.id,
        name: team.name,
        description: team.description,
        mountain,
        leader,
      }}
      userId={user.id}
    />
  )
}
