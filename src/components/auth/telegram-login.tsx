'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const TELEGRAM_BOT_NAME = 'mountaine_auth_bot'

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

export function TelegramLogin() {
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    // Define the callback globally
    (window as any).onTelegramAuth = async (user: TelegramUser) => {
      // Let server create/update the user with a stable password
      const res = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      })

      if (!res.ok) {
        console.error('Telegram auth error:', await res.text())
        return
      }

      const { email, password } = await res.json()

      // Sign in with the stable credentials
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        console.error('Sign in error:', error)
        return
      }

      router.push('/')
      router.refresh()
    }

    // Load Telegram widget script
    if (containerRef.current) {
      const script = document.createElement('script')
      script.src = 'https://telegram.org/js/telegram-widget.js?22'
      script.setAttribute('data-telegram-login', TELEGRAM_BOT_NAME)
      script.setAttribute('data-size', 'large')
      script.setAttribute('data-radius', '12')
      script.setAttribute('data-onauth', 'onTelegramAuth(user)')
      script.setAttribute('data-request-access', 'write')
      script.async = true
      containerRef.current.appendChild(script)
    }

    return () => {
      delete (window as any).onTelegramAuth
    }
  }, [router])

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-full border-t border-mountain-border" />
      <p className="text-xs text-mountain-muted">или войти через</p>
      <div ref={containerRef} />
    </div>
  )
}
