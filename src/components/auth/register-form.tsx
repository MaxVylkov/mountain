'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function RegisterForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signUp({
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
    </form>
  )
}
