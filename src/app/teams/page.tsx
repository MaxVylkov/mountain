import { createClient } from '@/lib/supabase/server'
import { UsersRound } from 'lucide-react'
import TeamList from '@/components/teams/team-list'

export default async function TeamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: mountains } = await supabase.from('mountains').select('id, name').order('name')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <UsersRound className="text-mountain-primary" />
        Отделения
      </h1>
      <TeamList userId={user.id} mountains={mountains || []} />
    </div>
  )
}
