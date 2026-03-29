import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TeamDetail } from '@/components/teams/team-detail'

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: team } = await supabase
    .from('teams')
    .select('*, mountain:mountains(name), route:routes(name)')
    .eq('id', id)
    .single()

  if (!team) redirect('/teams')

  return <TeamDetail teamId={id} team={team} currentUserId={user.id} />
}
