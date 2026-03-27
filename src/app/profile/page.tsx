'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { User } from '@supabase/supabase-js'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/login')
        return
      }
      setUser(data.user)
    })
  }, [router])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (!user) return null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Профиль</h1>
      <Card className="space-y-4">
        <div>
          <p className="text-sm text-mountain-muted">Имя</p>
          <p className="text-lg">{user.user_metadata?.display_name || 'Альпинист'}</p>
        </div>
        <div>
          <p className="text-sm text-mountain-muted">Email</p>
          <p className="text-lg">{user.email}</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          Выйти
        </Button>
      </Card>
    </div>
  )
}
