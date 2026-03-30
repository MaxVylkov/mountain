'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { UserPlus, Check } from 'lucide-react'

interface Props {
  inviter: { id: string; display_name: string | null }
  currentUserId: string
  existing: { id: string; status: string } | null
}

export function InviteClient({ inviter, currentUserId, existing }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const displayName = inviter.display_name || 'Пользователь'

  async function handleAddFriend() {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('friendships').insert({
      requester_id: currentUserId,
      addressee_id: inviter.id,
      status: 'accepted',
    })
    setDone(true)
    setLoading(false)
    setTimeout(() => router.push('/profile'), 1500)
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-sm text-center space-y-6 py-10 px-8">
        <div className="space-y-2">
          <div className="w-16 h-16 rounded-full bg-mountain-primary/20 flex items-center justify-center mx-auto">
            <UserPlus size={28} className="text-mountain-primary" />
          </div>
          <h1 className="text-2xl font-bold text-mountain-text">{displayName}</h1>
          <p className="text-sm text-mountain-muted">приглашает тебя в друзья</p>
        </div>

        {existing ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-mountain-success">
              <Check size={20} />
              <span className="font-medium">
                {existing.status === 'accepted' ? 'Вы уже друзья' : 'Запрос уже отправлен'}
              </span>
            </div>
            <Button variant="outline" onClick={() => router.push('/profile')} className="w-full">
              На профиль
            </Button>
          </div>
        ) : done ? (
          <div className="flex items-center justify-center gap-2 text-mountain-success">
            <Check size={20} />
            <span className="font-medium">Добавлено!</span>
          </div>
        ) : (
          <Button onClick={handleAddFriend} disabled={loading} className="w-full">
            <UserPlus size={16} className="mr-2" />
            {loading ? 'Добавляем...' : 'Добавить в друзья'}
          </Button>
        )}
      </Card>
    </div>
  )
}
