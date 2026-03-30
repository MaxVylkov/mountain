import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InviteClient } from './invite-client'

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Find the user who owns this invite token
  const { data: inviter } = await supabase
    .from('profiles')
    .select('id, display_name, invite_token')
    .eq('invite_token', token)
    .single()

  if (!inviter) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-2">
          <p className="text-xl font-bold text-mountain-text">Ссылка недействительна</p>
          <p className="text-sm text-mountain-muted">Пользователь не найден или ссылка устарела</p>
        </div>
      </div>
    )
  }

  // Can't add yourself
  if (inviter.id === user.id) redirect('/profile')

  // Check if friendship already exists
  const { data: existing } = await supabase
    .from('friendships')
    .select('id, status')
    .or(`and(requester_id.eq.${user.id},addressee_id.eq.${inviter.id}),and(requester_id.eq.${inviter.id},addressee_id.eq.${user.id})`)
    .single()

  return (
    <InviteClient
      inviter={{ id: inviter.id, display_name: inviter.display_name }}
      currentUserId={user.id}
      existing={existing ?? null}
    />
  )
}
