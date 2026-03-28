'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mountain, ChevronRight } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'

const levelLabels: Record<ExperienceLevel, string> = {
  beginner: 'Новичок',
  intermediate: 'Значкист',
  advanced: 'Разрядник',
}

const levelColors: Record<ExperienceLevel, string> = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-blue-100 text-blue-800',
  advanced: 'bg-amber-100 text-amber-800',
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push('/login')
        return
      }
      setUser(data.user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('experience_level')
        .eq('id', data.user.id)
        .single()

      if (profile?.experience_level) {
        setExperienceLevel(profile.experience_level as ExperienceLevel)
      }
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
          <div className="flex items-center gap-2">
            <p className="text-lg">{user.user_metadata?.display_name || 'Альпинист'}</p>
            {experienceLevel && (
              <span className={`text-xs px-2 py-1 rounded-full ${levelColors[experienceLevel]}`}>
                {levelLabels[experienceLevel]}
              </span>
            )}
          </div>
        </div>
        <div>
          <p className="text-sm text-mountain-muted">Email</p>
          <p className="text-lg">{user.email}</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          Выйти
        </Button>
      </Card>

      <Link href="/onboard?view=true">
        <div className="bg-mountain-surface border border-mountain-border rounded-xl p-4 hover:border-mountain-primary transition-colors flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mountain size={24} className="text-mountain-primary" />
            <span className="font-medium">Мой путь к вершине</span>
          </div>
          <ChevronRight size={20} className="text-mountain-muted" />
        </div>
      </Link>
    </div>
  )
}
