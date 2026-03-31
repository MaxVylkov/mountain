'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TelegramLogin } from './telegram-login'

type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'

const levels: { key: ExperienceLevel; label: string; sub: string }[] = [
  { key: 'beginner', label: 'Новичок', sub: 'Только начинаю' },
  { key: 'intermediate', label: 'Средний', sub: 'Есть опыт походов' },
  { key: 'advanced', label: 'Опытный', sub: '2–1 разряд и выше' },
]

export function RegisterForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [level, setLevel] = useState<ExperienceLevel>('beginner')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      await supabase
        .from('profiles')
        .update({ experience_level: level })
        .eq('id', data.user.id)
    }

    router.push('/')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="name"
        label="Имя"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Как тебя зовут"
        required
      />
      <Input
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
      />
      <Input
        id="password"
        label="Пароль"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Минимум 6 символов"
        minLength={6}
        required
      />

      <div>
        <p className="text-xs font-medium text-mountain-muted mb-2">Твой уровень</p>
        <div className="grid grid-cols-3 gap-2">
          {levels.map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => setLevel(l.key)}
              className={`
                flex flex-col items-center gap-0.5 px-2 py-2.5 rounded-lg border text-center transition-colors
                ${level === l.key
                  ? 'border-mountain-primary bg-mountain-primary/10 text-mountain-primary'
                  : 'border-mountain-border text-mountain-muted hover:border-mountain-primary/50 hover:text-mountain-text'
                }
              `}
            >
              <span className="text-xs font-semibold">{l.label}</span>
              <span className="text-[10px] leading-tight opacity-70">{l.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-mountain-danger">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Создаём...' : 'Создать аккаунт'}
      </Button>
      <p className="text-center text-sm text-mountain-muted">
        Уже есть аккаунт?{' '}
        <Link href="/login" className="text-mountain-primary hover:underline">
          Войти
        </Link>
      </p>
      <TelegramLogin />
    </form>
  )
}
