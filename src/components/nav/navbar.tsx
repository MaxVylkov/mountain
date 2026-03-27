'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Mountain, Backpack, BookOpen, Grip, Dumbbell, User, Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { MobileMenu } from './mobile-menu'
import type { User as SupabaseUser } from '@supabase/supabase-js'

const navLinks = [
  { href: '/mountains', label: 'Маршруты', icon: Mountain },
  { href: '/gear', label: 'Кладовка', icon: Backpack },
  { href: '/knowledge', label: 'Знания', icon: BookOpen },
  { href: '/knots', label: 'Узлы', icon: Grip },
  { href: '/training', label: 'Тренировки', icon: Dumbbell },
]

export function Navbar() {
  const pathname = usePathname()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <nav className="sticky top-0 z-50 border-b border-mountain-border bg-mountain-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold text-mountain-text">
          Mountaine
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors
                ${pathname.startsWith(href)
                  ? 'bg-mountain-surface text-mountain-primary'
                  : 'text-mountain-muted hover:text-mountain-text hover:bg-mountain-surface'
                }
              `}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-mountain-muted hover:text-mountain-text hover:bg-mountain-surface transition-colors"
            >
              <User size={18} />
              <span className="hidden sm:inline">Профиль</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-xl bg-mountain-primary px-4 py-2 text-sm font-medium text-white hover:bg-mountain-primary/90 transition-colors"
            >
              Войти
            </Link>
          )}

          <button
            className="md:hidden p-2 text-mountain-muted hover:text-mountain-text"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <MobileMenu
          links={navLinks}
          pathname={pathname}
          onClose={() => setMobileOpen(false)}
        />
      )}
    </nav>
  )
}
